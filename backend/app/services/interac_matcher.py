"""
Interac e-Transfer settlement matcher.

Given a parsed Interac email and the raw From header, finds the best-matching
SettlementRecord in the DB and optionally confirms it.

Matching strategy:
  1. Extract email from the From header (e.g. "Name <email@host>").
  2. Look up the creditor (payee) by that email in the users table.
  3. Fuzzy-match the parsed counterparty name against all TandemPay users
     to identify the debtor (payer).
  4. Find a pending/sent settlement where payee=creditor and amount matches
     within $0.01 tolerance; prefer the row whose payer=debtor if multiple exist.
"""

import difflib
import logging
import re
from decimal import Decimal
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.models import User, SettlementRecord, Notification, InteracEmailLog
from app.services.email_parser import ParsedInteracEmail
from app.services.email_service import email_for_notification

logger = logging.getLogger("tandempay.interac_matcher")

_AMOUNT_TOLERANCE = Decimal("0.01")
_NAME_RATIO_THRESHOLD = 0.7

_EMAIL_RE = re.compile(r'[\w\.-]+@[\w\.-]+')


# ── Internal helpers ──────────────────────────────────────────────────────────

def _name_ratio(a: str, b: str) -> float:
    """Case-insensitive similarity ratio between two name strings."""
    return difflib.SequenceMatcher(
        None, a.lower().strip(), b.lower().strip()
    ).ratio()


async def _resolve_user_by_email(email: str, db: AsyncSession) -> Optional[User]:
    """Find a TandemPay user by interac_email or login email."""
    email_lower = email.lower().strip()
    result = await db.execute(
        select(User).where(
            or_(
                User.interac_email == email_lower,
                User.email == email_lower,
            )
        )
    )
    return result.scalars().first()


# ── Public: match ─────────────────────────────────────────────────────────────

async def match_settlement(
    parsed: ParsedInteracEmail,
    from_email: str,
    db: AsyncSession,
    creditor: Optional[User] = None,   # pre-resolved from inbound token
) -> Optional[SettlementRecord]:
    """
    Find the SettlementRecord that best matches a parsed Interac email.

    Returns None if the creditor cannot be resolved, the debtor name falls
    below the fuzzy-match threshold, or no settlement matches by payee+amount.
    """
    if creditor is None:
        # Legacy path: resolve creditor from from_email
        m = _EMAIL_RE.search(from_email)
        if not m:
            logger.info(
                "interac_matcher: could not extract email from from_email=%r", from_email
            )
            return None
        creditor_email = m.group(0).lower().strip()

        creditor = await _resolve_user_by_email(creditor_email, db)
        if not creditor:
            logger.info(
                "interac_matcher: creditor not found for email=%s", creditor_email
            )
            return None
        logger.info(
            "interac_matcher: creditor found user_id=%s email=%s", creditor.id, creditor_email
        )
    # else: creditor already known from inbound token — skip resolution

    # Step 3: fuzzy-match parsed counterparty name against all users to find debtor
    all_result = await db.execute(select(User))
    all_users: list[User] = list(all_result.scalars().all())

    debtor: Optional[User] = None
    best_ratio = 0.0
    for u in all_users:
        if u.id == creditor.id:
            continue
        ratio = _name_ratio(parsed.counterparty_name, u.name)
        logger.debug(
            "interac_matcher: name candidate user_id=%s name=%r parsed_name=%r ratio=%.2f",
            u.id, u.name, parsed.counterparty_name, ratio,
        )
        if ratio > best_ratio:
            best_ratio = ratio
            debtor = u

    if debtor is None or best_ratio < _NAME_RATIO_THRESHOLD:
        logger.info(
            "interac_matcher: debtor not found — best ratio=%.2f threshold=%.2f name=%r",
            best_ratio, _NAME_RATIO_THRESHOLD, parsed.counterparty_name,
        )
        return None
    logger.info(
        "interac_matcher: debtor found user_id=%s ratio=%.2f name=%r",
        debtor.id, best_ratio, parsed.counterparty_name,
    )

    # Step 4: find pending settlement where payee=creditor, amount within $0.01
    amount_low  = parsed.amount - _AMOUNT_TOLERANCE
    amount_high = parsed.amount + _AMOUNT_TOLERANCE

    candidates_result = await db.execute(
        select(SettlementRecord).where(
            SettlementRecord.status.in_(["pending", "sent"]),
            SettlementRecord.payee_id == creditor.id,
            SettlementRecord.amount >= amount_low,
            SettlementRecord.amount <= amount_high,
        )
    )
    candidates = list(candidates_result.scalars().all())

    if not candidates:
        logger.info(
            "interac_matcher: no pending settlement found for payee=%s amount=%s — attempting auto-create",
            creditor.id, parsed.amount,
        )
        return await _auto_create_settlement(creditor, debtor, parsed.amount, db)

    # Prefer the row whose payer matches the identified debtor
    for settlement in candidates:
        if settlement.payer_id == debtor.id:
            logger.info(
                "interac_matcher: settlement matched settlement_id=%s payee=%s payer=%s",
                settlement.id, creditor.id, debtor.id,
            )
            return settlement

    # Fallback: return first candidate when payer differs (best-effort)
    settlement = candidates[0]
    logger.info(
        "interac_matcher: settlement matched (payer mismatch, best-effort) "
        "settlement_id=%s payee=%s expected_payer=%s",
        settlement.id, creditor.id, debtor.id,
    )
    return settlement


# ── Internal: auto-create ─────────────────────────────────────────────────────

async def _auto_create_settlement(
    creditor: User,
    debtor: Optional[User],
    amount: Decimal,
    db: AsyncSession,
) -> Optional[SettlementRecord]:
    """
    Create a new SettlementRecord when the debtor sent money without pressing
    Settle Up in the app.  Finds the group both users share; if multiple groups
    exist, picks the first one and logs a warning (best-effort for v1).
    Returns None if debtor is unknown or they share no group.
    """
    if debtor is None:
        logger.info(
            "interac_matcher: auto-create skipped — debtor could not be resolved"
        )
        return None

    from sqlalchemy import select as _select
    from app.models import GroupMember as _GM

    creditor_gids_result = await db.execute(
        _select(_GM.group_id).where(_GM.user_id == creditor.id)
    )
    creditor_gids = {row[0] for row in creditor_gids_result.all()}

    debtor_gids_result = await db.execute(
        _select(_GM.group_id).where(_GM.user_id == debtor.id)
    )
    debtor_gids = {row[0] for row in debtor_gids_result.all()}

    shared = creditor_gids & debtor_gids
    if not shared:
        logger.info(
            "interac_matcher: auto-create skipped — no shared group "
            "creditor=%s debtor=%s", creditor.id, debtor.id,
        )
        return None

    group_id = next(iter(shared))
    if len(shared) > 1:
        logger.warning(
            "interac_matcher: auto-create ambiguous — %d shared groups for "
            "creditor=%s debtor=%s — using group=%s",
            len(shared), creditor.id, debtor.id, group_id,
        )

    settlement = SettlementRecord(
        payer_id=debtor.id,
        payee_id=creditor.id,
        group_id=group_id,
        amount=amount,
        method="interac",
        status="pending",
        auto_confirmed=False,
    )
    db.add(settlement)
    await db.flush()
    logger.info(
        "interac_matcher: auto-created settlement=%s creditor=%s debtor=%s amount=%s group=%s",
        settlement.id, creditor.id, debtor.id, amount, group_id,
    )
    return settlement


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
