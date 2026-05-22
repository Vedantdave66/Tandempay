"""Add recurring_expenses table.

Revision ID: 20260522_add_recurring_expenses
Revises: 20260522_add_subscription_fields
Create Date: 2026-05-22

Schema changes
--------------
* Creates ``recurrencefrequency`` enum type (PostgreSQL only).
* Creates ``recurring_expenses`` table with FK to groups and users.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260522_add_recurring_expenses"
down_revision: Union[str, Sequence[str], None] = "20260522_add_subscription_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    is_postgres = conn.dialect.name == "postgresql"

    if is_postgres:
        op.execute("CREATE TYPE recurrencefrequency AS ENUM ('weekly', 'biweekly', 'monthly', 'yearly')")

    op.create_table(
        "recurring_expenses",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("group_id", sa.String(), sa.ForeignKey("groups.id", ondelete="CASCADE"), nullable=True),
        sa.Column("created_by_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("description", sa.String(255), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="CAD"),
        sa.Column(
            "frequency",
            sa.Enum("weekly", "biweekly", "monthly", "yearly", name="recurrencefrequency", create_type=False),
            nullable=False,
        ),
        sa.Column("next_run_date", sa.Date(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_recurring_expenses_created_by_id", "recurring_expenses", ["created_by_id"])
    op.create_index("ix_recurring_expenses_group_id", "recurring_expenses", ["group_id"])


def downgrade() -> None:
    op.drop_index("ix_recurring_expenses_group_id", table_name="recurring_expenses")
    op.drop_index("ix_recurring_expenses_created_by_id", table_name="recurring_expenses")
    op.drop_table("recurring_expenses")

    conn = op.get_bind()
    if conn.dialect.name == "postgresql":
        op.execute("DROP TYPE recurrencefrequency")
