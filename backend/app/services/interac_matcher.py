"""
Interac e-Transfer settlement matcher.

Given a parsed Interac email and the recipient's email address, finds
the best-matching SettlementRecord in the DB and optionally confirms it.
"""

import difflib
import logging
from decimal import Decimal
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.models import User, SettlementRecord, Notification, InteracEmailLog
from app.services.email_parser import ParsedInteracEmail
from app.services.email_service import email_for_notification

logger = logging.getLogger("tandempay.interac_matcher")

_AMOUNT_TOLERANCE = Decimal("0.10")
_NAME_RATIO_THRESHOLD = 0.6


# ── Internal helpers ──────────────────────────────────────────────────────────

def _name_ratio(a: str, b: str) -> float:
    """Case-insensitive similarity ratio between two name strings."""
    return difflib.SequenceMatcher(
        None, a.lower().strip(), b.lower().strip()
    ).ratio()


async def _resolve_user(recipient_email: str, db: AsyncSession) -> Optional[User]:
    """Find a TandemPay user by interac_email or login email."""
    email_lower = recipient_email.lower().strip()
    result = await db.execute(
        select(User).where(
            or_(
                User.interac_email == email_lower,
                User.email == email_lower,
            )
        )
    )
    return result.scalars().first()


async def _fetch_candidates(
    user: User,
    parsed: ParsedInteracEmail,
    db: AsyncSession,
) -> list[SettlementRecord]:
    """
    Return active SettlementRecords that could match this email.

    Direction mapping:
      "received" → user is the payee (someone sent money to them)
      "sent"     → user is the payer (they sent money out)
      "unknown"  → check both roles
    """
    amount_low  = parsed.amount - _AMOUNT_TOLERANCE
    amount_high = parsed.amount + _AMOUNT_TOLERANCE

    base_q = (
        select(SettlementRecord)
        .where(
            SettlementRecord.status.in_(["pending", "sent"]),
            SettlementRecord.amount >= amount_low,
            SettlementRecord.amount <= amount_high,
        )
    )

    if parsed.direction == "received":
        base_q = base_q.where(SettlementRecord.payee_id == user.id)
    elif parsed.direction == "sent":
        base_q = base_q.where(SettlementRecord.payer_id == user.id)
    else:
        base_q = base_q.where(
            or_(
                SettlementRecord.payer_id == user.id,
                SettlementRecord.payee_id == user.id,
            )
        )

    result = await db.execute(base_q)
    return list(result.scalars().all())


async def _fetch_other_party(
    settlement: SettlementRecord,
    user: User,
    db: AsyncSession,
) -> Optional[User]:
    """Return the User on the opposite side of the settlement from `user`."""
    other_id = (
        settlement.payer_id
        if settlement.payee_id == user.id
        else settlement.payee_id
    )
    result = await db.execute(select(User).where(User.id == other_id))
    return result.scalars().first()


# ── Public: match ─────────────────────────────────────────────────────────────

async def match_settlement(
    parsed: ParsedInteracEmail,
    recipient_email: str,
    db: AsyncSession,
) -> Optional[SettlementRecord]:
    """
    Find the SettlementRecord that best matches a parsed Interac email.

    Returns None if:
    - No TandemPay user found for recipient_email
    - No active settlements match the amount within tolerance
    - The best fuzzy name ratio is below the acceptance threshold
    """
    user = await _resolve_user(recipient_email, db)
    if not user:
        logger.info(
            "interac_matcher: no user found for recipient=%s", recipient_email
        )
        return None

    candidates = await _fetch_candidates(user, parsed, db)
    if not candidates:
        logger.info(
            "interac_matcher: no amount-matching settlements for user=%s amount=%s",
            user.id, parsed.amount,
        )
        return None

    # Single candidate — skip fuzzy match if name is empty (low-confidence parse)
    if len(candidates) == 1 and not parsed.counterparty_name:
        logger.info(
            "interac_matcher: single candidate, no name to compare — accepting user=%s",
            user.id,
        )
        return candidates[0]

    # Score each candidate by counterparty name similarity
    best_settlement: Optional[SettlementRecord] = None
    best_ratio = 0.0

    for settlement in candidates:
        other = await _fetch_other_party(settlement, user, db)
        if not other:
            continue

        ratio = _name_ratio(parsed.counterparty_name, other.name)
        logger.debug(
            "interac_matcher: candidate settlement=%s other_name=%r parsed_name=%r ratio=%.2f",
            settlement.id, other.name, parsed.counterparty_name, ratio,
        )

        if ratio > best_ratio:
            best_ratio = ratio
            best_settlement = settlement

    if best_ratio < _NAME_RATIO_THRESHOLD:
        logger.info(
            "interac_matcher: best ratio %.2f below threshold %.2f for user=%s",
            best_ratio, _NAME_RATIO_THRESHOLD, user.id,
        )
        return None

    logger.info(
        "interac_matcher: matched settlement=%s ratio=%.2f user=%s",
        best_settlement.id, best_ratio, user.id,
    )
    return best_settlement


# ── Public: confirm ───────────────────────────────────────────────────────────

async def confirm_settlement(
    settlement: SettlementRecord,
    log: InteracEmailLog,
    db: AsyncSession,
) -> None:
    """
    Mark a settlement as confirmed via Interac auto-detection.

    - Updates SettlementRecord.status → "settled"
    - Stamps InteracEmailLog.matched and settlement_id
    - Notifies both payer and payee
    - Commits the transaction
    """
    settlement.status = "settled"
    settlement.auto_confirmed = True

    log.matched = True
    log.settlement_id = settlement.id

    msg = f"Payment of ${settlement.amount:.2f} auto-confirmed via Interac e-Transfer ✅"

    for user_id in (settlement.payer_id, settlement.payee_id):
        db.add(Notification(
            user_id=user_id,
            type="payment_confirmed",
            title="Payment Auto-Confirmed",
            message=msg,
            group_id=settlement.group_id,
            reference_id=settlement.id,
        ))

    # Load users to get emails before commit (expire_on_commit would clear attributes)
    users_result = await db.execute(
        select(User).where(User.id.in_([settlement.payer_id, settlement.payee_id]))
    )
    _emails = [u.email for u in users_result.scalars().all()]

    await db.commit()

    for email in _emails:
        await email_for_notification(email, "payment_confirmed", "Payment Auto-Confirmed", msg)
    logger.info(
        "interac_matcher: confirmed settlement=%s via log=%s",
        settlement.id, log.id,
    )
