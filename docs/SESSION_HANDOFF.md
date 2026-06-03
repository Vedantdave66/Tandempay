# TandemPay — Session Handoff for Claude

**Last updated:** 2026-06-02
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

## What was completed this session (2026-06-02)

### GroupCard + Dashboard visual overhaul — PR #98 (branch `fix/groups-api-items-fallback`, merged to main)

Full UI polish pass across mobile and web. No backend changes.

#### Mobile — `mobile/src/constants/Colors.ts`
- Added 11 `group*` tokens to both `light` and `dark` palettes: `groupGlow`, `groupBoxFill`, `groupBoxBorder`, `groupBoxShadow`, `groupLabel`, `groupOwe`, `groupOwed`, `groupOthersFill`, `groupOthersInk`, `groupNameInk`, `groupArrowBg`.
- `groupGlow` typed as `[string, string, string, string, string]` tuple so `expo-linear-gradient`'s `colors` prop accepts it without a cast.
- **Why this was needed:** GroupCard was using `colors.surface` for the title pill and value boxes — the same colour as the card background — making them invisible (black-on-black) in dark mode.

#### Mobile — `mobile/src/components/GroupCard.tsx` (full rewrite)
- Replaced `react-native-svg` `<RadialGradient>` with `expo-linear-gradient` 5-stop vertical glow.
- All surfaces now read from `colors.group*` tokens — no hardcoded hex values.
- Dark mode: `groupBoxFill: '#0A0B0A'` renders as visible black silhouettes against the bright `#1AA94E` centre glow.
- Light mode: white elevated boxes (`groupBoxFill: '#FFFFFF'`, subtle border + shadow) on a soft mint glow.
- Characters peek above title pill with per-slot tilt (`TILT` array, ±4°–7° body, ±6°–10° name); crown icon for group creator.
- `+N others` pill appears when group has more than 4 members.
- Balance amount is gold when you owe / green when owed; arrow ring colour matches.
- Removed `eyeStyle="ball"` prop from `<CharacterShape>` (separate follow-up edit).

#### Mobile — `mobile/src/screens/DashboardScreen.tsx`
- **Safe area fix:** replaced `SafeAreaView` with plain `View`; header container uses `paddingTop: insets.top + 12` — no bleed under Dynamic Island or status bar.
- **Collapsing hero:** `FlatList` → `Animated.FlatList` with `scrollY` ref (`useNativeDriver: true`). Header + balance stat cards + pro upsell + customise row moved into `ListHeaderComponent`, wrapped in `Animated.View` with `heroOpacity` (`inputRange: [0, 100]`) and `heroTranslate` (`outputRange: [0, -20]`).
- **Compact sticky balance bar:** absolutely positioned at `top: insets.top`, fades in over `inputRange: [60, 110]` as the hero fades out. Renders as a sibling outside the FlatList so it overlays scrolling content. `pointerEvents="none"` so it doesn't intercept taps.

#### Web — `frontend/src/services/api.ts`
- Added `character_nickname: string | null` to `UserBalance` interface.

#### Web — `frontend/src/components/CharacterShape.tsx`
- Added `card` variant to `MINI_CONFIGS` with dimensions matching mobile (`rect` 38×64, `tall` 28×80, `semi` 66×38, `round` 50×64). Used `radius` strings (web format) derived from the mobile `tl`/`tr` values — no other changes to the component.

#### Web — `frontend/src/components/GroupCard.tsx` (full rewrite)
- Replaced Tailwind-based card with inline-style version matching the mobile design.
- Radial-gradient glow via CSS `background` (dark: `#28E06B → #070A08`; light: `#3BE57F → #F3FBF4`).
- `useDarkMode()` hook using `MutationObserver` on `document.documentElement` — checks `classList.contains('dark')`, `data-theme="dark"`, and `document.body.classList.contains('dark')`; re-reads on mount after hydration. Observes both `documentElement` and `body`.
- `LADDER` tilt array for character cluster (body ±4°–7°, name ±8°–10°), matching mobile.
- `character_nickname` used as display name (falls back to first name).
- `card` variant on `<CharacterShape>`.
- Themed box styles: dark = near-black pill + no shadow; light = white + border + drop shadow.
- Arrow ring colour tracks owe/owed/settled.
- Props interface unchanged — drop-in replacement, no changes to `DashboardPage.tsx`.

#### Web — `frontend/src/components/CurvedMenu.tsx`
- Nav item font: `font-light` → `font-semibold`.
- Removed backdrop `bg-black/40 backdrop-blur-[2px]` — overlay now transparent (click-to-close preserved).
- Removed per-item index number span (`0{index}`).
- Removed `border-b` and active/inactive border colour classes from `motion.button` — clean borderless nav rows.

---

## What was completed this session (2026-06-01)

### Mobile character identity system — PRs #90–94 (branch `feat/mobile-group-card`)

Full mobile redesign session. Everything below is merged to main (PR #94 pending CI — one commit, no backend changes, will merge automatically when green).

#### Character fields wired end-to-end
- `PATCH /api/auth/me` now accepts `character_shape`, `character_color`, `character_nickname` — added to `UserUpdate` schema with a `field_validator` rejecting invalid shapes. Handler in `auth.py` writes all three.
- `GET /groups/{id}/balances` now returns `character_shape`, `character_color`, `character_nickname` on every `UserBalance` entry — added to the schema and the `balance_service.py` constructor call.
- Mobile `User` interface and `UserBalance` interface both updated with optional `character_shape/color/nickname` fields. `authApi.updateProfile()` added for `PATCH /auth/me`.

#### New mobile components
- **`mobile/src/components/CharacterShape.tsx`** — ported from web. Now has four variants: `cluster`, `mini`, `hero`, `card`. New `eyeStyle` prop (`'dot'` default | `'ball'`): ball renders white outer circle + dark inner pupil. Mouth renders on `round` shape when config has `mouthLeft/mouthTop`. Existing variants untouched.
- **`mobile/src/components/GroupCard.tsx`** — ported from web PRs #84–88. Dark surface card, `expo-linear-gradient` green glow (dims to 50% in light mode), characters at `zIndex:2` standing on the black name pill (`marginTop: -20`, `zIndex:1`). Nicknames above characters. `card` variant + `eyeStyle="ball"`. Balance pills, arrow button, `+N others` pill all present.
- **`mobile/src/components/CharacterSetupModal.tsx`** — full-screen onboarding modal shown after registration when `character_nickname === null`. Animated hero character preview: `PanResponder` eye tracking, random blink loop, body `skewX` derived from touch offset. Shape picker (4 shapes), 8-color swatch palette, nickname input, "Let's go" CTA. Optional `onClose` prop makes it dismissible (used by dashboard character picker).

#### Modified mobile screens
- **`GroupsScreen`** — replaced inline row cards with `GroupCard`. Fetches per-group balances in parallel after `setGroups()` fires (balance failures silent).
- **`DashboardScreen`** — full redesign matching web `DashboardPage`: hero `CharacterShape` in header, two balance stat cards (green owed / amber owing), `GroupCard` list, character customise row (opens `CharacterSetupModal`), Recent Activity footer (last 3 notifications). Dynamic `paddingBottom` from `useSafeAreaInsets`.
- **`CustomTabBar`** — replaced hardcoded bottom offset with `useSafeAreaInsets()` so the floating bar clears the home indicator on all iPhones including Dynamic Island.

#### RootNavigator
- Wraps return in `Fragment`, renders `<CharacterSetupModal visible={!!user && user.character_nickname === null} />` as a sibling — appears automatically for new users, dismissed by `refreshUser()` after save.

---

### PR #88 — Dashboard font-weight fix (commit `88f6535`, branch `fix/dashboard-font-weight`)

`font-black` (weight 900) is outside Plus Jakarta Sans's supported range (300–800), causing browsers to synthesize the weight or fall back to system fonts — making dashboard headings look visually inconsistent with the sidebar.

**Changes:** Replaced all `font-black` → `font-extrabold` (800) on the greeting, section headers, balance amounts, and empty-state heading in the Dashboard component. 5 additions / 5 deletions.

**Files changed:** Dashboard component (Tailwind class swap only — no logic changes).

---

## What was completed in session (2026-05-12)

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

## Key files changed this session (2026-06-02)

```
mobile/src/constants/Colors.ts                — added 11 group* theme tokens (light + dark)
mobile/src/components/GroupCard.tsx           — full rewrite: LinearGradient glow, group* tokens, tilt cluster
mobile/src/screens/DashboardScreen.tsx        — safe area fix, Animated.FlatList, collapsing hero, compact bar
frontend/src/services/api.ts                  — UserBalance.character_nickname added
frontend/src/components/CharacterShape.tsx    — card variant added to MINI_CONFIGS
frontend/src/components/GroupCard.tsx         — full rewrite matching mobile, useDarkMode hook
frontend/src/components/CurvedMenu.tsx        — font-semibold nav, no backdrop blur, no index/dividers
```

## Key files changed in session (2026-06-01 / earlier)

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
> "I'm picking up TandemPay work. Memory has the project context and the handoff doc is at `docs/SESSION_HANDOFF.md`. The last session (2026-06-02) was a UI polish pass — GroupCard dark/light mode fix on mobile + web, DashboardScreen collapsing hero, and CurvedMenu nav cleanup (PR #98, merged to main). Branch `fix/groups-api-items-fallback` still has post-merge commits not yet in a new PR. The next focus is product work: either R1 (Settle Up modal redesign) or R2 (Interac email-parsing backend service)."

The new Claude will read memory, check the handoff doc, and be ready to continue from there.
