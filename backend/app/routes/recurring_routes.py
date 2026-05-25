import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.models import RecurringExpense, User
from app.schemas import RecurringExpenseCreate, RecurringExpenseUpdate, RecurringExpenseOut, PaginatedResponse
from app.routes.auth import get_current_user
from app.dependencies.subscription import require_pro

logger = logging.getLogger("tandempay.recurring")

router = APIRouter(prefix="/api/recurring", tags=["recurring"])


@router.post("", response_model=RecurringExpenseOut, status_code=status.HTTP_201_CREATED)
async def create_recurring_expense(
    data: RecurringExpenseCreate,
    current_user: User = Depends(require_pro),
    db: AsyncSession = Depends(get_db),
):
    rec = RecurringExpense(
        group_id=data.group_id,
        created_by_id=current_user.id,
        description=data.description,
        amount=data.amount,
        currency=data.currency,
        frequency=data.frequency.value,
        next_run_date=data.next_run_date,
    )
    db.add(rec)
    await db.flush()
    await db.refresh(rec)
    return rec


@router.get("", response_model=PaginatedResponse[RecurringExpenseOut])
async def list_recurring_expenses(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    total_q = await db.execute(
        select(func.count(RecurringExpense.id))
        .where(RecurringExpense.created_by_id == current_user.id)
    )
    total = total_q.scalar_one()

    result = await db.execute(
        select(RecurringExpense)
        .where(RecurringExpense.created_by_id == current_user.id)
        .order_by(RecurringExpense.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return PaginatedResponse(
        total=total,
        limit=limit,
        offset=offset,
        items=result.scalars().all(),
    )


@router.patch("/{recurring_id}", response_model=RecurringExpenseOut)
async def update_recurring_expense(
    recurring_id: str,
    data: RecurringExpenseUpdate,
    current_user: User = Depends(require_pro),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RecurringExpense).where(
            RecurringExpense.id == recurring_id,
            RecurringExpense.created_by_id == current_user.id,
        )
    )
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurring expense not found")

    if data.description is not None:
        rec.description = data.description
    if data.amount is not None:
        rec.amount = data.amount
    if data.frequency is not None:
        rec.frequency = data.frequency.value
    if data.next_run_date is not None:
        rec.next_run_date = data.next_run_date
    if data.is_active is not None:
        rec.is_active = data.is_active

    await db.flush()
    await db.refresh(rec)
    return rec


@router.delete("/{recurring_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recurring_expense(
    recurring_id: str,
    current_user: User = Depends(require_pro),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RecurringExpense).where(
            RecurringExpense.id == recurring_id,
            RecurringExpense.created_by_id == current_user.id,
        )
    )
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recurring expense not found")

    rec.is_active = False
    await db.flush()
    return None
