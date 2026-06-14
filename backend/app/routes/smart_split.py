import ast
import json
import re
import httpx
import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User
from app.database import get_db
from app.routes.auth import get_current_user

router = APIRouter(prefix="/api/smart-split", tags=["smart-split"])

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.5-flash:generateContent"
)


class SmartSplitRequest(BaseModel):
    description: str
    group_id: str
    member_ids: List[str]


class SplitEntry(BaseModel):
    user_id: str
    amount: float
    note: str = ""


class SmartSplitResponse(BaseModel):
    title: str = ""
    total: float = 0.0
    splits: List[SplitEntry] = []
    needs_total: Optional[bool] = None
    parse_failed: Optional[bool] = None


def _build_prompt(members: dict, description: str) -> str:
    member_list = ", ".join(
        f'"{name}" (id: {uid})' for uid, name in members.items()
    )
    return f"""You are parsing a natural language expense description for a bill-splitting app.
Group members: {member_list}
Description: {description}

Return JSON only:
{{
  "title": "string (short expense name, max 40 chars)",
  "total": number (total amount as a number, 0 if not mentioned),
  "needs_total": boolean (true only if total amount is not mentioned in the description),
  "splits": [
    {{"user_id": "string", "amount": number, "note": "string"}}
  ]
}}

Rules:
- title: concise name for the expense (e.g. "Thai Dinner", "Groceries", "Uber")
- If total is mentioned, splits must sum to exactly that total
- Distribute evenly by default among all members
- If someone is excluded ("X didn't have Y", "X skipped"), reduce their share and redistribute the remainder
- If no total is mentioned, return amounts as 0 and set needs_total: true
- notes: short phrase explaining why someone pays more or less (e.g. "skipped drinks", "extra pizza") — empty string if no adjustment
- Every member must appear in splits with their exact user_id
- Return ONLY valid JSON, no markdown fences, no explanation"""


def _extract_json(text: str) -> dict:
    # Step A: direct parse
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError):
        pass

    # Step B: strip markdown fences
    stripped = re.sub(r"```[a-z]*\n?", "", text).strip()
    try:
        return json.loads(stripped)
    except (json.JSONDecodeError, ValueError):
        pass

    # Step C: first {...} block
    match = re.search(r"\{.*\}", stripped, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except (json.JSONDecodeError, ValueError):
            pass

    # Step D: Python literal parser (handles single-quoted JSON-like output)
    try:
        result = ast.literal_eval(text)
        if isinstance(result, dict):
            return result
    except (ValueError, SyntaxError):
        pass

    raise ValueError("All JSON extraction steps failed")


def _coerce_amount(raw) -> float:
    try:
        return float(str(raw).replace("$", "").replace(",", "").strip())
    except (TypeError, ValueError):
        return 0.0


@router.post("", response_model=SmartSplitResponse)
async def smart_split(
    body: SmartSplitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not body.description.strip():
        raise HTTPException(status_code=400, detail="description is required")
    if not body.member_ids:
        raise HTTPException(status_code=400, detail="member_ids is required")
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

    # Fetch member names from DB
    users_result = await db.execute(
        select(User).where(User.id.in_(body.member_ids))
    )
    users_by_id = {str(u.id): u.name for u in users_result.scalars().all()}

    # Ensure current user is represented
    if str(current_user.id) not in users_by_id:
        users_by_id[str(current_user.id)] = current_user.name

    # Fill any unresolved IDs with a placeholder so Gemini sees all members
    for mid in body.member_ids:
        if mid not in users_by_id:
            users_by_id[mid] = "Member"

    prompt = _build_prompt(users_by_id, body.description.strip())

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 1024,
            "response_mime_type": "application/json",
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                GEMINI_URL,
                params={"key": GEMINI_API_KEY},
                json=payload,
            )
            resp.raise_for_status()
            result_data = resp.json()

        raw = result_data["candidates"][0]["content"]["parts"][0]["text"].strip()
        data = _extract_json(raw)

    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {e.response.text}")
    except (KeyError, IndexError, ValueError):
        return SmartSplitResponse(parse_failed=True)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    # Sanitize splits
    splits = []
    for entry in data.get("splits") or []:
        uid = str(entry.get("user_id", ""))
        splits.append(SplitEntry(
            user_id=uid,
            amount=round(_coerce_amount(entry.get("amount", 0)), 2),
            note=str(entry.get("note", "")),
        ))

    if not splits:
        return SmartSplitResponse(parse_failed=True)

    total = round(_coerce_amount(data.get("total", 0)), 2)
    needs_total = bool(data.get("needs_total", False)) or total == 0

    return SmartSplitResponse(
        title=str(data.get("title", "Shared Expense"))[:40],
        total=total,
        splits=splits,
        needs_total=needs_total or None,
    )
