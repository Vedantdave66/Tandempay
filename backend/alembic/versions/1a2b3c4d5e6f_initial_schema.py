"""Initial schema — full TandemPay baseline.

Revision ID: 1a2b3c4d5e6f
Revises:
Create Date: 2026-05-09

Purpose
-------
Single baseline migration that creates the entire TandemPay schema from scratch.
Replaces the two earlier migrations (ad04bfa3ca33 and 62d7c7fff3d6) which had
a broken chain — ad04bfa3ca33 declared down_revision=None but tried to ALTER
a settlement_records table that didn't yet exist. This consolidation fixes that
so a fresh DB can be brought up cleanly with `alembic upgrade head`.

For existing deployments
------------------------
Production databases that have already applied the earlier migrations
(ad04bfa3ca33 and 62d7c7fff3d6) should run:

    alembic stamp 1a2b3c4d5e6f

This marks the current schema as already up-to-date without re-running any DDL.
The old revision IDs are simply replaced in the alembic_version table.

For fresh databases
-------------------
Just run:

    alembic upgrade head

which creates every table in this file in the correct dependency order, plus
the partial unique index on active settlement records (PostgreSQL only).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "1a2b3c4d5e6f"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── users ────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("avatar_color", sa.String(7), nullable=False, server_default="#3ECF8E"),
        sa.Column("wallet_balance", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("interac_email", sa.String(255), nullable=True),
        sa.Column("stripe_account_id", sa.String(255), nullable=True),
        sa.Column("has_completed_payment", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ── groups ───────────────────────────────────────────────────────────────
    op.create_table(
        "groups",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("created_by", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        # Nullable in the schema (the lambda default fires at app layer);
        # see model docstring for the rationale.
        sa.Column("invite_token", sa.String(32), nullable=True),
    )

    # ── group_members ────────────────────────────────────────────────────────
    op.create_table(
        "group_members",
        sa.Column(
            "group_id",
            sa.String(),
            sa.ForeignKey("groups.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── expenses ─────────────────────────────────────────────────────────────
    op.create_table(
        "expenses",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "group_id",
            sa.String(),
            sa.ForeignKey("groups.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("paid_by", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("split_type", sa.String(20), nullable=False, server_default="equal"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── expense_participants ─────────────────────────────────────────────────
    op.create_table(
        "expense_participants",
        sa.Column(
            "expense_id",
            sa.String(),
            sa.ForeignKey("expenses.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("share_amount", sa.Numeric(12, 2), nullable=False),
    )

    # ── settlement_records ───────────────────────────────────────────────────
    op.create_table(
        "settlement_records",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "group_id",
            sa.String(),
            sa.ForeignKey("groups.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("payer_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("payee_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("method", sa.String(20), nullable=False, server_default="etransfer"),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    # Partial unique index — PostgreSQL only. SQLite tests won't enforce it.
    # Blocks a second pending/sent row for the same payer→payee pair in a group.
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_active_settlement_per_pair "
        "ON settlement_records (group_id, payer_id, payee_id) "
        "WHERE status IN ('pending', 'sent')"
    )

    # ── notifications ────────────────────────────────────────────────────────
    op.create_table(
        "notifications",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("type", sa.String(40), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("message", sa.String(500), nullable=False),
        sa.Column("read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("reference_id", sa.String(), nullable=True),
        sa.Column("group_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])

    # ── expense_reminders ────────────────────────────────────────────────────
    op.create_table(
        "expense_reminders",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "expense_id",
            sa.String(),
            sa.ForeignKey("expenses.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("created_by", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("interval_days", sa.Integer(), nullable=False),
        sa.Column("next_reminder_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── friend_requests ──────────────────────────────────────────────────────
    op.create_table(
        "friend_requests",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("sender_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("receiver_email", sa.String(255), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_friend_requests_receiver_email", "friend_requests", ["receiver_email"])

    # ── provider_accounts ────────────────────────────────────────────────────
    op.create_table(
        "provider_accounts",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("provider", sa.String(50), nullable=False, server_default="plaid"),
        sa.Column("account_id", sa.String(255), nullable=False),
        sa.Column("account_mask", sa.String(4), nullable=False),
        sa.Column("institution_name", sa.String(255), nullable=False),
        sa.Column("access_token", sa.String(255), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="linked"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_provider_accounts_user_id", "provider_accounts", ["user_id"])

    # ── wallet_transactions ──────────────────────────────────────────────────
    op.create_table(
        "wallet_transactions",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "user_id",
            sa.String(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("reference_type", sa.String(50), nullable=True),
        sa.Column("reference_id", sa.String(), nullable=True),
        sa.Column("stripe_payment_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_wallet_transactions_user_id", "wallet_transactions", ["user_id"])

    # ── payment_requests ─────────────────────────────────────────────────────
    op.create_table(
        "payment_requests",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column(
            "group_id",
            sa.String(),
            sa.ForeignKey("groups.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("requester_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("payer_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("note", sa.String(500), nullable=True),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── payments (Stripe PaymentIntents) ─────────────────────────────────────
    op.create_table(
        "payments",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("stripe_payment_intent_id", sa.String(255), nullable=True, unique=True),
        sa.Column("payer_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("payee_id", sa.String(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),  # cents
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("payout_arrival_date", sa.String(50), nullable=True),
        sa.Column(
            "settlement_id",
            sa.String(),
            sa.ForeignKey("settlement_records.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("settlement_id", "payer_id", name="uq_payment_settlement_payer"),
    )
    op.create_index("ix_payments_stripe_payment_intent_id", "payments", ["stripe_payment_intent_id"], unique=True)

    # ── stripe_events (webhook idempotency) ──────────────────────────────────
    op.create_table(
        "stripe_events",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("type", sa.String(100), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # ── idempotency_keys ─────────────────────────────────────────────────────
    op.create_table(
        "idempotency_keys",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("key", sa.String(255), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("endpoint", sa.String(500), nullable=False),
        sa.Column("request_hash", sa.String(64), nullable=False),
        sa.Column("response_code", sa.Integer(), nullable=False),
        sa.Column("response_body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("key", "user_id", "endpoint", name="uq_idempotency_key_user_endpoint"),
    )
    op.create_index("ix_idempotency_keys_key", "idempotency_keys", ["key"])


def downgrade() -> None:
    # Drop in reverse FK-dependency order.
    op.drop_index("ix_idempotency_keys_key", table_name="idempotency_keys")
    op.drop_table("idempotency_keys")
    op.drop_table("stripe_events")
    op.drop_index("ix_payments_stripe_payment_intent_id", table_name="payments")
    op.drop_table("payments")
    op.drop_table("payment_requests")
    op.drop_index("ix_wallet_transactions_user_id", table_name="wallet_transactions")
    op.drop_table("wallet_transactions")
    op.drop_index("ix_provider_accounts_user_id", table_name="provider_accounts")
    op.drop_table("provider_accounts")
    op.drop_index("ix_friend_requests_receiver_email", table_name="friend_requests")
    op.drop_table("friend_requests")
    op.drop_table("expense_reminders")
    op.drop_index("ix_notifications_user_id", table_name="notifications")
    op.drop_table("notifications")
    op.execute("DROP INDEX IF EXISTS uq_active_settlement_per_pair")
    op.drop_table("settlement_records")
    op.drop_table("expense_participants")
    op.drop_table("expenses")
    op.drop_table("group_members")
    op.drop_table("groups")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
