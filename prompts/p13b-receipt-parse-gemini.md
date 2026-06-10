# Patch — Swap OpenAI for Gemini Flash (free tier) in receipt parser

Load `graphify-out/GRAPH_REPORT.md`. Relevant communities: 2 (FastAPI Routes), 8 (Auth & Middleware).

Replace the OpenAI Vision client in the receipt parser with Google Gemini 1.5 Flash. Free tier: 15 req/min, 1500 req/day — plenty for TandemPay.

---

## 1. Update `backend/requirements.txt`

Remove:
```
openai>=1.30.0
```

Add:
```
google-generativeai>=0.7.0
```

---

## 2. Rewrite `backend/app/routes/receipts.py`

Replace the entire file with:

```python
import base64
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
import google.generativeai as genai
import os

from app.models import User
from app.routes.auth import get_current_user

router = APIRouter(prefix="/api/receipts", tags=["receipts"])

genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))
model = genai.GenerativeModel("gemini-1.5-flash")


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
- Combine quantity into name: "Garlic Naan x2" not two separate lines
- price: line total (quantity × unit price)
- subtotal: sum of items before tax/tip
- tax: actual dollar amount from the receipt
- tax_rate: tax / subtotal to 4 decimal places; use 0.13 if unreadable
- tip_detected: tip amount if on receipt, else 0
- currency: "CAD" if Canadian or ambiguous, else "USD"
- Estimate illegible values from context
- Always return all fields"""


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

    try:
        image_part = {
            "mime_type": "image/jpeg",
            "data": b64,
        }
        response = model.generate_content([PROMPT, image_part])
        raw = response.text.strip()

        # Strip markdown fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()

        data = json.loads(raw)

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"Gemini returned invalid JSON: {str(e)}")
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
```

---

## 3. Update environment variable

In `backend/.env`, replace `OPENAI_API_KEY=...` with:
```
GEMINI_API_KEY=your-key-here
```

Get your free key at: https://aistudio.google.com/app/apikey

---

## 4. Install + deploy

```bash
cd backend
pip install google-generativeai --break-system-packages
vercel --prod
```

Add `GEMINI_API_KEY` to Vercel: project → Settings → Environment Variables.

---

## Verification

```bash
uvicorn app.main:app --reload
```

Test with a receipt photo — response should be identical shape to the OpenAI version.
