"""Replace uq_payment_settlement_payer with partial unique index.

Revision ID: 20260524_payment_retry_partial_index
Revises: 20260522_add_subscription_fields
Create Date: 2026-05-24

Schema changes
--------------
* Drops the blanket unique constraint ``uq_payment_settlement_payer`` on
  (settlement_id, payer_id) which prevented retries after a failed/expired
  attempt.
* Creates a partial unique index ``uq_active_payment_settlement_payer`` on
  the same columns but scoped only to active rows
  (status NOT IN ('expired', 'failed', 'canceled')), so terminal-state rows
  no longer occupy the unique slot.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260524_payment_retry_partial_index"
down_revision: Union[str, Sequence[str], None] = "20260522_add_subscription_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    is_postgres = conn.dialect.name == "postgresql"

    # Drop the old blanket unique constraint
    op.drop_constraint("uq_payment_settlement_payer", "payments", type_="unique")

    # Create partial unique index (PostgreSQL only; SQLite has no partial index
    # support via op.create_index with postgresql_where, so we skip on SQLite)
    if is_postgres:
        op.create_index(
            "uq_active_payment_settlement_payer",
            "payments",
            ["settlement_id", "payer_id"],
            unique=True,
            postgresql_where=sa.text("status NOT IN ('expired', 'failed', 'canceled')"),
        )


def downgrade() -> None:
    conn = op.get_bind()
    is_postgres = conn.dialect.name == "postgresql"

    if is_postgres:
        op.drop_index("uq_active_payment_settlement_payer", table_name="payments")

    op.create_unique_constraint(
        "uq_payment_settlement_payer",
        "payments",
        ["settlement_id", "payer_id"],
    )
