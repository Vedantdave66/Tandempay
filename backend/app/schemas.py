"""
TandemPay Pydantic v2 schemas.

REQUEST schemas enforce strict input constraints — these are the first line of
defence before any data reaches the database:
  - Amount fields: gt=0, le=999_999.99, decimal_places=2 (Decimal, not float)
  - String fields: min_length, max_length, strip_whitespace=True
  - Enum / Literal fields: only accepted values, never raw str
  - List fields: min_length, max_length, no duplicate UUIDs

RESPONSE schemas (Out) are permissive — they describe DB data going out,
not untrusted input coming in.  No strip_whitespace on output fields.
"""

from __future__ import annotations

from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import Annotated, Generic, Optional, TypeVar

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    StringConstraints,
    field_validator,
)


# ── Pagination ────────────────────────────────────────────────────────────────

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated envelope returned by all list endpoints."""
    total: int
    limit: int
    offset: int
    items: list[T]


# ── Shared annotated types ────────────────────────────────────────────────────

# CAD currency amount used on every financial request body.
# - gt=0              : no zero or negative amounts
# - le=999_999.99     : reasonable ceiling for a roommate app
# - decimal_places=2  : reject 33.333 at the schema level
# - max_digits=8      : 999999.99 fits in 8 significant digits
CadAmount = Annotated[
    Decimal,
    Field(gt=Decimal("0"), le=Decimal("999999.99"), decimal_places=2, max_digits=8),
]

# Short human-readable name (group name, display name)
ShortName = Annotated[str, StringConstraints(min_length=1, max_length=100, strip_whitespace=True)]

# Expense / memo title
Title = Annotated[str, StringConstraints(min_length=1, max_length=255, strip_whitespace=True)]

# Free-text note / memo (payment request note etc.)
MemoText = Annotated[str, StringConstraints(min_length=1, max_length=1000, strip_whitespace=True)]

# Invite tokens are fixed-length opaque strings; cap length to prevent payload inflation.
InviteToken = Annotated[str, StringConstraints(min_length=1, max_length=64)]


# ── Enums for fixed-vocabulary fields ─────────────────────────────────────────

class SplitType(str, Enum):
    equal = "equal"
    # extend here when custom splits land (e.g. percentage, exact)


class PaymentMethod(str, Enum):
    etransfer = "etransfer"
    in_app = "in_app"


class SettlementStatus(str, Enum):
    """Valid *incoming* status transitions from a client PUT request."""
    sent = "sent"          # payer marks as sent
    settled = "settled"    # payee confirms receipt
    declined = "declined"  # payee rejects


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    name: ShortName
    email: EmailStr
    password: str = Field(
        min_length=8,
        max_length=128,
        description="Must be at least 8 characters",
    )
    interac_email: Optional[EmailStr] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=1, max_length=512)
    new_password: str = Field(min_length=8, max_length=128)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: str
    avatar_color: str
    wallet_balance: Decimal = Decimal("0.00")
    interac_email: Optional[str] = None
    stripe_account_id: Optional[str] = None
    has_completed_payment: bool = False
    subscription_tier: str = "free"
    created_at: datetime
    character_shape: Optional[str] = 'rect'
    character_color: Optional[str] = '#34D399'
    character_nickname: Optional[str] = None


_VALID_SHAPES = {'rect', 'tall', 'semi', 'round'}

class UserUpdate(BaseModel):
    """Safe partial-update schema for PATCH /api/auth/me.

    Only these three fields may be updated via this endpoint.
    Email, password, financial fields, and role flags are explicitly
    excluded — they have dedicated, higher-scrutiny endpoints.
    """
    has_completed_payment: Optional[bool] = None
    interac_email: Optional[EmailStr] = None
    name: Optional[ShortName] = None
    character_shape: Optional[str] = Field(default=None, max_length=20)
    character_color: Optional[str] = Field(default=None, max_length=7)
    character_nickname: Optional[str] = Field(default=None, max_length=50, strip_whitespace=True)

    @field_validator('character_shape')
    @classmethod
    def validate_shape(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in _VALID_SHAPES:
            raise ValueError(f"character_shape must be one of {sorted(_VALID_SHAPES)}")
        return v


# ── Groups ────────────────────────────────────────────────────────────────────

class GroupCreate(BaseModel):
    name: ShortName


class MemberAdd(BaseModel):
    email: EmailStr


class JoinGroup(BaseModel):
    """Request body for POST /api/groups/{group_id}/join."""
    invite_token: InviteToken


class GroupMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    name: str
    email: str
    interac_email: Optional[str] = None
    avatar_color: str


class GroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    created_by: str
    created_at: datetime
    members: list[GroupMemberOut] = []
    total_expenses: Decimal = Decimal("0")
    # Only populated for the group creator. None for all other members.
    invite_token: Optional[str] = None


class GroupListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    created_by: str
    created_at: datetime
    member_count: int = 0
    total_expenses: Decimal = Decimal("0")


# ── Expenses ──────────────────────────────────────────────────────────────────

class ExpenseCreate(BaseModel):
    title: Title
    amount: CadAmount
    paid_by: str = Field(min_length=1, max_length=64)
    participant_ids: list[str] = Field(
        min_length=1,
        max_length=50,
        description="At least one participant required; max 50; no duplicates",
    )
    split_type: SplitType = SplitType.equal

    @field_validator("participant_ids")
    @classmethod
    def no_duplicate_participants(cls, v: list[str]) -> list[str]:
        if len(v) != len(set(v)):
            raise ValueError("participant_ids must not contain duplicate user IDs")
        return v


class ExpenseParticipantOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: str
    name: str
    share_amount: Decimal
    avatar_color: str = "#3ECF8E"


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    amount: Decimal
    paid_by: str
    payer_name: str = ""
    payer_avatar_color: str = "#3ECF8E"
    split_type: str
    created_at: datetime
    participants: list[ExpenseParticipantOut] = []


# ── Balances & Settlements ────────────────────────────────────────────────────

class UserBalance(BaseModel):
    user_id: str
    name: str
    avatar_color: str
    character_shape: Optional[str] = None
    character_color: Optional[str] = None
    total_paid: Decimal
    total_owed: Decimal
    net_balance: Decimal


class Settlement(BaseModel):
    from_user_id: str
    from_user_name: str
    from_user_email: str
    from_avatar_color: str
    to_user_id: str
    to_user_name: str
    to_user_email: str
    to_avatar_color: str
    amount: Decimal


# ── Settlement Records (actual payment tracking) ──────────────────────────────

class SettlementRecordCreate(BaseModel):
    payee_id: str = Field(min_length=1, max_length=64)
    amount: CadAmount
    method: PaymentMethod = PaymentMethod.etransfer


class SettlementRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    group_id: str
    payer_id: str
    payer_name: str
    payer_email: str
    payer_avatar_color: str
    payee_id: str
    payee_name: str
    payee_email: str
    payee_avatar_color: str
    amount: Decimal
    method: str
    status: str
    created_at: datetime
    updated_at: datetime


class SettlementStatusUpdate(BaseModel):
    """Client-initiated status transition.  Only the three valid moves are accepted."""
    status: SettlementStatus


# ── Notifications ─────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    type: str
    title: str
    message: str
    read: bool
    reference_id: Optional[str] = None
    group_id: Optional[str] = None
    created_at: datetime


# ── Friend Requests ───────────────────────────────────────────────────────────

class FriendRequestCreate(BaseModel):
    email: EmailStr


class FriendRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    sender_id: str
    receiver_email: str
    status: str
    created_at: datetime
    updated_at: datetime

    # Optional nested data for the frontend
    sender_name: Optional[str] = None
    sender_avatar: Optional[str] = None
    sender_email: Optional[str] = None


# ── Fintech Platform Overhaul: Providers & Ledger ─────────────────────────────

class ProviderAccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    provider: str
    account_mask: str
    institution_name: str
    status: str
    created_at: datetime
    updated_at: datetime


class WalletTransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    type: str
    amount: Decimal
    status: str
    reference_id: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class PaymentRequestCreate(BaseModel):
    payer_id: str = Field(min_length=1, max_length=64)
    amount: CadAmount
    note: Optional[MemoText] = None
    due_date: Optional[datetime] = None


class PaymentRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    group_id: str
    requester_id: str
    payer_id: str
    amount: Decimal
    note: Optional[str] = None
    due_date: Optional[datetime] = None
    status: str
    created_at: datetime
    updated_at: datetime

    # Nested display data
    requester_name: Optional[str] = None
    requester_avatar: Optional[str] = None
    payer_name: Optional[str] = None
    payer_avatar: Optional[str] = None


# ── Expense Reminders ─────────────────────────────────────────────────────────

class ReminderCreate(BaseModel):
    interval_days: int = Field(ge=1, le=365, description="Reminder interval in days (1–365)")


class ReminderOut(BaseModel):
    id: str
    expense_id: str
    created_by: str
    interval_days: int


# ── Recurring Expenses (Pro) ──────────────────────────────────────────────────

class RecurrenceFrequency(str, Enum):
    weekly = "weekly"
    biweekly = "biweekly"
    monthly = "monthly"
    yearly = "yearly"


class RecurringExpenseCreate(BaseModel):
    description: Annotated[str, StringConstraints(min_length=1, max_length=255, strip_whitespace=True)]
    amount: CadAmount
    currency: str = Field(default="CAD", max_length=3)
    frequency: RecurrenceFrequency
    next_run_date: date
    group_id: Optional[str] = Field(default=None, max_length=64)


class RecurringExpenseUpdate(BaseModel):
    description: Optional[Annotated[str, StringConstraints(min_length=1, max_length=255, strip_whitespace=True)]] = None
    amount: Optional[CadAmount] = None
    frequency: Optional[RecurrenceFrequency] = None
    next_run_date: Optional[date] = None
    is_active: Optional[bool] = None


class RecurringExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    group_id: Optional[str] = None
    created_by_id: str
    description: str
    amount: Decimal
    currency: str
    frequency: str
    next_run_date: date
    is_active: bool
    created_at: datetime
    updated_at: datetime
