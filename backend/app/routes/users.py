import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.database import get_db
from app.models import User
from app.routes.auth import get_current_user
from app.schemas import UserOut
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/users", tags=["users"])

class UserSearchResult(BaseModel):
    id: str
    name: str
    email: str
    avatar_color: str

@router.get("/search", response_model=list[UserSearchResult])
async def search_users(
    query: str, 
    current_user: User = Depends(get_current_user), 
    db: AsyncSession = Depends(get_db)
):
    if len(query) < 2:
        return []
        
    search_pattern = f"%{query}%"
    result = await db.execute(
        select(User)
        .where(
            User.id != current_user.id,
            or_(
                User.name.ilike(search_pattern),
                User.email.ilike(search_pattern)
            )
        )
        .limit(10)
    )
    users = result.scalars().all()
    
    return [
        UserSearchResult(
            id=u.id,
            name=u.name,
            email=u.email,
            avatar_color=u.avatar_color
        ) for u in users
    ]


_VALID_SHAPES = {"rect", "semi", "round", "tall"}
_HEX_RE = re.compile(r'^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$')


class CharacterUpdate(BaseModel):
    shape: Optional[str] = None
    color: Optional[str] = None
    nickname: Optional[str] = None


@router.patch("/me/character", response_model=UserOut)
async def update_character(
    data: CharacterUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.shape is not None:
        if data.shape not in _VALID_SHAPES:
            raise HTTPException(status_code=422, detail=f"shape must be one of {sorted(_VALID_SHAPES)}")
        current_user.character_shape = data.shape

    if data.color is not None:
        if not _HEX_RE.match(data.color):
            raise HTTPException(status_code=422, detail="color must be a valid hex string (#RGB or #RRGGBB)")
        current_user.character_color = data.color

    if data.nickname is not None:
        stripped = data.nickname.strip()
        current_user.character_nickname = stripped or None

    await db.flush()
    await db.commit()
    await db.refresh(current_user)
    return current_user
