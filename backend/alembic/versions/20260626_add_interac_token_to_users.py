"""Add interac_token to users

Revision ID: 20260626_add_interac_token_to_users
Revises: 20260613_add_nudge_fields_to_settlement_records
Create Date: 2026-06-26
"""
from alembic import op
import sqlalchemy as sa

revision = '20260626_add_interac_token_to_users'
down_revision = '20260613_add_nudge_fields_to_settlement_records'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS interac_token VARCHAR(32)")
    op.execute(
        "UPDATE users SET interac_token = md5(random()::text || id::text) WHERE interac_token IS NULL"
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_interac_token ON users (interac_token)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_users_interac_token")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS interac_token")
