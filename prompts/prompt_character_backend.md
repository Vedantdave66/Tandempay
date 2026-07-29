# [Character System 1/2] Backend — allow character updates via PATCH /auth/me

## Context
Load `graphify-out/GRAPH_REPORT.md` first.
Relevant communities: **21** (App Configuration — schemas, settings), **2** (Auth & Notification Layer — UserUpdate, update_me handler).

---

## Problem

`PATCH /api/auth/me` currently only allows updating `name`, `interac_email`, and `has_completed_payment`. The `User` model already has `character_shape`, `character_color`, and `character_nickname` columns, and `UserOut` already returns them. But `UserUpdate` doesn't accept them, so users have no way to save their character choice.

---

## Task

**MODIFY `backend/app/schemas.py` — `UserUpdate` only:**

Add three optional fields:
```python
character_shape: Optional[str] = Field(default=None, max_length=20)
character_color: Optional[str] = Field(default=None, max_length=7)
character_nickname: Optional[str] = Field(default=None, max_length=50, strip_whitespace=True)
```

Valid values for `character_shape` are `rect`, `tall`, `semi`, `round`. Add a `field_validator` that rejects any other value (raise `ValueError('invalid character_shape')`). Allow `None` to pass through unchanged.

**MODIFY `backend/app/routes/auth.py` — `update_me` handler only:**

Add the three fields to the update block (same pattern as the existing fields):
```python
if data.character_shape is not None:
    current_user.character_shape = data.character_shape
if data.character_color is not None:
    current_user.character_color = data.character_color
if data.character_nickname is not None:
    current_user.character_nickname = data.character_nickname.strip() or None
```

No other changes to either file.

---

## Rules

1. Additive only — no existing fields in `UserUpdate` touched.
2. No new endpoints, no migrations (columns already exist).
3. The validator must allow `None` through — it only rejects non-None values outside the valid set.
