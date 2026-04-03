"""
Reminder Scheduler — Background job that fires expense reminder notifications.

Runs every 60 minutes via APScheduler. On each tick:
  1. Finds all active reminders where next_reminder_at <= now()
  2. For each due reminder, creates notifications for all participants (except the payer)
  3. Advances next_reminder_at by interval_days
  4. Commits everything in one transaction
"""

import logging
import datetime
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import async_session
from app.models import ExpenseReminder, Expense, ExpenseParticipant, Notification, User

logger = logging.getLogger("tandempay.reminders")


async def process_due_reminders():
    """
    Core scheduler tick. Called every ~60 minutes by APScheduler.
    Finds all due reminders and fires notifications.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    logger.info(f"[reminder_tick] Checking for due reminders at {now.isoformat()}")

    async with async_session() as db:
        try:
            # Find all active, due reminders
            result = await db.execute(
                select(ExpenseReminder)
                .where(
                    ExpenseReminder.is_active == True,
                    ExpenseReminder.next_reminder_at <= now,
                )
            )
            due_reminders = result.scalars().all()

            if not due_reminders:
                logger.info("[reminder_tick] No due reminders found.")
                return

            logger.info(f"[reminder_tick] Found {len(due_reminders)} due reminder(s).")

            for reminder in due_reminders:
                try:
                    await _fire_reminder(reminder, db, now)
                except Exception as e:
                    logger.error(
                        f"[reminder_tick] Error processing reminder {reminder.id}: {e}",
                        exc_info=True,
                    )

            await db.commit()
            logger.info(f"[reminder_tick] Successfully processed {len(due_reminders)} reminder(s).")

        except Exception as e:
            await db.rollback()
            logger.error(f"[reminder_tick] Fatal error: {e}", exc_info=True)


async def _fire_reminder(
    reminder: ExpenseReminder,
    db,
    now: datetime.datetime,
):
    """Process a single due reminder: create notifications and advance the schedule."""
    # Load the expense with participants
    result = await db.execute(
        select(Expense)
        .where(Expense.id == reminder.expense_id)
        .options(selectinload(Expense.participants))
    )
    expense = result.scalar_one_or_none()

    if not expense:
        # Expense was deleted but cascade didn't clean up (shouldn't happen)
        logger.warning(
            f"[reminder_tick] Expense {reminder.expense_id} not found, deactivating reminder {reminder.id}"
        )
        reminder.is_active = False
        return

    # Get the payer's name for the notification message
    payer_result = await db.execute(select(User).where(User.id == expense.paid_by))
    payer = payer_result.scalar_one_or_none()
    payer_name = payer.name if payer else "Someone"

    # Create a notification for each participant (except the payer)
    notif_count = 0
    for participant in expense.participants:
        if participant.user_id == expense.paid_by:
            continue  # Don't notify the payer

        notif = Notification(
            user_id=participant.user_id,
            type="expense_reminder",
            title="Payment Reminder",
            message=(
                f"\u23f0 Reminder: You owe ${participant.share_amount:.2f} "
                f'for "{expense.title}". Sent by {payer_name}.'
            ),
            group_id=expense.group_id,
            reference_id=expense.id,
        )
        db.add(notif)
        notif_count += 1

    # Advance to the next reminder time
    reminder.next_reminder_at = now + datetime.timedelta(days=reminder.interval_days)

    logger.info(
        f"[reminder_tick] Fired {notif_count} notification(s) for expense "
        f'"{expense.title}" (reminder {reminder.id}). '
        f"Next reminder at {reminder.next_reminder_at.isoformat()}"
    )
