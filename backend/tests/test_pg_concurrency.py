"""
PostgreSQL Real Concurrency Tests — proving financial safety under true contention.

These tests REQUIRE a running PostgreSQL instance (via Docker):

    cd backend
    docker compose -f docker-compose.test.yml up -d
    python -m pytest tests/test_pg_concurrency.py -v -s
    docker compose -f docker-compose.test.yml down -v

WHAT MAKES THIS DIFFERENT FROM THE SQLITE TESTS:
  - Uses PostgreSQL (row-level locking, SELECT FOR UPDATE actually blocks)
  - Uses asyncio.gather to fire truly parallel HTTP requests (not sequential loops)
  - Proves that UniqueConstraint races resolve correctly under real contention
  - Proves that SELECT FOR UPDATE serializes concurrent wallet mutations
  - Proves wallet balance can NEVER go negative under concurrent drain

Tests:
  A. 10 concurrent deposits with same idempotency key → only 1 executes
  B. 5 concurrent attempts to pay the same PaymentRequest → exactly 1 succeeds
  C. Wallet Drain: $100 balance, 3 concurrent $50 withdrawals → 2 succeed, 1 fails
  D. Row-level lock proof: FOR UPDATE blocks a second session until the first commits
  E. 5 concurrent deposits with different keys → all 5 execute (serialization, not rejection)

Expected output when all pass:

  ============================================================
  TEST A: Idempotency Race (10 concurrent, same key)
    [REQ-01] 200 OK       (t+0.023s)
    [REQ-02] 500 ERROR    (t+0.025s)  — IntegrityError rolled back
    ...
    Final balance:   $1050.00  ← NOT $1500
    Deposit txns:    1         ← NOT 10
    Ledger sum:      $1050.00  ← matches cached
  ✅ TEST A PASSED

  ============================================================
  TEST B: PaymentRequest Double Spend (5 concurrent)
    [REQ-01] 200 OK       (t+0.031s)
    [REQ-02] 400 BLOCKED  (t+0.045s)  — already settled
    ...
    Payer balance:     $900.00
    Requester balance: $600.00
    transfer_out txns: 1
    transfer_in txns:  1
  ✅ TEST B PASSED

  ============================================================
  TEST C: Wallet Drain ($100, 3x $50 concurrent)
    [REQ-01] 200 OK       (t+0.018s)  — balance: 100→50
    [REQ-02] 200 OK       (t+0.035s)  — balance: 50→0
    [REQ-03] 400 BLOCKED  (t+0.041s)  — Insufficient wallet balance
    Final balance:   $0.00   ← NOT negative
    Withdrawal txns: 2       ← NOT 3
    Ledger sum:      $0.00   ← matches cached
  ✅ TEST C PASSED

  ============================================================
  TEST D: Row-Level Lock Proof (SELECT FOR UPDATE)
    Session 1: Acquired lock, holding for 2.0s...
    Session 2: Blocked... waiting for lock
    Session 1: Releasing lock (commit)
    Session 2: Acquired lock after 1.95s
  ✅ TEST D PASSED

  ============================================================
  TEST E: Concurrent Deposits (5 different keys)
    [REQ-01] 200 OK  ...  [REQ-05] 200 OK
    Final balance:   $1250.00
    Deposit txns:    5
  ✅ TEST E PASSED
"""

import asyncio
import time
import uuid
import logging
from decimal import Decimal

import pytest
import pytest_asyncio
import bcrypt
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func

from tests.conftest import pg_engine, PgSessionLocal, pg_override_get_db
from app.main import app
from app.database import Base, get_db
from app.models import User, WalletTransaction, Group, GroupMember, PaymentRequest

# ─── Logging Setup ───
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("splitease.pg_concurrency_tests")

# Ensure app-level loggers are also verbose during tests
logging.getLogger("splitease.wallet").setLevel(logging.DEBUG)
logging.getLogger("splitease.requests").setLevel(logging.DEBUG)
logging.getLogger("splitease.ledger").setLevel(logging.DEBUG)
logging.getLogger("splitease.idempotency").setLevel(logging.DEBUG)

# Override app's DB dependency to use our PG test database
app.dependency_overrides[get_db] = pg_override_get_db


# ═══════════════════════════════════════════════════
# FIXTURES
# ═══════════════════════════════════════════════════

@pytest_asyncio.fixture(autouse=True)
async def setup_pg_database():
    """Create all tables before each test, drop after."""
    logger.info("Setting up PostgreSQL test database (CREATE ALL)...")
    async with pg_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Tables created. Running test...")
    yield
    logger.info("Tearing down PostgreSQL test database (DROP ALL)...")
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
            name="PG Test User",
            email=f"pgtest_{uuid.uuid4().hex[:8]}@example.com",
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


@pytest_asyncio.fixture
async def drain_user() -> dict:
    """Create a user with exactly $100 for wallet drain testing."""
    async with PgSessionLocal() as db:
        hashed = bcrypt.hashpw(b"test123", bcrypt.gensalt()).decode("utf-8")
        user = User(
            id=str(uuid.uuid4()),
            name="PG Drain User",
            email=f"drain_{uuid.uuid4().hex[:8]}@example.com",
            hashed_password=hashed,
            wallet_balance=Decimal("100.00"),
        )
        db.add(user)
        await db.flush()

        initial_tx = WalletTransaction(
            user_id=user.id,
            type="deposit",
            amount=Decimal("100.00"),
            status="completed",
            reference_type="deposit",
            reference_id="initial_drain_funding",
        )
        db.add(initial_tx)
        await db.commit()
        await db.refresh(user)

        from app.routes.auth import create_access_token
        token = create_access_token(data={"sub": user.id})

        logger.info(f"Created drain_user: id={user.id}, balance=$100.00")
        return {
            "id": user.id,
            "email": user.email,
            "token": token,
            "balance": Decimal("100.00"),
        }


@pytest_asyncio.fixture
async def payment_test_data() -> dict:
    """Create payer + requester in a group with a pending PaymentRequest."""
    async with PgSessionLocal() as db:
        hashed = bcrypt.hashpw(b"test123", bcrypt.gensalt()).decode("utf-8")

        payer = User(
            id=str(uuid.uuid4()),
            name="PG Payer",
            email=f"payer_{uuid.uuid4().hex[:8]}@example.com",
            hashed_password=hashed,
            wallet_balance=Decimal("1000.00"),
        )
        requester = User(
            id=str(uuid.uuid4()),
            name="PG Requester",
            email=f"req_{uuid.uuid4().hex[:8]}@example.com",
            hashed_password=hashed,
            wallet_balance=Decimal("500.00"),
        )
        db.add_all([payer, requester])
        await db.flush()

        db.add(WalletTransaction(
            user_id=payer.id, type="deposit", amount=Decimal("1000.00"),
            status="completed", reference_type="deposit", reference_id="init_payer",
        ))
        db.add(WalletTransaction(
            user_id=requester.id, type="deposit", amount=Decimal("500.00"),
            status="completed", reference_type="deposit", reference_id="init_req",
        ))

        group = Group(id=str(uuid.uuid4()), name="PG Test Group", created_by=requester.id)
        db.add(group)
        await db.flush()

        db.add(GroupMember(group_id=group.id, user_id=payer.id))
        db.add(GroupMember(group_id=group.id, user_id=requester.id))

        pr = PaymentRequest(
            id=str(uuid.uuid4()),
            group_id=group.id,
            requester_id=requester.id,
            payer_id=payer.id,
            amount=Decimal("100.00"),
            note="PG Concurrency Test Payment",
            status="pending",
        )
        db.add(pr)
        await db.commit()
        await db.refresh(payer)
        await db.refresh(requester)
        await db.refresh(pr)

        from app.routes.auth import create_access_token
        payer_token = create_access_token(data={"sub": payer.id})

        logger.info(
            f"Created payment_test_data: payer={payer.id}($1000), "
            f"requester={requester.id}($500), pr={pr.id}($100)"
        )
        return {
            "payer_id": payer.id,
            "requester_id": requester.id,
            "payer_token": payer_token,
            "pr_id": pr.id,
            "initial_payer_balance": Decimal("1000.00"),
            "initial_req_balance": Decimal("500.00"),
            "amount": Decimal("100.00"),
        }


# ═══════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════

async def get_wallet_balance(user_id: str) -> Decimal:
    """Read the cached wallet_balance from the User row."""
    async with PgSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one()
        return Decimal(str(user.wallet_balance))


async def compute_ledger_balance(user_id: str) -> Decimal:
    """Compute the true balance by summing all completed WalletTransactions."""
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
    """Count completed transactions of a given type for a user."""
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
    """Assert that cached balance == ledger sum (the golden invariant)."""
    cached = await get_wallet_balance(user_id)
    ledger = await compute_ledger_balance(user_id)
    assert abs(cached - ledger) <= Decimal("0.01"), (
        f"LEDGER INCONSISTENCY for {label}: cached=${cached}, ledger=${ledger}, "
        f"diff=${cached - ledger}. DATA CORRUPTION!"
    )
    logger.info(f"  Ledger consistency ✓ for {label}: cached=${cached}, ledger=${ledger}")


# ═══════════════════════════════════════════════════
# TEST A: Idempotency Race — 10 Concurrent, Same Key
#
# Fires 10 truly parallel requests via asyncio.gather.
# Only 1 should execute; the rest must either:
#   - Return cached response (sequential retry path)
#   - Fail with IntegrityError → rollback (concurrent race path)
#
# The balance MUST increase by exactly $50, not $500.
# ═══════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_a_idempotency_race(test_user: dict):
    """
    10 truly parallel add-funds requests with the SAME idempotency key.
    PostgreSQL's UniqueConstraint on idempotency_keys ensures only 1 deposit executes.
    """
    idem_key = f"pg-concurrent-deposit-{uuid.uuid4()}"
    payload = {"amount": 50.00, "source": "PG Concurrency Test"}
    test_start = time.monotonic()

    async def fire_request(req_id: int):
        t0 = time.monotonic()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/wallet/add-funds",
                json=payload,
                headers={
                    "Authorization": f"Bearer {test_user['token']}",
                    "Idempotency-Key": idem_key,
                },
            )
        elapsed = time.monotonic() - t0
        logger.debug(f"  [REQ-{req_id:02d}] → {resp.status_code} (took {elapsed:.3f}s)")
        return resp

    # Fire all 10 at once — TRUE concurrency
    logger.info("TEST A: Launching 10 concurrent requests with SAME idempotency key...")
    responses = await asyncio.gather(*[fire_request(i + 1) for i in range(10)])
    total_time = time.monotonic() - test_start

    # Analyze results
    successes = [r for r in responses if r.status_code == 200]
    errors = [r for r in responses if r.status_code >= 400]

    print(f"\n{'='*60}")
    print(f"TEST A: Idempotency Race (10 concurrent, same key)")
    print(f"  Total time:       {total_time:.3f}s")
    for i, r in enumerate(responses):
        detail = ""
        if r.status_code != 200:
            try:
                detail = f"  — {r.json().get('detail', '')[:60]}"
            except Exception:
                detail = f"  — {r.text[:60]}"
        status_label = "OK" if r.status_code == 200 else "ERROR"
        print(f"  [REQ-{i+1:02d}] {r.status_code} {status_label}{detail}")

    # ── ASSERTIONS ──
    final_balance = await get_wallet_balance(test_user["id"])
    tx_count = await count_transactions(test_user["id"], "deposit", exclude_ref="initial_test_funding")
    await assert_ledger_consistency(test_user["id"], "test_a_user")

    print(f"  Final balance:    ${final_balance}")
    print(f"  Deposit txns:     {tx_count}")
    print(f"  200 responses:    {len(successes)}")
    print(f"  Error responses:  {len(errors)}")
    print(f"{'='*60}")

    assert final_balance == Decimal("1050.00"), (
        f"CRITICAL: Expected $1050.00, got ${final_balance}. "
        f"Duplicate deposits! Financial safety violated!"
    )
    assert tx_count == 1, (
        f"Expected 1 deposit transaction, got {tx_count}. Multiple handlers executed!"
    )

    print("✅ TEST A PASSED: 10 concurrent requests → 1 deposit, balance correct\n")


# ═══════════════════════════════════════════════════
# TEST B: PaymentRequest Double Spend — 5 Concurrent
#
# Fires 5 truly parallel pay requests for the same PaymentRequest.
# PostgreSQL's SELECT FOR UPDATE on the PaymentRequest row serializes them.
# Only 1 should succeed; the other 4 should get 400 "already settled".
# ═══════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_b_payment_request_double_spend(payment_test_data: dict):
    """
    5 truly parallel attempts to pay the same PaymentRequest.
    PostgreSQL's SELECT FOR UPDATE + status check ensures exactly 1 succeeds.
    """
    pr_id = payment_test_data["pr_id"]
    token = payment_test_data["payer_token"]
    test_start = time.monotonic()

    async def fire_pay(req_id: int):
        t0 = time.monotonic()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.put(
                f"/api/requests/{pr_id}/pay",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Idempotency-Key": f"pg-pay-{uuid.uuid4()}",
                },
            )
        elapsed = time.monotonic() - t0
        detail = ""
        if resp.status_code != 200:
            try:
                detail = f" — {resp.json().get('detail', '')[:50]}"
            except Exception:
                pass
        logger.debug(f"  [REQ-{req_id:02d}] → {resp.status_code} ({elapsed:.3f}s){detail}")
        return resp

    # Fire all 5 at once — TRUE concurrency
    logger.info("TEST B: Launching 5 concurrent pay requests for same PaymentRequest...")
    responses = await asyncio.gather(*[fire_pay(i + 1) for i in range(5)])
    total_time = time.monotonic() - test_start

    success_count = sum(1 for r in responses if r.status_code == 200)
    fail_400 = sum(1 for r in responses if r.status_code == 400)
    other_errors = sum(1 for r in responses if r.status_code not in (200, 400))

    print(f"\n{'='*60}")
    print(f"TEST B: PaymentRequest Double Spend (5 concurrent)")
    print(f"  Total time:       {total_time:.3f}s")
    for i, r in enumerate(responses):
        detail = ""
        if r.status_code != 200:
            try:
                detail = f"  — {r.json().get('detail', '')[:50]}"
            except Exception:
                pass
        label = "OK" if r.status_code == 200 else "BLOCKED" if r.status_code == 400 else "ERROR"
        print(f"  [REQ-{i+1:02d}] {r.status_code} {label}{detail}")

    # ── ASSERTIONS ──
    payer_bal = await get_wallet_balance(payment_test_data["payer_id"])
    req_bal = await get_wallet_balance(payment_test_data["requester_id"])
    expected_payer = payment_test_data["initial_payer_balance"] - payment_test_data["amount"]
    expected_req = payment_test_data["initial_req_balance"] + payment_test_data["amount"]

    tx_out = await count_transactions(payment_test_data["payer_id"], "transfer_out")
    tx_in = await count_transactions(payment_test_data["requester_id"], "transfer_in")

    await assert_ledger_consistency(payment_test_data["payer_id"], "payer")
    await assert_ledger_consistency(payment_test_data["requester_id"], "requester")

    print(f"  Payer balance:     ${payer_bal} (expected ${expected_payer})")
    print(f"  Requester balance: ${req_bal} (expected ${expected_req})")
    print(f"  transfer_out txns: {tx_out}")
    print(f"  transfer_in txns:  {tx_in}")
    print(f"  200 responses:     {success_count}")
    print(f"  400 responses:     {fail_400}")
    print(f"  other errors:      {other_errors}")
    print(f"{'='*60}")

    assert success_count == 1, (
        f"Expected exactly 1 success, got {success_count}. DOUBLE PAYMENT!"
    )
    assert payer_bal == expected_payer, f"Payer: ${payer_bal} != ${expected_payer}"
    assert req_bal == expected_req, f"Requester: ${req_bal} != ${expected_req}"
    assert tx_out == 1, f"Expected 1 transfer_out, got {tx_out}"
    assert tx_in == 1, f"Expected 1 transfer_in, got {tx_in}"

    print("✅ TEST B PASSED: 5 concurrent pay attempts → 1 success, balances correct\n")


# ═══════════════════════════════════════════════════
# TEST C: Wallet Drain — $100 balance, 3x $50 concurrent withdrawals
#
# The most dangerous financial scenario: more concurrent withdrawals
# than the balance can cover. Without proper locking, all 3 could
# pass the balance check and drain the wallet to -$50.
#
# Expected: exactly 2 succeed ($100→$50→$0), 1 fails with "Insufficient"
# Balance must NEVER go negative.
# ═══════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_c_wallet_drain(drain_user: dict):
    """
    3 concurrent $50 withdrawals on a $100 balance.
    SELECT FOR UPDATE serializes them. 2 succeed, 1 fails.
    Balance MUST never go negative.
    """
    test_start = time.monotonic()

    async def fire_withdraw(req_id: int):
        t0 = time.monotonic()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/wallet/withdraw",
                json={"amount": 50.00, "destination": f"Bank-{req_id}"},
                headers={
                    "Authorization": f"Bearer {drain_user['token']}",
                    "Idempotency-Key": f"pg-drain-{uuid.uuid4()}",
                },
            )
        elapsed = time.monotonic() - t0
        detail = ""
        if resp.status_code != 200:
            try:
                detail = f" — {resp.json().get('detail', '')[:50]}"
            except Exception:
                pass
        logger.debug(f"  [WITHDRAW-{req_id:02d}] → {resp.status_code} ({elapsed:.3f}s){detail}")
        return resp

    # Fire all 3 at once — TRUE concurrency
    logger.info("TEST C: Launching 3 concurrent $50 withdrawals on $100 balance...")
    responses = await asyncio.gather(*[fire_withdraw(i + 1) for i in range(3)])
    total_time = time.monotonic() - test_start

    successes = [r for r in responses if r.status_code == 200]
    failures = [r for r in responses if r.status_code == 400]
    errors = [r for r in responses if r.status_code >= 500]

    print(f"\n{'='*60}")
    print(f"TEST C: Wallet Drain ($100 balance, 3x $50 concurrent)")
    print(f"  Total time:       {total_time:.3f}s")
    for i, r in enumerate(responses):
        detail = ""
        if r.status_code != 200:
            try:
                detail = f"  — {r.json().get('detail', '')[:50]}"
            except Exception:
                pass
        label = "OK" if r.status_code == 200 else "INSUFFICIENT" if r.status_code == 400 else "ERROR"
        print(f"  [WITHDRAW-{i+1:02d}] {r.status_code} {label}{detail}")

    # ── ASSERTIONS ──
    final_balance = await get_wallet_balance(drain_user["id"])
    ledger_balance = await compute_ledger_balance(drain_user["id"])
    withdrawal_count = await count_transactions(drain_user["id"], "withdrawal")
    await assert_ledger_consistency(drain_user["id"], "drain_user")

    print(f"  Final balance:    ${final_balance}")
    print(f"  Ledger sum:       ${ledger_balance}")
    print(f"  Withdrawal txns:  {withdrawal_count}")
    print(f"  200 responses:    {len(successes)}")
    print(f"  400 responses:    {len(failures)}")
    print(f"  500 errors:       {len(errors)}")
    print(f"{'='*60}")

    # CRITICAL: Balance must NEVER be negative
    assert final_balance >= Decimal("0.00"), (
        f"CRITICAL: NEGATIVE BALANCE! ${final_balance}. "
        f"Race condition allowed overdraft! Financial safety violated!"
    )

    # Exactly 2 should succeed ($100 / $50 = 2 withdrawals max)
    assert len(successes) == 2, (
        f"Expected exactly 2 successful withdrawals, got {len(successes)}. "
        f"{'Overdraft!' if len(successes) > 2 else 'Serialization too aggressive!'}"
    )

    # Exactly 1 should fail with insufficient balance
    assert len(failures) == 1, (
        f"Expected 1 failure (insufficient balance), got {len(failures)}"
    )

    # Final balance must be $0
    assert final_balance == Decimal("0.00"), (
        f"Expected $0.00, got ${final_balance}"
    )

    # Ledger must have exactly 2 withdrawal transactions
    assert withdrawal_count == 2, (
        f"Expected 2 withdrawal txns, got {withdrawal_count}"
    )

    print("✅ TEST C PASSED: 3 concurrent $50 withdrawals → 2 succeed, balance $0.00\n")


# ═══════════════════════════════════════════════════
# TEST D: Row-Level Lock Proof
#
# Two raw SQLAlchemy sessions:
#   Session 1: SELECT FOR UPDATE on user row, sleeps 2s, then commits
#   Session 2: SELECT FOR UPDATE on same row (should BLOCK until session 1 commits)
#
# Measures wall-clock time to prove real blocking.
# On SQLite, FOR UPDATE is a no-op → both complete instantly.
# On PostgreSQL, Session 2 MUST wait ~2 seconds.
# ═══════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_d_row_level_lock_proof(test_user: dict):
    """
    Prove that SELECT FOR UPDATE on PostgreSQL actually blocks a second session.
    Session 1 holds the lock for 2 seconds. Session 2 must wait.
    """
    user_id = test_user["id"]
    lock_hold_time = 2.0

    async def session_1_hold_lock():
        """Acquire FOR UPDATE lock, hold for 2 seconds, then commit."""
        async with PgSessionLocal() as db:
            async with db.begin():
                result = await db.execute(
                    select(User).where(User.id == user_id).with_for_update()
                )
                user = result.scalar_one()
                logger.info(f"  Session 1: 🔒 Acquired lock on '{user.name}', holding {lock_hold_time}s...")
                await asyncio.sleep(lock_hold_time)
                logger.info(f"  Session 1: 🔓 Releasing lock (commit)")

    async def session_2_try_lock():
        """Try to acquire FOR UPDATE lock — should block until session 1 releases."""
        await asyncio.sleep(0.1)  # Ensure session 1 gets lock first

        logger.info("  Session 2: Attempting to acquire lock...")
        start = time.monotonic()
        async with PgSessionLocal() as db:
            async with db.begin():
                result = await db.execute(
                    select(User).where(User.id == user_id).with_for_update()
                )
                user = result.scalar_one()
                elapsed = time.monotonic() - start
                logger.info(f"  Session 2: 🔒 Acquired lock after {elapsed:.2f}s (expected ~{lock_hold_time}s)")
                return elapsed

    print(f"\n{'='*60}")
    print(f"TEST D: Row-Level Lock Proof (SELECT FOR UPDATE)")

    results = await asyncio.gather(
        session_1_hold_lock(),
        session_2_try_lock(),
    )

    session_2_elapsed = results[1]

    print(f"  Session 2 waited: {session_2_elapsed:.2f}s")
    print(f"  Expected wait:    ~{lock_hold_time}s")
    print(f"{'='*60}")

    # Session 2 should have waited at least 1.5s (allowing for scheduling jitter)
    assert session_2_elapsed >= 1.5, (
        f"Session 2 only waited {session_2_elapsed:.2f}s — FOR UPDATE did not block! "
        f"Row-level locking is NOT working. Are you running against PostgreSQL?"
    )

    print(f"✅ TEST D PASSED: FOR UPDATE blocked session 2 for {session_2_elapsed:.2f}s\n")


# ═══════════════════════════════════════════════════
# TEST E: Concurrent Deposits — Different Keys (all should execute)
#
# Proves that concurrent requests with different idempotency keys
# all execute correctly. SELECT FOR UPDATE serializes them (no rejects).
# 5 concurrent $50 deposits → balance goes from $1000 → $1250.
# ═══════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_e_concurrent_deposits_different_keys(test_user: dict):
    """
    5 truly parallel add-funds with DIFFERENT idempotency keys.
    All 5 should succeed. SELECT FOR UPDATE serializes safely (no rejection).
    """
    payload = {"amount": 50.00, "source": "PG Parallel Test"}
    test_start = time.monotonic()

    async def fire_request(req_id: int):
        t0 = time.monotonic()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/wallet/add-funds",
                json=payload,
                headers={
                    "Authorization": f"Bearer {test_user['token']}",
                    "Idempotency-Key": f"pg-diff-{uuid.uuid4()}",
                },
            )
        elapsed = time.monotonic() - t0
        logger.debug(f"  [REQ-{req_id:02d}] → {resp.status_code} ({elapsed:.3f}s)")
        return resp

    logger.info("TEST E: Launching 5 concurrent deposits with DIFFERENT idempotency keys...")
    responses = await asyncio.gather(*[fire_request(i + 1) for i in range(5)])
    total_time = time.monotonic() - test_start

    success_count = sum(1 for r in responses if r.status_code == 200)

    print(f"\n{'='*60}")
    print(f"TEST E: Concurrent Deposits (5 different keys)")
    print(f"  Total time:       {total_time:.3f}s")
    for i, r in enumerate(responses):
        label = "OK" if r.status_code == 200 else "ERROR"
        print(f"  [REQ-{i+1:02d}] {r.status_code} {label}")

    # ── ASSERTIONS ──
    final_balance = await get_wallet_balance(test_user["id"])
    tx_count = await count_transactions(test_user["id"], "deposit", exclude_ref="initial_test_funding")
    await assert_ledger_consistency(test_user["id"], "test_e_user")

    print(f"  Final balance:    ${final_balance}")
    print(f"  Deposit txns:     {tx_count}")
    print(f"  200 responses:    {success_count}")
    print(f"{'='*60}")

    assert success_count == 5, (
        f"Expected all 5 to succeed, got {success_count}. "
        f"Row-level locking should serialize, not reject!"
    )
    assert final_balance == Decimal("1250.00"), (
        f"Expected $1250.00, got ${final_balance}. Deposits lost or duplicated!"
    )
    assert tx_count == 5, f"Expected 5 deposit transactions, got {tx_count}"

    print("✅ TEST E PASSED: 5 concurrent deposits → all executed, balance correct\n")
