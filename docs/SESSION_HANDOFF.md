# TandemPay — Session Handoff for Claude
**Last updated:** 2026-06-03
**Repo:** https://github.com/Vedantdave66/Tandempay
**Stack:** FastAPI backend (Vercel Python) · React/Vite frontend (Vercel) · React Native mobile (Expo/EAS)
**Prod URLs:** `https://tandempay.ca` (frontend) · `https://api.tandempay.ca` (backend)

---

## Where the project stands right now

- **Production is live and healthy.**
- **Production readiness score: ~83/100** — closed beta safe.
- **All 11 production hardening fixes are merged and deployed** (see below).
- **Alembic migration for `revoked_tokens` table has been run against prod Supabase.**
- **Interac email parsing (R2) is in progress** on branch `feat/interac-email-parsing`.

---

## Strategic direction

TandemPay = "Splitwise for Canadian roommates, free settlement on Interac." Wedge audience is roommates with recurring shared bills. Interac e-Transfer is the primary settlement path (free, ~30 sec), with **auto-confirmation via email parsing as the unique magic**. Stripe Connect stays as a backup "Pay by card" option. Monetization is Pro subscription at $3.99/mo or $29.99/yr. Pro headline feature is recurring expenses.

---

## What was completed this session (2026-06-03)

### Full production readiness code review
Claude reviewed the entire codebase and scored it **66/100**. All 11 critical/major issues were fixed across two PRs, bringing it to **83/100**.

### PR #100 — fix/groups-api-items-fallback → main (4 critical fixes)
1. `stripe_routes.py` — Webhook transfer validation fallthrough fixed; payment only marked succeeded after verified transfer
2. `schemas.py` + `auth.py` — `character_shape/color/nickname` added to `UserUpdate`; mobile character setup now actually saves
3. `auth.py` — `forgot_password` commit order fixed; token persisted before email sent
4. `payments.py` — Raw Stripe error no longer exposed to client
5. `test_stripe_webhook.py` — test_a + test_c updated with mock Charge/Transfer chain
6. `CurvedMenu.tsx` — Orphaned `setIsHovered` → `setIsOpen`, removed `{isPinned &&}` block

### PR #101 — fix/production-hardening → main (7 major fixes)
7. `config.py` — JWT expiry 1440 → 60 minutes
8. `models.py` — `RevokedToken` model added
9. `auth.py` — `create_access_token` stamps jti, `get_current_user` checks revocation, `POST /api/auth/logout` added
10. `schemas.py` — `validate_password_complexity` added to `UserRegister` + `PasswordResetConfirm`
11. `auth.py` — `@limiter.limit("5/hour")` on `/register`
12. `alembic/versions/20d7c91bb5df` — `revoked_tokens` migration (run against prod)
13. `settlements.py` — Settlement amount validated against actual debt
14. `groups.py` — `list_groups` N+1 replaced with correlated SQL scalar subquery
15. `expenses.py` — `create_expense` + `update_expense` N+1 replaced with batched WHERE IN
16. `auth.py` — Admin endpoints rate-limited + AuditLog entries added

---

## R2 — Interac Email Parsing (IN PROGRESS)

### Infrastructure (DONE)
- SendGrid account created
- `tandempay.ca` domain authenticated in SendGrid (CNAMEs + TXT added to Namecheap)
- Inbound Parse configured: `inbound.tandempay.ca` → `https://api.tandempay.ca/api/interac/inbound`
- MX record added: `inbound` → `mx.sendgrid.net` priority 10
- SendGrid API key created (`tandempay-inbound`) with Inbound Parse + Mail Send permissions
- `SENDGRID_WEBHOOK_SECRET` added to Vercel backend environment variables

### Code (branch: `feat/interac-email-parsing`)

| # | Prompt | Status |
|---|---|---|
| R2-1 | `InteracEmailLog` model + Alembic migration | ✅ DONE |
| R2-2 | `email_parser.py` — bank regex patterns (Big 5 + NBC + credit unions) | ✅ DONE |
| R2-3 | `interac_matcher.py` — fuzzy name matching + `confirm_settlement` | ✅ DONE |
| R2-4 | `interac_routes.py` — POST /api/interac/inbound webhook + main.py registration | ⏳ NEXT |
| R2-5 | Frontend "Auto-confirmed via Interac ✅" badge on settled settlements | ⏳ PENDING |

### What to do first in the new session
Continue on branch `feat/interac-email-parsing`. Run R2-4 prompt first, then R2-5.

**R2-4 prompt:**
```
FILE: backend/app/routes/interac_routes.py (NEW FILE)
FILE: backend/app/main.py (add router)
FILE: backend/app/config.py (add SENDGRID_WEBHOOK_SECRET)

PROBLEM:
Need a POST /api/interac/inbound endpoint that receives SendGrid Inbound
Parse webhooks, parses the email, attempts settlement matching, and logs
everything to InteracEmailLog.

TASK:
1. config.py: add SENDGRID_WEBHOOK_SECRET: str = "" to Settings.

2. interac_routes.py — create router with POST /api/interac/inbound:
   - Accepts multipart/form-data (SendGrid Inbound Parse format)
   - Extracts fields: `from` (sender), `to` (recipient), `subject`,
     `email` (raw MIME — present when "Send Raw" is enabled)
   - Calls parse_email_body(email) to get plain text
   - Calls parse_interac_email(subject, body_text)
   - Creates InteracEmailLog entry immediately (before matching)
   - If parsing succeeded: calls match_settlement(parsed, to_address, db)
   - If match found: calls confirm_settlement(settlement, log, db)
   - If no match: sets log.failure_reason = "no_matching_settlement"
   - Always returns HTTP 200 (SendGrid retries on non-200)
   - Rate limit: @limiter.limit("60/minute") — banks can send bursts

3. main.py: import and register interac_routes.router.

SECURITY:
- SendGrid Inbound Parse does NOT send a signature on raw MIME webhooks.
  Instead, verify the request comes from SendGrid's IP ranges by checking
  the X-Forwarded-For or client IP against SendGrid's published IP list.
  For now: log a WARNING if SENDGRID_WEBHOOK_SECRET is set and the header
  is missing, but do not block (Vercel proxies make IP checking unreliable).
  Add a TODO comment for production IP allowlisting.
- Never log the raw email body — only subject, from, parsed fields.

RULES:
- The endpoint must return 200 even on parse failure or match failure —
  SendGrid will retry indefinitely on any non-200 response.
- Add the SENDGRID_WEBHOOK_SECRET to Vercel env var instructions in a comment.
- Follow the existing route pattern (APIRouter, get_db, logger).

Show me interac_routes.py in full, the config.py addition, and the
main.py router registration line.
```

**R2-5 prompt:**
```
FILE: frontend/src/components/SettlementCard.tsx (or wherever individual
settlements are rendered in the group detail / settle-up view)

PROBLEM:
When a settlement is auto-confirmed via Interac email parsing, users should
see a clear visual indicator so they know the magic worked.

TASK:
In the settlement list/card component, when settlement.status === "settled"
AND settlement.method === "interac", show a small badge:

  ✅ Auto-confirmed via Interac

Badge style:
- Small pill, green background (use existing accent colour token)
- Text: "Auto-confirmed" with CheckCircle2 from lucide
- Appears inline with settlement amount or below status text
- Tooltip on hover: "Confirmed automatically from your bank email"

RULES:
- Only show when BOTH status === "settled" AND method === "interac".
- If no `auto_confirmed` field exists yet, add it as optional boolean
  defaulting to false and note a backend field is needed.
- Do not change any settlement logic — display only.
- Match existing dark/light mode styling.

Show me the updated settlement component with the badge added.
```

### After R2-4 and R2-5
1. Run Alembic migration for `interac_email_logs` table against prod:
   ```
   $env:DATABASE_URL="postgresql+asyncpg://..." ; alembic upgrade head
   ```
2. Test end-to-end: send a real Interac e-Transfer, forward confirmation email to `anything@inbound.tandempay.ca`, verify settlement auto-confirms.
3. Open PR `feat/interac-email-parsing → main`.

---

## Free vs Pro feature split

Free tier: Unlimited groups/members, equal-split expenses, debt simplification, Settle Up via Interac (with auto-confirm) or Stripe backup, manual fallback, friend system, notifications, activity feed, 30-day history, CAD only, dark/light mode, web + mobile.

Pro tier ($3.99/mo or $29.99/yr): Recurring expenses (HEADLINE), itemized split + receipt OCR, advanced split types, multi-currency, cross-group dashboard, push notifications, unlimited history, expense categories + summaries, CSV/PDF export, priority support.

---

## Remaining roadmap after R2

| # | Item | Notes |
|---|---|---|
| R1 | Settle Up modal redesign (Interac primary, card secondary) | Prompt written in prior session |
| R3 | Pro subscription billing infrastructure | Regular Stripe Subscriptions, paywall middleware |
| R4 | Recurring expenses feature | Pro headline. RecurringExpense model + scheduler + UI |
| R5+ | Remaining Pro features | Multi-currency, itemized split, OCR, CSV export, push notifs |

---

## Pre-Launch Checklist (non-code)

1. Register Canadian business entity
2. Add Privacy Policy and Terms of Service live URLs
3. Determine FINTRAC MSB registration requirement (consult Canadian fintech lawyer)
4. Start Stripe Connect application (2–4 week review)

---

## Working agreements with Claude

1. **No direct code edits.** Claude produces scoped Antigravity prompts. Vedant pastes, Antigravity executes.
2. **No git operations from bash.** Hand off to Antigravity.
3. **Conserve usage.** Short responses when sufficient. Skip mockups unless requested.
4. **One prompt at a time.** Don't merge unrelated changes into mega-prompts.

## Critical reference points

- **Repo path (Windows):** `C:\Users\vedan\Documents\Tandempay`
- **GitHub:** `github.com/Vedantdave66/Tandempay`
- **Vercel projects:** `tandempay-api` (backend), `tandempay` (frontend)
- **Database:** Supabase Postgres via Transaction Pooler. `DATABASE_URL` uses `postgresql+asyncpg://` on port 6543.
- **Alembic baseline:** `1a2b3c4d5e6f_initial_schema.py`. Latest migration: `20d7c91bb5df_add_revoked_tokens_table.py`.
- **SendGrid:** Domain `tandempay.ca` authenticated. Inbound Parse on `inbound.tandempay.ca`.

## What to open with in the new session

> "Picking up TandemPay R2 (Interac email parsing). Branch is `feat/interac-email-parsing`. R2-1 (InteracEmailLog model), R2-2 (email_parser.py), and R2-3 (interac_matcher.py) are done. Next is R2-4 (webhook route) then R2-5 (frontend badge). Prompts are in the handoff doc."
