"""
Auth endpoint tests.

Run with:
    cd backend
    python -m pytest tests/test_auth.py -v
"""

import os
import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_auth.db"

from app.main import app
from app.database import Base, get_db
from app.limiter import limiter

TEST_DB_URL = "sqlite+aiosqlite:///./test_auth.db"
test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSession = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

_TEST_EMAIL = f"authtest_{uuid.uuid4().hex[:8]}@example.com"
_TEST_PASSWORD = "TestPass1!"


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
    limiter._storage.reset()
    app.dependency_overrides[get_db] = override_get_db
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await test_engine.dispose()
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    app.dependency_overrides.pop(get_db, None)
    if os.path.exists("test_auth.db"):
        try:
            os.remove("test_auth.db")
        except PermissionError:
            pass


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient) -> dict:
    await client.post(
        "/api/auth/register",
        json={"name": "Test User", "email": _TEST_EMAIL, "password": _TEST_PASSWORD},
    )
    resp = await client.post(
        "/api/auth/login",
        json={"email": _TEST_EMAIL, "password": _TEST_PASSWORD},
    )
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ── Tests ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_slur_nickname_rejected(client: AsyncClient, auth_headers: dict):
    resp = await client.patch(
        "/api/auth/me",
        json={"character_nickname": "shit"},
        headers=auth_headers,
    )
    assert resp.status_code == 422
    errors = resp.json()["detail"]
    assert any(
        e.get("field") == "character_nickname" and "prohibited" in e.get("msg", "")
        for e in errors
    )
