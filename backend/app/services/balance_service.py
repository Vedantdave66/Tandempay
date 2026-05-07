from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from decimal import Decimal

from app.database import get_db
from app.models import User, Group, GroupMember, Expense, ExpenseParticipant, SettlementRecord
from app.schemas import UserBalance, Settlement
from app.routes.auth import get_current_user

router = APIRouter(prefix="/api/groups/{group_id}", tags=["balances"])


async def _verify_membership(group_id: str, user_id: str, db: AsyncSession) -> Group:
    result = await db.execute(
        select(Group).where(Group.id == group_id).options(selectinload(Group.members).selectinload(GroupMember.user))
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    is_member = any(m.user_id == user_id for m in group.members)
    if not is_member:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    return group


async def _compute_balances(group_id: str, db: AsyncSession) -> dict:
    """Compute net balance for each user in the group.

    Returns a dict with three keys:
      - total_paid:             amount each user paid across all expenses
      - total_owed:             amount each user owes across all expenses
      - settlement_adjustments: net adjustment per user from confirmed settlements
                                (positive = debt reduced, negative = credit consumed)

    Callers must apply settlement_adjustments when computing net balance:
        net = total_paid[uid] - total_owed[uid] + settlement_adjustments[uid]
    """
    # --- Step 1: Accumulate expense debts ---
    result = await db.execute(
        select(Expense)
        .where(Expense.group_id == group_id)
        .options(selectinload(Expense.participants))
    )
    expenses = result.scalars().all()

    total_paid: dict[str, Decimal] = {}
    total_owed: dict[str, Decimal] = {}

    for expense in expenses:
        # The payer paid the full expense amount
        total_paid[expense.paid_by] = total_paid.get(expense.paid_by, Decimal("0")) + expense.amount

        # Each participant owes their individual share
        for p in expense.participants:
            total_owed[p.user_id] = total_owed.get(p.user_id, Decimal("0")) + p.share_amount

    # --- Step 2: Subtract confirmed settlements from the net balance ---
    # Only rows with status == "settled" are counted. "pending", "sent", and
    # "declined" records are intentionally excluded because the payee has not
    # yet confirmed receipt, so the debt is not yet legally cleared.
    #
    # For each confirmed settlement (payer → payee, amount):
    #   • payer's net improves by `amount`  — their debt is cleared
    #   • payee's net decreases by `amount` — they consumed their credit
    #
    # These are stored separately (not merged into total_paid/total_owed) so
    # that the raw expense figures remain accurate for display purposes.
    sr_result = await db.execute(
        select(SettlementRecord).where(
            SettlementRecord.group_id == group_id,
            SettlementRecord.status == "settled",
        )
    )
    settled_records = sr_result.scalars().all()

    settlement_adjustments: dict[str, Decimal] = {}
    for sr in settled_records:
        # Payer paid off debt → their net balance improves
        settlement_adjustments[sr.payer_id] = (
            settlement_adjustments.get(sr.payer_id, Decimal("0")) + sr.amount
        )
        # Payee received payment → their net credit is consumed
        settlement_adjustments[sr.payee_id] = (
            settlement_adjustments.get(sr.payee_id, Decimal("0")) - sr.amount
        )

    return {
        "total_paid": total_paid,
        "total_owed": total_owed,
        "settlement_adjustments": settlement_adjustments,
    }


@router.get("/balances", response_model=list[UserBalance])
async def get_balances(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group = await _verify_membership(group_id, current_user.id, db)
    data = await _compute_balances(group_id, db)

    balances = []
    for member in group.members:
        user = member.user
        paid = data["total_paid"].get(user.id, Decimal("0"))
        owed = data["total_owed"].get(user.id, Decimal("0"))
        adj  = data["settlement_adjustments"].get(user.id, Decimal("0"))
        net  = paid - owed + adj
        balances.append(UserBalance(
            user_id=user.id,
            name=user.name,
            avatar_color=user.avatar_color,
            total_paid=paid,
            total_owed=owed,
            net_balance=net,
        ))

    return balances


@router.get("/settlements", response_model=list[Settlement])
async def get_settlements(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    group = await _verify_membership(group_id, current_user.id, db)
    data = await _compute_balances(group_id, db)

    # Build user info map
    user_info = {}
    for member in group.members:
        user = member.user
        # Prioritize interac_email if they have one, otherwise fallback to their login email
        email_to_use = user.interac_email if user.interac_email else user.email
        user_info[user.id] = {"name": user.name, "email": email_to_use, "avatar_color": user.avatar_color}

    # Compute net balances, including any confirmed settlement adjustments.
    # settlement_adjustments user IDs are included in the universe so that a
    # user who appears only in settlements (and no expenses) is still considered.
    net: dict[str, Decimal] = {}
    all_user_ids = (
        set(data["total_paid"].keys())
        | set(data["total_owed"].keys())
        | set(data["settlement_adjustments"].keys())
    )
    for uid in all_user_ids:
        paid    = data["total_paid"].get(uid, Decimal("0"))
        owed    = data["total_owed"].get(uid, Decimal("0"))
        adj     = data["settlement_adjustments"].get(uid, Decimal("0"))
        balance = paid - owed + adj
        if abs(balance) > Decimal("0.01"):
            net[uid] = balance

    # Greedy debt simplification
    creditors = sorted(
        [(uid, bal) for uid, bal in net.items() if bal > Decimal("0")],
        key=lambda x: -x[1]
    )
    debtors = sorted(
        [(uid, -bal) for uid, bal in net.items() if bal < Decimal("0")],
        key=lambda x: -x[1]
    )

    settlements = []
    i, j = 0, 0
    while i < len(creditors) and j < len(debtors):
        creditor_id, credit = creditors[i]
        debtor_id, debt = debtors[j]

        amount = min(credit, debt)
        if amount > Decimal("0.01"):
            c_info = user_info.get(creditor_id, {"name": "Unknown", "email": "", "avatar_color": "#3ECF8E"})
            d_info = user_info.get(debtor_id, {"name": "Unknown", "email": "", "avatar_color": "#3ECF8E"})
            settlements.append(Settlement(
                from_user_id=debtor_id,
                from_user_name=d_info["name"],
                from_user_email=d_info["email"],
                from_avatar_color=d_info["avatar_color"],
                to_user_id=creditor_id,
                to_user_name=c_info["name"],
                to_user_email=c_info["email"],
                to_avatar_color=c_info["avatar_color"],
                amount=amount,
            ))

        credit -= amount
        debt -= amount
        if credit < Decimal("0.01"):
            i += 1
        else:
            creditors[i] = (creditor_id, credit)
        if debt < Decimal("0.01"):
            j += 1
        else:
            debtors[j] = (debtor_id, debt)

    return settlements
