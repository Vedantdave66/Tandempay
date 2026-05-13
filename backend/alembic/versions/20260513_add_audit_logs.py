"""Add audit_logs table.

Revision ID: 20260513_add_audit_logs
Revises: 1a2b3c4d5e6f
Create Date: 2026-05-13

Schema changes
--------------
* Creates the ``audit_logs`` table.
* Adds a composite index on (group_id, created_at DESC) for the feed query.

FKs are intentionally omitted on actor_id and group_id so that audit rows
survive deletion of the referenced user or group.  entity_id is not FK-linked
to any table for the same reason.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision: str = "20260513_add_audit_logs"
down_revision: Union[str, Sequence[str], None] = "1a2b3c4d5e6f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── audit_logs ────────────────────────────────────────────────────────────
    op.create_table(
        "audit_logs",
        sa.Column(
            "id",
            sa.String(),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()::text"),
        ),
        # actor_id: NOT NULL, but no FK constraint so the row survives user deletion.
        sa.Column("actor_id", sa.String(), nullable=False),
        # group_id: nullable; no FK constraint so the row survives group deletion.
        sa.Column("group_id", sa.String(), nullable=True),
        sa.Column("action", sa.String(64), nullable=False),
        sa.Column("entity_type", sa.String(32), nullable=False),
        # entity_id: no FK — must survive deletion of the referenced entity.
        sa.Column("entity_id", sa.String(), nullable=False),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # Index for single-actor lookup (minor; included for completeness)
    op.create_index("ix_audit_logs_actor_id", "audit_logs", ["actor_id"])

    # Composite index for the group audit-log feed query:
    #   WHERE group_id = :gid ORDER BY created_at DESC LIMIT :n
    # The DESC direction must be specified here so PostgreSQL can satisfy the
    # ORDER BY without a sort step when scanning the index forward.
    op.execute(
        "CREATE INDEX ix_audit_logs_group_created "
        "ON audit_logs (group_id, created_at DESC)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_audit_logs_group_created")
    op.drop_index("ix_audit_logs_actor_id", table_name="audit_logs")
    op.drop_table("audit_logs")
