"""
Export endpoint tests.

Tests for GET /api/export/csv and GET /api/export/pdf (Pro feature).

Run with:
    cd backend
    python -m pytest tests/test_export.py -v
"""

import os
import uuid
from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_export.db"

from app.main import app
from app.database import Base, get_db
from app.models import User, SubscriptionTier, Group, GroupMember, Expense, ExpenseParticipant
from app.routes.auth import get_current_user

TEST_DB_URL = "sqlite+aiosqlite:///./test_export.db"
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
    if os.path.exists("test_export.db"):
        try:
            os.remove("test_export.db")
        except PermissionError:
            pass


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def pro_user():
    u = User(
        id=str(uuid.uuid4()),
        name="Pro Exporter",
        email="proexport@example.com",
        hashed_password="pw",
        subscription_tier=SubscriptionTier.pro,
    )
    async with TestSession() as db:
        db.add(u)
        await db.commit()
    return u


@pytest_asyncio.fixture
async def free_user():
    u = User(
        id=str(uuid.uuid4()),
        name="Free User",
        email="freeexport@example.com",
        hashed_password="pw",
        subscription_tier=SubscriptionTier.free,
    )
    async with TestSession() as db:
        db.add(u)
        await db.commit()
    return u


@pytest_asyncio.fixture
async def seeded_expenses(pro_user):
    """Create a group with one expense for the pro_user."""
    async with TestSession() as db:
        group = Group(
            id=str(uuid.uuid4()),
            name="Test Group",
            created_by=pro_user.id,
        )
        db.add(group)
        await db.flush()

        db.add(GroupMember(group_id=group.id, user_id=pro_user.id))
        await db.flush()

        expense = Expense(
            id=str(uuid.uuid4()),
            group_id=group.id,
            title="Groceries",
            amount=Decimal("60.00"),
            paid_by=pro_user.id,
            split_type="equal",
        )
        db.add(expense)
        await db.flush()

        db.add(ExpenseParticipant(
            expense_id=expense.id,
            user_id=pro_user.id,
            share_amount=Decimal("60.00"),
        ))
        await db.commit()
    return group


# ── Tests ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_csv_export_pro_user(client: AsyncClient, pro_user, seeded_expenses):
    app.dependency_overrides[get_current_user] = lambda: pro_user

    resp = await client.get("/api/export/csv")
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    assert "attachment" in resp.headers.get("content-disposition", "")

    body = resp.text
    assert "Date" in body
    assert "Description" in body
    assert "Groceries" in body
    assert "Test Group" in body


@pytest.mark.asyncio
async def test_pdf_export_pro_user(client: AsyncClient, pro_user, seeded_expenses):
    app.dependency_overrides[get_current_user] = lambda: pro_user

    resp = await client.get("/api/export/pdf")
    assert resp.status_code == 200
    assert "application/pdf" in resp.headers["content-type"]
    assert "attachment" in resp.headers.get("content-disposition", "")
    # PDF files start with the %PDF magic bytes
    assert resp.content[:4] == b"%PDF"


@pytest.mark.asyncio
async def test_csv_export_empty_returns_header_only(client: AsyncClient, pro_user):
    """CSV with no expenses still returns a valid CSV with just the header row."""
    app.dependency_overrides[get_current_user] = lambda: pro_user

    resp = await client.get("/api/export/csv")
    assert resp.status_code == 200
    lines = [l for l in resp.text.splitlines() if l.strip()]
    assert len(lines) == 1  # only header
    assert "Date" in lines[0]


@pytest.mark.asyncio
async def test_pdf_export_empty_returns_valid_pdf(client: AsyncClient, pro_user):
    """PDF with no expenses still returns a valid PDF document."""
    app.dependency_overrides[get_current_user] = lambda: pro_user

    resp = await client.get("/api/export/pdf")
    assert resp.status_code == 200
    assert resp.content[:4] == b"%PDF"


@pytest.mark.asyncio
async def test_csv_export_free_user_forbidden(client: AsyncClient, free_user):
    app.dependency_overrides[get_current_user] = lambda: free_user

    resp = await client.get("/api/export/csv")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_pdf_export_free_user_forbidden(client: AsyncClient, free_user):
    app.dependency_overrides[get_current_user] = lambda: free_user

    resp = await client.get("/api/export/pdf")
    assert resp.status_code == 403
