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
    op.add_column('groups', sa.Column('invite_token', sa.String(32), nullable=True))
    # Backfill existing rows with unique tokens (PostgreSQL only)
    op.execute(
        "UPDATE groups SET invite_token = md5(random()::text || id::text) WHERE invite_token IS NULL"
    )
    op.create_index('uq_group_invite_token', 'groups', ['invite_token'], unique=True)


def downgrade() -> None:
    op.drop_index('uq_group_invite_token', table_name='groups')
    op.drop_column('groups', 'invite_token')
