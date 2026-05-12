# TODO(sentry-validation): TEMPORARY — remove this file after confirming Sentry
# receives events in the dashboard. Do NOT deploy to production permanently.
#
# Usage:
#   curl -X POST https://api.tandempay.ca/sentry-test \
#        -H "X-Sentry-Test-Token: <your-token>" \
#   OR:
#   curl https://api.tandempay.ca/sentry-test?token=<your-token>
#
# Set SENTRY_TEST_TOKEN in your Vercel backend env vars (any random string).
# If the token matches, a real exception is raised and Sentry should capture it.

import os
import sentry_sdk
from fastapi import APIRouter, Header, Query, HTTPException

router = APIRouter(tags=["__sentry_test__"])


def _check_token(token: str | None) -> None:
    expected = os.environ.get("SENTRY_TEST_TOKEN", "")
    if not expected:
        raise HTTPException(status_code=503, detail="SENTRY_TEST_TOKEN not configured on this server.")
    if token != expected:
        raise HTTPException(status_code=403, detail="Invalid test token.")


@router.post("/sentry-test")
async def sentry_test_exception(
    x_sentry_test_token: str | None = Header(default=None, alias="X-Sentry-Test-Token"),
    token: str | None = Query(default=None),
):
    """
    TODO(sentry-validation): TEMPORARY endpoint — raises a real exception so
    Sentry captures a full stack trace. Protected by SENTRY_TEST_TOKEN env var.
    Remove after validation.
    """
    _check_token(x_sentry_test_token or token)
    raise RuntimeError("Sentry backend test error")


@router.get("/sentry-test")
async def sentry_test_message(
    x_sentry_test_token: str | None = Header(default=None, alias="X-Sentry-Test-Token"),
    token: str | None = Query(default=None),
):
    """
    TODO(sentry-validation): TEMPORARY endpoint — sends a captureMessage event
    (no exception) so you can verify message-level Sentry events too.
    Remove after validation.
    """
    _check_token(x_sentry_test_token or token)
    sentry_sdk.capture_message("Sentry backend test message", level="info")
    # flush() is mandatory on Vercel serverless — without it, the function
    # may exit before Sentry's background sender thread delivers the event.
    sentry_sdk.flush(timeout=2)
    return {"detail": "Sentry test message sent. Check your Sentry dashboard."}
