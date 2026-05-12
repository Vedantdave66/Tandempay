from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Required — no defaults. App will refuse to start if these are missing from env.
    DATABASE_URL: str
    SECRET_KEY: str
    ADMIN_SECRET: str

    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

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

    # Sentry — leave empty to disable monitoring entirely (safe for local dev)
    SENTRY_DSN: str = ""
    ENVIRONMENT: str = "development"  # override to "production" on Vercel

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
