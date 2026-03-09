from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func
from typing import List

from app.database import get_db
from app.models import User, FriendRequest, Notification, Group, GroupMember
from app.schemas import FriendRequestCreate, FriendRequestOut, UserOut
from app.routes.auth import get_current_user

router = APIRouter(prefix="/api/friends", tags=["friends"])

@router.post("/requests", response_model=FriendRequestOut)
async def send_friend_request(
    request_data: FriendRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send a friend request to an email address."""
    email = request_data.email.lower().strip()
    
    if email == current_user.email.lower():
        raise HTTPException(status_code=400, detail="You cannot send a friend request to yourself.")
        
    # Check if a pending request already exists
    stmt = select(FriendRequest).where(
        FriendRequest.sender_id == current_user.id,
        func.lower(FriendRequest.receiver_email) == email,
        FriendRequest.status == "pending"
    )
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="A pending request to this email already exists.")

    # Create the request
    new_request = FriendRequest(
        sender_id=current_user.id,
        receiver_email=email,
        status="pending"
    )
    db.add(new_request)

    # If the receiver is already registered, create an in-app notification
    target_user_stmt = select(User).where(func.lower(User.email) == email)
    target_result = await db.execute(target_user_stmt)
    target_user = target_result.scalar_one_or_none()
    
    if target_user:
        # Check if they sent US a request already
        reverse_stmt = select(FriendRequest).where(
            FriendRequest.sender_id == target_user.id,
            func.lower(FriendRequest.receiver_email) == current_user.email.lower(),
            FriendRequest.status == "pending"
        )
        reverse_result = await db.execute(reverse_stmt)
        if reverse_result.scalar_one_or_none():
             raise HTTPException(status_code=400, detail="This user has already sent you a request. Check your received requests.")
             
        # Generate notification
        notification = Notification(
            user_id=target_user.id,
            type="friend_request",
            title="New Friend Request",
            message=f"{current_user.name} sent you a friend request.",
            reference_id=new_request.id
        )
        db.add(notification)

    await db.commit()
    await db.refresh(new_request)
    
    out = FriendRequestOut.model_validate(new_request)
    out.sender_name = current_user.name
    out.sender_avatar = current_user.avatar_color
    return out


@router.get("/requests/pending", response_model=dict)
async def get_pending_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all pending sent and received requests."""
    # Sent requests
    sent_stmt = select(FriendRequest).where(
        FriendRequest.sender_id == current_user.id,
        FriendRequest.status == "pending"
    ).order_by(FriendRequest.created_at.desc())
    
    # Received requests
    received_stmt = select(FriendRequest, User).join(
        User, FriendRequest.sender_id == User.id
    ).where(
        func.lower(FriendRequest.receiver_email) == current_user.email.lower(),
        FriendRequest.status == "pending"
    ).order_by(FriendRequest.created_at.desc())
    
    sent_results = await db.execute(sent_stmt)
    received_results = await db.execute(received_stmt)
    
    sent = []
    for req in sent_results.scalars().all():
        out = FriendRequestOut.model_validate(req)
        out.sender_name = current_user.name
        out.sender_avatar = current_user.avatar_color
        sent.append(out)
        
    received = []
    for req, sender in received_results.all():
        out = FriendRequestOut.model_validate(req)
        out.sender_name = sender.name
        out.sender_avatar = sender.avatar_color
        received.append(out)

    return {
        "sent": sent,
        "received": received
    }


@router.put("/requests/{request_id}/accept")
async def accept_request(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Accept a friend request and notify the sender."""
    stmt = select(FriendRequest).where(
        FriendRequest.id == request_id,
        func.lower(FriendRequest.receiver_email) == current_user.email.lower()
    )
    result = await db.execute(stmt)
    req = result.scalar_one_or_none()
    
    if not req:
        raise HTTPException(status_code=404, detail="Request not found or unauthorized.")
        
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Request is already processed.")
        
    req.status = "accepted"
    
    # Notify the sender
    notification = Notification(
        user_id=req.sender_id,
        type="friend_accepted",
        title="Friend Request Accepted",
        message=f"{current_user.name} accepted your friend request.",
        reference_id=req.id
    )
    db.add(notification)
    
    await db.commit()
    return {"status": "success", "message": "Request accepted"}


@router.put("/requests/{request_id}/decline")
async def decline_request(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Decline a friend request."""
    stmt = select(FriendRequest).where(
        FriendRequest.id == request_id,
        func.lower(FriendRequest.receiver_email) == current_user.email.lower()
    )
    result = await db.execute(stmt)
    req = result.scalar_one_or_none()
    
    if not req:
        raise HTTPException(status_code=404, detail="Request not found or unauthorized.")
        
    if req.status != "pending":
        raise HTTPException(status_code=400, detail="Request is already processed.")
        
    req.status = "declined"
    await db.commit()
    return {"status": "success", "message": "Request declined"}
