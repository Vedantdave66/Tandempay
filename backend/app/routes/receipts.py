import base64
import json
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

PROMPT = """You are a receipt parser. Extract line items and totals from this receipt image.

Return ONLY valid JSON — no markdown, no explanation:
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
- items: food/product lines only — exclude subtotal, tax, tip, total, discounts
- Ignore any line items with negative prices — these are discounts or modifications, not real items
- Ignore TAX, PROMO, and TIP lines — extract food and drink items only
- Combine quantity into name: "Garlic Naan x2" not two separate lines
- price: line total (quantity × unit price)
- subtotal: sum of items before tax/tip
- tax: actual dollar amount from the receipt
- tax_rate: tax / subtotal to 4 decimal places; use 0.13 if unreadable
- tip_detected: tip amount if on receipt, else 0
- total: use TOTAL DUE or ROUNDED TOTAL if present, never SUBTOTAL
- currency: "CAD" if Canadian or ambiguous, else "USD"
- Estimate illegible values from context
- Always return all fields"""


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

        data = json.loads(raw)

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"Gemini returned invalid JSON: {str(e)}")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OCR service error: {str(e)}")

    items = []
    for i, item in enumerate(data.get("items", []), start=1):
        items.append(ParsedItem(
            id=str(item.get("id", i)),
            name=str(item.get("name", "Item")),
            price=float(item.get("price", 0)),
        ))

    return ReceiptParseResponse(
        items=items,
        subtotal=float(data.get("subtotal", 0)),
        tax=float(data.get("tax", 0)),
        tax_rate=float(data.get("tax_rate", 0.13)),
        tip_detected=float(data.get("tip_detected", 0)),
        total=float(data.get("total", 0)),
        currency=str(data.get("currency", "CAD")),
    )
