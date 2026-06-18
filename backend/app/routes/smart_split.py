import ast
import base64
import json
import logging
import re
import httpx
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User, GroupMember
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
    group_name: str = ""
    member_ids: List[str]


class SplitEntry(BaseModel):
    user_id: str
    name: str = ""
    amount: float
    note: str = ""
    included: bool = True


class SmartSplitResponse(BaseModel):
    intent: str = "parse_expense"
    title: str = ""
    total: float = 0.0
    needs_total: Optional[bool] = None
    splits: List[SplitEntry] = []
    parse_failed: Optional[bool] = None
    member_name: Optional[str] = None
    group_name_suggestion: Optional[str] = None
    adjustment: Optional[float] = None
    message: Optional[str] = None


def _build_intent_prompt(members: dict, group_name: str, description: str) -> str:
    member_list = ", ".join(
        f'"{name}" (id: {uid})' for uid, name in members.items()
    )
    return f"""You are a smart expense assistant for a bill-splitting app called TandemPay.
Current group members: {member_list}
Current group name: {group_name}
User message: {description}

Detect the intent and return JSON only. Never return explanations or markdown.

Intents and their return shapes:

1. Parsing an expense (default — use this if the message describes any bill, purchase, meal, or cost):
{{"intent": "parse_expense", "title": "short expense name max 40 chars", "total": <number, 0 if not mentioned>, "needs_total": <true if total not mentioned>, "splits": [{{"user_id": "<exact id>", "name": "<member name>", "amount": <number>, "note": "<reason or empty>", "included": <true unless explicitly excluded>}}]}}

2. Excluding a member ("don't include X", "X isn't coming", "remove X from this split"):
{{"intent": "exclude_member", "member_name": "<name as mentioned>", "message": "<friendly confirmation e.g. Got it, removed Lakshit from this split>"}}

3. Adding someone to the group ("add X to the group", "invite X"):
{{"intent": "add_to_group", "member_name": "<name as mentioned>", "message": "<friendly message>"}}

4. Creating a new group ("make a new group called X", "create a group for X"):
{{"intent": "create_group", "group_name": "<suggested group name>", "message": "<friendly message>"}}

5. Adjusting an existing split ("give X more", "X should pay extra $10", "reduce X by $5"):
{{"intent": "adjust_split", "member_name": "<name as mentioned>", "adjustment": <number, positive=more negative=less>, "message": "<friendly confirmation>"}}

6. Unclear or unrelated (greetings, questions about the app, pure confusion):
{{"intent": "clarify", "message": "<one specific clarifying question>"}}

Rules:
- Default to parse_expense for ANY message mentioning a bill, cost, meal, item, price, or split
- ALWAYS return valid JSON — never markdown fences, never plain text
- For parse_expense with needs_total true, still include all members in splits with amount 0
- included: false only for explicitly excluded members, true for everyone else
- In splits, populate name from the provided member list
- EVERY member must appear in splits for parse_expense using their exact user_id"""


def _build_fallback_prompt(description: str) -> str:
    return (
        f'Extract the expense title and total amount from: "{description}". '
        f'Return JSON only: {{"intent": "parse_expense", "title": "string", "total": number}}'
    )


def _extract_json(text: str) -> tuple:
    """Return (parsed_dict, step_name). Raise ValueError when all steps fail."""
    try:
        return json.loads(text), "A_direct"
    except (json.JSONDecodeError, ValueError):
        logger.debug("JSON step A (direct parse) failed")

    stripped = re.sub(r"```[a-z]*\n?", "", text).strip()
    try:
        return json.loads(stripped), "B_strip_fences"
    except (json.JSONDecodeError, ValueError):
        logger.debug("JSON step B (strip markdown fences) failed")

    match = re.search(r"\{.*\}", stripped, re.DOTALL)
    if match:
        try:
            return json.loads(match.group()), "C_regex_extract"
        except (json.JSONDecodeError, ValueError):
            logger.debug("JSON step C (regex first-block) failed")

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


async def _call_gemini_voice(
    audio_bytes: bytes,
    mime_type: str,
    prompt: str,
    client: httpx.AsyncClient,
) -> str:
    payload = {
        "contents": [{
            "parts": [
                {
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": base64.b64encode(audio_bytes).decode(),
                    }
                },
                {"text": prompt},
            ]
        }],
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
        timeout=60.0,
    )
    resp.raise_for_status()
    result_data = resp.json()
    return result_data["candidates"][0]["content"]["parts"][0]["text"].strip()


def _build_response(data: dict, users_by_id: dict) -> SmartSplitResponse:
    """Convert Gemini JSON dict into SmartSplitResponse, routing on intent."""
    intent = str(data.get("intent", "parse_expense"))
    logger.info("smart_split intent=%s", intent)

    if intent == "exclude_member":
        return SmartSplitResponse(
            intent=intent,
            member_name=str(data.get("member_name", "")),
            message=str(data.get("message", "")),
        )

    if intent == "add_to_group":
        return SmartSplitResponse(
            intent=intent,
            member_name=str(data.get("member_name", "")),
            message=str(data.get("message", "")),
        )

    if intent == "create_group":
        return SmartSplitResponse(
            intent=intent,
            group_name_suggestion=str(data.get("group_name", "")),
            message=str(data.get("message", "")),
        )

    if intent == "adjust_split":
        return SmartSplitResponse(
            intent=intent,
            member_name=str(data.get("member_name", "")),
            adjustment=_coerce_amount(data.get("adjustment", 0)),
            message=str(data.get("message", "")),
        )

    if intent == "clarify":
        return SmartSplitResponse(
            intent=intent,
            message=str(data.get("message", "")),
        )

    # parse_expense (default)
    splits = []
    for entry in data.get("splits") or []:
        uid = str(entry.get("user_id", ""))
        name = str(entry.get("name", users_by_id.get(uid, "Member")))
        splits.append(SplitEntry(
            user_id=uid,
            name=name,
            amount=round(_coerce_amount(entry.get("amount", 0)), 2),
            note=str(entry.get("note", "")),
            included=bool(entry.get("included", True)),
        ))

    total = round(_coerce_amount(data.get("total", 0)), 2)
    needs_total = bool(data.get("needs_total", False)) or total == 0

    if not splits:
        splits = [
            SplitEntry(user_id=uid, name=name, amount=0.0, note="", included=True)
            for uid, name in users_by_id.items()
        ]
        needs_total = True

    return SmartSplitResponse(
        intent="parse_expense",
        title=str(data.get("title", "Shared Expense"))[:40],
        total=total,
        splits=splits,
        needs_total=needs_total or None,
    )


async def _fetch_members(
    db: AsyncSession,
    member_ids: List[str],
    current_user: User,
) -> dict:
    users_result = await db.execute(
        select(User).where(User.id.in_(member_ids))
    )
    users_by_id = {str(u.id): u.name for u in users_result.scalars().all()}

    if str(current_user.id) not in users_by_id:
        users_by_id[str(current_user.id)] = current_user.name

    for mid in member_ids:
        if mid not in users_by_id:
            users_by_id[mid] = "Member"

    return users_by_id


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

    users_by_id = await _fetch_members(db, body.member_ids, current_user)
    prompt = _build_intent_prompt(users_by_id, body.group_name, description)
    logger.info("smart_split prompt |\n%s", prompt)

    raw: Optional[str] = None
    data: Optional[dict] = None

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                raw = await _call_gemini(prompt, client)
                logger.info("smart_split gemini_raw | %r", raw)
                data, step = _extract_json(raw)
                logger.info("smart_split parsed_ok | step=%s", step)

            except (ValueError, KeyError, IndexError) as first_err:
                logger.warning(
                    "smart_split first_attempt_failed | raw=%r error=%s — retrying",
                    raw, first_err,
                )
                fallback_prompt = _build_fallback_prompt(description)
                try:
                    raw = await _call_gemini(fallback_prompt, client)
                    logger.info("smart_split fallback_raw | %r", raw)
                    data, step = _extract_json(raw)
                    logger.info("smart_split fallback_parsed_ok | step=%s", step)
                except (ValueError, KeyError, IndexError) as retry_err:
                    logger.error("smart_split retry_failed | raw=%r error=%s", raw, retry_err)
                    data = None

    except httpx.HTTPStatusError as e:
        logger.error("smart_split gemini_http_error | status=%s body=%s", e.response.status_code, e.response.text)
        raise HTTPException(status_code=502, detail=f"Gemini API error: {e.response.text}")
    except Exception as e:
        logger.error("smart_split unexpected_error | %s", e, exc_info=True)
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    if data is None:
        logger.warning("smart_split parse_failed | description=%r", description)
        return SmartSplitResponse(parse_failed=True)

    result = _build_response(data, users_by_id)
    logger.info("smart_split result | intent=%s title=%r", result.intent, result.title)
    return result


@router.post("/voice", response_model=SmartSplitResponse)
async def smart_split_voice(
    audio: UploadFile = File(...),
    group_id: str = Form(...),
    group_name: str = Form(""),
    member_ids: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

    try:
        member_ids_list: List[str] = json.loads(member_ids)
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(status_code=400, detail="member_ids must be a JSON array string")

    if not member_ids_list:
        raise HTTPException(status_code=400, detail="member_ids is required")

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="audio file is empty")

    content_type = audio.content_type or "audio/mp4"
    if audio.filename:
        ext = audio.filename.rsplit(".", 1)[-1].lower()
        mime_map = {
            "m4a": "audio/mp4",
            "mp4": "audio/mp4",
            "wav": "audio/wav",
            "mp3": "audio/mpeg",
            "ogg": "audio/ogg",
            "webm": "audio/webm",
        }
        content_type = mime_map.get(ext, content_type)

    logger.info(
        "smart_split_voice request | user=%s group=%s bytes=%d mime=%s",
        current_user.id, group_id, len(audio_bytes), content_type,
    )

    users_by_id = await _fetch_members(db, member_ids_list, current_user)
    member_list = ", ".join(f'"{name}" (id: {uid})' for uid, name in users_by_id.items())

    voice_prompt = f"""Transcribe this audio, then process it as a TandemPay expense description.

Group members: {member_list}
Group name: {group_name}

Detect the intent and return JSON only. Never return explanations or markdown.
If the audio describes an expense, return intent "parse_expense" with title, total, needs_total, and splits for every member.
For any other intent use the same shapes as the text endpoint.
ALWAYS return valid JSON."""

    raw: Optional[str] = None
    data: Optional[dict] = None

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                raw = await _call_gemini_voice(audio_bytes, content_type, voice_prompt, client)
                logger.info("smart_split_voice gemini_raw | %r", raw)
                data, step = _extract_json(raw)
                logger.info("smart_split_voice parsed_ok | step=%s", step)
            except (ValueError, KeyError, IndexError) as err:
                logger.error("smart_split_voice parse_failed | raw=%r error=%s", raw, err)
                data = None

    except httpx.HTTPStatusError as e:
        logger.error(
            "smart_split_voice gemini_http_error | status=%s body=%s",
            e.response.status_code, e.response.text,
        )
        raise HTTPException(status_code=502, detail=f"Gemini API error: {e.response.text}")
    except Exception as e:
        logger.error("smart_split_voice unexpected_error | %s", e, exc_info=True)
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    if data is None:
        return SmartSplitResponse(parse_failed=True)

    result = _build_response(data, users_by_id)
    logger.info("smart_split_voice result | intent=%s", result.intent)
    return result
