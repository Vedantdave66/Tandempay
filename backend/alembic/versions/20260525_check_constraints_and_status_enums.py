"""Add CHECK constraints on financial amounts and convert status/method to enums.

Revision ID: 20260525_check_constraints_and_status_enums
Revises: 20260524_payment_retry_partial_index
Create Date: 2026-05-25

Schema changes
--------------
CHECK constraints (all databases):
  * expenses.amount > 0
  * expense_participants.share_amount > 0
  * settlement_records.amount > 0
  * settlement_records.payer_id != payee_id

PostgreSQL enum types (replaces VARCHAR columns):
  * settlementstatus  — pending | sent | settled | declined
  * settlementmethod  — in_app | interac | cash | other | etransfer
  * paymentstatus     — pending | pending_claim | pending_claim_ready |
                        processing | succeeded | expired | failed |
                        canceled | requires_action | disputed

Backwards-compatible: downgrade drops constraints and reverts columns to
VARCHAR, then drops the enum types.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260525_check_constraints_and_status_enums"
down_revision: Union[str, Sequence[str], None] = "20260524_payment_retry_partial_index"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ── Enum value sets ──────────────────────────────────────────────────────────
_SETTLEMENT_STATUSES = ("pending", "sent", "settled", "declined")
_SETTLEMENT_METHODS = ("in_app", "interac", "cash", "other", "etransfer")
_PAYMENT_STATUSES = (
    "pending", "pending_claim", "pending_claim_ready", "processing",
    "succeeded", "expired", "failed", "canceled", "requires_action", "disputed",
)


def upgrade() -> None:
    conn = op.get_bind()
    is_postgres = conn.dialect.name == "postgresql"

    # ── CHECK constraints (database-agnostic) ────────────────────────────────
    op.create_check_constraint(
        "ck_expense_amount_positive", "expenses", "amount > 0"
    )
    op.create_check_constraint(
        "ck_share_amount_positive", "expense_participants", "share_amount > 0"
    )
    op.create_check_constraint(
        "ck_settlement_amount_positive", "settlement_records", "amount > 0"
    )
    op.create_check_constraint(
        "ck_no_self_settle", "settlement_records", "payer_id != payee_id"
    )

    # ── Enum type creation + column alteration (PostgreSQL only) ─────────────
    if is_postgres:
        statuses = ", ".join(f"'{v}'" for v in _SETTLEMENT_STATUSES)
        methods = ", ".join(f"'{v}'" for v in _SETTLEMENT_METHODS)
        pstatuses = ", ".join(f"'{v}'" for v in _PAYMENT_STATUSES)

        op.execute(f"CREATE TYPE settlementstatus AS ENUM ({statuses})")
        op.execute(f"CREATE TYPE settlementmethod AS ENUM ({methods})")
        op.execute(f"CREATE TYPE paymentstatus AS ENUM ({pstatuses})")

        # Each of these columns carries a VARCHAR server_default (set in the
        # initial schema migration). Postgres cannot auto-cast a column's
        # existing default expression to a new enum type, so ALTER COLUMN
        # TYPE fails with "default ... cannot be cast automatically" unless
        # the default is dropped first and re-applied (cast to the enum)
        # afterward.
        # uq_active_settlement_per_pair is a partial index whose predicate
        # references status. Postgres cannot rebuild a predicate expression
        # in place during ALTER COLUMN TYPE ("functions in index predicate
        # must be marked IMMUTABLE"), so drop it first and recreate after.
        op.execute("DROP INDEX IF EXISTS uq_active_settlement_per_pair")

        op.execute("ALTER TABLE settlement_records ALTER COLUMN status DROP DEFAULT")
        op.execute(
            "ALTER TABLE settlement_records "
            "ALTER COLUMN status TYPE settlementstatus "
            "USING status::settlementstatus"
        )
        op.execute(
            "ALTER TABLE settlement_records "
            "ALTER COLUMN status SET DEFAULT 'pending'::settlementstatus"
        )

        op.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_active_settlement_per_pair "
            "ON settlement_records (group_id, payer_id, payee_id) "
            "WHERE status IN ('pending', 'sent')"
        )

        op.execute("ALTER TABLE settlement_records ALTER COLUMN method DROP DEFAULT")
        op.execute(
            "ALTER TABLE settlement_records "
            "ALTER COLUMN method TYPE settlementmethod "
            "USING method::settlementmethod"
        )
        op.execute(
            "ALTER TABLE settlement_records "
            "ALTER COLUMN method SET DEFAULT 'etransfer'::settlementmethod"
        )

        # uq_active_payment_settlement_payer (created by
        # 20260524_payment_retry_partial_index) is likewise a partial index
        # whose predicate references status — same drop/recreate treatment.
        op.execute("DROP INDEX IF EXISTS uq_active_payment_settlement_payer")

        op.execute("ALTER TABLE payments ALTER COLUMN status DROP DEFAULT")
        op.execute(
            "ALTER TABLE payments "
            "ALTER COLUMN status TYPE paymentstatus "
            "USING status::paymentstatus"
        )
        op.execute(
            "ALTER TABLE payments "
            "ALTER COLUMN status SET DEFAULT 'pending'::paymentstatus"
        )

        op.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_active_payment_settlement_payer "
            "ON payments (settlement_id, payer_id) "
            "WHERE status NOT IN ('expired', 'failed', 'canceled')"
        )


def downgrade() -> None:
    conn = op.get_bind()
    is_postgres = conn.dialect.name == "postgresql"

    # ── Revert enum columns to plain VARCHAR (PostgreSQL only) ───────────────
    if is_postgres:
        op.execute("DROP INDEX IF EXISTS uq_active_payment_settlement_payer")

        op.execute("ALTER TABLE payments ALTER COLUMN status DROP DEFAULT")
        op.execute(
            "ALTER TABLE payments "
            "ALTER COLUMN status TYPE VARCHAR(50) USING status::VARCHAR"
        )
        op.execute("ALTER TABLE payments ALTER COLUMN status SET DEFAULT 'pending'")

        op.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_active_payment_settlement_payer "
            "ON payments (settlement_id, payer_id) "
            "WHERE status NOT IN ('expired', 'failed', 'canceled')"
        )

        op.execute("ALTER TABLE settlement_records ALTER COLUMN method DROP DEFAULT")
        op.execute(
            "ALTER TABLE settlement_records "
            "ALTER COLUMN method TYPE VARCHAR(20) USING method::VARCHAR"
        )
        op.execute("ALTER TABLE settlement_records ALTER COLUMN method SET DEFAULT 'etransfer'")

        op.execute("DROP INDEX IF EXISTS uq_active_settlement_per_pair")

        op.execute("ALTER TABLE settlement_records ALTER COLUMN status DROP DEFAULT")
        op.execute(
            "ALTER TABLE settlement_records "
            "ALTER COLUMN status TYPE VARCHAR(20) USING status::VARCHAR"
        )
        op.execute("ALTER TABLE settlement_records ALTER COLUMN status SET DEFAULT 'pending'")

        op.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_active_settlement_per_pair "
            "ON settlement_records (group_id, payer_id, payee_id) "
            "WHERE status IN ('pending', 'sent')"
        )

        op.execute("DROP TYPE paymentstatus")
        op.execute("DROP TYPE settlementmethod")
        op.execute("DROP TYPE settlementstatus")

    # ── DROP CHECK constraints ───────────────────────────────────────────────
    op.drop_constraint("ck_no_self_settle", "settlement_records", type_="check")
    op.drop_constraint("ck_settlement_amount_positive", "settlement_records", type_="check")
    op.drop_constraint("ck_share_amount_positive", "expense_participants", type_="check")
    op.drop_constraint("ck_expense_amount_positive", "expenses", type_="check")
