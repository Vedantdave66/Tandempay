"""Add character_shape, character_color, character_nickname to users

Revision ID: 20260527_add_character_columns
Revises: 20260525_add_password_reset_tokens
Create Date: 2026-05-27
"""
from alembic import op
import sqlalchemy as sa

revision = '20260527_add_character_columns'
down_revision = '20260525_add_password_reset_tokens'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('character_shape', sa.String(20), nullable=True, server_default='rect'))
    op.add_column('users', sa.Column('character_color', sa.String(7), nullable=True, server_default='#34D399'))
    op.add_column('users', sa.Column('character_nickname', sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'character_nickname')
    op.drop_column('users', 'character_color')
    op.drop_column('users', 'character_shape')
