import ast
import json
import logging
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
logger = logging.getLogger("tandempay.smart_split")

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
    return f"""You are a bill-splitting assistant. Parse the natural language expense description and return a JSON split plan.

ALWAYS return valid JSON. NEVER return explanations or markdown. If you are uncertain about any value, make your best guess.

Group members: {member_list}
Description: {description}

Return exactly this JSON structure:
{{
  "title": "short expense name (max 40 chars)",
  "total": <total amount as a plain number, 0 if not mentioned>,
  "needs_total": <true if total was not mentioned, false otherwise>,
  "splits": [
    {{"user_id": "<exact user_id from the list>", "amount": <number>, "note": "<reason or empty string>"}}
  ]
}}

Rules:
- title: concise expense name (e.g. "Thai Dinner", "Groceries", "Uber")
- Accept any amount format: $85, 85, 85.00, "eighty-five dollars" all mean 85.0
- Accept vague splits: "split evenly" / "3 ways" / "equal" → divide total equally among all members
- If total is mentioned, calculate splits so amounts sum to exactly that total
- If someone is excluded or skipped something, reduce their share and redistribute evenly
- If no total is mentioned, set needs_total to true and set all amounts to 0
- notes: one short phrase when someone pays more or less (e.g. "skipped drinks"), empty string otherwise
- EVERY member must appear in splits using their exact user_id from the list above
- Return ONLY the JSON object — no markdown code fences, no explanation"""


def _build_fallback_prompt(description: str) -> str:
    return (
        f'Extract the expense title and total amount from: "{description}". '
        f'Return JSON only: {{"title": "string", "total": number}}'
    )


def _extract_json(text: str) -> tuple:
    """Return (parsed_dict, step_name). Raise ValueError when all steps fail."""
    # Step A: direct parse
    try:
        return json.loads(text), "A_direct"
    except (json.JSONDecodeError, ValueError):
        logger.debug("JSON step A (direct parse) failed")

    # Step B: strip markdown fences
    stripped = re.sub(r"```[a-z]*\n?", "", text).strip()
    try:
        return json.loads(stripped), "B_strip_fences"
    except (json.JSONDecodeError, ValueError):
        logger.debug("JSON step B (strip markdown fences) failed")

    # Step C: first {...} block
    match = re.search(r"\{.*\}", stripped, re.DOTALL)
    if match:
        try:
            return json.loads(match.group()), "C_regex_extract"
        except (json.JSONDecodeError, ValueError):
            logger.debug("JSON step C (regex first-block) failed")

    # Step D: Python literal parser (handles single-quoted JSON-like output)
    try:
        result = ast.literal_eval(text)
        if isinstance(result, dict):
            return result, "D_ast_literal_eval"
    except (ValueError, SyntaxError):
        logger.debug("JSON step D (ast.literal_eval) failed")

    raise ValueError("All JSON extraction steps failed (A, B, C, D)")


def _coerce_amount(raw) -> float:
    try:
        return float(str(raw).replace("$", "").replace(",", "").strip())
    except (TypeError, ValueError):
        return 0.0


async def _call_gemini(prompt: str, client: httpx.AsyncClient) -> str:
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 1024,
            "response_mime_type": "application/json",
        },
    }
    resp = await client.post(
        GEMINI_URL,
        params={"key": GEMINI_API_KEY},
        json=payload,
    )
    resp.raise_for_status()
    result_data = resp.json()
    return result_data["candidates"][0]["content"]["parts"][0]["text"].strip()


@router.post("", response_model=SmartSplitResponse)
async def smart_split(
    body: SmartSplitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    description = body.description.strip()
    logger.info("smart_split request | user=%s description=%r", current_user.id, description)

    if not description:
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

    if str(current_user.id) not in users_by_id:
        users_by_id[str(current_user.id)] = current_user.name

    for mid in body.member_ids:
        if mid not in users_by_id:
            users_by_id[mid] = "Member"

    prompt = _build_prompt(users_by_id, description)
    logger.info("smart_split prompt |\n%s", prompt)

    raw: Optional[str] = None
    data: Optional[dict] = None

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # ── First attempt ─────────────────────────────────────────────────
            try:
                raw = await _call_gemini(prompt, client)
                logger.info("smart_split gemini_raw | %r", raw)
                data, step = _extract_json(raw)
                logger.info("smart_split parsed_ok | step=%s", step)

            except (ValueError, KeyError, IndexError) as first_err:
                logger.warning(
                    "smart_split first_attempt_failed | raw=%r error=%s — retrying with fallback prompt",
                    raw, first_err,
                )
                # ── Retry with simpler prompt ─────────────────────────────────
                fallback_prompt = _build_fallback_prompt(description)
                logger.info("smart_split fallback_prompt | %s", fallback_prompt)
                try:
                    raw = await _call_gemini(fallback_prompt, client)
                    logger.info("smart_split fallback_raw | %r", raw)
                    data, step = _extract_json(raw)
                    logger.info("smart_split fallback_parsed_ok | step=%s", step)
                except (ValueError, KeyError, IndexError) as retry_err:
                    logger.error(
                        "smart_split retry_failed | raw=%r error=%s", raw, retry_err,
                    )
                    data = None

    except httpx.HTTPStatusError as e:
        logger.error("smart_split gemini_http_error | status=%s body=%s", e.response.status_code, e.response.text)
        raise HTTPException(status_code=502, detail=f"Gemini API error: {e.response.text}")
    except Exception as e:
        logger.error("smart_split unexpected_error | %s", e, exc_info=True)
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    # Both attempts failed — only return parse_failed as a last resort
    if data is None:
        logger.warning("smart_split parse_failed | description=%r", description)
        return SmartSplitResponse(parse_failed=True)

    # Sanitize splits
    splits = []
    for entry in data.get("splits") or []:
        uid = str(entry.get("user_id", ""))
        splits.append(SplitEntry(
            user_id=uid,
            amount=round(_coerce_amount(entry.get("amount", 0)), 2),
            note=str(entry.get("note", "")),
        ))

    total = round(_coerce_amount(data.get("total", 0)), 2)
    needs_total = bool(data.get("needs_total", False)) or total == 0

    # Fallback prompt only returned {title, total} — synthesize zero splits for
    # all members so the review screen renders and the user can fill amounts in
    if not splits:
        splits = [
            SplitEntry(user_id=uid, amount=0.0, note="")
            for uid in users_by_id
        ]
        needs_total = True

    result = SmartSplitResponse(
        title=str(data.get("title", "Shared Expense"))[:40],
        total=total,
        splits=splits,
        needs_total=needs_total or None,
    )
    logger.info(
        "smart_split result | title=%r total=%s needs_total=%s splits=%d",
        result.title, result.total, result.needs_total, len(result.splits),
    )
    return result
