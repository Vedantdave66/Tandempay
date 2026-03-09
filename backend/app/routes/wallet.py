from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.models import User, Notification
from app.routes.auth import get_current_user
from app.schemas import UserOut

router = APIRouter(prefix="/api/wallet", tags=["wallet"])

class AddFundsRequest(BaseModel):
    amount: float
    source: str = "Bank Account"

@router.post("/add-funds", response_model=UserOut)
async def add_funds(
    request: AddFundsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Simulate adding funds from an external bank account to the SplitEase wallet."""
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
        
    if request.amount > 10000:
        raise HTTPException(status_code=400, detail="Maximum add funds limit is $10,000 at a time")

    # Increment balance
    current_user.wallet_balance += request.amount
    
    # Generate notification
    notif = Notification(
        user_id=current_user.id,
        type="payment_confirmed",  # Reusing this type for the green check icon
        title="Funds Added",
        message=f"Successfully added ${request.amount:.2f} from {request.source}."
    )
    db.add(notif)
    
    await db.commit()
    await db.refresh(current_user)
    
    return current_user


@router.get("/balance", response_model=UserOut)
async def get_balance(
    current_user: User = Depends(get_current_user)
):
    """Return the current user's wallet profile."""
    return current_user
