import base64
import json
import re
import httpx
import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List

from app.models import User
from app.routes.auth import get_current_user

router = APIRouter(prefix="/api/receipts", tags=["receipts"])

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.5-flash:generateContent"
)

PROMPT = """You are a receipt parser. Extract every single line item from this receipt exactly as it appears - do not skip, filter, or summarise anything.

RULES:
- Include ALL lines: food, drinks, discounts, modifications, tax, tip, gratuity, promotions, service charges, rounding adjustments - everything.
- Negative prices are valid - keep them exactly as negative numbers.
- Prices may have $ symbols or not - strip any currency symbol and return a plain decimal number either way (e.g. $5.99 → 5.99, 5.99 → 5.99).
- If a price is truly unreadable, use 0.0.
- For total: use TOTAL DUE or ROUNDED TOTAL if present, otherwise the largest total shown.
- item name: use the exact text from the receipt, cleaned up for readability (expand obvious abbreviations if clear, e.g. 'REG-CAESAR.SALAD' → 'Caesar Salad').
- Merchant: restaurant or store name from the header. Use 'Receipt' if not visible.
- is_discount: set to true when price is negative or the item is clearly a discount, promotion, or promo line.
- Do not wrap in markdown or add explanations. Pure JSON only."""

_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "merchant": {"type": "string"},
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "price": {"type": "number"},
                    "is_discount": {"type": "boolean"},
                },
                "required": ["name", "price"],
            },
        },
        "total": {"type": "number"},
    },
    "required": ["items", "total"],
}


class ParseReceiptRequest(BaseModel):
    image_base64: str


class ParsedItem(BaseModel):
    id: str
    name: str
    price: float
    is_discount: bool = False


class ReceiptParseResponse(BaseModel):
    items: List[ParsedItem]
    subtotal: float = 0.0
    tax: float = 0.0
    tax_rate: float = 0.13
    tip_detected: float = 0.0
    total: float
    currency: str = "CAD"
    merchant: str = "Receipt"


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
            "response_mime_type": "application/json",
            "response_schema": _RESPONSE_SCHEMA,
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

        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        # Sanitise currency symbols Gemini may embed in JSON values
        raw = re.sub(r':\s*-\$?([\d.]+)', r': -\1', raw)       # negative: -$5.99 → -5.99
        raw = re.sub(r':\s*"\$?([\d.]+)"', r': \1', raw)        # quoted:  "$5.99" → 5.99
        raw = re.sub(r':\s*\$?([\d.]+)', r': \1', raw)          # unquoted: $5.99  → 5.99

        data = json.loads(raw)

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"Gemini returned invalid JSON: {str(e)}")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OCR service error: {str(e)}")

    items = []
    for i, item in enumerate(data.get("items", []), start=1):
        price = float(item.get("price", 0))
        is_discount = bool(item.get("is_discount", False)) or price < 0
        items.append(ParsedItem(
            id=str(item.get("id", i)),
            name=str(item.get("name", "Item")),
            price=price,
            is_discount=is_discount,
        ))

    raw_merchant = str(data.get("merchant", "")).strip()
    merchant = raw_merchant if raw_merchant and raw_merchant != "Receipt" else "Receipt"

    return ReceiptParseResponse(
        items=items,
        subtotal=float(data.get("subtotal", 0)),
        tax=float(data.get("tax", 0)),
        tax_rate=float(data.get("tax_rate", 0.13)),
        tip_detected=float(data.get("tip_detected", 0)),
        total=float(data.get("total", 0)),
        currency=str(data.get("currency", "CAD")),
        merchant=merchant,
    )
