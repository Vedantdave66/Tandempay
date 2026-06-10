# Backend — Receipt OCR Parsing Endpoint

Load `graphify-out/GRAPH_REPORT.md`. Relevant communities: 2 (FastAPI Routes), 8 (Auth & Middleware).

Add a `POST /api/receipts/parse` endpoint that accepts a base64-encoded receipt image, sends it to GPT-4o Vision, and returns structured receipt data (items, subtotal, actual tax, tip).

---

## 1. Install dependency

Add to `backend/requirements.txt`:
```
openai>=1.30.0
```

---

## 2. New file — `backend/app/routes/receipts.py`

```python
import base64
import json
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from openai import OpenAI
import os

from app.models import User
from app.routes.auth import get_current_user

router = APIRouter(prefix="/api/receipts", tags=["receipts"])

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


class ParseReceiptRequest(BaseModel):
    image_base64: str  # raw base64 string, no data URI prefix


class ParsedItem(BaseModel):
    id: str
    name: str
    price: float


class ReceiptParseResponse(BaseModel):
    items: List[ParsedItem]
    subtotal: float
    tax: float
    tax_rate: float        # e.g. 0.13 for 13% HST
    tip_detected: float    # 0 if no tip line found
    total: float
    currency: str          # "CAD" or "USD"


SYSTEM_PROMPT = """You are a receipt parser. Extract line items and totals from receipt images accurately.

Return ONLY valid JSON in exactly this shape — no markdown, no explanation:
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
- items: individual food/product lines only — exclude subtotal, tax, tip, total, discounts, and headers
- Combine quantity into the name: "Garlic Naan x2" not two separate lines
- price: the line item total (quantity × unit price), not unit price alone
- subtotal: sum of item prices before tax/tip
- tax: the actual dollar amount of tax charged (read it directly from the receipt)
- tax_rate: tax / subtotal rounded to 4 decimal places; if unreadable use 0.13
- tip_detected: tip amount if explicitly on receipt, otherwise 0
- total: the final amount charged
- currency: "CAD" if the receipt is Canadian or ambiguous, otherwise "USD"
- If a value is illegible, use your best estimate based on context
- Always return valid JSON with all fields present"""


@router.post("/parse", response_model=ReceiptParseResponse)
async def parse_receipt(
    body: ParseReceiptRequest,
    current_user: User = Depends(get_current_user),
):
    """Parse a receipt image using GPT-4o Vision and return structured data."""
    if not body.image_base64:
        raise HTTPException(status_code=400, detail="image_base64 is required")

    # Strip data URI prefix if present (e.g. "data:image/jpeg;base64,...")
    b64 = body.image_base64
    if "," in b64:
        b64 = b64.split(",", 1)[1]

    # Validate it's actually base64
    try:
        base64.b64decode(b64, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image data")

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            max_tokens=1024,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{b64}",
                                "detail": "high",
                            },
                        },
                        {
                            "type": "text",
                            "text": "Parse this receipt.",
                        },
                    ],
                },
            ],
        )

        raw = response.choices[0].message.content or ""
        # Strip markdown code fences if GPT wraps in ```json ... ```
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        data = json.loads(raw)

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=502,
            detail=f"GPT returned invalid JSON: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"OCR service error: {str(e)}",
        )

    # Ensure every item has a string id
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
```

---

## 3. Register the router

In `backend/app/main.py`, add alongside the existing router imports:
```python
from app.routes.receipts import router as receipts_router
```

And register it:
```python
app.include_router(receipts_router)
```

---

## 4. Environment variable

Add `OPENAI_API_KEY` to:
- `backend/.env` (local dev): `OPENAI_API_KEY=sk-...`
- Vercel project settings → Environment Variables: `OPENAI_API_KEY` = your key

---

## Verification

```bash
cd backend
pip install openai --break-system-packages
uvicorn app.main:app --reload
```

Then test with curl (replace TOKEN and BASE64):
```bash
curl -X POST http://localhost:8000/api/receipts/parse \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"image_base64": "BASE64_OF_RECEIPT_IMAGE"}'
```

Expected response:
```json
{
  "items": [{"id": "1", "name": "Butter Chicken", "price": 19.50}],
  "subtotal": 59.50,
  "tax": 7.74,
  "tax_rate": 0.13,
  "tip_detected": 0,
  "total": 67.24,
  "currency": "CAD"
}
```

Deploy: `vercel --prod`
