import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# ── Load env vars ──────────────────────────────────────────────────────────────
# dotenv is only needed locally; on Render the vars are already in the env.
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
except ImportError:
    pass

# ── Alembic config object ──────────────────────────────────────────────────────
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── Database URL ───────────────────────────────────────────────────────────────
# The app uses asyncpg (async driver). Alembic needs a synchronous driver.
# We swap the scheme here so autogenerate can introspect the live DB.
_raw_url = os.environ["DATABASE_URL"]
_sync_url = _raw_url.replace("postgresql+asyncpg", "postgresql+psycopg2") \
                    .replace("postgresql+asyncpg", "postgresql")   # fallback
config.set_main_option("sqlalchemy.url", _sync_url)

# ── Target metadata ────────────────────────────────────────────────────────────
# Import ALL models so they register with Base before autogenerate runs.
from app.database import Base      # noqa: E402
import app.models                  # noqa: E402, F401 — side-effect: registers all tables

target_metadata = Base.metadata


# ── Migration runners ──────────────────────────────────────────────────────────

def run_migrations_offline() -> None:
    """Run migrations without an active DB connection (generates SQL to stdout)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against the live database."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

