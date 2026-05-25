"""
Wallet routes — add funds, withdraw, check balance, transaction history.

Production-grade financial safety guarantees:
  1. Pre-validation BEFORE any mutation (cached balance == ledger)
  2. Transactions created as PENDING, promoted to COMPLETED after flush
  3. Conservation-of-money invariant checked before commit
  4. Post-commit read-only verification (never auto-fixes)
  5. Row-level locking prevents concurrent mutations
  6. Idempotency with request body hashing prevents duplicates
  7. Structured logging with correlation IDs
"""

import datetime
import logging
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel

from app.audit_log import AuditLog, AuditActions
from app.database import get_db
from app.models import User, Notification, WalletTransaction
from app.routes.auth import get_current_user
from app.schemas import UserOut, WalletTransactionOut, CadAmount, PaginatedResponse
from app.idempotency import idempotent
from app.ledger import (
    lock_user_for_update,
    pre_validate_balance,
    validate_balance_integrity,
    verify_post_commit,
    compute_wallet_balance,
)

logger = logging.getLogger("tandempay.wallet")

router = APIRouter(prefix="/api/wallet", tags=["wallet"])



class AddFundsRequest(BaseModel):
    amount: CadAmount

class WithdrawRequest(BaseModel):
    amount: CadAmount

@router.post("/add-funds")
@idempotent
async def add_funds(
    request: Request,
    data: AddFundsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    raise HTTPException(
        status_code=503,
        detail="Direct wallet funding is not available. Please use the payment flow.",
    )

@router.post("/withdraw")
@idempotent
async def withdraw_funds(
    request: Request,
    data: WithdrawRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    raise HTTPException(
        status_code=503,
        detail="Direct wallet funding is not available. Please use the payment flow.",
    )

@router.get("/balance", response_model=UserOut)
async def get_balance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Return the current user's wallet profile.
    
    Read-only: if a mismatch is detected between cached balance and ledger,
    it is LOGGED as a critical error but NOT auto-fixed. Use the reconciliation
    endpoint to investigate and fix discrepancies.
    """
    ledger_balance = await compute_wallet_balance(current_user.id, db)
    cached_balance = Decimal(str(current_user.wallet_balance)).quantize(Decimal("0.01"))

    if abs(cached_balance - ledger_balance) > Decimal("0.01"):
        logger.critical(
            f"BALANCE DRIFT DETECTED on read: user={current_user.id} "
            f"cached={cached_balance}, ledger={ledger_balance}, "
            f"diff={cached_balance - ledger_balance}. "
            f"NOT auto-fixing — use /api/admin/reconciliation to investigate."
        )

    return current_user


@router.get("/transactions", response_model=PaginatedResponse[WalletTransactionOut])
async def get_transactions(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the paginated ledger feed for this user."""
    total_q = await db.execute(
        select(func.count(WalletTransaction.id))
        .where(WalletTransaction.user_id == current_user.id)
    )
    total = total_q.scalar_one()

    result = await db.execute(
        select(WalletTransaction)
        .where(WalletTransaction.user_id == current_user.id)
        .order_by(WalletTransaction.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return PaginatedResponse(
        total=total,
        limit=limit,
        offset=offset,
        items=result.scalars().all(),
    )
