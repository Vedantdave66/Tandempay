import logging

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.services.nudge_service import run_nudge_job

logger = logging.getLogger("tandempay.cron")

router = APIRouter()


@router.post("/nudge")
async def cron_nudge(request: Request):
    """Vercel Cron-triggered endpoint — runs the daily nudge sweep.

    Auth: Authorization: Bearer {CRON_SECRET}
    Returns 401 if the header is missing, wrong, or CRON_SECRET is empty.
    """
    settings = get_settings()
    if not settings.CRON_SECRET:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})
    auth = request.headers.get("Authorization", "")
    if auth != f"Bearer {settings.CRON_SECRET}":
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})

    logger.info("[cron] /api/cron/nudge invoked")
    await run_nudge_job()
    return {"ok": True}
