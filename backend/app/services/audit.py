"""
Audit logging service for TandemPay financial actions.

PRIVACY CONTRACT — the `action_metadata` dict passed to log_action MUST NOT contain:
    - email, interac_email, interac_handle
    - stripe_payment_intent, stripe_account_id
    - hashed_password, access_token
    - phone, name (user display name)
    - Any field matching the Sentry forbidden-terms list in app/main.py

Safe fields for action_metadata: amount (numeric), description (expense title),
method (payment method string e.g. "etransfer"), split_type,
participant_count, status_from, status_to.

Do NOT add Sentry capture calls here — app/main.py's _log_unhandled_exception
handler already forwards every unhandled exception to Sentry.  A second
capture here would create duplicate events.
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.audit_log import AuditLog


async def log_action(
    db: AsyncSession,
    actor_id: str | UUID,
    action: str,
    entity_type: str,
    entity_id: str | UUID,
    group_id: str | UUID | None = None,
    action_metadata: dict[str, Any] | None = None,
) -> None:
    """
    Insert one AuditLog row in the current session.

    This call MUST happen within the same `async with db` block as the primary
    write so that if the audit insert fails, the entire transaction rolls back
    (no silent audit loss, no orphaned primary write).

    Args:
        db:              The active AsyncSession for the current request.
        actor_id:        ID of the user performing the action.
        action:          One of the AuditActions constants (e.g. AuditActions.EXPENSE_CREATED).
        entity_type:     Short noun for the affected entity ("expense", "settlement").
        entity_id:       PK of the affected row.
        group_id:        Group context; None for user-scoped actions without a group.
        action_metadata: Optional structured context dict.  See PRIVACY CONTRACT above.
    """
    entry = AuditLog(
        actor_id=str(actor_id),
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        group_id=str(group_id) if group_id is not None else None,
        action_metadata=action_metadata,
    )
    db.add(entry)
    # Flush so the row is visible within the transaction (e.g. for tests that
    # inspect the session before commit), but do NOT commit — the caller owns
    # the transaction boundary.
    await db.flush()
