from fastapi import Depends, HTTPException, status

from app.models import User, SubscriptionTier
from app.routes.auth import get_current_user


async def require_pro(current_user: User = Depends(get_current_user)) -> User:
    if current_user.subscription_tier != SubscriptionTier.pro:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Pro subscription required",
        )
    return current_user
