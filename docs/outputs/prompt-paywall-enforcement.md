# TandemPay — R3-Gate: Pro Paywall Enforcement
**Paste this entire prompt into Antigravity (Claude Code).**

---

## FILES TO TOUCH

```
backend/app/models.py
backend/app/schemas.py
backend/app/dependencies.py        ← new file (or add to existing)
backend/app/routes/expenses.py     ← add require_pro to recurring endpoints
backend/app/routes/export.py       ← add require_pro to all export endpoints
alembic/versions/<new_file>.py     ← new migration
```

---

## PROBLEM

Pro-tier features (recurring expenses, CSV/PDF export) are not gated server-side.
Any authenticated user can currently hit those endpoints. We need a hard server-side
paywall before we open to a wider beta — the client-side hide is not sufficient.

---

## TASK

### 1 — `models.py`: add subscription fields to `User`

Add two columns to the `User` model (after existing columns, before relationships):

```python
is_pro: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="false")
subscription_tier: Mapped[str] = mapped_column(String(20), default="free", nullable=False, server_default="'free'")
# subscription_tier values: "free" | "pro_monthly" | "pro_annual"
```

### 2 — `schemas.py`: surface pro status in `UserOut`

Add to `UserOut` (and `UserRead` if it exists separately):

```python
is_pro: bool = False
subscription_tier: str = "free"
```

### 3 — `dependencies.py` (create if absent, otherwise append)

Add a `require_pro` dependency:

```python
from fastapi import Depends, HTTPException, status
from app.auth import get_current_user
from app.models import User

async def require_pro(current_user: User = Depends(get_current_user)) -> User:
    """Raise 402 if the authenticated user is not on a Pro plan."""
    if not current_user.is_pro:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={
                "error": "pro_required",
                "message": "This feature requires TandemPay Pro.",
                "upgrade_url": "https://tandempay.ca/upgrade",
            },
        )
    return current_user
```

### 4 — Gate recurring expense endpoints in `expenses.py`

Locate every endpoint that creates, lists, updates, or deletes **recurring** expenses
(likely paths containing `/recurring` or a `RecurringExpense` model reference).
Add `require_pro` as a dependency on each:

```python
from app.dependencies import require_pro

# Example — adjust to match actual signatures:
@router.post("/recurring", dependencies=[Depends(require_pro)])
async def create_recurring_expense(...):
    ...

@router.get("/recurring", dependencies=[Depends(require_pro)])
async def list_recurring_expenses(...):
    ...

@router.put("/recurring/{id}", dependencies=[Depends(require_pro)])
async def update_recurring_expense(...):
    ...

@router.delete("/recurring/{id}", dependencies=[Depends(require_pro)])
async def delete_recurring_expense(...):
    ...
```

### 5 — Gate export endpoints in `export.py` (or wherever CSV/PDF export lives)

Apply `require_pro` to **all** export routes:

```python
from app.dependencies import require_pro

@router.get("/export/csv", dependencies=[Depends(require_pro)])
async def export_csv(...):
    ...

@router.get("/export/pdf", dependencies=[Depends(require_pro)])
async def export_pdf(...):
    ...
```

If export routes don't exist yet, skip step 5 and add a TODO comment in `dependencies.py`.

### 6 — Alembic migration

Generate a new migration for the two new `User` columns:

```
alembic revision --autogenerate -m "add_subscription_fields_to_users"
```

Review the generated file to confirm it adds:
- `is_pro` BOOLEAN NOT NULL DEFAULT false
- `subscription_tier` VARCHAR(20) NOT NULL DEFAULT 'free'

Do NOT run `alembic upgrade head` — Vedant will run it against prod manually.

---

## RULES

- Follow existing route patterns (APIRouter, get_db, logger, existing Depends chain).
- Do NOT change any business logic — this is gating only.
- The 402 response body must include `"error": "pro_required"` so the frontend can detect it.
- Do NOT add `require_pro` to any free-tier endpoints — only recurring + export.
- If `dependencies.py` already exists, append `require_pro`; do not overwrite existing deps.

---

## SHOW ME

1. The updated `User` model columns (models.py diff)
2. The updated `UserOut` schema (schemas.py diff)
3. The full `dependencies.py` (new or appended section)
4. The gated route signatures for recurring + export (just the decorator + def line for each)
5. The generated Alembic migration file in full

---

## AFTER THIS PROMPT

Run in your terminal (Windows PowerShell):
```powershell
$env:DATABASE_URL="postgresql+asyncpg://<your-prod-connection-string>"
alembic upgrade head
```
Then verify in Supabase Table Editor: `users` table now has `is_pro` and `subscription_tier` columns.

Manual test: hit `POST /api/expenses/recurring` with a valid auth token for a free user → expect HTTP 402 with `"error": "pro_required"`.
