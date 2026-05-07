"""Replace broad UniqueConstraint with partial index on active settlements

Revision ID: ad04bfa3ca33
Revises:
Create Date: 2026-05-07 18:16:19.415859

Design decision
---------------
A full UniqueConstraint on (group_id, payer_id, payee_id) permanently blocks any
future settlement between the same pair in the same group, even after new expenses
create new debts. This breaks the core repeat-use flow of the app.

The correct guard is a PARTIAL unique index that only covers active (in-flight)
settlements:

    WHERE status IN ('pending', 'sent')

This allows:
  - Multiple settled/declined rows for the same pair (kept as history)
  - A new pending settlement after a previous one is settled or declined

This blocks:
  - Two pending rows for the same pair at the same time (accidental double-tap)
  - Two sent rows for the same pair at the same time

NOTE: Partial indexes are a PostgreSQL feature. SQLite (used in unit tests) does
not enforce the WHERE clause, so the constraint is production-only. Tests that
rely on it must use PostgreSQL.

This migration:
  1. Drops the over-broad UniqueConstraint created in the previous revision
     (if it exists — safe to skip if it was never applied to this DB).
  2. Creates the correct partial unique index.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ad04bfa3ca33'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Step 1: Drop the over-broad full unique constraint (if it exists).
    Step 2: Create the correct partial unique index on active settlements only.
    """
    # Drop the broad constraint if it was previously applied.
    # Using execute() with IF EXISTS so this is idempotent on fresh databases.
    op.execute(
        "ALTER TABLE settlement_records "
        "DROP CONSTRAINT IF EXISTS uq_settlement_group_payer_payee"
    )

    # Partial unique index: only active (in-flight) settlements are unique.
    # 'settled' and 'declined' rows are excluded, so historical records are
    # preserved and the same pair can settle new debts after resolving old ones.
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_active_settlement_per_pair "
        "ON settlement_records (group_id, payer_id, payee_id) "
        "WHERE status IN ('pending', 'sent')"
    )


def downgrade() -> None:
    """
    Step 1: Drop the partial index.
    Step 2: Restore the original (over-broad) full unique constraint.
    """
    op.execute(
        "DROP INDEX IF EXISTS uq_active_settlement_per_pair"
    )
    op.create_unique_constraint(
        "uq_settlement_group_payer_payee",
        "settlement_records",
        ["group_id", "payer_id", "payee_id"],
    )
