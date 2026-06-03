# TandemPay — Session Handoff for Claude
**Last updated:** 2026-06-03
**Repo:** https://github.com/Vedantdave66/Tandempay
**Stack:** FastAPI backend (Vercel Python) · React/Vite frontend (Vercel) · React Native mobile (Expo/EAS)
**Prod URLs:** `https://tandempay.ca` (frontend) · `https://api.tandempay.ca` (backend)

---

## Where the project stands right now

- **Production is live and healthy.**
- **Production readiness score: ~83/100** — closed beta safe.
- **All 11 production hardening fixes are merged and deployed.**
- **R2 (Interac email parsing) is COMPLETE and merged to main (PR #104).**
- **All Alembic migrations run against prod Supabase:**
  - `20d7c91bb5df` — `revoked_tokens` table
  - `7af805ecb0e7` — `interac_email_logs` table
  - `a107c01bd8f1` — `auto_confirmed` column on `settlement_records`

---

## Strategic direction

TandemPay = "Splitwise for Canadian roommates, free settlement on Interac." Wedge audience is roommates with recurring shared bills. Interac e-Transfer is the primary settlement path (free, ~30 sec), with **auto-confirmation via email parsing as the unique magic**. Stripe Connect stays as a backup "Pay by card" option. Monetization is Pro subscription at $3.99/mo or $29.99/yr. Pro headline feature is recurring expenses.

---

## What was completed this session (2026-06-03)

### Full production readiness code review
Claude reviewed the entire codebase and scored it **66/100**. All 11 critical/major issues were fixed across two PRs, bringing it to **83/100**.

### PR #100 — fix/groups-api-items-fallback → main (4 critical fixes)
1. `stripe_routes.py` — Webhook transfer validation fallthrough fixed
2. `schemas.py` + `auth.py` — `character_shape/color/nickname` added to `UserUpdate`
3. `auth.py` — `forgot_password` commit order fixed
4. `payments.py` — Raw Stripe error no longer exposed to client
5. `test_stripe_webhook.py` — test_a + test_c updated with mock Charge/Transfer chain
6. `CurvedMenu.tsx` — Orphaned `setIsHovered` → `setIsOpen`, removed `{isPinned &&}` block

### PR #101 — fix/production-hardening → main (7 major fixes)
7. `config.py` — JWT expiry 1440 → 60 minutes
8. `models.py` — `RevokedToken` model added
9. `auth.py` — jti stamping, revocation check, `POST /api/auth/logout`
10. `schemas.py` — `validate_password_complexity` on `UserRegister` + `PasswordResetConfirm`
11. `auth.py` — `@limiter.limit("5/hour")` on `/register`
12. `alembic/versions/20d7c91bb5df` — `revoked_tokens` migration
13. `settlements.py` — Settlement amount validated against actual debt
14. `groups.py` — `list_groups` N+1 replaced with correlated SQL scalar subquery
15. `expenses.py` — `create_expense` + `update_expense` N+1 replaced with batched WHERE IN
16. `auth.py` — Admin endpoints rate-limited + AuditLog entries added

### PR #104 — feat/interac-email-parsing → main (R2 complete ✅)
Full Interac e-Transfer auto-confirmation system — the core product differentiator.

**Infrastructure:**
- SendGrid account created, `tandempay.ca` domain authenticated
- Inbound Parse: `inbound.tandempay.ca` → `https://api.tandempay.ca/api/interac/inbound`
- MX record: `inbound` → `mx.sendgrid.net` priority 10
- `SENDGRID_WEBHOOK_SECRET` in Vercel backend env vars

**Code shipped:**
- `backend/app/models.py` — `InteracEmailLog` model (audit trail for every inbound email)
- `backend/app/services/email_parser.py` — regex parsers for RBC, TD, Scotia, BMO, CIBC, NBC + credit union fallback
- `backend/app/services/interac_matcher.py` — fuzzy name matching (difflib), `confirm_settlement`
- `backend/app/routes/interac_routes.py` — `POST /api/interac/inbound` webhook (always 200, rate-limited 60/min)
- `backend/app/main.py` — `interac_routes` router registered
- `backend/app/config.py` — `SENDGRID_WEBHOOK_SECRET` setting
- `frontend/src/services/api.ts` — `auto_confirmed?: boolean` on `SettlementRecord`
- `frontend/src/components/PaymentRecordCard.tsx` — "Auto-confirmed via Interac" green badge
- `alembic/versions/7af805ecb0e7` — `interac_email_logs` table
- `alembic/versions/a107c01bd8f1` — `auto_confirmed` column on `settlement_records`

**Flow:**
```
User's bank → confirmation email → inbound.tandempay.ca
→ SendGrid Inbound Parse → POST /api/interac/inbound
→ email_parser.py (extract amount + name + direction)
→ interac_matcher.py (fuzzy match to SettlementRecord)
→ settlement.status = "settled", settlement.auto_confirmed = True
→ both users notified → frontend shows "Auto-confirmed via Interac ✅"
```

---

## UI fixes also done this session

- Balance bars in group Balances tab: character avatars centred (fixed-width container)
- GroupCard web + mobile: subtle grey border, gradient extended, "you're owed" bolder
- Dashboard: "Customise" button moved to top-right badge on character avatar
- CurvedMenu: "TandemPay" wordmark is sole hover/pin trigger; duplicate text removed
- INCOMING/OUTGOING stat cards on dashboard: now clickable, show per-group/per-person breakdown
- GroupCard dark mode: visible box fills, tilt cluster, balance colours

---

## Next steps

### Immediate — test R2 end to end
Send a real Interac e-Transfer, forward the bank confirmation email to `anything@inbound.tandempay.ca`, verify the settlement auto-confirms in the app.

### Roadmap

| # | Item | Status |
|---|---|---|
| R1 | Settle Up modal redesign (Interac primary, card secondary) | Prompt exists — ready to run |
| R3 | Pro subscription billing infrastructure | Stripe Subscriptions + paywall middleware |
| R4 | Recurring expenses feature | Pro headline — model + scheduler + UI |
| R5+ | Remaining Pro features | Multi-currency, itemized split, OCR, CSV export, push notifs |

---

## Pre-Launch Checklist (non-code)

1. Register Canadian business entity
2. Add Privacy Policy and Terms of Service live URLs
3. Determine FINTRAC MSB registration requirement (consult Canadian fintech lawyer)
4. Start Stripe Connect application (2–4 week review)

---

## Working agreements with Claude

1. **No direct code edits.** Claude produces scoped prompts. Vedant pastes into Claude Code, it executes.
2. **No git operations from bash.** Hand off to Claude Code.
3. **Conserve usage.** Short responses when sufficient. Skip mockups unless requested.
4. **One prompt at a time.** Don't merge unrelated changes into mega-prompts.

## Critical reference points

- **Repo path (Windows):** `C:\Users\vedan\Documents\Tandempay`
- **GitHub:** `github.com/Vedantdave66/Tandempay`
- **Vercel projects:** `tandempay-api` (backend), `tandempay` (frontend)
- **Database:** Supabase Postgres via Transaction Pooler. `DATABASE_URL` uses `postgresql+asyncpg://` on port 6543.
- **Alembic latest migration:** `a107c01bd8f1_add_auto_confirmed_to_settlement_records.py`
- **SendGrid:** Domain `tandempay.ca` authenticated. Inbound Parse on `inbound.tandempay.ca`.

## What to open with in the new session

> "Picking up TandemPay. R2 (Interac email parsing) is fully merged and live in production. All migrations are on prod. Next is either R1 (Settle Up modal redesign) or testing R2 end-to-end with a real Interac transfer. Handoff doc has full context."
