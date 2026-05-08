"""add invite_token to groups

Revision ID: 62d7c7fff3d6
Revises: ad04bfa3ca33
Create Date: 2026-05-08 03:45:36

Purpose
-------
Adds an invite_token column to the groups table.

The token is a 22-character URL-safe base64 string (secrets.token_urlsafe(16)).
It is required to join a group via POST /api/groups/{id}/join.

Migration strategy for existing rows
-------------------------------------
1. Add the column as nullable (no DEFAULT at DB level) so the DDL is instant
   even on large tables — no full table rewrite.
2. Backfill all existing rows with a freshly generated token using
   gen_random_bytes(12) — available in PostgreSQL 9.6+ (Supabase uses PG 15).
   We use 12 random bytes which base64-encode to 16 characters, equivalent
   to secrets.token_urlsafe(12). This keeps tokens short and avoids the
   need for pgcrypto's extensions — gen_random_bytes is built-in.
3. Set the column NOT NULL after backfill so new rows without a token are
   rejected at the DB level.

Downgrade
---------
Simply drops the column — no data loss beyond the tokens themselves.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '62d7c7fff3d6'
down_revision: Union[str, Sequence[str], None] = 'ad04bfa3ca33'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: Add nullable column (instant DDL, no table rewrite)
    op.add_column(
        "groups",
        sa.Column("invite_token", sa.String(32), nullable=True),
    )

    # Step 2: Backfill existing rows with a unique token each.
    # encode(gen_random_bytes(16), 'base64') produces a 24-char base64 string;
    # we take the first 22 chars and strip padding/newlines for a clean token.
    # This matches the output length of secrets.token_urlsafe(16) in Python.
    op.execute(
        "UPDATE groups "
        "SET invite_token = replace(replace("
        "  left(encode(gen_random_bytes(16), 'base64'), 22), "
        "  '/', '_'), '+', '-') "
        "WHERE invite_token IS NULL"
    )

    # Step 3: Now that all rows have a value, enforce NOT NULL
    op.alter_column("groups", "invite_token", nullable=False)


def downgrade() -> None:
    op.drop_column("groups", "invite_token")
