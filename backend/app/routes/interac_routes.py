"""
POST /api/interac/inbound — SendGrid Inbound Parse webhook receiver.

SendGrid delivers inbound emails as multipart/form-data. This endpoint:
  1. Extracts the raw MIME string from the `email` field.
  2. Parses it for Interac e-Transfer signals.
  3. Attempts to match and auto-confirm a pending settlement.
  4. Logs everything to InteracEmailLog regardless of outcome.

Always returns HTTP 200 — SendGrid retries indefinitely on non-200 responses.

Security note:
  SendGrid Inbound Parse (raw MIME mode) does NOT send a webhook signature.
  IP-based allowlisting is the recommended approach but is unreliable behind
  Vercel's proxy layer. If SENDGRID_WEBHOOK_SECRET is configured we emit a
  WARNING when the corresponding header is absent so ops can detect spoofed
  requests in logs.

  TODO (production hardening): add SendGrid IP allowlist middleware once
  Vercel documents stable egress IPs or when migrating to a non-serverless
  host. Reference: https://sendgrid.com/docs/for-developers/sending-email/ip-addresses/
"""

import logging
import re
from typing import Optional

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.limiter import limiter
from app.models import InteracEmailLog, User
from app.services.email_parser import parse_email_body, parse_interac_email
from app.services.interac_matcher import confirm_settlement, match_settlement

logger = logging.getLogger("tandempay.interac")
settings = get_settings()

router = APIRouter(prefix="/api/interac", tags=["Interac"])

_INBOUND_TOKEN_RE = re.compile(r'([a-zA-Z0-9_-]+)@inbound\.tandempay\.ca', re.IGNORECASE)


@router.post("/inbound")
@limiter.limit("60/minute")
async def interac_inbound(
    request: Request,
    # SendGrid Inbound Parse form fields
    from_: Optional[str] = Form(None, alias="from"),
    to: Optional[str] = Form(None),
    subject: Optional[str] = Form(None),
    email: Optional[str] = Form(None),   # raw MIME — present when "Send Raw" is enabled
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    """Receive and process a SendGrid Inbound Parse webhook."""

    # Security: warn if secret is configured but not present in request headers.
    # We cannot block here because Vercel proxies make IP verification unreliable.
    if settings.SENDGRID_WEBHOOK_SECRET:
        incoming_secret = request.headers.get("X-Sendgrid-Webhook-Signature")
        if not incoming_secret:
            logger.warning(
                "interac_inbound: SENDGRID_WEBHOOK_SECRET is set but "
                "X-Sendgrid-Webhook-Signature header is missing — possible spoofed request"
            )

    sender = (from_ or "").strip()
    recipient = (to or "").strip()
    raw_subject = (subject or "").strip()

    # Extract plain-text body from raw MIME when available; fall back to subject only.
    body_text = ""
    parsed_subject = raw_subject
    if email:
        try:
            parsed_subject, body_text = parse_email_body(email)
            parsed_subject = parsed_subject or raw_subject
        except Exception:
            logger.warning(
                "interac_inbound: failed to parse MIME body from=%s subject=%r",
                sender, raw_subject,
            )

    # Resolve creditor from unique inbound token in the `to` address.
    # This is the preferred path — avoids all from_email fuzzy matching.
    creditor_from_token: Optional[User] = None
    _token_match = _INBOUND_TOKEN_RE.search(recipient)
    if _token_match:
        _token = _token_match.group(1)
        _token_result = await db.execute(select(User).where(User.interac_token == _token))
        creditor_from_token = _token_result.scalars().first()
        if creditor_from_token:
            logger.info(
                "interac_inbound: creditor identified via token=%s user_id=%s",
                _token, creditor_from_token.id,
            )
        else:
            logger.warning(
                "interac_inbound: token=%s in `to` address did not match any user", _token
            )

    # Attempt to extract Interac signal from the email content.
    parsed = parse_interac_email(parsed_subject, body_text)

    # Create the audit log row immediately — exists for every inbound email
    # regardless of whether parsing or matching succeeds.
    log = InteracEmailLog(
        from_email=sender,
        subject=parsed_subject,
        raw_subject=raw_subject if raw_subject != parsed_subject else None,
        bank=parsed.bank if parsed else "unknown",
        direction=parsed.direction if parsed else "unknown",
        parsed_amount=parsed.amount if parsed else None,
        parsed_name=parsed.counterparty_name if parsed else None,
        matched=False,
    )
    db.add(log)
    await db.flush()  # assign log.id before matching uses it

    if not parsed:
        log.failure_reason = "parse_failed"
        logger.info(
            "interac_inbound: no Interac pattern matched from=%s subject=%r",
            sender, raw_subject,
        )
        await db.commit()
        return JSONResponse(status_code=200, content={"status": "no_match"})

    logger.info(
        "interac_inbound: parsed bank=%s direction=%s amount=%s name=%r confidence=%s",
        parsed.bank, parsed.direction, parsed.amount,
        parsed.counterparty_name, parsed.confidence,
    )

    # Attempt to match against a pending settlement.
    settlement = await match_settlement(parsed, sender, db, creditor=creditor_from_token)

    if settlement is None:
        log.failure_reason = "no_matching_settlement"
        await db.commit()
        logger.info(
            "interac_inbound: no settlement matched from=%s amount=%s",
            sender, parsed.amount,
        )
        return JSONResponse(status_code=200, content={"status": "no_match"})

    await confirm_settlement(settlement, log, db)
    logger.info(
        "interac_inbound: settlement=%s auto-confirmed from=%s amount=%s",
        settlement.id, sender, parsed.amount,
    )
    return JSONResponse(status_code=200, content={"status": "confirmed", "settlement_id": settlement.id})
