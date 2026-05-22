"""Add subscription_tier and stripe_customer_id to users.

Revision ID: 20260522_add_subscription_fields
Revises: 20260513_add_audit_logs
Create Date: 2026-05-22

Schema changes
--------------
* Adds ``subscription_tier`` enum column to ``users`` (default 'free').
* Adds ``stripe_customer_id`` varchar(64) column to ``users`` (nullable).

Backwards-compatible: existing rows receive the server_default 'free'
so no backfill step is needed.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260522_add_subscription_fields"
down_revision: Union[str, Sequence[str], None] = "20260513_add_audit_logs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the enum type for PostgreSQL; SQLite ignores this.
    conn = op.get_bind()
    is_postgres = conn.dialect.name == "postgresql"

    if is_postgres:
        op.execute("CREATE TYPE subscriptiontier AS ENUM ('free', 'pro')")

    op.add_column(
        "users",
        sa.Column(
            "subscription_tier",
            sa.Enum("free", "pro", name="subscriptiontier", create_type=False),
            nullable=False,
            server_default="free",
        ),
    )
    op.add_column(
        "users",
        sa.Column("stripe_customer_id", sa.String(64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "stripe_customer_id")
    op.drop_column("users", "subscription_tier")

    conn = op.get_bind()
    if conn.dialect.name == "postgresql":
        op.execute("DROP TYPE subscriptiontier")
