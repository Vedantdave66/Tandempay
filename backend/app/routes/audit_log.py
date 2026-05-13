"""
GET /groups/{group_id}/audit-log

Returns the immutable audit feed for a group, newest-first, with
ISO timestamp cursor pagination via the `before` query param.

Auth: requesting user must be a member of the group.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Group
from app.audit_log import AuditLog
from app.routes.auth import get_current_user
from app.models import User

router = APIRouter(prefix="/api/groups", tags=["audit-log"])


# ── Response schema ───────────────────────────────────────────────────────────

class AuditLogEntry(BaseModel):
    id: str
    actor_id: str
    action: str
    entity_type: str
    entity_id: str
    metadata: Optional[dict] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Helper ────────────────────────────────────────────────────────────────────

async def _verify_membership(group_id: str, user_id: str, db: AsyncSession) -> Group:
    result = await db.execute(
        select(Group).where(Group.id == group_id).options(selectinload(Group.members))
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    is_member = any(m.user_id == user_id for m in group.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    return group


# ── Route ─────────────────────────────────────────────────────────────────────

@router.get("/{group_id}/audit-log", response_model=list[AuditLogEntry])
async def get_audit_log(
    group_id: str,
    limit: int = Query(default=50, ge=1, le=200, description="Number of entries to return (max 200)"),
    before: Optional[datetime] = Query(
        default=None,
        description="ISO 8601 timestamp cursor — return entries created before this point",
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch the audit log for a group, newest-first.

    - **limit**: how many rows to return (1–200, default 50)
    - **before**: opaque ISO timestamp cursor for pagination; pass the
      `created_at` of the last row from the previous page to get the next page
    """
    await _verify_membership(group_id, current_user.id, db)

    query = (
        select(AuditLog)
        .where(AuditLog.group_id == group_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
    )

    if before is not None:
        query = query.where(AuditLog.created_at < before)

    result = await db.execute(query)
    rows = result.scalars().all()
    return rows
