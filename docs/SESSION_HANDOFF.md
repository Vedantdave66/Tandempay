# TandemPay — Session Handoff for Claude
**Last updated:** 2026-06-06
**Repo:** https://github.com/Vedantdave66/Tandempay
**Stack:** FastAPI backend (Vercel Python) · React/Vite frontend (Vercel) · React Native mobile (Expo/EAS)
**Prod URLs:** `https://tandempay.ca` (frontend) · `https://api.tandempay.ca` (backend)

---

## Where the project stands right now

- **Production is live and healthy.**
- **Production readiness score: ~83/100** — closed beta safe.
- **All 11 production hardening fixes are merged and deployed** (see below).
- **R1–R5 of the post-launch roadmap are all merged into `main`** — Settle Up redesign, Interac email auto-confirm, Pro subscription billing, recurring expenses, and CSV/PDF export are live in production. See "Roadmap status" below; the table that previously listed these as remaining is now stale.
- **Mobile UI revamp (Dashboard/Groups/GroupDetail/Friends/Profile/TabBar/AddExpense + LimelightNav tab bar) shipped 2026-06-06** via PRs #123, #124, #125 — all merged into `main`.
- **Latest Alembic head: `a107c01bd8f1`** (`add_auto_confirmed_to_settlement_records`, chained on `7af805ecb0e7` interac_email_logs ← `20d7c91bb5df` revoked_tokens). Confirm these have been run against prod Supabase before relying on the Interac auto-confirm flow in production.

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

## Mobile UI revamp session (2026-06-06) — branch `feat/revamp-friends-profile-tabbar-addexpense`

### What shipped
- **PR #123** "feat: full mobile UI revamp (A+B+C)" → **MERGED** into `main` (Dashboard, Groups, GroupDetail, Friends, Profile, TabBar, AddExpense rewrites)
- **PR #124** "fix: post-revamp follow-ups" → **MERGED** into `main`. Included: PaymentsScreen null-guards + array-extraction for paginated API responses, `ThemeToggle` added to Dashboard header, `Logo.tsx` slash-thickness fix, `GroupCard` clipping/alignment fixes, `CharacterShape` taller `semi` shape in card variant, ProHub "Customise character" Alert copy
- **PR #125** "feat: LimelightNav tab bar + recurring merge-conflict fixes" → **OPEN**, base `main`, head `feat/revamp-friends-profile-tabbar-addexpense`. Contains:
  - Full rewrite of `mobile/src/components/CustomTabBar.tsx` — "LimelightNav" pattern: `Animated.spring`-driven indicator that measures each tab's center-X via `onLayout` and glides to the active tab (`useNativeDriver: true`, `tension: 180, friction: 20`), plus a `LinearGradient` cone-glow beneath it
  - Recurring-bug fix commit (see below)

### ⚠️ Recurring systemic bug — watch for this every time `main` merges into this branch
Every `git merge origin/main` (or merge of `main`) into `feat/revamp-friends-profile-tabbar-addexpense` reintroduces two bugs that apparently live unresolved in `main` itself:
1. **`mobile/src/constants/Colors.ts`** — duplicate keys `accentBg`, `accentBgFaint`, `warningBg`, `warningBright`, `faintText` declared twice in both the `light` and `dark` palettes (once early in the object, once again under the `// Faint variants used for chips, pills, icon tiles` comment). Causes TS1117 "duplicate object literal property" errors. **Fix:** delete the *first* declarations, keep the later "Faint variants" block (it wins at runtime per JS object-literal semantics — last write wins).
2. **`mobile/src/screens/DashboardScreen.tsx`** — `styles` defines `safe: { flex: 1 }` but the JSX references `styles.screen`, causing TS2339 errors. **Fix:** rename `safe` → `screen`.

This was hit and fixed identically **three separate times** in one session (commits `9947e42`, then again, then `f3e4bcb`). If you're merging `main` into a feature branch and `npx tsc --noEmit` lights up with these exact errors, apply the same two fixes — don't waste time re-diagnosing.

### Stranded-commit pattern (also recurring)
Twice this session, a PR merged into `main` while follow-up commits kept landing on the same feature branch — leaving them stranded (not in `main`, not covered by any open PR). Detection: `git merge-base --is-ancestor <latest-sha> origin/main` returns false, or `git log --oneline origin/main..origin/<branch>` lists unmerged commits. **Resolution both times:** open a fresh follow-up PR from the same branch into `main` (PR #124, then PR #125) rather than trying to amend a merged PR.

### Pending for next session
- **PR #125 needs review/merge.** Manual checks still outstanding: limelight indicator animation on device, light/dark palette rendering.
- After #125 merges, re-check for stranded commits before starting new mobile work — the pattern is likely to repeat if anyone pushes to this branch concurrently.

---

## R2 — Interac Email Parsing — ✅ DONE (merged 2026-06-03, PRs #104, #105, #106)

### Infrastructure (DONE)
- SendGrid account created
- `tandempay.ca` domain authenticated in SendGrid (CNAMEs + TXT added to Namecheap)
- Inbound Parse configured: `inbound.tandempay.ca` → `https://api.tandempay.ca/api/interac/inbound`
- MX record added: `inbound` → `mx.sendgrid.net` priority 10
- SendGrid API key created (`tandempay-inbound`) with Inbound Parse + Mail Send permissions
- `SENDGRID_WEBHOOK_SECRET` added to Vercel backend environment variables

### Code — all merged into `main`

| # | Item | Status |
|---|---|---|
| R2-1 | `InteracEmailLog` model + Alembic migration `7af805ecb0e7` | ✅ DONE |
| R2-2 | `email_parser.py` — bank regex patterns (Big 5 + NBC + credit unions) | ✅ DONE |
| R2-3 | `interac_matcher.py` — fuzzy name matching + `confirm_settlement` | ✅ DONE |
| R2-4 | `interac_routes.py` — `POST /api/interac/inbound` SendGrid webhook, `SENDGRID_WEBHOOK_SECRET` in `config.py`, router registered in `main.py` | ✅ DONE — confirmed live in `backend/app/routes/interac_routes.py` on `main` |
| R2-5 | `PaymentRecordCard.tsx` — green "Auto-confirmed via Interac" pill, shown when `status === 'settled' && auto_confirmed && method === 'interac'` | ✅ DONE — confirmed live on `main` (line ~94) |
| — | `auto_confirmed` boolean added to `SettlementRecord` model + schema; Alembic migration `a107c01bd8f1`; `confirm_settlement` stamps the field | ✅ DONE |

Landed via PR #104 (webhook route + auto_confirmed field + frontend badge), PR #105 (Interac email parsing follow-ups across web pages), and PR #106 (R1 Settle Up redesign bundled with Interac auto-confirm wiring).

### Still to verify (non-code / ops)
1. Confirm Alembic migrations `7af805ecb0e7` and `a107c01bd8f1` have been run against prod Supabase (latest head is `a107c01bd8f1` — see "Critical reference points"):
   ```
   $env:DATABASE_URL="postgresql+asyncpg://..." ; alembic upgrade head
   ```
2. Test end-to-end in prod: send a real Interac e-Transfer, forward the confirmation email to `anything@inbound.tandempay.ca`, verify the settlement auto-confirms and the badge appears.

### Misc completed UI items (from this and prior sessions, all live on `main`)
- Balance bars in group Balances tab: character avatars centred (fixed-width container)
- GroupCard web + mobile: subtle grey border, gradient extended, "you're owed" bolder
- Dashboard: "Customise" button moved to top-right badge on character avatar
- CurvedMenu: "TandemPay" wordmark is sole hover/pin trigger; duplicate text removed
- INCOMING/OUTGOING stat cards on dashboard: now clickable, show per-group/per-person breakdown
- GroupCard dark mode: visible box fills, tilt cluster, balance colours

## Free vs Pro feature split

Free tier: Unlimited groups/members, equal-split expenses, debt simplification, Settle Up via Interac (with auto-confirm) or Stripe backup, manual fallback, friend system, notifications, activity feed, 30-day history, CAD only, dark/light mode, web + mobile.

Pro tier ($3.99/mo or $29.99/yr): Recurring expenses (HEADLINE), itemized split + receipt OCR, advanced split types, multi-currency, cross-group dashboard, push notifications, unlimited history, expense categories + summaries, CSV/PDF export, priority support.

## Roadmap status — R1–R5 are ALL DONE and merged into `main`

The table below previously listed these as "remaining roadmap after R2." That was stale — verification against GitHub on 2026-06-06 shows every item is merged and live:

| # | Item | Status | Evidence |
|---|---|---|---|
| R1 | Settle Up modal redesign (Interac primary, card secondary) | ✅ DONE | PR #106 "feat: R1 Settle Up redesign + rebrand + Interac auto-confirm" (merged 2026-06-03) |
| R2 | Interac email parsing | ✅ DONE | See section above |
| R3 | Pro subscription billing infrastructure | ✅ DONE | PR #5 "feat: Pro subscription billing infrastructure (R3)" (merged 2026-05-22) — `subscription_tier`/`stripe_customer_id` on `users`, migration `20260522_add_subscription_fields` |
| R4 | Recurring expenses feature | ✅ DONE | PR #6 "feat: Recurring Expenses Automation (Phase 4 R4)" (merged 2026-05-22) — `RecurringExpense` model, `recurring_routes.py`, `reminder_scheduler.py`/`scheduler.py`, migration `20260522_add_recurring_expenses`, integration tests in PR #50 |
| R5 | CSV/PDF export | ✅ DONE | PR #7 "feat: CSV/PDF Export (Phase 4 R5)" (merged 2026-05-22), refined in PR #24 "restructure tab nav + Pro hub, Recurring, Export screens" |
| R5+ | Multi-currency, itemized split, receipt OCR, mobile Pro tier | ✅ DONE (UI scaffolding at minimum) | PR #21 "Feat/mobile pro tier", PR #24 (Pro hub/Export/OCR screens), PR #25 (OCR copy fix), PR #20 (crown badge + `/pro-success` page + checkout wiring) |

**Nothing from the original R1–R5 roadmap remains open.** If there's a next phase (R6+), it hasn't been documented yet — define it fresh rather than trusting the old table.

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
- **Alembic baseline:** `1a2b3c4d5e6f_initial_schema.py`. Latest head: `a107c01bd8f1_add_auto_confirmed_to_settlement_records.py` (chain: `... → 20d7c91bb5df_add_revoked_tokens_table → 534d32e54b2b_merge_heads → 7af805ecb0e7_add_interac_email_logs_table → a107c01bd8f1_add_auto_confirmed_to_settlement_records`). Verify this has been run against prod.
- **SendGrid:** Domain `tandempay.ca` authenticated. Inbound Parse on `inbound.tandempay.ca`.

## What to open with in the new session

> "TandemPay's R1–R5 roadmap (Settle Up redesign, Interac auto-confirm, Pro billing, recurring expenses, CSV/PDF export) and the mobile UI revamp (PRs #123–#125) are all merged into `main`. Before starting new feature work: (1) confirm Alembic migrations are current on prod (head is `a107c01bd8f1`), (2) do an end-to-end Interac auto-confirm test against the live inbound parse address, (3) decide what the next roadmap phase (R6+) should be — there's no documented next item."

## Open items / things to double-check next session

1. **Prod migration check** — confirm `a107c01bd8f1` (and `7af805ecb0e7` before it) have actually run against prod Supabase; the doc previously only confirmed `20d7c91bb5df`.
2. **Interac end-to-end test** — no record found of a real e-Transfer being forwarded through `inbound.tandempay.ca` to verify the full auto-confirm pipeline in production.
3. **Pre-launch checklist** (below) — still appears to be open non-code work (business registration, legal docs, FINTRAC, Stripe Connect).
4. **Define R6+** — the roadmap table that used to list "remaining" items is now fully done; there's no documented next phase.
