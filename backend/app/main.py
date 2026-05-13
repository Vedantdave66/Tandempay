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
import sentry_sdk
from sentry_sdk.integrations.starlette import StarletteIntegration
from sentry_sdk.integrations.fastapi import FastApiIntegration

from app.database import engine  # used by APScheduler-started services via app.database
from app.routes import auth, groups, expenses, settlements, notifications, me, friends, wallet, bank_links, requests, plaid_routes, stripe_routes, users, payments
from app.routes import reminders
from app.services import balance_service
from app.services.reconciliation import router as reconciliation_router
from app.services.reminder_scheduler import process_due_reminders
from app.idempotency import IdempotencyKey  # noqa: F401 — ensures table is created

logger = logging.getLogger("tandempay.main")

# ── Sentry — module-level init ───────────────────────────────────────────────
# Must be at module level so it runs on every serverless cold start.
# Mangum (Vercel) imports this module directly; lifespan() is not always
# guaranteed to execute before the first request on a cold start.
# If SENTRY_DSN is empty or missing, sentry_sdk.init() is never called and
# Sentry is completely inactive — safe for local dev and fresh clones.
_SENTRY_DSN = os.environ.get("SENTRY_DSN", "")
_SENTRY_ENV = os.environ.get("ENVIRONMENT", "production")

if _SENTRY_DSN:
    # Forbidden terms are checked against exception *values* and *messages* only.
    # Do NOT serialise the full event dict — that includes request URLs which
    # contain query-param names like '?token=...' and would silently drop
    # every single event (the original bug).
    _SENTRY_FORBIDDEN = (
        "password", "hashed_password", "stripe_payment_intent", "interac",
    )

    def _before_send(event, hint):
        """Drop events whose exception message or log message contains sensitive data."""
        # Check exception values (one per chained exception)
        for exc_val in event.get("exception", {}).get("values", []):
            val = str(exc_val.get("value", "")).lower()
            if any(term in val for term in _SENTRY_FORBIDDEN):
                return None
        # Check top-level log message (captureMessage events)
        msg = str(event.get("message", "")).lower()
        if any(term in msg for term in _SENTRY_FORBIDDEN):
            return None
        return event

    sentry_sdk.init(
        dsn=_SENTRY_DSN,
        traces_sample_rate=0.1,          # 10 % of transactions for perf monitoring
        environment=_SENTRY_ENV,
        send_default_pii=False,          # never capture IPs, cookies, or user agents
        before_send=_before_send,
        integrations=[
            StarletteIntegration(),      # captures ASGI-level request context
            FastApiIntegration(),        # captures FastAPI route/handler context
        ],
    )
    logger.info("Sentry enabled (environment=%s).", _SENTRY_ENV)
else:
    logger.info("Sentry disabled — SENTRY_DSN not set.")



@asynccontextmanager
async def lifespan(app: FastAPI):
    # Sentry is initialised at module level above (not here) so it runs on
    # every serverless cold start before any request is handled.

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


# ── Diagnostic: log every unhandled exception ────────────────────────────────
# Without this, FastAPI's default 500 handler swallows tracebacks on Vercel
# (the runtime doesn't capture starlette's internal logger). This surfaces
# them through our `tandempay.*` logger which IS captured.
import traceback
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def _log_unhandled_exception(request: Request, exc: Exception):
    logger.error(
        "UNHANDLED %s on %s %s: %s\n%s",
        type(exc).__name__,
        request.method,
        request.url.path,
        exc,
        traceback.format_exc(),
    )
    # Explicitly forward to Sentry — the FastAPI exception handler converts
    # the exception into a JSONResponse, which means Sentry's ASGI middleware
    # never sees it as an unhandled exception. Calling capture_exception() here
    # guarantees delivery. flush() is required on serverless (Vercel) because
    # the function may exit before Sentry's background thread sends the event.
    if _SENTRY_DSN:
        sentry_sdk.capture_exception(exc)
        sentry_sdk.flush(timeout=2)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error_type": type(exc).__name__},
    )

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
