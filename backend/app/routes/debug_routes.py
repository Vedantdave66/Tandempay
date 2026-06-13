"""
Temporary debug endpoints — remove before production hardening.
"""

from fastapi import APIRouter
from app.services.nudge_service import run_nudge_job

router = APIRouter(prefix="/api/debug", tags=["debug"])


@router.post("/run-nudge-job")
async def trigger_nudge_job():
    await run_nudge_job()
    return {"status": "done"}
