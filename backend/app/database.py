import logging
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from app.config import get_settings

logger = logging.getLogger("tandempay.database")
settings = get_settings()

# DATABASE_URL must use the asyncpg driver scheme on Vercel:
#   postgresql+asyncpg://USER:PASSWORD@HOST:6543/postgres
# Plain postgres:// or postgresql:// will crash create_async_engine at import.
# For Supabase, use the Transaction Pooler host (...pooler.supabase.com:6543).
_db_url = settings.DATABASE_URL
_scheme = _db_url.split("://", 1)[0] if "://" in _db_url else "<missing>"
logger.info("Initializing async engine with scheme=%s", _scheme)

engine = create_async_engine(
    _db_url,
    echo=False,
    poolclass=NullPool,
    # asyncpg + Supabase Transaction Pooler (PgBouncer) requires:
    #   - prepared-statement caches disabled (PgBouncer recycles connections,
    #     so cached statements break across them)
    #   - SSL required (Supabase rejects plaintext)
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        "ssl": "require",
    },
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    """
    Yields an async database session.

    Transaction strategy:
      - The session does NOT auto-commit. Routes are responsible for calling
        `await db.flush()` to send changes to the DB within the transaction,
        and the session commits when it closes successfully.
      - On exception, the session rolls back automatically.

    This gives payment-critical routes explicit control over their
    transaction boundaries while keeping non-critical routes simple.
    """
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
