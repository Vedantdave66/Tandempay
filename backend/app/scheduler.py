"""
Recurring Expense Scheduler — Background job that auto-creates Expense records
from active RecurringExpense definitions.

Runs daily (every 24 hours) via APScheduler. On each tick:
  1. Finds all active RecurringExpenses where next_run_date <= today
  2. For each with a group_id: creates an equal-split Expense among all group members
  3. Advances next_run_date by the frequency interval
  4. Commits in one transaction per record (isolated failures don't block others)
"""

import calendar
import logging
import datetime
from decimal import Decimal, ROUND_DOWN
from sqlalchemy import select

from app.database import async_session
from app.models import RecurringExpense, RecurrenceFrequency, Expense, ExpenseParticipant, GroupMember

logger = logging.getLogger("tandempay.recurring")


def _advance_date(current: datetime.date, frequency: RecurrenceFrequency) -> datetime.date:
    if frequency == RecurrenceFrequency.weekly:
        return current + datetime.timedelta(weeks=1)
    if frequency == RecurrenceFrequency.biweekly:
        return current + datetime.timedelta(weeks=2)
    if frequency == RecurrenceFrequency.monthly:
        month = current.month + 1
        year = current.year + (month - 1) // 12
        month = ((month - 1) % 12) + 1
        day = min(current.day, calendar.monthrange(year, month)[1])
        return current.replace(year=year, month=month, day=day)
    # yearly
    year = current.year + 1
    day = min(current.day, calendar.monthrange(year, current.month)[1])
    return current.replace(year=year, day=day)


async def process_due_recurring_expenses():
    today = datetime.date.today()
    logger.info("[recurring_tick] Checking for due recurring expenses on %s", today.isoformat())

    async with async_session() as db:
        try:
            result = await db.execute(
                select(RecurringExpense).where(
                    RecurringExpense.is_active == True,
                    RecurringExpense.next_run_date <= today,
                )
            )
            due = result.scalars().all()

            if not due:
                logger.info("[recurring_tick] No due recurring expenses.")
                return

            logger.info("[recurring_tick] Found %d due recurring expense(s).", len(due))

            for rec in due:
                try:
                    await _fire_recurring(rec, db)
                    rec.next_run_date = _advance_date(rec.next_run_date, rec.frequency)
                    await db.commit()
                except Exception:
                    await db.rollback()
                    logger.error(
                        "[recurring_tick] Failed to process recurring expense %s",
                        rec.id,
                        exc_info=True,
                    )

        except Exception:
            await db.rollback()
            logger.error("[recurring_tick] Fatal error during recurring expense tick", exc_info=True)


async def _fire_recurring(rec: RecurringExpense, db) -> None:
    if not rec.group_id:
        logger.info(
            "[recurring_tick] Skipping recurring expense %s — no group_id (personal tracking only).",
            rec.id,
        )
        return

    # Load group members to split equally
    members_result = await db.execute(
        select(GroupMember).where(GroupMember.group_id == rec.group_id)
    )
    members = members_result.scalars().all()
    if not members:
        logger.warning("[recurring_tick] Group %s has no members; skipping.", rec.group_id)
        return

    expense = Expense(
        group_id=rec.group_id,
        title=rec.description,
        amount=rec.amount,
        paid_by=rec.created_by_id,
        split_type="equal",
    )
    db.add(expense)
    await db.flush()

    n = len(members)
    base_share = (rec.amount / Decimal(n)).quantize(Decimal("0.01"), rounding=ROUND_DOWN)
    remainder = rec.amount - (base_share * n)
    shares = [base_share] * n
    shares[0] += remainder

    for member, share in zip(members, shares):
        db.add(ExpenseParticipant(
            expense_id=expense.id,
            user_id=member.user_id,
            share_amount=share,
        ))

    await db.flush()
    logger.info(
        "[recurring_tick] Created expense '%s' ($%s) in group %s from recurring template %s.",
        rec.description,
        rec.amount,
        rec.group_id,
        rec.id,
    )
