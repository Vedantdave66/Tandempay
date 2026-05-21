import asyncio
import logging
import stripe

logger = logging.getLogger("tandempay.stripe")
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from pydantic import BaseModel
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, ProviderAccount, WalletTransaction, SettlementRecord, Payment, StripeEvent
from app.routes.auth import get_current_user
from app.config import get_settings
from app.idempotency import idempotent

import plaid
from plaid.api import plaid_api
from plaid.model.processor_stripe_bank_account_token_create_request import ProcessorStripeBankAccountTokenCreateRequest

router = APIRouter(prefix="/api/stripe", tags=["Stripe"])
settings = get_settings()

stripe.api_key = settings.STRIPE_SECRET_KEY

# Setup Plaid client for processor token exchange
configuration = plaid.Configuration(
    host=plaid.Environment.Sandbox if settings.PLAID_ENV == 'sandbox' else plaid.Environment.Production,
    api_key={
        'clientId': settings.PLAID_CLIENT_ID,
        'secret': settings.PLAID_SECRET,
    }
)
api_client = plaid.ApiClient(configuration)
plaid_client = plaid_api.PlaidApi(api_client)

class PaymentIntentRequest(BaseModel):
    amount: Decimal
    payee_id: str
    provider_account_id: str

@router.post("/onboard")
async def onboard_user(
    return_path: str = "/dashboard",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Creates a Stripe Express account for the user so they can receive payouts.
    """
    if not current_user.stripe_account_id:
        try:
            account = stripe.Account.create(
                type="express",
                email=current_user.email,
                capabilities={
                    "transfers": {"requested": True},
                },
            )
            current_user.stripe_account_id = account.id
            await db.commit()
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
            
    # Create an onboarding link
    try:
        clean_path = return_path.lstrip("/")
        account_link = stripe.AccountLink.create(
            account=current_user.stripe_account_id,
            refresh_url=f"{settings.FRONTEND_URL}/{clean_path}",
            return_url=f"{settings.FRONTEND_URL}/{clean_path}",
            type="account_onboarding",
        )
        return {"url": account_link.url}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/status")
async def get_onboarding_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.stripe_account_id:
        return {"onboarded": False, "account_id": None, "email": None, "payouts_enabled": False, "dashboard_url": None}
        
    try:
        account = stripe.Account.retrieve(current_user.stripe_account_id)
        
        if account.details_submitted:
            # Check for any pending claims for this user
            result = await db.execute(
                select(Payment).where(
                    Payment.payee_id == current_user.id, 
                    Payment.status == "pending_claim"
                )
            )
            pending_claims = result.scalars().all()
            
            if pending_claims:
                from app.models import Notification

                for p in pending_claims:
                    # Mark it so we don't double-notify
                    p.status = "pending_claim_ready"
                    
                    # Notify the payer
                    notif = Notification(
                        user_id=p.payer_id,
                        type="payment_claim_ready",
                        title="They are ready to be paid!",
                        message=f"{current_user.name} has set up their bank account. You can now send them the ${p.amount / 100:.2f}.",
                        reference_id=p.id,
                        group_id=None
                    )
                    db.add(notif)
                    logger.info(f"Resolved pending claim {p.id}, notified payer {p.payer_id}")
                
                await db.commit()
                
        # Build Stripe Express dashboard link (optional, non-fatal)
        dashboard_url = None
        try:
            login_link = stripe.Account.create_login_link(current_user.stripe_account_id)
            dashboard_url = login_link.url
        except Exception:
            pass

        return {
            "onboarded": account.details_submitted,
            "account_id": current_user.stripe_account_id,
            "email": account.email,
            "payouts_enabled": account.payouts_enabled,
            "dashboard_url": dashboard_url,
        }
    except Exception:
        return {"onboarded": False, "account_id": None, "email": None, "payouts_enabled": False, "dashboard_url": None}



@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    import traceback

    try:
        payload = await request.body()
        sig_header = request.headers.get("Stripe-Signature", "")
        endpoint_secret = settings.STRIPE_WEBHOOK_SECRET
        
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")

        # 1. Webhook Idempotency: Check if already processed
        event_check = await db.execute(select(StripeEvent).where(StripeEvent.id == event.id))
        if event_check.scalars().first():
            logger.info(f"Ignoring duplicate webhook event: {event.id}")
            return {"status": "ignored", "reason": "duplicate"}

        event_logger = f"event_id={event.id} type={event.type}"
        logger.info(f"Processing webhook: {event_logger}")

        if event.type == 'payment_intent.succeeded':
            intent = event.data.object
            metadata = intent.get('metadata', {})
            payment_id = metadata.get("payment_id")
            
            if not payment_id:
                logger.warning(f"No payment_id found in metadata for {event_logger}")
            else:
                result = await db.execute(select(Payment).where(Payment.id == payment_id))
                payment = result.scalars().first()
                
                if payment:
                    if payment.status != "succeeded":
                        # STRICT TRANSFER VALIDATION
                        try:
                            latest_charge_id = intent.get("latest_charge")
                            if latest_charge_id:
                                charge = stripe.Charge.retrieve(latest_charge_id)
                                transfer_id = charge.get("transfer")
                                if transfer_id:
                                    transfer = stripe.Transfer.retrieve(transfer_id)
                                    if transfer.status != "succeeded":
                                        logger.error(f"Transfer {transfer_id} failed for payment {payment_id}")
                                        payment.status = "failed"
                                        await db.commit()
                                        return {"status": "failed"}
                                    logger.info(f"Transfer {transfer_id} verified as succeeded")
                        except Exception as transfer_err:
                            logger.error(f"Transfer validation error: {str(transfer_err)}")

                        payment.status = "succeeded"
                        
                        # Calculate +2 business days for payout arrival
                        from datetime import datetime, timedelta
                        now = datetime.now()
                        days_to_add = 2
                        while days_to_add > 0:
                            now += timedelta(days=1)
                            if now.weekday() < 5:
                                days_to_add -= 1
                        payment.payout_arrival_date = now.strftime("%b %d")

                        if payment.settlement_id and payment.settlement_id != "none":
                            settlement_res = await db.execute(select(SettlementRecord).where(SettlementRecord.id == payment.settlement_id))
                            settlement = settlement_res.scalars().first()
                            if settlement:
                                settlement.status = "settled"
                        logger.info(f"Payment {payment_id} marked as succeeded")
        
        elif event.type == 'payment_intent.payment_failed':
            intent = event.data.object
            metadata = intent.get('metadata', {})
            payment_id = metadata.get("payment_id")
            
            result = await db.execute(select(Payment).where(Payment.id == payment_id))
            payment = result.scalars().first()
            if payment and payment.status not in ["succeeded", "failed"]:
                payment.status = "failed"
                logger.info(f"Payment {payment_id} marked as failed")

        elif event.type == 'payment_intent.canceled':
            intent = event.data.object
            metadata = intent.get('metadata', {})
            payment_id = metadata.get("payment_id")
            
            result = await db.execute(select(Payment).where(Payment.id == payment_id))
            payment = result.scalars().first()
            if payment:
                payment.status = "expired"
                logger.info(f"Payment {payment_id} marked as expired via cancellation")

        elif event.type == 'payment_intent.requires_action':
            # 3DS challenge pending — the user must complete authentication.
            # We mark the DB so the scheduled cleanup can expire it later if they abandon.
            intent = event.data.object
            metadata = intent.get('metadata', {})
            payment_id = metadata.get("payment_id")

            if not payment_id:
                logger.warning(f"payment_intent.requires_action: no payment_id in metadata for {event_logger}")
            else:
                result = await db.execute(select(Payment).where(Payment.id == payment_id))
                payment = result.scalars().first()
                if payment and payment.status not in ("succeeded", "failed", "expired"):
                    payment.status = "requires_action"
                    logger.info(f"Payment {payment_id} requires 3DS action (intent={intent.get('id')})")

        elif event.type == 'charge.dispute.created':
            # A chargeback has been opened — mark the payment disputed and alert ops.
            dispute = event.data.object
            charge_id = dispute.get("charge")
            dispute_id = dispute.get("id")
            dispute_amount = dispute.get("amount", 0) / 100  # Stripe amounts are in cents

            # Look up the Payment by charge ID via the PaymentIntent
            payment = None
            if charge_id:
                import asyncio as _asyncio
                try:
                    charge = await _asyncio.to_thread(
                        lambda: stripe.Charge.retrieve(charge_id)
                    )
                    pi_id = charge.get("payment_intent")
                    if pi_id:
                        result = await db.execute(
                            select(Payment).where(Payment.stripe_payment_intent_id == pi_id)
                        )
                        payment = result.scalars().first()
                except Exception as dispute_err:
                    logger.error(f"charge.dispute.created: could not retrieve charge {charge_id}: {dispute_err}")

            if payment:
                payment.status = "disputed"
                logger.critical(
                    f"DISPUTE CREATED — dispute_id={dispute_id} "
                    f"payment_id={payment.id} "
                    f"amount=${dispute_amount:.2f} "
                    f"charge={charge_id} — IMMEDIATE REVIEW REQUIRED"
                )
            else:
                logger.critical(
                    f"DISPUTE CREATED — dispute_id={dispute_id} "
                    f"charge={charge_id} amount=${dispute_amount:.2f} "
                    f"— could not find matching Payment record"
                )

        elif event.type == 'account.updated':
            # Stripe Connect: a connected account's status changed.
            # If charges_enabled goes False, payouts are suspended — alert ops immediately.
            import asyncio as _asyncio
            account = event.data.object
            account_id = account.get("id")
            charges_enabled = account.get("charges_enabled", True)

            if not charges_enabled:
                # Identify whose account this is for log context
                try:
                    result = await db.execute(
                        select(User).where(User.stripe_account_id == account_id)
                    )
                    affected_user = result.scalars().first()
                    user_ref = f"user_id={affected_user.id}" if affected_user else "unknown user"
                except Exception:
                    user_ref = "unknown user"

                logger.critical(
                    f"STRIPE CONNECT ACCOUNT SUSPENDED — "
                    f"account_id={account_id} {user_ref} "
                    f"charges_enabled=False — payouts are suspended, IMMEDIATE REVIEW REQUIRED"
                )

        # 2. Commit transaction and record the event for idempotency
        new_event = StripeEvent(id=event.id, type=event.type)
        db.add(new_event)
        await db.commit()
        return {"status": "success"}

    except Exception as e:
        error_msg = traceback.format_exc()
        logger.error(f"Webhook error: {error_msg}")
        await db.rollback()
        raise HTTPException(status_code=400, detail="Webhook error")

@router.post("/reconcile/{payment_id}")
async def reconcile_payment(
    payment_id: str,
    db: AsyncSession = Depends(get_db),
    x_admin_secret: str = Header(..., alias="X-Admin-Secret"),
):
    """
    Admin-only: manually reconcile a payment using Stripe as the source of truth.
    Ensures absolute DB-Stripe synchronization.
    Protected by the X-Admin-Secret header — same mechanism as auth admin routes.
    """
    if x_admin_secret != settings.ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalars().first()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
        
    if payment.status == "succeeded":
        return {"status": "succeeded", "resolved": True}
        
    if not payment.stripe_payment_intent_id:
        raise HTTPException(status_code=400, detail="No Stripe intent ID")

    try:
        intent = stripe.PaymentIntent.retrieve(payment.stripe_payment_intent_id)
        logger.info(f"Reconciling {payment_id}: Stripe status={intent.status}")
        
        if intent.status == "succeeded":
            payment.status = "succeeded"
            
            # Calculate +2 business days for payout arrival
            from datetime import datetime, timedelta
            now = datetime.now()
            days_to_add = 2
            while days_to_add > 0:
                now += timedelta(days=1)
                if now.weekday() < 5:
                    days_to_add -= 1
            payment.payout_arrival_date = now.strftime("%b %d")

            if payment.settlement_id and payment.settlement_id != "none":
                settlement_res = await db.execute(select(SettlementRecord).where(SettlementRecord.id == payment.settlement_id))
                settlement = settlement_res.scalars().first()
                if settlement:
                    settlement.status = "settled"
            await db.commit()
            return {"status": "succeeded", "resolved": True}
            
        elif intent.status == "canceled":
            payment.status = "expired"
            await db.commit()
            return {"status": "expired", "resolved": True}

        elif intent.status == "requires_payment_method":
            # If it's requires_payment_method, it likely failed or timed out
            payment.status = "failed"
            await db.commit()
            return {"status": "failed", "resolved": True}

        elif intent.status == "processing":
            payment.status = "processing"
            await db.commit()
            return {"status": "processing", "resolved": False}
            
        return {"status": intent.status, "resolved": False}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Reconciliation failed: {str(e)}")

@router.post("/cleanup")
async def cleanup_payments(
    db: AsyncSession = Depends(get_db),
    x_admin_secret: str = Header(..., alias="X-Admin-Secret"),
):
    """
    Admin-only: expire payments older than 24 h that never reached a terminal state.
    Protected by the X-Admin-Secret header — same mechanism as auth admin routes.
    """
    if x_admin_secret != settings.ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin secret")
    from datetime import datetime, timedelta
    twenty_four_hours_ago = datetime.now() - timedelta(hours=24)
    
    result = await db.execute(
        select(Payment).where(
            Payment.status.in_(["pending", "processing"]),
            Payment.created_at < twenty_four_hours_ago
        )
    )
    payments = result.scalars().all()
    
    count = 0
    for p in payments:
        p.status = "expired"
        count += 1
        
    await db.commit()
    return {"status": "success", "expired_count": count}
