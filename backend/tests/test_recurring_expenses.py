"""
Recurring Expenses Tests

Tests for the /api/recurring endpoints (Pro feature).

Run with:
    cd backend
    python -m pytest tests/test_recurring_expenses.py -v
"""

import asyncio
import datetime
import os
import uuid

import pytest
import pytest_asyncio
from decimal import Decimal
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_recurring.db"

from app.main import app
from app.database import Base, get_db
from app.models import User, SubscriptionTier
from app.routes.auth import get_current_user

TEST_DB_URL = "sqlite+aiosqlite:///./test_recurring.db"
test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSession = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSession() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


def _make_pro_user(suffix: str = "") -> User:
    return User(
        id=str(uuid.uuid4()),
        name=f"Pro User{suffix}",
        email=f"pro{suffix}@example.com",
        hashed_password="pw",
        subscription_tier=SubscriptionTier.pro,
    )


def _make_free_user() -> User:
    return User(
        id=str(uuid.uuid4()),
        name="Free User",
        email="free@example.com",
        hashed_password="pw",
        subscription_tier=SubscriptionTier.free,
    )


@pytest_asyncio.fixture(autouse=True)
async def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await test_engine.dispose()
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    app.dependency_overrides.pop(get_db, None)
    app.dependency_overrides.pop(get_current_user, None)
    if os.path.exists("test_recurring.db"):
        try:
            os.remove("test_recurring.db")
        except PermissionError:
            pass


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def pro_user():
    u = _make_pro_user()
    async with TestSession() as db:
        db.add(u)
        await db.commit()
    return u


@pytest_asyncio.fixture
async def free_user():
    u = _make_free_user()
    async with TestSession() as db:
        db.add(u)
        await db.commit()
    return u


# ── Tests ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_recurring_expense_pro(client: AsyncClient, pro_user: User):
    app.dependency_overrides[get_current_user] = lambda: pro_user

    resp = await client.post("/api/recurring", json={
        "description": "Monthly Rent",
        "amount": "1200.00",
        "frequency": "monthly",
        "next_run_date": "2026-06-01",
    })
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["description"] == "Monthly Rent"
    assert data["frequency"] == "monthly"
    assert data["is_active"] is True
    assert data["created_by_id"] == pro_user.id


@pytest.mark.asyncio
async def test_create_recurring_expense_free_user_forbidden(client: AsyncClient, free_user: User):
    app.dependency_overrides[get_current_user] = lambda: free_user

    resp = await client.post("/api/recurring", json={
        "description": "Weekly Groceries",
        "amount": "150.00",
        "frequency": "weekly",
        "next_run_date": "2026-05-25",
    })
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_recurring_expenses(client: AsyncClient, pro_user: User):
    app.dependency_overrides[get_current_user] = lambda: pro_user

    # Create two
    for title, freq in [("Rent", "monthly"), ("Netflix", "monthly")]:
        await client.post("/api/recurring", json={
            "description": title,
            "amount": "100.00",
            "frequency": freq,
            "next_run_date": "2026-06-01",
        })

    resp = await client.get("/api/recurring")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 2


@pytest.mark.asyncio
async def test_update_recurring_expense(client: AsyncClient, pro_user: User):
    app.dependency_overrides[get_current_user] = lambda: pro_user

    create_resp = await client.post("/api/recurring", json={
        "description": "Old Gym",
        "amount": "50.00",
        "frequency": "monthly",
        "next_run_date": "2026-06-01",
    })
    rec_id = create_resp.json()["id"]

    patch_resp = await client.patch(f"/api/recurring/{rec_id}", json={
        "description": "New Gym",
        "amount": "60.00",
    })
    assert patch_resp.status_code == 200
    updated = patch_resp.json()
    assert updated["description"] == "New Gym"
    assert updated["amount"] == "60.00"


@pytest.mark.asyncio
async def test_delete_recurring_expense_deactivates(client: AsyncClient, pro_user: User):
    app.dependency_overrides[get_current_user] = lambda: pro_user

    create_resp = await client.post("/api/recurring", json={
        "description": "Spotify",
        "amount": "10.00",
        "frequency": "monthly",
        "next_run_date": "2026-06-01",
    })
    rec_id = create_resp.json()["id"]

    del_resp = await client.delete(f"/api/recurring/{rec_id}")
    assert del_resp.status_code == 204

    # List should still return it (is_active=False), endpoint returns all owned records
    list_resp = await client.get("/api/recurring")
    data = list_resp.json()
    match = next((r for r in data["items"] if r["id"] == rec_id), None)
    assert match is not None
    assert match["is_active"] is False


@pytest.mark.asyncio
async def test_update_other_users_recurring_expense_returns_404(client: AsyncClient, pro_user: User):
    """Cannot update a recurring expense owned by someone else."""
    other = _make_pro_user("_other")
    async with TestSession() as db:
        db.add(other)
        await db.commit()

    # Create as other user
    app.dependency_overrides[get_current_user] = lambda: other
    create_resp = await client.post("/api/recurring", json={
        "description": "Other's rent",
        "amount": "900.00",
        "frequency": "monthly",
        "next_run_date": "2026-06-01",
    })
    rec_id = create_resp.json()["id"]

    # Try to update as pro_user (not the owner)
    app.dependency_overrides[get_current_user] = lambda: pro_user
    patch_resp = await client.patch(f"/api/recurring/{rec_id}", json={"description": "Hijacked"})
    assert patch_resp.status_code == 404


@pytest.mark.asyncio
async def test_scheduler_advance_date_logic():
    """Unit-test the date advancement helper directly."""
    from app.scheduler import _advance_date
    from app.models import RecurrenceFrequency

    base = datetime.date(2026, 1, 31)

    assert _advance_date(base, RecurrenceFrequency.weekly) == datetime.date(2026, 2, 7)
    assert _advance_date(base, RecurrenceFrequency.biweekly) == datetime.date(2026, 2, 14)
    # Jan 31 + 1 month → Feb 28 (2026 is not a leap year)
    assert _advance_date(base, RecurrenceFrequency.monthly) == datetime.date(2026, 2, 28)
    assert _advance_date(base, RecurrenceFrequency.yearly) == datetime.date(2027, 1, 31)
