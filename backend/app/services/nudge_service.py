"""
Escalating nudge system — sends push + email reminders to debtors with
pending settlements at day 3, day 7, and day 14.

Nudge schedule (relative to creation for the first nudge, then relative
to the previous nudge for subsequent ones):
  nudge_count 0 → sent when created_at <= now - 3 days   (day-3 nudge)
  nudge_count 1 → sent when last_nudged_at <= now - 4 days (day-7 nudge)
  nudge_count 2 → sent when last_nudged_at <= now - 7 days (day-14 nudge)
  nudge_count >= 3 → no more nudges

Each send_nudge() call is fully self-contained: it fetches users, sends
push + email, increments nudge_count, sets last_nudged_at, and commits.
Failures never propagate — they are logged and swallowed.
"""

import datetime
import logging

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models import SettlementRecord, User, Group
from app.services.push import push_for_user
from app.services.email_service import send_notification_email

logger = logging.getLogger("tandempay.nudge")

_APP_URL = "https://tandempay.ca"


def _build_email(intro: str, cta: str) -> str:
    return (
        f'<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a">'
        f'<p style="font-size:16px;line-height:1.6">{intro}</p>'
        f'<p style="font-size:15px;line-height:1.6;color:#555">{cta}</p>'
        f'<p style="margin-top:24px">'
        f'<a href="{_APP_URL}" '
        f'style="background:#3ECF8E;color:#fff;padding:12px 24px;border-radius:8px;'
        f'text-decoration:none;font-weight:bold;display:inline-block">'
        f'Open TandemPay</a></p>'
        f'<p style="font-size:12px;color:#999;margin-top:24px">'
        f'TandemPay — Free Interac settlement for Canadian roommates \U0001f1e8\U0001f1e6</p>'
        f'</div>'
    )


async def send_nudge(settlement: SettlementRecord, session: AsyncSession) -> None:
    """Send one nudge for a pending settlement and advance the nudge counter.

    Never raises — all failures are logged and swallowed.
    """
    try:
        if settlement.nudge_count >= 3:
            return

        debtor_result = await session.execute(select(User).where(User.id == settlement.payer_id))
        debtor = debtor_result.scalar_one_or_none()
        if not debtor:
            logger.warning(
                "[nudge] Debtor %s not found for settlement %s — skipping",
                settlement.payer_id, settlement.id,
            )
            return

        creditor_result = await session.execute(select(User).where(User.id == settlement.payee_id))
        creditor = creditor_result.scalar_one_or_none()
        if not creditor:
            logger.warning(
                "[nudge] Creditor %s not found for settlement %s — skipping",
                settlement.payee_id, settlement.id,
            )
            return

        group_result = await session.execute(select(Group).where(Group.id == settlement.group_id))
        group = group_result.scalar_one_or_none()
        group_name = group.name if group else "your group"

        amount = f"{settlement.amount:.2f}"
        count = settlement.nudge_count

        if count == 0:
            push_title = "Friendly reminder \U0001f44b"
            push_body = f"You owe {creditor.name} ${amount} in {group_name}"
            email_subject = f"Just a reminder — you owe {creditor.name} ${amount}"
            email_html = _build_email(
                f"Hey {debtor.name}, just a heads up — you still have an outstanding balance of "
                f"<strong>${amount}</strong> with <strong>{creditor.name}</strong> in <em>{group_name}</em>.",
                "Settle free via Interac e-Transfer — it takes 30 seconds.",
            )
        elif count == 1:
            push_title = "Still outstanding \U0001f4b8"
            push_body = f"{creditor.name} is waiting on ${amount} in {group_name}"
            email_subject = f"Your balance of ${amount} is still pending"
            email_html = _build_email(
                f"Hi {debtor.name}, your balance of <strong>${amount}</strong> with "
                f"<strong>{creditor.name}</strong> in <em>{group_name}</em> is still pending.",
                "Settling is free and takes less than a minute via Interac e-Transfer. "
                "Open TandemPay and tap Settle Up.",
            )
        else:  # count == 2
            push_title = "Final reminder"
            push_body = f"Don't forget — you owe {creditor.name} ${amount}"
            email_subject = f"Last reminder: ${amount} still owed in {group_name}"
            email_html = _build_email(
                f"Hi {debtor.name}, this is our final reminder that you still owe "
                f"<strong>${amount}</strong> to <strong>{creditor.name}</strong> in <em>{group_name}</em>.",
                "After this we won’t send any more reminders. "
                "Settling via Interac e-Transfer is free and instant.",
            )

        await push_for_user(debtor, push_title, push_body, settlement.id)
        await send_notification_email(debtor.email, email_subject, email_html)

        settlement.nudge_count += 1
        settlement.last_nudged_at = datetime.datetime.now(datetime.timezone.utc)
        await session.commit()

        logger.info(
            "[nudge] Nudge %d sent to %s for settlement %s ($%s in %s)",
            count + 1, debtor.email, settlement.id, amount, group_name,
        )

    except Exception:
        logger.error(
            "[nudge] Failed to send nudge for settlement %s", settlement.id, exc_info=True
        )


async def run_nudge_job() -> None:
    """Daily job: find all pending settlements due for a nudge and send them.

    Timing windows:
      nudge_count 0  → created_at <= now - 3 days
      nudge_count 1  → last_nudged_at <= now - 4 days  (≈ day 7 from creation)
      nudge_count 2  → last_nudged_at <= now - 7 days  (≈ day 14 from creation)
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    three_days_ago = now - datetime.timedelta(days=3)
    four_days_ago  = now - datetime.timedelta(days=4)
    seven_days_ago = now - datetime.timedelta(days=7)

    logger.info("[nudge_job] Starting nudge sweep at %s", now.isoformat())

    async with async_session() as db:
        try:
            result = await db.execute(
                select(SettlementRecord).where(
                    SettlementRecord.status == "pending",
                    SettlementRecord.nudge_count < 3,
                    or_(
                        and_(
                            SettlementRecord.nudge_count == 0,
                            SettlementRecord.created_at <= three_days_ago,
                        ),
                        and_(
                            SettlementRecord.nudge_count == 1,
                            SettlementRecord.last_nudged_at <= four_days_ago,
                        ),
                        and_(
                            SettlementRecord.nudge_count == 2,
                            SettlementRecord.last_nudged_at <= seven_days_ago,
                        ),
                    ),
                )
            )
            due = result.scalars().all()

            if not due:
                logger.info("[nudge_job] No settlements due for nudge.")
                return

            logger.info("[nudge_job] Found %d settlement(s) due for nudge.", len(due))

            sent = 0
            for settlement in due:
                try:
                    await send_nudge(settlement, db)
                    sent += 1
                except Exception:
                    logger.error(
                        "[nudge_job] Unexpected error on settlement %s", settlement.id, exc_info=True
                    )

            logger.info("[nudge_job] Nudge sweep complete — %d nudge(s) sent.", sent)

        except Exception:
            logger.error("[nudge_job] Fatal error during nudge sweep", exc_info=True)
