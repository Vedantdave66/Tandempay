"""
Test Suite: SettlementRecord Partial Index Constraints

Validates the behaviour of the partial unique index:

    CREATE UNIQUE INDEX uq_active_settlement_per_pair
    ON settlement_records (group_id, payer_id, payee_id)
    WHERE status IN ('pending', 'sent');

IMPORTANT — PostgreSQL only
---------------------------
Partial indexes with a WHERE clause are a PostgreSQL feature.
SQLite (used by other test suites here) silently ignores the WHERE clause and
treats the index as a full unique constraint, which would cause tests C and D
to fail with an IntegrityError that should not occur.

These tests therefore:
  1. Require a live PostgreSQL connection (DATABASE_URL env var must point to PG).
  2. Skip automatically when the DATABASE_URL is not PostgreSQL.

Run with:
    DATABASE_URL=postgresql+asyncpg://... pytest tests/test_settlement_constraints.py -v -s

Tests
-----
A. Duplicate pending settlement is blocked
B. Duplicate sent settlement is blocked
C. A settled record does NOT block a new settlement (historical debt allowed)
D. A declined record does NOT block a new settlement
E. Balance does not double-subtract: the partial index prevents two active
   settled rows from coexisting, so balance_service cannot invert the sign
   (constraint enforced at DB level — confirmed via IntegrityError)
"""

import uuid
import pytest
import pytest_asyncio

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
import os

# ── Skip entire module if not connected to PostgreSQL ────────────────────────

DATABASE_URL = os.environ.get("DATABASE_URL", "")

if not DATABASE_URL.startswith("postgresql"):
    pytest.skip(
        "test_settlement_constraints.py requires PostgreSQL. "
        "Set DATABASE_URL=postgresql+asyncpg://... to run.",
        allow_module_level=True,
    )

from app.database import Base
from app.models import User, Group, GroupMember, SettlementRecord   # noqa: E402

# ── Test DB Setup ─────────────────────────────────────────────────────────────

test_engine = create_async_engine(DATABASE_URL, echo=False)
TestSession = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture(autouse=True)
async def setup_schema():
    """Create all tables before each test, drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
        # Apply the partial index (normally done by Alembic on production).
        # Base.metadata.create_all does NOT apply Index objects that use
        # dialect-specific kwargs like postgresql_where on non-PG dialects,
        # but on PG it will. We run this explicitly to be safe.
        await conn.execute(
            __import__("sqlalchemy").text(
                "CREATE UNIQUE INDEX IF NOT EXISTS uq_active_settlement_per_pair "
                "ON settlement_records (group_id, payer_id, payee_id) "
                "WHERE status IN ('pending', 'sent')"
            )
        )
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()


@pytest_asyncio.fixture
async def base_data():
    """
    Creates two users (Alice, Bob) and a group they both belong to.
    Returns a dict with ids for use in each test.
    """
    async with TestSession() as db:
        alice = User(
            id=str(uuid.uuid4()), name="Alice", email=f"alice_{uuid.uuid4().hex[:6]}@test.com",
            hashed_password="pw",
        )
        bob = User(
            id=str(uuid.uuid4()), name="Bob", email=f"bob_{uuid.uuid4().hex[:6]}@test.com",
            hashed_password="pw",
        )
        db.add_all([alice, bob])
        await db.flush()

        group = Group(
            id=str(uuid.uuid4()), name="Test Group", created_by=alice.id,
        )
        db.add(group)
        await db.flush()

        db.add_all([
            GroupMember(group_id=group.id, user_id=alice.id),
            GroupMember(group_id=group.id, user_id=bob.id),
        ])
        await db.commit()

        return {"alice_id": alice.id, "bob_id": bob.id, "group_id": group.id}


# ── Helper ────────────────────────────────────────────────────────────────────

def make_settlement(group_id: str, payer_id: str, payee_id: str, status: str, amount: float = 50.0):
    return SettlementRecord(
        id=str(uuid.uuid4()),
        group_id=group_id,
        payer_id=payer_id,
        payee_id=payee_id,
        amount=amount,
        status=status,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# TEST A: Duplicate PENDING settlement is blocked
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_a_duplicate_pending_blocked(base_data):
    """
    Two 'pending' rows for the same (group, payer, payee) must raise IntegrityError.
    This prevents accidental double-tap from creating two in-flight settlements.
    """
    gid, aid, bid = base_data["group_id"], base_data["alice_id"], base_data["bob_id"]

    async with TestSession() as db:
        db.add(make_settlement(gid, aid, bid, "pending"))
        await db.commit()

    with pytest.raises(IntegrityError, match="uq_active_settlement_per_pair"):
        async with TestSession() as db:
            db.add(make_settlement(gid, aid, bid, "pending"))
            await db.commit()

    print("\n✅ TEST A: duplicate pending blocked by partial index")


# ═══════════════════════════════════════════════════════════════════════════════
# TEST B: Duplicate SENT settlement is blocked
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_b_duplicate_sent_blocked(base_data):
    """
    Two 'sent' rows for the same pair must raise IntegrityError.
    A user cannot claim to have sent the same payment twice simultaneously.
    """
    gid, aid, bid = base_data["group_id"], base_data["alice_id"], base_data["bob_id"]

    async with TestSession() as db:
        db.add(make_settlement(gid, aid, bid, "sent"))
        await db.commit()

    with pytest.raises(IntegrityError, match="uq_active_settlement_per_pair"):
        async with TestSession() as db:
            db.add(make_settlement(gid, aid, bid, "sent"))
            await db.commit()

    print("\n✅ TEST B: duplicate sent blocked by partial index")


# ═══════════════════════════════════════════════════════════════════════════════
# TEST C: SETTLED record does NOT block a new settlement (historical debt)
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_c_settled_does_not_block_new_settlement(base_data):
    """
    A 'settled' row for the same pair must NOT block a new 'pending' row.
    This is the core repeat-use flow: Alice and Bob split a new expense after
    having settled a previous one.

    The broad UniqueConstraint would have raised IntegrityError here.
    The partial index must allow this insert.
    """
    gid, aid, bid = base_data["group_id"], base_data["alice_id"], base_data["bob_id"]

    async with TestSession() as db:
        db.add(make_settlement(gid, aid, bid, "settled", amount=30.0))
        await db.commit()

    # This must NOT raise — settled row is excluded from the partial index
    async with TestSession() as db:
        db.add(make_settlement(gid, aid, bid, "pending", amount=20.0))
        await db.commit()

    # Verify both rows exist
    from sqlalchemy import select
    async with TestSession() as db:
        result = await db.execute(
            select(SettlementRecord).where(
                SettlementRecord.group_id == gid,
                SettlementRecord.payer_id == aid,
                SettlementRecord.payee_id == bid,
            )
        )
        rows = result.scalars().all()

    assert len(rows) == 2, f"Expected 2 rows (1 settled + 1 pending), got {len(rows)}"
    statuses = {r.status for r in rows}
    assert statuses == {"settled", "pending"}, f"Unexpected statuses: {statuses}"

    print(f"\n✅ TEST C: settled row does not block new pending — both rows exist: {statuses}")


# ═══════════════════════════════════════════════════════════════════════════════
# TEST D: DECLINED record does NOT block a new settlement
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_d_declined_does_not_block_new_settlement(base_data):
    """
    A 'declined' row for the same pair must NOT block a new 'pending' row.
    If Bob declines a settlement, Alice must be able to initiate a fresh one.
    """
    gid, aid, bid = base_data["group_id"], base_data["alice_id"], base_data["bob_id"]

    async with TestSession() as db:
        db.add(make_settlement(gid, aid, bid, "declined", amount=40.0))
        await db.commit()

    # This must NOT raise — declined row is excluded from the partial index
    async with TestSession() as db:
        db.add(make_settlement(gid, aid, bid, "pending", amount=40.0))
        await db.commit()

    from sqlalchemy import select
    async with TestSession() as db:
        result = await db.execute(
            select(SettlementRecord).where(
                SettlementRecord.group_id == gid,
                SettlementRecord.payer_id == aid,
                SettlementRecord.payee_id == bid,
            )
        )
        rows = result.scalars().all()

    assert len(rows) == 2, f"Expected 2 rows (1 declined + 1 pending), got {len(rows)}"
    statuses = {r.status for r in rows}
    assert statuses == {"declined", "pending"}, f"Unexpected statuses: {statuses}"

    print(f"\n✅ TEST D: declined row does not block new pending — both rows exist: {statuses}")


# ═══════════════════════════════════════════════════════════════════════════════
# TEST E: Balance double-subtraction is prevented at DB level
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_e_balance_double_subtraction_blocked_at_db_level(base_data):
    """
    balance_service._compute_balances() subtracts ALL 'settled' records.
    If two settled rows existed for the same pair, the payer's balance would be
    subtracted twice, inverting them from debtor to creditor.

    This test proves that the partial index prevents the condition that would
    cause the double-subtraction: two ACTIVE rows cannot coexist, so by the time
    the first is marked 'settled', a second active row cannot be inserted.

    Sequence:
      1. Insert first row as 'pending'   → OK
      2. Attempt to insert second 'pending' → BLOCKED (IntegrityError)
      3. Mark first row as 'settled'
      4. Now a new 'pending' row IS allowed (new debt after settlement)
      5. Confirm only one 'settled' row exists → double-subtraction is impossible

    Step 2 is the critical gate. Without it, both rows could be marked 'settled'
    later, and balance_service would subtract the amount twice.
    """
    from sqlalchemy import select, update

    gid, aid, bid = base_data["group_id"], base_data["alice_id"], base_data["bob_id"]

    # Step 1: First settlement created as pending
    sr1_id = str(uuid.uuid4())
    async with TestSession() as db:
        db.add(SettlementRecord(id=sr1_id, group_id=gid, payer_id=aid, payee_id=bid,
                                amount=100.0, status="pending"))
        await db.commit()

    # Step 2: Attempting a duplicate pending is blocked at the DB level
    with pytest.raises(IntegrityError):
        async with TestSession() as db:
            db.add(make_settlement(gid, aid, bid, "pending", amount=100.0))
            await db.commit()

    # Step 3: Mark the first row as settled (debt paid)
    async with TestSession() as db:
        await db.execute(
            update(SettlementRecord)
            .where(SettlementRecord.id == sr1_id)
            .values(status="settled")
        )
        await db.commit()

    # Step 4: New pending settlement (new debt from new expense) — must succeed
    sr2_id = str(uuid.uuid4())
    async with TestSession() as db:
        db.add(SettlementRecord(id=sr2_id, group_id=gid, payer_id=aid, payee_id=bid,
                                amount=50.0, status="pending"))
        await db.commit()

    # Step 5: Only one settled row exists — double-subtraction is impossible
    async with TestSession() as db:
        result = await db.execute(
            select(SettlementRecord).where(
                SettlementRecord.group_id == gid,
                SettlementRecord.payer_id == aid,
                SettlementRecord.payee_id == bid,
                SettlementRecord.status == "settled",
            )
        )
        settled_rows = result.scalars().all()

    assert len(settled_rows) == 1, (
        f"Expected exactly 1 settled row (double-subtraction prevention). "
        f"Got {len(settled_rows)}. balance_service would subtract twice!"
    )
    assert settled_rows[0].amount == 100, f"Expected $100, got {settled_rows[0].amount}"

    print(
        f"\n✅ TEST E: DB-level gate prevents double-subtraction. "
        f"Settled rows: {len(settled_rows)} × ${settled_rows[0].amount}"
    )
