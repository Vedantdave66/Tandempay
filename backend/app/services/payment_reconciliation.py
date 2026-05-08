import logging
import asyncio
from datetime import datetime, timedelta
import stripe
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import engine
from app.models import Payment, SettlementRecord
from app.config import get_settings

settings = get_settings()
stripe.api_key = settings.STRIPE_SECRET_KEY
logger = logging.getLogger("splitease.reconciliation")

async def run_payment_reconciliation():
    """
    Background job to reconcile stuck payments and cleanup expired ones.

    Three passes per run:
      1. Reconcile 'processing' payments >15 min old against Stripe.
      2. Expire/recover 'requires_action' payments >1 hour old (3DS abandoned).
      3. Hard-expire any payment still in pending/processing after 24 h.
    """
    logger.info("Starting automated payment reconciliation...")
    
    async with AsyncSession(engine) as db:
        # ── Pass 1: Reconcile 'processing' payments older than 15 mins ──────────
        fifteen_mins_ago = datetime.now() - timedelta(minutes=15)
        result = await db.execute(
            select(Payment).where(
                Payment.status == "processing",
                Payment.updated_at < fifteen_mins_ago
            )
        )
        stuck_payments = result.scalars().all()
        
        for p in stuck_payments:
            if not p.stripe_payment_intent_id:
                continue
                
            try:
                intent = await asyncio.to_thread(
                    stripe.PaymentIntent.retrieve, p.stripe_payment_intent_id
                )
                logger.info(f"Reconciling payment {p.id}: Stripe status is {intent.status}")
                
                if intent.status == "succeeded":
                    p.status = "succeeded"
                    if p.settlement_id:
                        settlement_res = await db.execute(select(SettlementRecord).where(SettlementRecord.id == p.settlement_id))
                        settlement = settlement_res.scalars().first()
                        if settlement:
                            settlement.status = "settled"
                elif intent.status in ["canceled", "requires_payment_method"]:
                    p.status = "failed"
            except Exception as e:
                logger.error(f"Failed to reconcile payment {p.id}: {str(e)}")

        # ── Pass 2: Expire 'requires_action' payments older than 1 hour ─────────
        # These are stuck in 3DS. If the user abandoned the challenge, Stripe
        # still shows requires_action — we expire them and reset the linked
        # SettlementRecord to 'pending' so the user can initiate a fresh payment.
        # If Stripe shows 'succeeded' (webhook missed), we recover them instead.
        one_hour_ago = datetime.now() - timedelta(hours=1)
        ra_result = await db.execute(
            select(Payment).where(
                Payment.status == "requires_action",
                Payment.updated_at < one_hour_ago
            )
        )
        requires_action_payments = ra_result.scalars().all()

        for p in requires_action_payments:
            if not p.stripe_payment_intent_id:
                # No way to check Stripe — expire it defensively
                p.status = "expired"
                logger.warning(f"Expiring requires_action payment {p.id}: no stripe_payment_intent_id")
                continue

            try:
                intent = await asyncio.to_thread(
                    stripe.PaymentIntent.retrieve, p.stripe_payment_intent_id
                )
                stripe_status = intent.status
                logger.info(f"requires_action check for payment {p.id}: Stripe status={stripe_status}")

                if stripe_status == "succeeded":
                    # Webhook was missed — recover the payment
                    p.status = "succeeded"
                    if p.settlement_id:
                        s_res = await db.execute(
                            select(SettlementRecord).where(SettlementRecord.id == p.settlement_id)
                        )
                        settlement = s_res.scalars().first()
                        if settlement:
                            settlement.status = "settled"
                    logger.info(f"Recovered missed-webhook payment {p.id} -> succeeded")

                elif stripe_status == "requires_action":
                    # Still waiting for 3DS and it's been >1 h — user abandoned.
                    # Reset the linked settlement so the user can retry.
                    p.status = "expired"
                    if p.settlement_id:
                        s_res = await db.execute(
                            select(SettlementRecord).where(SettlementRecord.id == p.settlement_id)
                        )
                        settlement = s_res.scalars().first()
                        if settlement and settlement.status not in ("settled", "declined"):
                            settlement.status = "pending"
                            logger.info(
                                f"Reset settlement {p.settlement_id} to pending "
                                f"after 3DS timeout on payment {p.id}"
                            )
                    logger.info(f"Expired abandoned 3DS payment {p.id}")

                else:
                    # canceled / requires_payment_method / failed
                    p.status = "expired"
                    logger.info(f"Expiring requires_action payment {p.id}: Stripe={stripe_status}")

            except Exception as e:
                logger.error(f"Failed to check requires_action payment {p.id}: {str(e)}")

        # ── Pass 3: Hard-expire payments older than 24 h still in soft states ───
        twenty_four_hours_ago = datetime.now() - timedelta(hours=24)
        expire_result = await db.execute(
            select(Payment).where(
                Payment.status.in_(["pending", "processing"]),
                Payment.created_at < twenty_four_hours_ago
            )
        )
        expired_payments = expire_result.scalars().all()
        for p in expired_payments:
            logger.info(f"Expiring payment {p.id}")
            p.status = "expired"

        await db.commit()
    logger.info("Payment reconciliation finished.")

