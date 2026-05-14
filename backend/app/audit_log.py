"""
AuditLog model — immutable record of every financial action in TandemPay.

Design constraints:
- Rows are write-once. No update or delete route exists.
- FKs to users and groups are nullable at the *DB level* with no ON DELETE clause,
  so audit rows survive the deletion of the entity they describe.
  (actor_id and group_id are left nullable in the FK sense — see below.)
- entity_id is stored as a plain String (UUID text), deliberately NOT a FK,
  so the audit record survives deletion of the referenced expense / settlement.
- created_at is indexed for feed-style pagination.
"""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, DateTime, Index, JSON, func, text, desc
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AuditActions:
    """
    String constants for the `action` column.

    Using plain class-level strings (not a Postgres ENUM or Python enum) keeps
    the set of valid values open for extension without a schema migration.
    """

    # Expense lifecycle
    EXPENSE_CREATED = "expense.created"
    EXPENSE_UPDATED = "expense.updated"
    EXPENSE_DELETED = "expense.deleted"

    # Settlement lifecycle
    SETTLEMENT_INITIATED = "settlement.initiated"
    SETTLEMENT_CONFIRMED = "settlement.confirmed"
    SETTLEMENT_REJECTED = "settlement.rejected"


class AuditLog(Base):
    """
    Immutable audit trail for all financial actions.

    IMPORTANT — no updated_at column.  Rows must never be mutated after insert.
    """

    __tablename__ = "audit_logs"

    # ── Primary key ───────────────────────────────────────────────────────────
    # server_default uses gen_random_uuid() so the DB assigns the ID even if
    # the application layer forgets to set one.
    id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        server_default=text("gen_random_uuid()::text"),
        default=lambda: str(uuid.uuid4()),
    )

    # ── Who did it ────────────────────────────────────────────────────────────
    # NOT NULL at the application layer; nullable=False on the column.
    # No FK constraint at the DB level so the row survives user deletion.
    actor_id: Mapped[str] = mapped_column(String, nullable=False, index=True)

    # ── Which group (nullable for user-scoped actions) ────────────────────────
    # No FK constraint at the DB level — audit row must outlive the group.
    group_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # ── What happened ─────────────────────────────────────────────────────────
    action: Mapped[str] = mapped_column(String(64), nullable=False)

    # ── What kind of entity ───────────────────────────────────────────────────
    entity_type: Mapped[str] = mapped_column(String(32), nullable=False)

    # ── Which entity (PK of the affected row, stored as text) ─────────────────
    # Plain String — not a FK — so the audit row survives deletion of the entity.
    entity_id: Mapped[str] = mapped_column(String, nullable=False)

    # ── Structured context ────────────────────────────────────────────────────
    # PRIVACY RULE: this JSONB field MUST NOT contain any of the following:
    #   email, interac_handle, interac_email, stripe_payment_intent,
    #   stripe_account_id, phone, hashed_password, access_token,
    #   or any field that matches the Sentry forbidden-terms list in main.py.
    # Safe fields: amount (Decimal/float), description (expense title),
    #   method (payment method string), split_type, participant_count.
    # Column name is "metadata" in the DB; Python attr renamed to avoid
    # shadowing SQLAlchemy's BaseModel.metadata class attribute.
    action_metadata: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)

    # ── When ──────────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    # ── Composite index for the group audit-log feed query ────────────────────
    # (group_id, created_at DESC) covers the WHERE + ORDER BY in one index scan.
    # The Index is created via Alembic (op.execute) with the DESC direction;
    # this declaration keeps SQLAlchemy metadata in sync for autogenerate.
    __table_args__ = (
        Index("ix_audit_logs_group_created", "group_id", "created_at"),
    )
