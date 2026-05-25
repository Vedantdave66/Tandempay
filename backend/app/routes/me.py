from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, text, func
from sqlalchemy.orm import selectinload, joinedload

from app.database import get_db
from app.models import User, Group, GroupMember, SettlementRecord, Expense, ExpenseParticipant
from app.schemas import SettlementRecordOut, UserOut, PaginatedResponse
from app.routes.auth import get_current_user

router = APIRouter(prefix="/api/me", tags=["me"])

@router.get("/payments", response_model=PaginatedResponse[SettlementRecordOut])
async def get_my_payments(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all settlement records where the user is either the payer or the payee."""
    where_clause = or_(
        SettlementRecord.payer_id == current_user.id,
        SettlementRecord.payee_id == current_user.id,
    )

    total_q = await db.execute(
        select(func.count(SettlementRecord.id)).where(where_clause)
    )
    total = total_q.scalar_one()

    result = await db.execute(
        select(SettlementRecord)
        .where(where_clause)
        .order_by(SettlementRecord.created_at.desc())
        .options(joinedload(SettlementRecord.payer), joinedload(SettlementRecord.payee))
        .limit(limit)
        .offset(offset)
    )
    records = result.unique().scalars().all()

    items = []
    for r in records:
        payer = r.payer
        payee = r.payee
        items.append(SettlementRecordOut(
            id=r.id,
            group_id=r.group_id,
            payer_id=payer.id,
            payer_name=payer.name,
            payer_email=payer.interac_email or payer.email,
            payer_avatar_color=payer.avatar_color,
            payee_id=payee.id,
            payee_name=payee.name,
            payee_email=payee.interac_email or payee.email,
            payee_avatar_color=payee.avatar_color,
            amount=r.amount,
            status=r.status,
            method=r.method,
            created_at=r.created_at,
            updated_at=r.updated_at,
        ))

    return PaginatedResponse(total=total, limit=limit, offset=offset, items=items)


@router.get("/friends", response_model=dict)
async def get_my_friends(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all users the current user shares a group with OR has an accepted friend request with."""
    from app.models import FriendRequest
    
    friends_dict = {}

    # 1. Find all groups the user is part of
    my_groups_result = await db.execute(select(GroupMember.group_id).where(GroupMember.user_id == current_user.id))
    my_group_ids = [g for g in my_groups_result.scalars().all()]
    
    if my_group_ids:
        # Find all unique members in those groups (excluding the current user)
        group_friends_result = await db.execute(
            select(User).join(GroupMember, User.id == GroupMember.user_id)
            .where(GroupMember.group_id.in_(my_group_ids), User.id != current_user.id)
            .distinct()
        )
        for f in group_friends_result.scalars().all():
            friends_dict[f.id] = f

    # 2. Find friends from sent accepted friend requests
    sent_requests_stmt = select(User).join(
        FriendRequest, func.lower(User.email) == func.lower(FriendRequest.receiver_email)
    ).where(
        FriendRequest.sender_id == current_user.id,
        FriendRequest.status == 'accepted'
    )
    sent_friends_result = await db.execute(sent_requests_stmt)
    for f in sent_friends_result.scalars().all():
        friends_dict[f.id] = f
        
    # 3. Find friends from received accepted friend requests
    received_requests_stmt = select(User).join(
        FriendRequest, User.id == FriendRequest.sender_id
    ).where(
        func.lower(FriendRequest.receiver_email) == func.lower(current_user.email),
        FriendRequest.status == 'accepted'
    )
    received_friends_result = await db.execute(received_requests_stmt)
    for f in received_friends_result.scalars().all():
        friends_dict[f.id] = f

    all_friends = [
        {
            "id": f.id,
            "name": f.name,
            "email": f.email,
            "avatar_color": f.avatar_color,
            "shared_groups_count": 0,
        }
        for f in friends_dict.values()
    ]
    total = len(all_friends)
    items = all_friends[offset: offset + limit]
    return {"total": total, "limit": limit, "offset": offset, "items": items}
