# TandemPay — Session Handoff for Claude

**Last updated:** 2026-05-12
**Repo:** https://github.com/Vedantdave66/Tandempay
**Stack:** FastAPI backend (Vercel Python) · React/Vite frontend (Vercel) · React Native mobile (Expo/EAS)
**Prod URLs:** `https://tandempay.ca` (frontend) · `https://api.tandempay.ca` (backend)

Use this to bring a fresh Claude conversation up to speed without scrolling chat history. Memory (`MEMORY.md` and the files it indexes) auto-loads in any new session and covers the deeper project context — this doc focuses on what's in flight and what to do next.

---

## Where the project stands right now

- **Production is live and healthy.** Backend deploys to `api.tandempay.ca`, frontend to `www.tandempay.ca`, both on Vercel.
- **Login works.** asyncpg + Supabase Transaction Pooler + `connect_args` issue was fixed; production stable since.
- **Backend audit is complete.** Phase 1 (P0 safety) and Phase 2 (P1 beta) prompt-suite outputs were all reviewed and applied. `splitease` → `tandempay` rename done. Consolidated Alembic baseline (`1a2b3c4d5e6f`) replaced two broken older migrations and is stamped on prod.
- **Security headers landed.** `www.tandempay.ca` scores **A** on securityheaders.com.
- **Sentry error monitoring is operational on backend + frontend.** Mobile is code-ready, awaiting EAS build to verify.
- **Diagnostic exception handler in `backend/app/main.py` (`_log_unhandled_exception`) catches unhandled errors and now also forwards them to Sentry.** Keep it.

---

## Strategic direction (one paragraph)

TandemPay = "Splitwise for Canadian roommates, free settlement on Interac." Wedge audience is roommates with recurring shared bills. Interac e-Transfer is the primary settlement path (free, ~30 sec), with auto-confirmation via email parsing as the unique magic. Stripe Connect stays as a backup "Pay by card" option. Monetization is a Pro subscription at $3.99/mo or $29.99/yr via regular Stripe Subscriptions. Pro headline feature is recurring expenses for shared bills. See memory file `project_tandempay_strategy.md` for the full version and the Free/Pro feature split.

---

## What was completed this session (2026-05-12)

### 1. HTTP Security Headers (commit `12ed004`)

Added a `"headers"` array to both Vercel config files. No build or routing config was touched.

**`vercel.json` (frontend) — 6 headers on all routes:**
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self)`
- Full `Content-Security-Policy` (see file for exact value)

**`backend/vercel.json` — 4 headers (no CSP on API responses):**
HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy.

**CSP third-party allowlist (verified against actual source):**

| Domain | Directive |
|---|---|
| `https://js.stripe.com` | script-src, frame-src |
| `https://hooks.stripe.com` | frame-src |
| `https://api.stripe.com` | connect-src |
| `https://cdn.plaid.com` | script-src |
| `https://*.plaid.com` | frame-src, connect-src |
| `https://api.tandempay.ca` | connect-src |
| `https://fonts.googleapis.com` | style-src |
| `https://fonts.gstatic.com` | font-src |
| `https://*.ingest.sentry.io` | connect-src *(added in Sentry step)* |
| `https://*.ingest.us.sentry.io` | connect-src *(added in Sentry step)* |

### 2. Sentry error monitoring — all 3 layers (commits `0817f36`, `ad393b7`, fixes `5173151`, `e3d08a2`, `b39b03a`)

Operational on backend and frontend; mobile code-ready pending EAS build.

**Backend** (`backend/app/main.py`, `backend/app/config.py`, both `requirements.txt`):
- `sentry-sdk[fastapi]` added to `backend/requirements.txt` AND `backend/api/requirements.txt`
- `SENTRY_DSN: str = ""` and `ENVIRONMENT: str = "development"` added to `Settings` in `config.py`
- `sentry_sdk.init()` at **module level** in `main.py` (NOT inside lifespan — critical for serverless cold starts)
- Integrations: `StarletteIntegration()` + `FastApiIntegration()`
- `send_default_pii=False`
- `before_send` scrubs only exception `.value` strings and `.message` — NOT the full serialized event. (Serializing the full event was the original bug: URLs contain "token" which matched the forbidden-terms filter and silently dropped everything.)
- `_log_unhandled_exception` handler explicitly calls `sentry_sdk.capture_exception(exc) + sentry_sdk.flush(timeout=2)` — necessary because FastAPI's exception handlers convert exceptions to JSONResponse before Sentry's ASGI layer sees them
- **Vercel env vars required:** `SENTRY_DSN=https://...` (Python project DSN) and `ENVIRONMENT=production` on the backend Vercel project

**Frontend** (`frontend/src/main.tsx`):
- `@sentry/react` v10 installed
- `Sentry.init()` runs before `ReactDOM.createRoot` — reads `import.meta.env.VITE_SENTRY_DSN`
- `browserTracingIntegration()` added (required in v8+)
- Same targeted `beforeSend` filter (the broken initial version was `JSON.stringify(event)` matched against forbidden terms — every event contained "token" via URLs)
- `console.log('[Sentry] Frontend monitoring enabled/disabled')` for visibility
- App wrapped with `Sentry.ErrorBoundary` when DSN is set
- **CSP fix:** `https://*.ingest.sentry.io` and `https://*.ingest.us.sentry.io` added to `connect-src` in `vercel.json` — this was the final blocker (browser was blocking the outbound fetch to Sentry's ingest endpoint)
- **Vercel env var:** `VITE_SENTRY_DSN=https://...` (React project DSN)
- **Verified working ✅** — both `captureMessage` and thrown errors visible in Sentry dashboard (`tandempay-frontend` project)

**Mobile** (`mobile/App.tsx`, `mobile/app.json`):
- `@sentry/react-native` installed (via `--legacy-peer-deps` due to pre-existing `@types/react` peer conflict)
- `Sentry.init()` at top of `App.tsx` before any component renders
- DSN read from `Constants.expoConfig?.extra?.sentryDsn` (set in `app.json`)
- `sentryDsn` field added to `mobile/app.json` under `extra{}` — DSN is committed in the repo (intentional; mobile DSNs are not secret in the same way backend DSNs are)
- Same `beforeSend` filter + `__DEV__` environment detection
- **Needs EAS build to test** — not verifiable in Expo Go

**Privacy rules enforced on all 3 layers:**
- `send_default_pii=False` on backend
- No Sentry Replay
- `beforeSend` forbidden terms: `password`, `hashed_password`, `stripe_payment_intent`, `interac`
- DSN not logged or printed anywhere

### 3. Cleanup (commit `9249d5e`)

All temporary Sentry validation scaffolding removed:
- `backend/app/routes/sentry_test.py` deleted
- `frontend/src/pages/SentryTestPage.tsx` deleted
- `mobile/src/screens/SentryTestScreen.tsx` deleted
- All `TODO(sentry-validation)` imports and route registrations removed from `main.py`, `App.tsx`, `RootNavigator.tsx`

---

## Key files changed this session

```
vercel.json                          — frontend security headers + CSP (incl. Sentry ingest)
backend/vercel.json                  — backend security headers
backend/requirements.txt             — added sentry-sdk[fastapi]
backend/api/requirements.txt         — added sentry-sdk[fastapi] (Vercel build layer)
backend/app/config.py                — added SENTRY_DSN, ENVIRONMENT settings
backend/app/main.py                  — module-level Sentry init, integrations, flush in exception handler
backend/.env.example                 — added SENTRY_DSN=, ENVIRONMENT=development placeholders
frontend/package.json                — added @sentry/react
frontend/src/main.tsx                — Sentry.init(), browserTracingIntegration, ErrorBoundary
mobile/package.json                  — added @sentry/react-native
mobile/App.tsx                       — Sentry.init() before first render
mobile/app.json                      — added sentryDsn to extra{}
```

---

## Free vs Pro feature split (decided 2026-05-12)

Free tier — no quantity caps, genuinely usable indefinitely:
- Unlimited groups, members, friends
- Equal-split expenses, debt simplification
- Settle Up via Interac (with auto-confirm) or Stripe card backup
- Manual "I sent it" fallback
- Friend system, in-app notifications, activity feed, invite links
- 30-day searchable history
- CAD only, dark/light mode, web + mobile

Pro tier — $3.99/mo or $29.99/yr:
- Recurring expenses (HEADLINE — auto-generated monthly settlements for shared bills)
- Itemized split with receipt OCR
- Advanced split types (percentage, share-based, exact-amount)
- Multi-currency with live FX
- Cross-group dashboard
- Push notifications
- Unlimited searchable history
- Expense categories + monthly summaries
- CSV / PDF export
- Priority email support

---

## Execution sequence — Phase 3 trust/security pass

| # | Prompt | Status |
|---|---|---|
| 1 | Security headers (vercel.json, both projects) | ✅ DONE — A grade on securityheaders.com |
| 2 | Sentry error monitoring (backend + frontend + mobile) | ✅ DONE on backend + frontend; mobile pending EAS build verification |
| 3 | Audit log for financial actions | ✅ DONE — AuditLog wired in wallet.py (deposit/withdraw) and payments.py (4 locations); commit `a07769f`, merged PR #1 |
| 4 | Structured JSON logging (slimmed — rename portion already done) | ✅ DONE — moved inline loggers to module level in stripe_routes.py and plaid_routes.py; commit `47de988`, merged PR #2 |
| 5 | Input validation hardening | ✅ DONE — bounded amount on payments/wallet, max_length on payee_id/settlement_id, self-payment guard, fixed `recent_reset_requests` NameError; commit `54f0e2a`, merged PR #3 |
| 6 | CI/CD pipeline | ✅ DONE — GitHub Actions SQLite job green (commits `bc60c8f`–`a57c5bb`); PG job TODO (needs service container) |
| 7 | Refund endpoint | Optional — depends on whether Stripe Connect stays as backup |

## Pre-Launch Checklist (Before/During Phase 4)

These are non-code requirements that must be addressed before TandemPay handles real money at scale. Work these in parallel with Phase 4 development.

1. **Register Canadian business entity** — sole proprietorship or corporation. Required before opening a business bank account and before Stripe Connect approval.
2. **Add Privacy Policy and Terms of Service pages to the app** — required by Stripe, Apple App Store, and Google Play. Must be live URLs, not placeholders.
3. **Determine if MSB (Money Services Business) registration with FINTRAC is required** — any platform that facilitates money transfers in Canada may need to register. Consult a Canadian fintech lawyer before launching to real users.
4. **Start Stripe Connect application once core payment flows are working (mid-Phase 4)** — Stripe reviews Connect applications manually; allow 2–4 weeks. Do not wait until launch week.
5. **Stripe Connect will need:** business registration documents, KYC/onboarding flow description, dispute/refund policy, and expected transaction volumes (monthly).

---

## After Phase 3 — product revamp (the new direction)

| # | Prompt | Notes |
|---|---|---|
| R1 | Settle Up modal redesign (Interac primary, card secondary) | Prompt written; given to Vedant prior to Phase 3 start (still in chat history — may want to re-write in fresh session if not pasted before chat clears) |
| R2 | Interac email-parsing backend service | The big one — SendGrid Inbound Parse webhook, bank-email regex parsers (RBC/TD/Scotia/BMO/CIBC/NBC), match against pending SettlementRecord. ~1-2 weeks. |
| R3 | Pro subscription billing infrastructure | Regular Stripe Subscriptions, paywall middleware, `User.subscription_tier` column |
| R4 | Recurring expenses feature | Pro headline. `RecurringExpense` model + scheduler + UI |
| R5+ | Remaining Pro features | Multi-currency, itemized split, OCR, CSV export, dashboard, push notifs, categories |

---

## Remaining items the new Claude should know about

1. **Mobile Sentry verification** — needs an EAS production build to confirm the DSN in `app.json` actually fires events end-to-end. No code changes needed.
2. **Backend Sentry env vars** — confirm `SENTRY_DSN` and `ENVIRONMENT=production` are set in the **backend** Vercel project (separate from the frontend project, which has `VITE_SENTRY_DSN`).
3. **HSTS preload** — the `preload` directive is set in the header. Submit at https://hstspreload.org only after confirming no subdomain ever serves plain HTTP. One-way operation; do not rush.
4. **CSP tightening** — `'unsafe-inline'` in `script-src` and `style-src` is a known tradeoff (Vite/React inject inline content). Tightening requires nonce-based CSP, a future task.
5. **`@types/react` version mismatch in mobile** — pre-existing. `@types/react@18` pinned in devDependencies but `react-native@0.81.5` wants `@types/react@19`. Not blocking anything; resolve in a separate PR.
6. **`test_payment_concurrency.py` tests are skipped** — all three tests carry `@pytest.mark.skip` (commit `4cb9cad`). The endpoint `PUT /api/requests/{pr_id}/pay` was removed in `810379b` when wallet-based payment was replaced with pure Stripe PaymentIntents. Tests need a full rewrite against the current Stripe flow before the skip can be lifted.

---

## Working agreements with Claude

1. **No direct code edits.** Claude produces scoped Antigravity prompts in Vedant's existing Phase 1/2/3/4 suite style (file references, PROBLEM, TASK, RULES, "Show me..."). Vedant pastes, Antigravity executes.
2. **No git operations from bash.** Windows file-lock contention with `.git/index`. Hand off git operations to Antigravity.
3. **Conserve usage.** Short responses when sufficient. Skip mockups unless explicitly requested. Batch related questions.
4. **One prompt at a time.** Don't merge unrelated changes into mega-prompts. Each prompt should be scoped to one concern.

## Critical reference points

- **Repo path (Windows):** `C:\Users\vedan\.gemini\antigravity\playground\TandemPay`
- **GitHub:** `github.com/Vedantdave66/Tandempay`
- **Vercel projects:** `tandempay-api` (backend), `tandempay` (frontend) — both deployed
- **Database:** Supabase Postgres via Transaction Pooler. `DATABASE_URL` uses `postgresql+asyncpg://` on port 6543. Local uses the `tandempay/tandempay/tandempay` setup per `docker-compose.yml`.
- **Alembic baseline:** `1a2b3c4d5e6f_initial_schema.py`. Future migrations build on top.
- **Original prompt suite:** Uploaded as `TandemPay_Prompts.md` — Vedant's preferred format for all prompts.
- **Audit doc:** `docs/BACKEND_AUDIT.md` — covers the Phase 1/2 cleanup pass.

---

## What to do first in the new session

Open with:
> "I'm picking up TandemPay work. Memory has the project context and the handoff doc is at `docs/SESSION_HANDOFF.md`. We just finished Phase 3 #1 (security headers, A grade) and Phase 3 #2 (Sentry — operational on backend and frontend, mobile pending EAS build). The next prompt I need is Phase 3 #3: the audit log for financial actions. Please write that prompt in my Phase-suite style."

The new Claude will read memory, glance at the handoff doc for any specific commit IDs or details, and produce the audit log prompt ready to paste into Antigravity.
