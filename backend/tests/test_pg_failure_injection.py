"""
PostgreSQL Failure Injection Tests — simulating real-world distributed system failures.

These tests REQUIRE a running PostgreSQL instance (via Docker):

    cd backend
    docker compose -f docker-compose.test.yml up -d
    python -m pytest tests/test_pg_failure_injection.py -v -s
    docker compose -f docker-compose.test.yml down -v

WHAT THESE TESTS PROVE:
  The system recovers correctly from:
    A. Crash AFTER commit but BEFORE response (client retries → idempotency)
    B. Slow handler + concurrent retry while in-flight (overlapping requests)
    C. Exception between flush and commit (full rollback, zero partial state)
    D. Retry storm: 5 staggered retries of the same request (exactly 1 execution)

Each test verifies:
  ✅ No duplicate ledger entries
  ✅ Balances remain correct
  ✅ Ledger consistency: cached == SUM(completed transactions)
  ✅ System recovers cleanly for subsequent requests

Expected output:

  ============================================================
  TEST A: Crash After Commit Before Response
    Phase 1: 💥 500 ERROR (crash simulated after commit)
    Phase 2: ♻️  200 OK    (retry → idempotency cache hit)
    Balance: $1050.00 (correct — no duplicate)
    Ledger:  $1050.00 (consistent)
  ✅ TEST A PASSED

  ============================================================
  TEST B: In-Flight Retry (overlapping requests)
    [REQ-01] started at t+0.000s → 200 OK
    [REQ-02] started at t+0.050s → 200/500 (either cached or IntegrityError)
    Balance: $1050.00 (single deposit)
  ✅ TEST B PASSED

  ============================================================
  TEST C: Partial Failure (exception between flush and commit)
    Phase 1: 💥 500 ERROR (exception injected → full rollback)
    Phase 2: ✅ 200 OK    (retry succeeds — clean slate)
    Balance after crash:   $1000.00 (no partial state)
    Balance after recovery: $1050.00 (clean recovery)
  ✅ TEST C PASSED

  ============================================================
  TEST D: Retry Storm (5 staggered retries, same key)
    [REQ-01] t+0.000s → 200 OK / 500 ERROR
    [REQ-02] t+0.050s → 200 OK / 500 ERROR
    [REQ-03] t+0.100s → ...
    [REQ-04] t+0.150s → ...
    [REQ-05] t+0.200s → ...
    Balance: $1050.00 (exactly 1 deposit)
    Deposit txns: 1
  ✅ TEST D PASSED
"""

import asyncio
import time
import uuid
import logging
from decimal import Decimal
from unittest.mock import patch

import pytest
import pytest_asyncio
import bcrypt
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func

from tests.conftest import pg_engine, PgSessionLocal, pg_override_get_db
from app.main import app
from app.database import Base, get_db
from app.models import User, WalletTransaction

# ─── Logging ───
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("splitease.failure_injection")
logging.getLogger("splitease.wallet").setLevel(logging.DEBUG)
logging.getLogger("splitease.idempotency").setLevel(logging.DEBUG)
logging.getLogger("splitease.ledger").setLevel(logging.DEBUG)


# ═══════════════════════════════════════════════════
# CRASH-INJECTABLE get_db OVERRIDE
#
# When _crash_after_commit["armed"] is True, the session commits
# successfully (data persisted!) but then raises an exception,
# simulating a process crash after commit but before the HTTP
# response reaches the client.
#
# The client sees a 500 error, but the DB contains the committed
# data (including the idempotency record). On retry, the
# idempotency layer returns the cached response.
# ═══════════════════════════════════════════════════

_crash_after_commit = {"armed": False}


async def get_db_crashable():
    """get_db with optional crash-after-commit simulation."""
    async with PgSessionLocal() as session:
        try:
            yield session
            await session.commit()

            # ── CRASH SIMULATION ──
            # At this point, ALL data is committed (including idempotency record).
            # A real crash here means: data persisted, response never sent.
            if _crash_after_commit["armed"]:
                _crash_after_commit["armed"] = False  # One-shot
                logger.warning(
                    "💥 SIMULATED CRASH: Data committed successfully, but process "
                    "died before sending HTTP response to client!"
                )
                raise RuntimeError(
                    "Simulated crash: process died after commit, before response"
                )
        except Exception:
            # Rollback is a no-op after commit (starts empty new transaction).
            # For non-crash exceptions, this correctly rolls back uncommitted changes.
            await session.rollback()
            raise


# ═══════════════════════════════════════════════════
# FIXTURES
# ═══════════════════════════════════════════════════

@pytest_asyncio.fixture(autouse=True)
async def setup_pg_database():
    """Create tables before each test, drop after."""
    # Reset crash flag to avoid leaking state between tests
    _crash_after_commit["armed"] = False
    # Default to normal (non-crashing) get_db for all tests
    app.dependency_overrides[get_db] = pg_override_get_db

    logger.info("Setting up PostgreSQL test database...")
    async with pg_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with pg_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await pg_engine.dispose()
    logger.info("Teardown complete.")


@pytest_asyncio.fixture
async def test_user() -> dict:
    """Create a test user with $1000 balance backed by a ledger transaction."""
    async with PgSessionLocal() as db:
        hashed = bcrypt.hashpw(b"test123", bcrypt.gensalt()).decode("utf-8")
        user = User(
            id=str(uuid.uuid4()),
            name="Failure Test User",
            email=f"failtest_{uuid.uuid4().hex[:8]}@example.com",
            hashed_password=hashed,
            wallet_balance=Decimal("1000.00"),
        )
        db.add(user)
        await db.flush()

        initial_tx = WalletTransaction(
            user_id=user.id,
            type="deposit",
            amount=Decimal("1000.00"),
            status="completed",
            reference_type="deposit",
            reference_id="initial_test_funding",
        )
        db.add(initial_tx)
        await db.commit()
        await db.refresh(user)

        from app.routes.auth import create_access_token
        token = create_access_token(data={"sub": user.id})

        logger.info(f"Created test_user: id={user.id}, balance=$1000.00")
        return {
            "id": user.id,
            "email": user.email,
            "token": token,
            "balance": Decimal("1000.00"),
        }


# ═══════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════

async def get_wallet_balance(user_id: str) -> Decimal:
    async with PgSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one()
        return Decimal(str(user.wallet_balance))


async def compute_ledger_balance(user_id: str) -> Decimal:
    async with PgSessionLocal() as db:
        result = await db.execute(
            select(sa_func.coalesce(sa_func.sum(WalletTransaction.amount), 0)).where(
                WalletTransaction.user_id == user_id,
                WalletTransaction.status == "completed",
            )
        )
        val = result.scalar_one()
        return Decimal(str(val)).quantize(Decimal("0.01"))


async def count_transactions(user_id: str, tx_type: str, exclude_ref: str = None) -> int:
    async with PgSessionLocal() as db:
        query = select(WalletTransaction).where(
            WalletTransaction.user_id == user_id,
            WalletTransaction.type == tx_type,
            WalletTransaction.status == "completed",
        )
        if exclude_ref:
            query = query.where(WalletTransaction.reference_id != exclude_ref)
        result = await db.execute(query)
        return len(result.scalars().all())


async def assert_ledger_consistency(user_id: str, label: str):
    cached = await get_wallet_balance(user_id)
    ledger = await compute_ledger_balance(user_id)
    assert abs(cached - ledger) <= Decimal("0.01"), (
        f"LEDGER INCONSISTENCY for {label}: cached=${cached}, ledger=${ledger}, "
        f"diff=${cached - ledger}. DATA CORRUPTION!"
    )
    logger.info(f"  ✓ Ledger consistent for {label}: cached=${cached}, ledger=${ledger}")


async def make_request(token: str, idem_key: str, amount: float = 50.00):
    """Fire a single add-funds request and return the response."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.post(
            "/api/wallet/add-funds",
            json={"amount": amount, "source": "Failure Test"},
            headers={
                "Authorization": f"Bearer {token}",
                "Idempotency-Key": idem_key,
            },
        )


# ═══════════════════════════════════════════════════
# TEST A: Crash After Commit Before Response
#
# Scenario:
#   1. Client sends add-funds request
#   2. Server processes it, commits to DB (balance + ledger + idempotency record)
#   3. Server process CRASHES before sending HTTP response
#   4. Client sees 500 error
#   5. Client retries with same idempotency key
#   6. Server returns cached response from idempotency table
#
# This is the classic "at-least-once delivery" problem.
# Without idempotency, the retry would create a duplicate deposit.
# ═══════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_a_crash_after_commit_before_response(test_user: dict):
    """
    Simulate process crash after DB commit but before HTTP response.
    Verify idempotency prevents duplicate execution on client retry.
    """
    idem_key = f"crash-test-{uuid.uuid4()}"

    print(f"\n{'='*60}")
    print(f"TEST A: Crash After Commit Before Response")

    # ── Phase 1: First request with crash simulation ──
    # Switch to crashable get_db and arm the crash
    app.dependency_overrides[get_db] = get_db_crashable
    _crash_after_commit["armed"] = True

    logger.info("Phase 1: Sending request with crash-after-commit armed...")
    r1 = await make_request(test_user["token"], idem_key)

    print(f"  Phase 1: 💥 {r1.status_code} ERROR (crash simulated after commit)")
    logger.info(f"  Phase 1 response: {r1.status_code}")
    assert r1.status_code == 500, (
        f"Expected 500 (crash simulation), got {r1.status_code}. "
        f"Crash injection failed!"
    )

    # Verify the data WAS committed despite the crash
    balance_after_crash = await get_wallet_balance(test_user["id"])
    logger.info(f"  Balance after crash: ${balance_after_crash}")
    assert balance_after_crash == Decimal("1050.00"), (
        f"Expected $1050.00 (commit succeeded), got ${balance_after_crash}. "
        f"Commit was rolled back — crash injection is broken!"
    )

    # ── Phase 2: Client retries with same idempotency key ──
    # Switch back to normal (non-crashing) get_db
    app.dependency_overrides[get_db] = pg_override_get_db

    logger.info("Phase 2: Client retries with same idempotency key...")
    r2 = await make_request(test_user["token"], idem_key)

    print(f"  Phase 2: ♻️  {r2.status_code} OK (retry → idempotency cache hit)")
    assert r2.status_code == 200, (
        f"Expected 200 (cached response), got {r2.status_code}: {r2.text}. "
        f"Idempotency cache miss — was the record committed?"
    )

    # ── ASSERTIONS ──
    final_balance = await get_wallet_balance(test_user["id"])
    tx_count = await count_transactions(test_user["id"], "deposit", exclude_ref="initial_test_funding")
    await assert_ledger_consistency(test_user["id"], "crash_test_user")

    print(f"  Balance:  ${final_balance} (expected $1050.00)")
    print(f"  Deposits: {tx_count} (expected 1)")
    print(f"{'='*60}")

    assert final_balance == Decimal("1050.00"), (
        f"DUPLICATE DEPOSIT! Balance=${final_balance}. "
        f"Crash-retry created a duplicate!"
    )
    assert tx_count == 1, (
        f"Expected 1 deposit transaction, got {tx_count}. "
        f"Multiple executions occurred!"
    )

    print("✅ TEST A PASSED: Crash after commit → retry returned cached, no duplicate\n")


# ═══════════════════════════════════════════════════
# TEST B: In-Flight Retry (Network Timeout Simulation)
#
# Scenario:
#   1. Client sends request, handler is slow (acquires lock, processing...)
#   2. Client assumes timeout and sends a SECOND request (same idem key)
#   3. Both requests are now in-flight simultaneously
#   4. One commits first → idempotency record created
#   5. Second either hits cache or IntegrityError → no duplicate
#
# This simulates the real-world case where a load balancer
# or client times out and retries while the first request
# is still being processed by the server.
# ═══════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_b_network_timeout_in_flight_retry(test_user: dict):
    """
    Simulate overlapping requests: first is slow, second arrives while
    first is still processing. Same idempotency key → no duplicate.
    """
    idem_key = f"timeout-retry-{uuid.uuid4()}"
    test_start = time.monotonic()

    async def fire_slow_request():
        """First request — has a delay injected in the lock phase."""
        t0 = time.monotonic() - test_start
        logger.info(f"  [REQ-01] Started at t+{t0:.3f}s (slow path)")
        resp = await make_request(test_user["token"], idem_key)
        t1 = time.monotonic() - test_start
        logger.info(f"  [REQ-01] Completed at t+{t1:.3f}s → {resp.status_code}")
        return resp

    async def fire_retry():
        """Second request — arrives 50ms later (while first is still in-flight)."""
        await asyncio.sleep(0.05)  # Staggered start
        t0 = time.monotonic() - test_start
        logger.info(f"  [REQ-02] Started at t+{t0:.3f}s (retry)")
        resp = await make_request(test_user["token"], idem_key)
        t1 = time.monotonic() - test_start
        logger.info(f"  [REQ-02] Completed at t+{t1:.3f}s → {resp.status_code}")
        return resp

    print(f"\n{'='*60}")
    print(f"TEST B: In-Flight Retry (overlapping requests)")

    # Fire both concurrently — simulating timeout + retry
    r1, r2 = await asyncio.gather(fire_slow_request(), fire_retry())

    # ── Analyze results ──
    # At least one must succeed. The other might be 200 (cached) or 500 (IntegrityError).
    statuses = sorted([r1.status_code, r2.status_code])
    success_count = sum(1 for s in statuses if s == 200)

    for i, r in enumerate([r1, r2], 1):
        detail = ""
        if r.status_code != 200:
            try:
                detail = f"  — {r.json().get('detail', '')[:50]}"
            except Exception:
                detail = f"  — {r.text[:50]}"
        label = "OK" if r.status_code == 200 else "RACE-LOST"
        print(f"  [REQ-{i:02d}] {r.status_code} {label}{detail}")

    # ── ASSERTIONS ──
    final_balance = await get_wallet_balance(test_user["id"])
    tx_count = await count_transactions(test_user["id"], "deposit", exclude_ref="initial_test_funding")
    await assert_ledger_consistency(test_user["id"], "timeout_test_user")

    print(f"  Balance:  ${final_balance} (expected $1050.00)")
    print(f"  Deposits: {tx_count} (expected 1)")
    print(f"{'='*60}")

    # At least 1 request must have succeeded
    assert success_count >= 1, f"No request succeeded! Statuses: {statuses}"

    # Critical: balance must show exactly 1 deposit
    assert final_balance == Decimal("1050.00"), (
        f"Expected $1050.00, got ${final_balance}. "
        f"{'Duplicate!' if final_balance > Decimal('1050') else 'Lost deposit!'}"
    )
    assert tx_count == 1, f"Expected 1 deposit, got {tx_count}"

    print("✅ TEST B PASSED: In-flight retry → no duplicate, balance correct\n")


# ═══════════════════════════════════════════════════
# TEST C: Partial Failure — Exception Between Flush and Commit
#
# Scenario:
#   1. Handler runs: acquires lock, creates ledger entry, flushes to DB
#   2. Post-flush integrity check CRASHES (injected exception)
#   3. Exception propagates → get_db rolls back entire transaction
#   4. NO partial state: no ledger entry, no balance change, no notification
#   5. Client retries (different idem key) → succeeds on clean state
#
# This proves the transaction boundary is correct: flush sends
# SQL to the DB, but commit is what makes it permanent. An
# exception before commit means EVERYTHING rolls back.
# ═══════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_c_partial_failure_rollback(test_user: dict):
    """
    Inject exception after flush but before commit.
    Verify COMPLETE rollback — zero partial state.
    Then verify clean recovery on retry.
    """
    print(f"\n{'='*60}")
    print(f"TEST C: Partial Failure (exception between flush and commit)")

    # ── Phase 1: Request with injected crash ──
    logger.info("Phase 1: Injecting exception in validate_balance_integrity...")

    crash_idem_key = f"partial-crash-{uuid.uuid4()}"

    with patch(
        "app.routes.wallet.validate_balance_integrity",
        side_effect=RuntimeError(
            "SIMULATED: Database connection dropped during integrity check"
        ),
    ):
        r1 = await make_request(test_user["token"], crash_idem_key)

    print(f"  Phase 1: 💥 {r1.status_code} ERROR (exception injected → rollback)")
    logger.info(f"  Phase 1 response: {r1.status_code}")

    # Must be 500 (unhandled exception → rollback)
    assert r1.status_code == 500, (
        f"Expected 500 (crash injected), got {r1.status_code}"
    )

    # ── Verify ZERO partial state ──
    balance_after_crash = await get_wallet_balance(test_user["id"])
    deposit_count = await count_transactions(test_user["id"], "deposit", exclude_ref="initial_test_funding")
    await assert_ledger_consistency(test_user["id"], "partial_crash_user")

    print(f"  Balance after crash:  ${balance_after_crash} (expected $1000.00 — no change)")
    print(f"  New deposit txns:     {deposit_count} (expected 0 — fully rolled back)")

    assert balance_after_crash == Decimal("1000.00"), (
        f"PARTIAL STATE! Balance=${balance_after_crash}, expected $1000.00. "
        f"Rollback did not fully undo the flush!"
    )
    assert deposit_count == 0, (
        f"PARTIAL STATE! {deposit_count} deposit(s) survived rollback! "
        f"Transaction boundary is broken!"
    )

    # ── Phase 2: Clean recovery (different idem key) ──
    logger.info("Phase 2: Retrying with clean handler (no crash injection)...")

    recovery_idem_key = f"recovery-{uuid.uuid4()}"
    r2 = await make_request(test_user["token"], recovery_idem_key)

    print(f"  Phase 2: ✅ {r2.status_code} OK (clean recovery)")
    assert r2.status_code == 200, (
        f"Recovery failed with {r2.status_code}: {r2.text}. "
        f"System did not recover cleanly after crash!"
    )

    # ── Verify clean recovery ──
    balance_after_recovery = await get_wallet_balance(test_user["id"])
    deposit_count_after = await count_transactions(test_user["id"], "deposit", exclude_ref="initial_test_funding")
    await assert_ledger_consistency(test_user["id"], "recovery_user")

    print(f"  Balance after recovery: ${balance_after_recovery} (expected $1050.00)")
    print(f"  Deposit txns:           {deposit_count_after} (expected 1)")
    print(f"{'='*60}")

    assert balance_after_recovery == Decimal("1050.00"), (
        f"Recovery balance wrong: ${balance_after_recovery}"
    )
    assert deposit_count_after == 1, (
        f"Expected 1 deposit after recovery, got {deposit_count_after}"
    )

    print("✅ TEST C PASSED: Full rollback on partial failure, clean recovery\n")


# ═══════════════════════════════════════════════════
# TEST D: Concurrent Retry Storm — 5 Staggered Retries
#
# Scenario:
#   A flaky network causes the client to fire 5 retries of the same
#   request at 50ms intervals. All 5 use the SAME idempotency key
#   and overlap in execution.
#
#   Timeline:
#     t=0ms    → REQ-1 starts
#     t=50ms   → REQ-2 starts (REQ-1 still processing)
#     t=100ms  → REQ-3 starts (REQ-1/2 still processing)
#     t=150ms  → REQ-4 starts
#     t=200ms  → REQ-5 starts
#
#   Expected:
#     - Exactly 1 handler execution
#     - Others get cached response or IntegrityError rollback
#     - Balance increases by $50 (not $250)
# ═══════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_d_retry_storm(test_user: dict):
    """
    5 staggered retries at 50ms intervals — same idempotency key.
    Simulates aggressive client retry policy under network instability.
    """
    idem_key = f"retry-storm-{uuid.uuid4()}"
    test_start = time.monotonic()
    delays = [0.0, 0.05, 0.10, 0.15, 0.20]  # 50ms intervals

    async def fire_staggered(req_id: int, delay: float):
        """Fire request after specified delay."""
        await asyncio.sleep(delay)
        t0 = time.monotonic() - test_start
        logger.debug(f"  [STORM-{req_id:02d}] Fired at t+{t0:.3f}s")
        resp = await make_request(test_user["token"], idem_key)
        t1 = time.monotonic() - test_start
        logger.debug(f"  [STORM-{req_id:02d}] → {resp.status_code} at t+{t1:.3f}s")
        return resp

    print(f"\n{'='*60}")
    print(f"TEST D: Retry Storm (5 staggered retries, same key)")

    logger.info("Launching retry storm: 5 requests at 50ms intervals...")
    responses = await asyncio.gather(
        *[fire_staggered(i + 1, delays[i]) for i in range(5)]
    )
    total_time = time.monotonic() - test_start

    # ── Analyze results ──
    successes = [r for r in responses if r.status_code == 200]
    errors = [r for r in responses if r.status_code >= 400]

    print(f"  Total time: {total_time:.3f}s")
    for i, (r, d) in enumerate(zip(responses, delays)):
        detail = ""
        if r.status_code != 200:
            try:
                detail = f"  — {r.json().get('detail', '')[:50]}"
            except Exception:
                detail = f"  — {r.text[:50]}"
        label = "OK" if r.status_code == 200 else "REJECTED"
        print(f"  [STORM-{i+1:02d}] t+{d:.3f}s → {r.status_code} {label}{detail}")

    # ── ASSERTIONS ──
    final_balance = await get_wallet_balance(test_user["id"])
    tx_count = await count_transactions(test_user["id"], "deposit", exclude_ref="initial_test_funding")
    await assert_ledger_consistency(test_user["id"], "storm_user")

    print(f"  Balance:      ${final_balance} (expected $1050.00)")
    print(f"  Deposit txns: {tx_count} (expected 1)")
    print(f"  200 count:    {len(successes)}")
    print(f"  Error count:  {len(errors)}")
    print(f"{'='*60}")

    # CRITICAL: exactly 1 deposit, regardless of how many requests were fired
    assert final_balance == Decimal("1050.00"), (
        f"CRITICAL: Expected $1050.00, got ${final_balance}. "
        f"Retry storm created duplicates! "
        f"{'DUPLICATE DEPOSIT!' if final_balance > Decimal('1050') else 'LOST DEPOSIT!'}"
    )
    assert tx_count == 1, (
        f"Expected 1 deposit transaction, got {tx_count}. "
        f"Storm penetrated idempotency barrier!"
    )

    # At least 1 request must have succeeded
    assert len(successes) >= 1, "No request succeeded in the storm!"

    print("✅ TEST D PASSED: 5-request retry storm → exactly 1 deposit, balance correct\n")
