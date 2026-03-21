"""
Shared test configuration for PostgreSQL-based concurrency tests.

This conftest provides the PG engine and session factory used by
test_pg_concurrency.py. It does NOT set DATABASE_URL or override
app dependencies globally — that is done inside each PG test module.

Existing SQLite-based tests (test_idempotency_concurrency.py, etc.)
set os.environ["DATABASE_URL"] and app.dependency_overrides at module level,
so they are completely unaffected by this conftest.
"""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# ─── PostgreSQL Test Connection ───
PG_TEST_URL = "postgresql+asyncpg://test:test@localhost:5433/splitease_test"

pg_engine = create_async_engine(PG_TEST_URL, echo=False, pool_size=20, max_overflow=30)
PgSessionLocal = async_sessionmaker(pg_engine, class_=AsyncSession, expire_on_commit=False)


async def pg_override_get_db():
    """Dependency override for get_db that uses the PG test database."""
    async with PgSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
