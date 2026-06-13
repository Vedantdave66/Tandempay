"""Add nudge_count and last_nudged_at to settlement_records

Revision ID: 20260613_add_nudge_fields_to_settlement_records
Revises: 20260613_add_invite_token_to_groups
Create Date: 2026-06-13
"""
from alembic import op
import sqlalchemy as sa

revision = '20260613_add_nudge_fields_to_settlement_records'
down_revision = '20260613_add_invite_token_to_groups'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE settlement_records ADD COLUMN IF NOT EXISTS nudge_count INTEGER NOT NULL DEFAULT 0"
    )
    op.execute(
        "ALTER TABLE settlement_records ADD COLUMN IF NOT EXISTS last_nudged_at TIMESTAMP WITH TIME ZONE"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE settlement_records DROP COLUMN IF EXISTS last_nudged_at")
    op.execute("ALTER TABLE settlement_records DROP COLUMN IF EXISTS nudge_count")
