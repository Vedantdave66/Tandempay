import logging

import stripe
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models import User
from app.routes.auth import get_current_user

logger = logging.getLogger("tandempay.subscription")

router = APIRouter(prefix="/api/subscription", tags=["Subscription"])
settings = get_settings()

stripe.api_key = settings.STRIPE_SECRET_KEY


async def _get_or_create_stripe_customer(user: User, db: AsyncSession) -> str:
    """Return existing stripe_customer_id or create a new Stripe Customer and persist it."""
    if user.stripe_customer_id:
        return user.stripe_customer_id

    customer = stripe.Customer.create(
        email=user.email,
        name=user.name,
        metadata={"user_id": user.id},
    )
    user.stripe_customer_id = customer.id
    await db.commit()
    return customer.id


@router.post("/checkout")
async def create_checkout_session(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Checkout Session for the Pro subscription plan."""
    if not settings.STRIPE_PRO_PRICE_ID:
        raise HTTPException(status_code=500, detail="Pro plan not configured")

    try:
        customer_id = await _get_or_create_stripe_customer(current_user, db)
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": settings.STRIPE_PRO_PRICE_ID, "quantity": 1}],
            success_url=f"{settings.FRONTEND_URL}/pro-success",
            cancel_url=f"{settings.FRONTEND_URL}/settings?subscription=cancelled",
            metadata={"user_id": current_user.id},
        )
        return {"checkout_url": session.url}
    except stripe.error.StripeError as e:
        logger.error(f"Stripe checkout session error for user {current_user.id}: {e}")
        raise HTTPException(status_code=400, detail=str(e.user_message or e))


@router.post("/portal")
async def create_portal_session(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Customer Portal session for managing/cancelling the subscription."""
    try:
        customer_id = await _get_or_create_stripe_customer(current_user, db)
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f"{settings.FRONTEND_URL}/settings",
        )
        return {"portal_url": session.url}
    except stripe.error.StripeError as e:
        logger.error(f"Stripe portal session error for user {current_user.id}: {e}")
        raise HTTPException(status_code=400, detail=str(e.user_message or e))


@router.get("/status")
async def get_subscription_status(
    current_user: User = Depends(get_current_user),
):
    """Return the current user's subscription tier and Stripe customer ID."""
    return {
        "tier": current_user.subscription_tier.value,
        "stripe_customer_id": current_user.stripe_customer_id,
    }
