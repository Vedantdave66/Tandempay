"""
Password Reset Flow Tests

Tests the full token lifecycle for /api/auth/forgot-password and /api/auth/reset-password.

Run with:
    cd backend
    python -m pytest tests/test_password_reset_flow.py -v
"""

import hashlib
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_pw_reset.db"

from app.main import app
from app.database import Base, get_db
from app.models import User, PasswordResetToken
from app.limiter import limiter

TEST_DB_URL = "sqlite+aiosqlite:///./test_pw_reset.db"
test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSession = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

_TEST_EMAIL = "resetuser@example.com"
_EMAIL_SUCCESS = {"success": True, "response": {"id": "msg_test"}, "error": None}


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
    if os.path.exists("test_pw_reset.db"):
        try:
            os.remove("test_pw_reset.db")
        except PermissionError:
            pass


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def test_user() -> User:
    u = User(
        id=str(uuid.uuid4()),
        name="Reset User",
        email=_TEST_EMAIL,
        hashed_password="pw",
    )
    async with TestSession() as db:
        db.add(u)
        await db.commit()
    return u


# ── Tests ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_a_request_token_creates_db_row(client: AsyncClient, test_user: User):
    with patch("app.routes.auth.send_reset_email_sync", return_value=_EMAIL_SUCCESS):
        resp = await client.post("/api/auth/forgot-password", json={"email": _TEST_EMAIL})

    assert resp.status_code == 200

    async with TestSession() as db:
        result = await db.execute(
            select(PasswordResetToken).where(PasswordResetToken.user_id == test_user.id)
        )
        token = result.scalar_one_or_none()

    assert token is not None
    assert token.used_at is None
    assert token.token_hash != ""


@pytest.mark.asyncio
async def test_b_reset_with_valid_token_changes_password(client: AsyncClient, test_user: User):
    with patch("app.routes.auth.send_reset_email_sync", return_value=_EMAIL_SUCCESS) as mock_send:
        await client.post("/api/auth/forgot-password", json={"email": _TEST_EMAIL})
        reset_link: str = mock_send.call_args[0][1]
        raw_token = reset_link.split("token=")[1]

    resp = await client.post(
        "/api/auth/reset-password",
        json={"token": raw_token, "new_password": "NewPassword123!"},
    )
    assert resp.status_code == 200

    import bcrypt
    async with TestSession() as db:
        result = await db.execute(select(User).where(User.id == test_user.id))
        updated = result.scalar_one()
    assert bcrypt.checkpw(b"NewPassword123!", updated.hashed_password.encode())


@pytest.mark.asyncio
async def test_c_token_cannot_be_reused(client: AsyncClient, test_user: User):
    with patch("app.routes.auth.send_reset_email_sync", return_value=_EMAIL_SUCCESS) as mock_send:
        await client.post("/api/auth/forgot-password", json={"email": _TEST_EMAIL})
        raw_token = mock_send.call_args[0][1].split("token=")[1]

    r1 = await client.post(
        "/api/auth/reset-password",
        json={"token": raw_token, "new_password": "First123!"},
    )
    assert r1.status_code == 200

    r2 = await client.post(
        "/api/auth/reset-password",
        json={"token": raw_token, "new_password": "Second123!"},
    )
    assert r2.status_code == 400


@pytest.mark.asyncio
async def test_d_expired_token_rejected(client: AsyncClient, test_user: User):
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expired = PasswordResetToken(
        user_id=test_user.id,
        token_hash=token_hash,
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
    )
    async with TestSession() as db:
        db.add(expired)
        await db.commit()

    resp = await client.post(
        "/api/auth/reset-password",
        json={"token": raw_token, "new_password": "NewPass123!"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_e_new_request_invalidates_old_token(client: AsyncClient, test_user: User):
    with patch("app.routes.auth.send_reset_email_sync", return_value=_EMAIL_SUCCESS) as mock_send:
        await client.post("/api/auth/forgot-password", json={"email": _TEST_EMAIL})
        old_token = mock_send.call_args[0][1].split("token=")[1]

        await client.post("/api/auth/forgot-password", json={"email": _TEST_EMAIL})
        new_token = mock_send.call_args[0][1].split("token=")[1]

    old_resp = await client.post(
        "/api/auth/reset-password",
        json={"token": old_token, "new_password": "OldPass123!"},
    )
    assert old_resp.status_code == 400

    new_resp = await client.post(
        "/api/auth/reset-password",
        json={"token": new_token, "new_password": "NewPass123!"},
    )
    assert new_resp.status_code == 200


@pytest.mark.asyncio
async def test_f_invalid_token_returns_400(client: AsyncClient, test_user: User):
    resp = await client.post(
        "/api/auth/reset-password",
        json={"token": "this_is_not_a_real_token_xyz_abc", "new_password": "NewPass123!"},
    )
    assert resp.status_code == 400
