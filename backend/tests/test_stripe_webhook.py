"""
Stripe Webhook Handler Tests

Tests for POST /api/stripe/webhook — event processing, idempotency, and error handling.

Run with:
    cd backend
    python -m pytest tests/test_stripe_webhook.py -v
"""

import os
import uuid
from unittest.mock import MagicMock, patch

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_stripe_webhook.db"

from app.main import app
from app.database import Base, get_db
from app.models import User, Payment, PaymentStatus, StripeEvent

TEST_DB_URL = "sqlite+aiosqlite:///./test_stripe_webhook.db"
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
    if os.path.exists("test_stripe_webhook.db"):
        try:
            os.remove("test_stripe_webhook.db")
        except PermissionError:
            pass


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


def _make_user(tag: str) -> User:
    return User(
        id=str(uuid.uuid4()),
        name=f"User {tag}",
        email=f"user_{tag}_{uuid.uuid4().hex[:6]}@example.com",
        hashed_password="pw",
    )


def _make_payment(payer_id: str, payee_id: str) -> Payment:
    return Payment(
        id=str(uuid.uuid4()),
        stripe_payment_intent_id=f"pi_{uuid.uuid4().hex}",
        payer_id=payer_id,
        payee_id=payee_id,
        amount=5000,
        status=PaymentStatus.pending,
        settlement_id=None,
    )


def _mock_succeeded_event(payment_id: str) -> MagicMock:
    event = MagicMock()
    event.id = f"evt_{uuid.uuid4().hex}"
    event.type = "payment_intent.succeeded"
    event.data.object.metadata = {"payment_id": payment_id}
    event.data.object.latest_charge = None  # skips transfer validation branch
    return event


_WEBHOOK_HEADERS = {"Stripe-Signature": "sig_test", "Content-Type": "application/json"}


# ── Tests ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_a_payment_success_marks_settlement_paid(client: AsyncClient):
    payer = _make_user("payer")
    payee = _make_user("payee")
    payment = _make_payment(payer.id, payee.id)

    async with TestSession() as db:
        db.add(payer)
        db.add(payee)
        db.add(payment)
        await db.commit()

    mock_event = _mock_succeeded_event(payment.id)
    mock_event.data.object.latest_charge = "ch_test_mock123"

    mock_charge = MagicMock()
    mock_charge.transfer = "tr_test_mock456"

    mock_transfer = MagicMock()
    mock_transfer.status = "succeeded"

    with patch("stripe.Webhook.construct_event", return_value=mock_event), \
         patch("stripe.Charge.retrieve", return_value=mock_charge), \
         patch("stripe.Transfer.retrieve", return_value=mock_transfer):
        resp = await client.post("/api/stripe/webhook", content=b"{}", headers=_WEBHOOK_HEADERS)

    assert resp.status_code == 200
    assert resp.json()["status"] == "success"

    async with TestSession() as db:
        result = await db.execute(select(Payment).where(Payment.id == payment.id))
        updated = result.scalar_one()
    assert updated.status == PaymentStatus.succeeded


@pytest.mark.asyncio
async def test_b_payment_failed_updates_status(client: AsyncClient):
    payer = _make_user("payer_b")
    payee = _make_user("payee_b")
    payment = _make_payment(payer.id, payee.id)

    async with TestSession() as db:
        db.add(payer)
        db.add(payee)
        db.add(payment)
        await db.commit()

    mock_event = MagicMock()
    mock_event.id = f"evt_{uuid.uuid4().hex}"
    mock_event.type = "payment_intent.payment_failed"
    mock_event.data.object.metadata = {"payment_id": payment.id}

    with patch("stripe.Webhook.construct_event", return_value=mock_event):
        resp = await client.post("/api/stripe/webhook", content=b"{}", headers=_WEBHOOK_HEADERS)

    assert resp.status_code == 200

    async with TestSession() as db:
        result = await db.execute(select(Payment).where(Payment.id == payment.id))
        updated = result.scalar_one()
    assert updated.status == PaymentStatus.failed


@pytest.mark.asyncio
async def test_c_duplicate_event_is_idempotent(client: AsyncClient):
    payer = _make_user("payer_c")
    payee = _make_user("payee_c")
    payment = _make_payment(payer.id, payee.id)

    async with TestSession() as db:
        db.add(payer)
        db.add(payee)
        db.add(payment)
        await db.commit()

    shared_event_id = f"evt_{uuid.uuid4().hex}"
    mock_event = MagicMock()
    mock_event.id = shared_event_id
    mock_event.type = "payment_intent.succeeded"
    mock_event.data.object.metadata = {"payment_id": payment.id}
    mock_event.data.object.latest_charge = "ch_test_mock123"

    mock_charge = MagicMock()
    mock_charge.transfer = "tr_test_mock456"

    mock_transfer = MagicMock()
    mock_transfer.status = "succeeded"

    with patch("stripe.Webhook.construct_event", return_value=mock_event), \
         patch("stripe.Charge.retrieve", return_value=mock_charge), \
         patch("stripe.Transfer.retrieve", return_value=mock_transfer):
        r1 = await client.post("/api/stripe/webhook", content=b"{}", headers=_WEBHOOK_HEADERS)
        r2 = await client.post("/api/stripe/webhook", content=b"{}", headers=_WEBHOOK_HEADERS)

    assert r1.status_code == 200
    assert r1.json()["status"] == "success"
    assert r2.status_code == 200
    assert r2.json()["status"] == "ignored"
    assert r2.json()["reason"] == "duplicate"

    # DB should have exactly one StripeEvent row for this event ID
    async with TestSession() as db:
        result = await db.execute(select(StripeEvent).where(StripeEvent.id == shared_event_id))
        events = result.scalars().all()
    assert len(events) == 1


@pytest.mark.asyncio
async def test_d_invalid_signature_returns_400(client: AsyncClient):
    import stripe as stripe_sdk
    with patch(
        "stripe.Webhook.construct_event",
        side_effect=stripe_sdk.error.SignatureVerificationError("bad sig", "sig_header"),
    ):
        resp = await client.post(
            "/api/stripe/webhook",
            content=b"{}",
            headers={"Stripe-Signature": "bad_sig_value"},
        )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_e_unknown_event_type_returns_200(client: AsyncClient):
    mock_event = MagicMock()
    mock_event.id = f"evt_{uuid.uuid4().hex}"
    mock_event.type = "some.unknown.event.type"

    with patch("stripe.Webhook.construct_event", return_value=mock_event):
        resp = await client.post("/api/stripe/webhook", content=b"{}", headers=_WEBHOOK_HEADERS)

    assert resp.status_code == 200
    assert resp.json()["status"] == "success"

    async with TestSession() as db:
        result = await db.execute(
            select(StripeEvent).where(StripeEvent.id == mock_event.id)
        )
        recorded = result.scalar_one_or_none()
    assert recorded is not None
    assert recorded.type == "some.unknown.event.type"
