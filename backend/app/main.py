import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.limiter import limiter
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.database import engine
from app.routes import auth, groups, expenses, settlements, notifications, me, friends, wallet, bank_links, requests, plaid_routes, stripe_routes, users, payments
from app.routes import reminders
from app.services import balance_service
from app.services.reconciliation import router as reconciliation_router
from app.services.reminder_scheduler import process_due_reminders
from app.idempotency import IdempotencyKey  # noqa: F401 — ensures table is created

logger = logging.getLogger("tandempay.main")



@asynccontextmanager
async def lifespan(app: FastAPI):
    is_serverless = os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME")

    # Database migrations managed by Alembic. Run: alembic upgrade head
    # Schema changes must be made via: alembic revision --autogenerate -m "description"
    # Never add raw ALTER TABLE statements here — they are not idempotent under
    # concurrent gunicorn workers and leave no migration history.

    try:
        # APScheduler only works in long-running servers, not serverless
        if not is_serverless:
            from app.services.payment_reconciliation import run_payment_reconciliation
            scheduler = AsyncIOScheduler()
            scheduler.add_job(
                process_due_reminders,
                trigger=IntervalTrigger(minutes=60),
                id="reminder_tick",
                name="Process due expense reminders",
                replace_existing=True,
            )
            scheduler.add_job(
                run_payment_reconciliation,
                trigger=IntervalTrigger(minutes=30),
                id="reconciliation_tick",
                name="Automated payment reconciliation",
                replace_existing=True,
            )
            scheduler.start()
            logger.info("Schedulers started (Reminders 60m, Reconciliation 30m).")
    except Exception as e:
        logger.error(f"Lifespan startup error (non-fatal): {e}")

    yield

    # Shutdown scheduler (only if it was started)
    if not is_serverless:
        try:
            scheduler.shutdown(wait=False)
            logger.info("Reminder scheduler stopped.")
        except Exception:
            pass

app = FastAPI(title="Tandem API", version="1.0.0", lifespan=lifespan)

# ── Rate limiting (slowapi) ──────────────────────────────────────────────────
# Limiter is defined in app/limiter.py to avoid circular imports with routes.
# _rate_limit_exceeded_handler converts RateLimitExceeded → HTTP 429.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS: allow local dev + production frontend URL from env

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://tandempay.ca",
        "https://www.tandempay.ca",
        "http://localhost:3000",
        "http://localhost:8081",
        "exp://localhost:8081",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(me.router)
app.include_router(groups.router)
app.include_router(expenses.router)
app.include_router(balance_service.router)
app.include_router(settlements.router)
app.include_router(notifications.router)
app.include_router(friends.router)
app.include_router(wallet.router)
app.include_router(bank_links.router)
app.include_router(requests.router)
app.include_router(plaid_routes.router)
app.include_router(stripe_routes.router)
app.include_router(users.router)
app.include_router(reminders.router)
app.include_router(payments.router)
app.include_router(reconciliation_router)

@app.get("/")
async def root():
    return {"status": "ok", "message": "Tandem API is running"}

@app.get("/api/health")
async def health():
    return {"status": "ok"}
