"""Add push_token to users

Revision ID: 20260612_add_push_token_to_users
Revises: a107c01bd8f1
Create Date: 2026-06-12
"""
from alembic import op
import sqlalchemy as sa

revision = '20260612_add_push_token_to_users'
down_revision = 'a107c01bd8f1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('push_token', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'push_token')
