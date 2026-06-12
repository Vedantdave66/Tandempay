import ast
import base64
import json
import re
import httpx
import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional

from app.models import User
from app.routes.auth import get_current_user

router = APIRouter(prefix="/api/receipts", tags=["receipts"])

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.5-flash:generateContent"
)

PROMPT = """You are a receipt parser. Extract line items and totals from this receipt image.

Return ONLY valid JSON - no markdown, no explanation:
{
  "items": [
    {"id": "1", "name": "Item name", "price": 12.50}
  ],
  "subtotal": 59.50,
  "tax": 7.74,
  "tax_rate": 0.13,
  "tip_detected": 0.00,
  "total": 67.24,
  "currency": "CAD"
}

Rules:
- items: food/product lines only - exclude subtotal, tax, tip, total, discounts
- Combine quantity into name: "Garlic Naan x2" not two separate lines
- price: line total (quantity x unit price)
- subtotal: sum of items before tax/tip
- tax: actual dollar amount from the receipt
- tax_rate: tax / subtotal to 4 decimal places; use 0.13 if unreadable
- tip_detected: tip amount if on receipt, else 0
- currency: "CAD" if Canadian or ambiguous, else "USD"
- Estimate illegible values from context
- Always return all fields"""

_FALLBACK = dict(items=[], subtotal=0.0, tax=0.0, tax_rate=0.13,
                 tip_detected=0.0, total=0.0, currency="CAD",
                 merchant="Receipt", parse_failed=True)


class ParseReceiptRequest(BaseModel):
    image_base64: str


class ParsedItem(BaseModel):
    id: str
    name: str
    price: float


class ReceiptParseResponse(BaseModel):
    items: List[ParsedItem]
    subtotal: float
    tax: float
    tax_rate: float
    tip_detected: float
    total: float
    currency: str
    merchant: str = "Receipt"
    parse_failed: Optional[bool] = None


def _extract_json(text: str) -> dict:
    """Four-step extraction pipeline. Raises ValueError when all steps fail."""
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


def _coerce_price(raw) -> float:
    try:
        return float(str(raw).replace("$", "").replace(",", "").strip())
    except (TypeError, ValueError):
        return 0.0


@router.post("/parse", response_model=ReceiptParseResponse)
async def parse_receipt(
    body: ParseReceiptRequest,
    current_user: User = Depends(get_current_user),
):
    if not body.image_base64:
        raise HTTPException(status_code=400, detail="image_base64 is required")

    b64 = body.image_base64
    if "," in b64:
        b64 = b64.split(",", 1)[1]

    try:
        base64.b64decode(b64, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image data")

    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": PROMPT},
                    {
                        "inline_data": {
                            "mime_type": "image/jpeg",
                            "data": b64,
                        }
                    },
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 1024,
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
            result = resp.json()

        raw = result["candidates"][0]["content"]["parts"][0]["text"].strip()
        data = _extract_json(raw)

    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {e.response.text}")
    except (KeyError, IndexError, ValueError):
        return ReceiptParseResponse(**_FALLBACK)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OCR service error: {str(e)}")

    # Sanitize items; negative prices are valid (discounts)
    items = []
    for i, item in enumerate(data.get("items") or [], start=1):
        price = _coerce_price(item.get("price", 0))
        items.append(ParsedItem(
            id=str(item.get("id", i)),
            name=str(item.get("name", "Item")),
            price=price,
        ))

    if not items:
        return ReceiptParseResponse(**_FALLBACK)

    # Fall back to summing positive items if total is absent or unparseable
    raw_total = data.get("total")
    try:
        total = float(str(raw_total).replace("$", "").replace(",", "").strip())
    except (TypeError, ValueError):
        total = sum(item.price for item in items if item.price > 0)

    return ReceiptParseResponse(
        items=items,
        subtotal=_coerce_price(data.get("subtotal", 0)),
        tax=_coerce_price(data.get("tax", 0)),
        tax_rate=_coerce_price(data.get("tax_rate", 0.13)) or 0.13,
        tip_detected=_coerce_price(data.get("tip_detected", 0)),
        total=total,
        currency=str(data.get("currency", "CAD")),
        merchant=str(data.get("merchant", "Receipt")),
    )
