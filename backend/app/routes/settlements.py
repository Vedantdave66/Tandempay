import logging
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload, joinedload

logger = logging.getLogger("tandempay.settlements")

from app.database import get_db
from app.models import User, Group, GroupMember, SettlementRecord, Notification
from app.schemas import SettlementRecordCreate, SettlementRecordOut, SettlementStatusUpdate, PaginatedResponse
from app.routes.auth import get_current_user
from app.idempotency import idempotent
from app.services.audit import log_action
from app.audit_log import AuditActions
from app.services.balance_service import _compute_balances
from app.services.push import push_for_user
from app.services.email_service import email_for_notification

router = APIRouter(prefix="/api/groups/{group_id}/settlement-records", tags=["settlement-records"])


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


def _build_settlement_out(record: SettlementRecord, payer: User, payee: User) -> SettlementRecordOut:
    payer_email_to_use = payer.interac_email if payer.interac_email else payer.email
    payee_email_to_use = payee.interac_email if payee.interac_email else payee.email

    return SettlementRecordOut(
        id=record.id,
        group_id=record.group_id,
        payer_id=payer.id,
        payer_name=payer.name,
        payer_email=payer_email_to_use,
        payer_avatar_color=payer.avatar_color,
        payee_id=payee.id,
        payee_name=payee.name,
        payee_email=payee_email_to_use,
        payee_avatar_color=payee.avatar_color,
        amount=record.amount,
        method=record.method,
        status=record.status,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


def _create_notification(user_id: str, ntype: str, title: str, message: str, group_id: str, reference_id: str | None = None) -> Notification:
    return Notification(
        user_id=user_id,
        type=ntype,
        title=title,
        message=message,
        group_id=group_id,
        reference_id=reference_id,
    )


@router.post("", response_model=SettlementRecordOut)
@idempotent
async def create_settlement(
    group_id: str,
    data: SettlementRecordCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Initiate a settlement — payer starts the process."""
    group = await _verify_membership(group_id, current_user.id, db)

    # Verify payee is a member
    member_ids = {m.user_id for m in group.members}
    if data.payee_id not in member_ids:
        raise HTTPException(status_code=400, detail="Payee is not a group member")

    if data.payee_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot settle with yourself")

    # Validate amount does not exceed actual debt
    balance_data = await _compute_balances(group_id, db)
    paid = balance_data["total_paid"].get(current_user.id, Decimal("0"))
    owed = balance_data["total_owed"].get(current_user.id, Decimal("0"))
    adj  = balance_data["settlement_adjustments"].get(current_user.id, Decimal("0"))
    net  = paid - owed + adj
    max_settleable = abs(net) if net < Decimal("0") else Decimal("0")
    if max_settleable == Decimal("0"):
        raise HTTPException(status_code=400, detail="You have no outstanding debt to this member.")
    if data.amount > max_settleable + Decimal("0.01"):
        raise HTTPException(
            status_code=400,
            detail=f"Settlement amount exceeds outstanding debt. Maximum: ${max_settleable:.2f}",
        )

    # Create the record
    record = SettlementRecord(
        group_id=group_id,
        payer_id=current_user.id,
        payee_id=data.payee_id,
        amount=data.amount,
        method=data.method,
        status="pending",
    )
    db.add(record)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        logger.warning(
            "Duplicate active settlement blocked: group=%s payer=%s payee=%s",
            group_id, current_user.id, data.payee_id,
        )
        raise HTTPException(
            status_code=409,
            detail="An active settlement already exists for this pair. Resolve it before creating another.",
        )
    await db.refresh(record)

    # Get payee user for notification + output
    payee_result = await db.execute(select(User).where(User.id == data.payee_id))
    payee = payee_result.scalar_one()

    # Notify the payee
    notif = _create_notification(
        user_id=payee.id,
        ntype="settlement_requested",
        title="Settlement Requested",
        message=f"{current_user.name} wants to send you ${data.amount:.2f} via {data.method.replace('_', '-')}",
        group_id=group_id,
        reference_id=record.id,
    )
    db.add(notif)
    await db.flush()
    await push_for_user(payee, notif.title, notif.message, notif.id)
    await email_for_notification(payee.email, notif.type, notif.title, notif.message)

    await log_action(
        db=db,
        actor_id=current_user.id,
        action=AuditActions.SETTLEMENT_INITIATED,
        entity_type="settlement",
        entity_id=record.id,
        group_id=group_id,
        action_metadata={
            "amount": float(data.amount),
            "method": data.method,
        },
    )

    return _build_settlement_out(record, current_user, payee)


@router.get("", response_model=PaginatedResponse[SettlementRecordOut])
async def list_settlements(
    group_id: str,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List settlement records for a group, newest first."""
    await _verify_membership(group_id, current_user.id, db)

    total_q = await db.execute(
        select(func.count(SettlementRecord.id))
        .where(SettlementRecord.group_id == group_id)
    )
    total = total_q.scalar_one()

    result = await db.execute(
        select(SettlementRecord)
        .where(SettlementRecord.group_id == group_id)
        .order_by(SettlementRecord.created_at.desc())
        .options(joinedload(SettlementRecord.payer), joinedload(SettlementRecord.payee))
        .limit(limit)
        .offset(offset)
    )
    records = result.unique().scalars().all()

    return PaginatedResponse(
        total=total,
        limit=limit,
        offset=offset,
        items=[_build_settlement_out(r, r.payer, r.payee) for r in records],
    )


@router.put("/{settlement_id}/status", response_model=SettlementRecordOut)
@idempotent
async def update_settlement_status(
    group_id: str,
    settlement_id: str,
    data: SettlementStatusUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update the status of a settlement record.
    
    - Payer can update: pending -> sent
    - Payee can update: sent -> settled or sent -> declined
    """
    await _verify_membership(group_id, current_user.id, db)

    # BEFORE: bare select then 2 separate User queries after the status update
    # AFTER:  single JOIN loads payer + payee; captured in locals before flush expires them
    result = await db.execute(
        select(SettlementRecord)
        .where(
            SettlementRecord.id == settlement_id,
            SettlementRecord.group_id == group_id,
        )
        .options(joinedload(SettlementRecord.payer), joinedload(SettlementRecord.payee))
    )
    record = result.unique().scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Settlement not found")

    payer = record.payer
    payee = record.payee

    # Authorization checks
    valid_transitions = {
        # payer actions
        ("pending", "sent"): record.payer_id,
        # payee actions
        ("sent", "settled"): record.payee_id,
        ("sent", "declined"): record.payee_id,
    }

    transition = (record.status, data.status)
    allowed_user = valid_transitions.get(transition)
    if allowed_user is None:
        raise HTTPException(status_code=400, detail=f"Invalid status transition: {record.status} → {data.status}")
    if allowed_user != current_user.id:
        raise HTTPException(status_code=403, detail="You are not authorized for this action")

    record.status = data.status
    await db.flush()
    await db.refresh(record)

    # Send notification based on transition
    if data.status == "sent":
        notif = _create_notification(
            user_id=payee.id,
            ntype="payment_sent",
            title="Payment Sent",
            message=f"{payer.name} marked ${record.amount:.2f} as sent. Please confirm when received.",
            group_id=group_id,
            reference_id=record.id,
        )
        db.add(notif)
    elif data.status == "settled":
        notif = _create_notification(
            user_id=payer.id,
            ntype="payment_confirmed",
            title="Payment Confirmed",
            message=f"{payee.name} confirmed receiving ${record.amount:.2f}. Debt settled!",
            group_id=group_id,
            reference_id=record.id,
        )
        db.add(notif)
    elif data.status == "declined":
        notif = _create_notification(
            user_id=payer.id,
            ntype="payment_declined",
            title="Payment Not Received",
            message=f"{payee.name} has not received your ${record.amount:.2f} payment yet.",
            group_id=group_id,
            reference_id=record.id,
        )
        db.add(notif)

    await db.flush()
    if data.status == "sent":
        await push_for_user(payee, notif.title, notif.message, notif.id)
        await email_for_notification(payee.email, notif.type, notif.title, notif.message)
    elif data.status in ("settled", "declined"):
        await push_for_user(payer, notif.title, notif.message, notif.id)
        await email_for_notification(payer.email, notif.type, notif.title, notif.message)

    # Derive audit action from the new status value.
    # "sent" is a payer-internal step; only payee-driven transitions
    # (settled → confirmed, declined → rejected) produce audit entries.
    _AUDIT_STATUS_MAP = {
        "settled": AuditActions.SETTLEMENT_CONFIRMED,
        "declined": AuditActions.SETTLEMENT_REJECTED,
    }
    audit_action = _AUDIT_STATUS_MAP.get(data.status)
    if audit_action:
        await log_action(
            db=db,
            actor_id=current_user.id,
            action=audit_action,
            entity_type="settlement",
            entity_id=record.id,
            group_id=group_id,
            action_metadata={
                "amount": float(record.amount),
                "method": record.method,
                "status_from": transition[0],
                "status_to": data.status,
            },
        )

    await db.commit()
    return _build_settlement_out(record, payer, payee)
