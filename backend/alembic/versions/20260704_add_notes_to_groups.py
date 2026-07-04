"""Add notes to groups

Revision ID: 20260704_add_notes_to_groups
Revises: 20260626_add_interac_token_to_users
Create Date: 2026-07-04
"""
from alembic import op
import sqlalchemy as sa

revision = '20260704_add_notes_to_groups'
down_revision = '20260626_add_interac_token_to_users'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('groups', sa.Column('notes', sa.String(300), nullable=True))


def downgrade() -> None:
    op.drop_column('groups', 'notes')
