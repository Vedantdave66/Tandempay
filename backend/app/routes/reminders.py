"""
Expense Reminder routes — create, view, and cancel recurring reminders.

Only the payer of an expense can manage its reminder. One reminder per expense.
"""

import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, Expense, ExpenseReminder, GroupMember
from app.schemas import ReminderCreate, ReminderOut
from app.routes.auth import get_current_user

router = APIRouter(
    prefix="/api/groups/{group_id}/expenses/{expense_id}/reminder",
    tags=["reminders"],
)


async def _verify_payer(
    group_id: str, expense_id: str, user_id: str, db: AsyncSession
) -> Expense:
    """Verify the user is a group member AND the payer of this expense."""
    # Check membership
    member = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == user_id,
        )
    )
    if not member.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this group")

    # Fetch expense
    result = await db.execute(
        select(Expense).where(
            Expense.id == expense_id,
            Expense.group_id == group_id,
        )
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    if expense.paid_by != user_id:
        raise HTTPException(
            status_code=403,
            detail="Only the person who paid can set reminders",
        )

    return expense


@router.post("", response_model=ReminderOut)
async def create_reminder(
    group_id: str,
    expense_id: str,
    data: ReminderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or update a recurring reminder for an expense."""
    if data.interval_days < 1:
        raise HTTPException(status_code=400, detail="Interval must be at least 1 day")
    if data.interval_days > 90:
        raise HTTPException(status_code=400, detail="Interval cannot exceed 90 days")

    expense = await _verify_payer(group_id, expense_id, current_user.id, db)

    # Check if a reminder already exists — upsert
    result = await db.execute(
        select(ExpenseReminder).where(ExpenseReminder.expense_id == expense_id)
    )
    existing = result.scalar_one_or_none()

    now = datetime.datetime.now(datetime.timezone.utc)
    next_at = now + datetime.timedelta(days=data.interval_days)

    if existing:
        existing.interval_days = data.interval_days
        existing.next_reminder_at = next_at
        existing.is_active = True
        await db.flush()
        await db.refresh(existing)
        return existing
    else:
        reminder = ExpenseReminder(
            expense_id=expense_id,
            created_by=current_user.id,
            interval_days=data.interval_days,
            next_reminder_at=next_at,
            is_active=True,
        )
        db.add(reminder)
        await db.flush()
        await db.refresh(reminder)
        return reminder


@router.get("", response_model=ReminderOut | None)
async def get_reminder(
    group_id: str,
    expense_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the current reminder for an expense (any group member can view)."""
    # Verify membership
    member = await db.execute(
        select(GroupMember).where(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id,
        )
    )
    if not member.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this group")

    result = await db.execute(
        select(ExpenseReminder).where(
            ExpenseReminder.expense_id == expense_id,
        )
    )
    reminder = result.scalar_one_or_none()
    return reminder


@router.delete("", status_code=204)
async def cancel_reminder(
    group_id: str,
    expense_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel (delete) a reminder. Only the payer can do this."""
    await _verify_payer(group_id, expense_id, current_user.id, db)

    result = await db.execute(
        select(ExpenseReminder).where(ExpenseReminder.expense_id == expense_id)
    )
    reminder = result.scalar_one_or_none()
    if not reminder:
        raise HTTPException(status_code=404, detail="No reminder set for this expense")

    await db.delete(reminder)
    await db.flush()
    return None
