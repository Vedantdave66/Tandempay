"""Add invite_token to groups

Revision ID: 20260613_add_invite_token_to_groups
Revises: 20260612_add_push_token_to_users
Create Date: 2026-06-13
"""
from alembic import op
import sqlalchemy as sa

revision = '20260613_add_invite_token_to_groups'
down_revision = '20260612_add_push_token_to_users'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE groups ADD COLUMN IF NOT EXISTS invite_token VARCHAR(32)")
    op.execute(
        "UPDATE groups SET invite_token = md5(random()::text || id::text) WHERE invite_token IS NULL"
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_group_invite_token ON groups (invite_token)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_group_invite_token")
    op.execute("ALTER TABLE groups DROP COLUMN IF EXISTS invite_token")
