from pydantic_settings import BaseSettings
from functools import lru_cache

DEFAULT_TAX_RATE: float = 0.13  # Canadian HST


class Settings(BaseSettings):
    # Required — no defaults. App will refuse to start if these are missing from env.
    DATABASE_URL: str
    SECRET_KEY: str
    ADMIN_SECRET: str

    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "noreply@send.tandempay.ca"
    FRONTEND_URL: str = "http://localhost:5173"

    # Plaid Configuration
    PLAID_CLIENT_ID: str = ""
    PLAID_SECRET: str = ""
    PLAID_ENV: str = "sandbox"

    # Stripe Configuration
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRO_PRICE_ID: str = ""

    # SendGrid Inbound Parse — set in Vercel backend env vars as SENDGRID_WEBHOOK_SECRET
    SENDGRID_WEBHOOK_SECRET: str = ""

    # Gemini — used by receipt scanning route
    GEMINI_API_KEY: str = ""

    # Sentry — leave empty to disable monitoring entirely (safe for local dev)
    SENTRY_DSN: str = ""
    ENVIRONMENT: str = "development"  # override to "production" on Vercel

    # Cron auth — set in Vercel backend env vars; checked by POST /api/cron/nudge.
    # Generate with: python -c "import secrets; print(secrets.token_hex(32))"
    CRON_SECRET: str = ""

    # Logging — controls the root logger level applied by JsonFormatter setup in main.py.
    # Valid values: DEBUG | INFO | WARNING | ERROR | CRITICAL
    # Leave at INFO for production; set DEBUG locally when chasing a bug.
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
