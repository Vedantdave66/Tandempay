import enum
import uuid
import secrets
from datetime import datetime, date
from typing import Optional
from sqlalchemy import String, Float, Numeric, ForeignKey, DateTime, Boolean, func, Integer, UniqueConstraint, Index, Enum as SAEnum, Date, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from decimal import Decimal
from app.database import Base


class SubscriptionTier(str, enum.Enum):
    free = "free"
    pro = "pro"


class SettlementStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    settled = "settled"
    declined = "declined"


class SettlementMethod(str, enum.Enum):
    in_app = "in_app"
    interac = "interac"
    cash = "cash"
    other = "other"
    etransfer = "etransfer"


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    pending_claim = "pending_claim"
    pending_claim_ready = "pending_claim_ready"
    processing = "processing"
    succeeded = "succeeded"
    expired = "expired"
    failed = "failed"
    canceled = "canceled"
    requires_action = "requires_action"
    disputed = "disputed"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_color: Mapped[str] = mapped_column(String(7), default="#3ECF8E")
    wallet_balance: Mapped[Decimal] = mapped_column(Numeric(12, 2, asdecimal=True), default=Decimal('0.00'))
    interac_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    stripe_account_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    has_completed_payment: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    subscription_tier: Mapped[SubscriptionTier] = mapped_column(
        SAEnum(SubscriptionTier, name="subscriptiontier", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=SubscriptionTier.free,
        server_default=SubscriptionTier.free.value,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    character_shape: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default='rect')
    character_color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True, default='#34D399')
    character_nickname: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    groups: Mapped[list["GroupMember"]] = relationship(back_populates="user")
    expenses_paid: Mapped[list["Expense"]] = relationship(back_populates="payer")


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    created_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # Randomly generated at creation time. Required to join via the invite link.
    # nullable=True so the column can be added to an existing table without a DEFAULT;
    # the migration backfills existing rows. All new rows receive a token from the lambda.
    invite_token: Mapped[str] = mapped_column(String(32), nullable=True, default=lambda: secrets.token_urlsafe(16))

    members: Mapped[list["GroupMember"]] = relationship(back_populates="group", cascade="all, delete-orphan")
    expenses: Mapped[list["Expense"]] = relationship(back_populates="group", cascade="all, delete-orphan")
    settlement_records: Mapped[list["SettlementRecord"]] = relationship(back_populates="group", cascade="all, delete-orphan")
    creator: Mapped["User"] = relationship()


class GroupMember(Base):
    __tablename__ = "group_members"

    group_id: Mapped[str] = mapped_column(String, ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), primary_key=True)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    group: Mapped["Group"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(back_populates="groups")


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id: Mapped[str] = mapped_column(String, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2, asdecimal=True), nullable=False)
    paid_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    split_type: Mapped[str] = mapped_column(String(20), default="equal")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    group: Mapped["Group"] = relationship(back_populates="expenses")
    payer: Mapped["User"] = relationship(back_populates="expenses_paid")
    participants: Mapped[list["ExpenseParticipant"]] = relationship(back_populates="expense", cascade="all, delete-orphan")


class ExpenseParticipant(Base):
    __tablename__ = "expense_participants"

    expense_id: Mapped[str] = mapped_column(String, ForeignKey("expenses.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), primary_key=True)
    share_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2, asdecimal=True), nullable=False)

    expense: Mapped["Expense"] = relationship(back_populates="participants")
    user: Mapped["User"] = relationship()


# ARCHITECTURE NOTE: TandemPay has two settlement tracking models.
# SettlementRecord: tracks the intent to pay (manual/etransfer/in_app method)
# Payment: tracks an actual Stripe PaymentIntent (in_app only)
# A SettlementRecord with method='in_app' SHOULD have a linked Payment record.
# Do not add features to either model until this dual-model architecture is consolidated.
class SettlementRecord(Base):
    """Tracks actual payment transactions between users within a group."""
    __tablename__ = "settlement_records"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id: Mapped[str] = mapped_column(String, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    payer_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    payee_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2, asdecimal=True), nullable=False)
    method: Mapped[SettlementMethod] = mapped_column(
        SAEnum(SettlementMethod, name="settlementmethod", values_callable=lambda x: [e.value for e in x]),
        default=SettlementMethod.etransfer,
    )
    status: Mapped[SettlementStatus] = mapped_column(
        SAEnum(SettlementStatus, name="settlementstatus", values_callable=lambda x: [e.value for e in x]),
        default=SettlementStatus.pending,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    group: Mapped["Group"] = relationship(back_populates="settlement_records")
    payer: Mapped["User"] = relationship(foreign_keys=[payer_id])
    payee: Mapped["User"] = relationship(foreign_keys=[payee_id])

    # PARTIAL unique index (PostgreSQL only — not enforced on SQLite in tests).
    # Blocks a second 'pending' or 'sent' row for the same payer→payee pair in
    # the same group, preventing double-payment initiation.
    # Does NOT block historical rows with status 'settled' or 'declined', so
    # the same pair can settle multiple debts over the lifetime of a group.
    #
    # This index is created by Alembic migration ad04bfa3ca33 via op.execute().
    # SQLAlchemy defines it here so that autogenerate can detect future drift.
    __table_args__ = (
        Index(
            "uq_active_settlement_per_pair",
            "group_id",
            "payer_id",
            "payee_id",
            unique=True,
            postgresql_where="status IN ('pending', 'sent')",
        ),
    )


# --- Notifications ---
class Notification(Base):
    """In-app notification for group activity events."""
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(40), nullable=False)  # expense_added, settlement_requested, payment_sent, payment_confirmed, member_added
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    reference_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # group_id or settlement_id
    group_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship()


# --- Expense Reminders ---
class ExpenseReminder(Base):
    """Recurring reminder for an expense. Only the payer can create one."""
    __tablename__ = "expense_reminders"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    expense_id: Mapped[str] = mapped_column(String, ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False, unique=True)
    created_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    interval_days: Mapped[int] = mapped_column(nullable=False)
    next_reminder_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    expense: Mapped["Expense"] = relationship()
    creator: Mapped["User"] = relationship()


# --- Friend Requests ---
class FriendRequest(Base):
    """Tracks friend requests sent via email."""
    __tablename__ = "friend_requests"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    sender_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    receiver_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | accepted | declined
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    sender: Mapped["User"] = relationship()


# --- Fintech Platform Overhaul: Providers, Ledger, and Payment Requests ---

class ProviderAccount(Base):
    """Represents a linked bank account via an external provider (e.g., Plaid)."""
    __tablename__ = "provider_accounts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(50), default="plaid")
    account_id: Mapped[str] = mapped_column(String(255), nullable=False)
    account_mask: Mapped[str] = mapped_column(String(4), nullable=False)
    institution_name: Mapped[str] = mapped_column(String(255), nullable=False)
    access_token: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="linked")  # linked | relink_required | verification_required | removed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user: Mapped["User"] = relationship()


class WalletTransaction(Base):
    """The internal ledger representing all money movement in and out of user wallets."""
    __tablename__ = "wallet_transactions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # deposit | withdrawal | transfer_in | transfer_out
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2, asdecimal=True), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending | completed | failed
    reference_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # payment_request | deposit | withdrawal | settlement
    reference_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # link to a payment_request, provider_account, etc.
    stripe_payment_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship()


class PaymentRequest(Base):
    """Tracks direct peer-to-peer money requests within groups."""
    __tablename__ = "payment_requests"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id: Mapped[str] = mapped_column(String, ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    requester_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    payer_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2, asdecimal=True), nullable=False)
    note: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending | awaiting_payment | processing | settled | failed | cancelled
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    group: Mapped["Group"] = relationship()
    requester: Mapped["User"] = relationship(foreign_keys=[requester_id])
    payer: Mapped["User"] = relationship(foreign_keys=[payer_id])



class Payment(Base):
    """Core transaction tracker representing a real Stripe PaymentIntent."""
    __tablename__ = "payments"
    __table_args__ = (
        Index("uq_active_payment_settlement_payer", "settlement_id", "payer_id", unique=True,
              postgresql_where=text("status NOT IN ('expired', 'failed', 'canceled')")),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, index=True, nullable=True)
    payer_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    payee_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False) # cents
    status: Mapped[PaymentStatus] = mapped_column(
        SAEnum(PaymentStatus, name="paymentstatus", values_callable=lambda x: [e.value for e in x]),
        default=PaymentStatus.pending,
    )
    payout_arrival_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    settlement_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("settlement_records.id", ondelete="CASCADE"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    payer: Mapped["User"] = relationship(foreign_keys=[payer_id])
    payee: Mapped["User"] = relationship(foreign_keys=[payee_id])
    settlement: Mapped["SettlementRecord"] = relationship(foreign_keys=[settlement_id])


class StripeEvent(Base):
    """Tracks processed Stripe event IDs to ensure webhook idempotency."""
    __tablename__ = "stripe_events"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # This will be the actual Stripe event ID
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# --- Recurring Expenses (Pro feature) ---

class RecurrenceFrequency(str, enum.Enum):
    weekly = "weekly"
    biweekly = "biweekly"
    monthly = "monthly"
    yearly = "yearly"


class RecurringExpense(Base):
    """Template for an expense that auto-fires on a recurring schedule (Pro only)."""
    __tablename__ = "recurring_expenses"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("groups.id", ondelete="CASCADE"), nullable=True)
    created_by_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2, asdecimal=True), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="CAD")
    frequency: Mapped[RecurrenceFrequency] = mapped_column(
        SAEnum(RecurrenceFrequency, name="recurrencefrequency", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    next_run_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    group: Mapped[Optional["Group"]] = relationship()
    created_by: Mapped["User"] = relationship(foreign_keys=[created_by_id])


class PasswordResetToken(Base):
    """Single-use, time-limited password reset token stored as a SHA-256 hash.

    The raw token travels only in the reset URL and is never persisted.
    Lookup is by token_hash; used_at is set on first successful consumption
    so replayed links are rejected even if they arrive before expires_at.
    """
    __tablename__ = "password_reset_tokens"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship()
