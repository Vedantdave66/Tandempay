"""
Recurring Expense Scheduler Tests

Tests for process_due_recurring_expenses() — the background job that auto-fires
RecurringExpense templates into real Expense rows.

These tests patch app.scheduler.async_session with the test session factory so
the scheduler function writes to the in-memory SQLite DB instead of production.

Run with:
    cd backend
    python -m pytest tests/test_recurring_scheduler.py -v
"""

import datetime
import os
import uuid
from decimal import Decimal
from unittest.mock import patch

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_scheduler.db"

from app.main import app  # noqa: F401 — registers all models with Base
from app.database import Base
from app.models import (
    User, Group, GroupMember,
    RecurringExpense, RecurrenceFrequency,
    Expense, SubscriptionTier,
)
from app.scheduler import process_due_recurring_expenses

TEST_DB_URL = "sqlite+aiosqlite:///./test_scheduler.db"
test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSession = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await test_engine.dispose()
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    if os.path.exists("test_scheduler.db"):
        try:
            os.remove("test_scheduler.db")
        except PermissionError:
            pass


async def _make_pro_setup() -> tuple:
    """Insert a Pro user, a group, and a group member. Returns (user, group)."""
    user = User(
        id=str(uuid.uuid4()),
        name="Pro User",
        email=f"pro_{uuid.uuid4().hex[:8]}@example.com",
        hashed_password="pw",
        subscription_tier=SubscriptionTier.pro,
    )
    group = Group(id=str(uuid.uuid4()), name="Test Group", created_by=user.id)
    member = GroupMember(group_id=group.id, user_id=user.id)

    async with TestSession() as db:
        db.add(user)
        db.add(group)
        db.add(member)
        await db.commit()

    return user, group


# ── Tests ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_a_due_expense_creates_expense():
    user, group = await _make_pro_setup()
    today = datetime.date.today()

    rec = RecurringExpense(
        id=str(uuid.uuid4()),
        group_id=group.id,
        created_by_id=user.id,
        description="Monthly Rent",
        amount=Decimal("1200.00"),
        frequency=RecurrenceFrequency.monthly,
        next_run_date=today - datetime.timedelta(days=1),
        is_active=True,
    )
    async with TestSession() as db:
        db.add(rec)
        await db.commit()

    with patch("app.scheduler.async_session", TestSession):
        await process_due_recurring_expenses()

    async with TestSession() as db:
        result = await db.execute(select(Expense).where(Expense.group_id == group.id))
        expenses = result.scalars().all()

    assert len(expenses) == 1
    assert expenses[0].title == "Monthly Rent"
    assert expenses[0].amount == Decimal("1200.00")
    assert expenses[0].paid_by == user.id


@pytest.mark.asyncio
async def test_b_not_due_expense_is_skipped():
    user, group = await _make_pro_setup()
    today = datetime.date.today()

    rec = RecurringExpense(
        id=str(uuid.uuid4()),
        group_id=group.id,
        created_by_id=user.id,
        description="Future Rent",
        amount=Decimal("800.00"),
        frequency=RecurrenceFrequency.monthly,
        next_run_date=today + datetime.timedelta(days=7),
        is_active=True,
    )
    async with TestSession() as db:
        db.add(rec)
        await db.commit()

    with patch("app.scheduler.async_session", TestSession):
        await process_due_recurring_expenses()

    async with TestSession() as db:
        result = await db.execute(select(Expense).where(Expense.group_id == group.id))
        expenses = result.scalars().all()

    assert len(expenses) == 0


@pytest.mark.asyncio
async def test_c_free_user_expense_is_skipped():
    free_user = User(
        id=str(uuid.uuid4()),
        name="Free User",
        email=f"free_{uuid.uuid4().hex[:8]}@example.com",
        hashed_password="pw",
        subscription_tier=SubscriptionTier.free,
    )
    group = Group(id=str(uuid.uuid4()), name="Free Group", created_by=free_user.id)
    member = GroupMember(group_id=group.id, user_id=free_user.id)

    async with TestSession() as db:
        db.add(free_user)
        db.add(group)
        db.add(member)
        await db.commit()

    today = datetime.date.today()
    rec = RecurringExpense(
        id=str(uuid.uuid4()),
        group_id=group.id,
        created_by_id=free_user.id,
        description="Free Recurring",
        amount=Decimal("50.00"),
        frequency=RecurrenceFrequency.weekly,
        next_run_date=today - datetime.timedelta(days=1),
        is_active=True,
    )
    async with TestSession() as db:
        db.add(rec)
        await db.commit()

    with patch("app.scheduler.async_session", TestSession):
        await process_due_recurring_expenses()

    async with TestSession() as db:
        result = await db.execute(select(Expense).where(Expense.group_id == group.id))
        expenses = result.scalars().all()

    assert len(expenses) == 0


@pytest.mark.asyncio
async def test_d_next_run_date_advances_after_processing():
    user, group = await _make_pro_setup()
    today = datetime.date.today()
    original_next_run = today - datetime.timedelta(days=1)

    rec = RecurringExpense(
        id=str(uuid.uuid4()),
        group_id=group.id,
        created_by_id=user.id,
        description="Weekly Netflix",
        amount=Decimal("15.00"),
        frequency=RecurrenceFrequency.weekly,
        next_run_date=original_next_run,
        is_active=True,
    )
    async with TestSession() as db:
        db.add(rec)
        await db.commit()
    rec_id = rec.id

    with patch("app.scheduler.async_session", TestSession):
        await process_due_recurring_expenses()

    async with TestSession() as db:
        result = await db.execute(
            select(RecurringExpense).where(RecurringExpense.id == rec_id)
        )
        updated = result.scalar_one()

    expected_date = original_next_run + datetime.timedelta(weeks=1)
    assert updated.next_run_date == expected_date


@pytest.mark.asyncio
async def test_e_disabled_expense_is_skipped():
    user, group = await _make_pro_setup()
    today = datetime.date.today()

    rec = RecurringExpense(
        id=str(uuid.uuid4()),
        group_id=group.id,
        created_by_id=user.id,
        description="Disabled Expense",
        amount=Decimal("200.00"),
        frequency=RecurrenceFrequency.monthly,
        next_run_date=today - datetime.timedelta(days=1),
        is_active=False,
    )
    async with TestSession() as db:
        db.add(rec)
        await db.commit()

    with patch("app.scheduler.async_session", TestSession):
        await process_due_recurring_expenses()

    async with TestSession() as db:
        result = await db.execute(select(Expense).where(Expense.group_id == group.id))
        expenses = result.scalars().all()

    assert len(expenses) == 0
