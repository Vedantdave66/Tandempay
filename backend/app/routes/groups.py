from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func, literal
from sqlalchemy.orm import selectinload
from decimal import Decimal
import logging

from app.database import get_db
from app.models import User, Group, GroupMember, Expense
from app.schemas import GroupCreate, GroupOut, GroupListOut, MemberAdd, JoinGroup, GroupMemberOut, PaginatedResponse
from app.routes.auth import get_current_user
from app.services.balance_service import _compute_balances

logger = logging.getLogger("tandempay.groups")
router = APIRouter(prefix="/api/groups", tags=["groups"])


@router.post("", response_model=GroupOut)
async def create_group(data: GroupCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    group = Group(name=data.name, created_by=current_user.id)
    db.add(group)
    await db.flush()

    # Add creator as a member
    member = GroupMember(group_id=group.id, user_id=current_user.id)
    db.add(member)
    await db.flush()
    await db.refresh(group, attribute_names=["members"])

    members_out = [
        GroupMemberOut(user_id=current_user.id, name=current_user.name, email=current_user.email, interac_email=current_user.interac_email, avatar_color=current_user.avatar_color)
    ]

    return GroupOut(
        id=group.id,
        name=group.name,
        created_by=group.created_by,
        created_at=group.created_at,
        members=members_out,
        total_expenses=0,
        # Always show token to creator — they need it to share with invitees.
        invite_token=group.invite_token,
    )


@router.get("", response_model=PaginatedResponse[GroupListOut])
async def list_groups(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    member_q = select(GroupMember.group_id).where(GroupMember.user_id == current_user.id)

    total_q = await db.execute(
        select(sa_func.count(Group.id)).where(Group.id.in_(member_q))
    )
    total = total_q.scalar_one()

    total_subq = (
        select(sa_func.coalesce(sa_func.sum(Expense.amount), literal(Decimal("0"))))
        .where(Expense.group_id == Group.id)
        .correlate(Group)
        .scalar_subquery()
    )

    result = await db.execute(
        select(Group, total_subq.label("total_expenses"))
        .where(Group.id.in_(member_q))
        .options(selectinload(Group.members))
        .order_by(Group.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = result.all()

    out = []
    for g, total_exp in rows:
        out.append(GroupListOut(
            id=g.id,
            name=g.name,
            created_by=g.created_by,
            created_at=g.created_at,
            member_count=len(g.members),
            total_expenses=total_exp,
        ))
    return PaginatedResponse(total=total, limit=limit, offset=offset, items=out)


@router.get("/{group_id}", response_model=GroupOut)
async def get_group(group_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Group)
        .where(Group.id == group_id)
        .options(selectinload(Group.members).selectinload(GroupMember.user))
        .options(selectinload(Group.expenses))
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Check membership
    is_member = any(m.user_id == current_user.id for m in group.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    members_out = [
        GroupMemberOut(user_id=m.user.id, name=m.user.name, email=m.user.email, interac_email=m.user.interac_email, avatar_color=m.user.avatar_color)
        for m in group.members
    ]
    total = sum(e.amount for e in group.expenses)

    return GroupOut(
        id=group.id,
        name=group.name,
        created_by=group.created_by,
        created_at=group.created_at,
        members=members_out,
        total_expenses=total,
        # Expose invite_token to the creator only; None for all other members
        # so the token is never leaked to non-creators via this endpoint.
        invite_token=group.invite_token if group.created_by == current_user.id else None,
    )


@router.post("/{group_id}/members", response_model=GroupMemberOut)
async def add_member(group_id: str, data: MemberAdd, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Verify group exists and user is a member
    result = await db.execute(
        select(Group).where(Group.id == group_id).options(selectinload(Group.members))
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    is_member = any(m.user_id == current_user.id for m in group.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this group")

    # Find user by email
    result = await db.execute(select(User).where(User.email == data.email))
    user_to_add = result.scalar_one_or_none()
    if not user_to_add:
        raise HTTPException(status_code=404, detail="User not found with that email")

    # Check if already a member
    already = any(m.user_id == user_to_add.id for m in group.members)
    if already:
        raise HTTPException(status_code=400, detail="User is already a member")

    member = GroupMember(group_id=group_id, user_id=user_to_add.id)
    db.add(member)
    await db.flush()

    return GroupMemberOut(
        user_id=user_to_add.id,
        name=user_to_add.name,
        email=user_to_add.email,
        interac_email=user_to_add.interac_email,
        avatar_color=user_to_add.avatar_color,
    )


@router.post("/{group_id}/join", response_model=GroupMemberOut)
async def join_group(
    group_id: str,
    data: JoinGroup,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Join a group using its invite token.

    The invite token is shared by the group creator and must match the
    token stored on the group. Without it, group IDs alone are not enough
    to join — prevents enumeration attacks where anyone with a UUID joins.
    """
    result = await db.execute(
        select(Group).where(Group.id == group_id).options(selectinload(Group.members))
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Validate invite token before revealing anything about membership state.
    # Use a constant-time comparison to prevent timing attacks.
    import secrets as _secrets
    if not group.invite_token or not _secrets.compare_digest(
        group.invite_token, data.invite_token
    ):
        raise HTTPException(status_code=403, detail="Invalid invite token")

    # Check if already a member — silently succeed so retries are safe.
    already = any(m.user_id == current_user.id for m in group.members)
    if already:
        return GroupMemberOut(
            user_id=current_user.id,
            name=current_user.name,
            email=current_user.email,
            interac_email=current_user.interac_email,
            avatar_color=current_user.avatar_color,
        )

    member = GroupMember(group_id=group_id, user_id=current_user.id)
    db.add(member)
    await db.flush()

    return GroupMemberOut(
        user_id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        interac_email=current_user.interac_email,
        avatar_color=current_user.avatar_color,
    )


@router.delete("/{group_id}", status_code=204)
async def delete_group(group_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Group).where(Group.id == group_id))
    group = result.scalar_one_or_none()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    if group.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the creator can delete the group")

    try:
        await db.delete(group)
        await db.flush()
    except Exception as e:
        logger.error(f"Error deleting group {group_id}: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Failed to delete group. Ensure all associated Stripe payments are completed or settled first."
        )
    return None


@router.delete("/{group_id}/members/{user_id}", status_code=204)
async def remove_member(group_id: str, user_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Verify group exists
    result = await db.execute(
        select(Group).where(Group.id == group_id).options(selectinload(Group.members))
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Only a member can remove someone, and you can only remove yourself OR the creator can remove anyone
    is_member = any(m.user_id == current_user.id for m in group.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this group")
        
    if current_user.id != user_id and current_user.id != group.created_by:
        raise HTTPException(status_code=403, detail="Only the group creator can remove other members")

    # Find the member record
    result = await db.execute(
        select(GroupMember).where(GroupMember.group_id == group_id, GroupMember.user_id == user_id)
    )
    member_record = result.scalar_one_or_none()
    
    if not member_record:
        raise HTTPException(status_code=404, detail="Member not found in this group")

    # Creator self-removal: transfer ownership or delete the group if last member.
    if user_id == group.created_by:
        remaining = [m for m in group.members if m.user_id != user_id]
        if not remaining:
            # Creator is the last member — delete the whole group.
            await db.delete(group)
            await db.flush()
            return None
        # Transfer ownership to the next oldest member before proceeding.
        group.created_by = remaining[0].user_id

    # PRIMARY GUARD: block removal if the member has any unsettled balance.
    # We pass the current active member set explicitly so _compute_balances
    # doesn't need an extra DB round-trip to fetch the member list.
    active_member_ids = {m.user_id for m in group.members}
    balance_data = await _compute_balances(group_id, db, active_member_ids=active_member_ids)

    paid = balance_data["total_paid"].get(user_id, Decimal("0"))
    owed = balance_data["total_owed"].get(user_id, Decimal("0"))
    adj  = balance_data["settlement_adjustments"].get(user_id, Decimal("0"))
    net_balance = paid - owed + adj

    # Use a $0.01 threshold to tolerate floating-point rounding artefacts.
    if abs(net_balance) > Decimal("0.01"):
        raise HTTPException(
            status_code=400,
            detail="Cannot remove a member with unsettled balances. Settle their debts first.",
        )

    await db.delete(member_record)
    await db.flush()
    return None
