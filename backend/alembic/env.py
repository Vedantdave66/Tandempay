import os
from logging.config import fileConfig

from sqlalchemy import create_engine, pool
from alembic import context

# ── Load .env for local development ───────────────────────────────────────────
# On Vercel/production the vars are injected by the platform; .env is only
# needed locally. Silently skip if python-dotenv is not installed.
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
except ImportError:
    pass

# ── Alembic config object ──────────────────────────────────────────────────────
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── Build synchronous DATABASE_URL for Alembic ────────────────────────────────
# The main app uses asyncpg (async driver via DATABASE_URL in .env / Vercel).
# Alembic requires a synchronous driver — we swap the prefix here.
# This modified URL is used ONLY by Alembic; the main app DATABASE_URL is
# never altered.
#
# We apply two replacements to cover every variant Supabase or local PG
# might hand us:
#   postgresql+asyncpg://  →  postgresql+psycopg2://
#   postgresql://           →  postgresql+psycopg2://   (bare scheme fallback)
#
# We do NOT call config.set_main_option("sqlalchemy.url", ...) because
# configparser treats '%' as an interpolation character, which breaks any
# URL containing percent-encoded characters (e.g. %24 for a literal '$').
# Instead we pass the URL string directly to create_engine().

_raw_url: str = os.environ["DATABASE_URL"]

_sync_url: str = _raw_url.replace(
    "postgresql+asyncpg://", "postgresql+psycopg2://"
)
# Bare postgresql:// with no driver suffix — add psycopg2 explicitly
if _sync_url.startswith("postgresql://"):
    _sync_url = _sync_url.replace(
        "postgresql://", "postgresql+psycopg2://", 1
    )

# ── Target metadata ────────────────────────────────────────────────────────────
# Import every model so SQLAlchemy's MetaData is fully populated before
# autogenerate compares it against the live schema.
# We import app.models here — NOT app.database — so we never touch the async
# engine or its psycopg3-specific connect_args.
from app.database import Base   # noqa: E402  — Base carries the MetaData object
import app.models               # noqa: E402, F401 — registers all Table objects

target_metadata = Base.metadata


# ── Offline mode — emit SQL to stdout, no live connection needed ───────────────

def run_migrations_offline() -> None:
    """Generate SQL without connecting to the database.

    Useful for reviewing what will be applied or piping to psql manually.
    """
    context.configure(
        url=_sync_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Online mode — connect to the live database and apply migrations ────────────

def run_migrations_online() -> None:
    """Apply pending migrations to the database.

    Uses create_engine() directly (not engine_from_config) so that the URL
    is never routed through configparser and special characters are preserved.
    """
    connectable = create_engine(_sync_url, poolclass=pool.NullPool)
    try:
        with connectable.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                compare_type=True,
            )
            with context.begin_transaction():
                context.run_migrations()
    finally:
        connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
