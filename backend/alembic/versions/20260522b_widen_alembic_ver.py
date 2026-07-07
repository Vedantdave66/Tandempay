"""Widen alembic_version.version_num to VARCHAR(255).

Revision ID: 20260522b_widen_alembic_ver
Revises: 20260522_add_subscription_fields
Create Date: 2026-07-07

Schema changes
--------------
* Alembic's bootstrap-created ``alembic_version.version_num`` column defaults
  to VARCHAR(32). Our revision ids are descriptive slugs (dates + a short
  description) that can exceed 32 characters, which silently truncates or
  errors on write depending on the driver.

  Production was already hand-patched to VARCHAR(64) at some point (verified
  by direct read-only query against Supabase — never captured as a migration),
  but that's still a ceiling we can hit again. Widening to VARCHAR(255) here
  matches Alembic's own upstream recommendation and removes the problem for
  good, for both production and any fresh database (CI, new dev setups).
"""

from typing import Sequence, Union

from alembic import op


revision: str = "20260522b_widen_alembic_ver"
down_revision: Union[str, Sequence[str], None] = "20260522_add_subscription_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(255)")


def downgrade() -> None:
    # Reverting is best-effort: this will fail if any recorded revision id in
    # this table is already longer than 32 characters by the time it runs.
    op.execute("ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(32)")
