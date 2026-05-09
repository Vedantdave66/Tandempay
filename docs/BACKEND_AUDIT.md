# TandemPay — Backend Audit & Cleanup Plan

Generated 2026-05-09. Read-only audit of what your Phase 1 / Phase 2 prompt suite produced, plus a full inventory of lingering `splitease` references from the original rename. Cleanup actions are listed at the end, ordered by impact. **No code has been changed by this document** — apply individual sections by greenlighting them.

---

## 1. Rename Sweep — `splitease` → `tandempay`

The rename is incomplete in three layers: code identifiers (logger names), build / deploy config (package names, Docker DB, Render service names), and docs.

### 1a. Logger names (mechanical change, low risk)

Twelve `getLogger("splitease.…")` calls remain. Renaming them only changes the log channel string; no functional behavior changes. Recommendation: replace every `splitease.` prefix with `tandempay.` (matches what `main.py`, `database.py`, and `auth.py` already use).

| File | Line | Current channel |
|---|---|---|
| `backend/app/idempotency.py` | 41 | `splitease.idempotency` |
| `backend/app/ledger.py` | 21 | `splitease.ledger` |
| `backend/app/routes/payments.py` | 17 | `splitease.payments` |
| `backend/app/routes/requests.py` | 37 | `splitease.requests` |
| `backend/app/routes/stripe_routes.py` | 101 | `splitease.onboarding` |
| `backend/app/routes/stripe_routes.py` | 145 | `splitease.webhooks` |
| `backend/app/routes/stripe_routes.py` | 358 | `splitease.reconciliation` |
| `backend/app/routes/wallet.py` | 35 | `splitease.wallet` |
| `backend/app/services/payment_reconciliation.py` | 13 | `splitease.reconciliation` |
| `backend/app/services/reconciliation.py` | 15 | `splitease.reconciliation` |
| `backend/tests/test_pg_concurrency.py` | 98, 101–104 | `splitease.*` (5 spots) |
| `backend/tests/test_pg_failure_injection.py` | 86–89 | `splitease.*` (4 spots) |

### 1b. Frontend package name

| File | What |
|---|---|
| `frontend/package.json` line 2 | `"name": "splitease-frontend"` → `"tandempay-frontend"` |
| `frontend/package-lock.json` lines 2 & 8 | Same rename. Will regenerate on next `npm install`. |

### 1c. Docker / database identifiers

| File | What |
|---|---|
| `docker-compose.yml` | `POSTGRES_USER/PASSWORD/DB` all set to `splitease`. Rename to `tandempay`. **Note:** changing this means dropping your local `pgdata` volume (or re-creating the role/database manually) — your local DB will not persist through this rename. |
| `backend/docker-compose.test.yml` | `container_name: splitease-test-pg`, `POSTGRES_DB: splitease_test`. Rename to `tandempay-test-pg` and `tandempay_test`. |
| `backend/tests/conftest.py` line 16 | `PG_TEST_URL = "…/splitease_test"` — must match `docker-compose.test.yml` after rename. |
| `backend/.env.example` line 2 | `DATABASE_URL=sqlite+aiosqlite:///./splitease.db` → `tandempay.db`. |
| `backend/splitease.db`, `backend/split_ease.db` | Stale SQLite files at the repo root level. Already gitignored (`*.db` is in `.gitignore`). Safe to delete locally. |

### 1d. Render deployment config (`render.yaml`)

The file already contains the comment "This project is deployed on Vercel, not Render. render.yaml is kept for reference only." If you keep it, rename the three services and the database for consistency:

| Current | Suggested |
|---|---|
| `splitease-api` | `tandempay-api` |
| `splitease-web` | `tandempay-web` |
| `splitease-db` | `tandempay-db` |

Alternatively: delete `render.yaml` since you no longer deploy there. Cleaner.

### 1e. Docs (high impact for "feel")

| File | What |
|---|---|
| `README.md` lines 391, 403–405 | References to `splitease-api`, `splitease-web`, `splitease-db`, and `postgresql+asyncpg://splitease:splitease@…` snippets. Rewrite. |
| `docs/splitease_pitch_deck.md` | Whole deck still branded "SplitEase". **Rename file** to `tandempay_pitch_deck.md` and rewrite content (15+ occurrences). Ironically points readers to a dead `splitease-web.onrender.com` URL. |
| `docs/system_evolution.md` | Title "SplitEase Backend — System Evolution Document" plus dozens of `file:///c:/.../splitease/...` absolute path links from before the rename. Links won't break code but they're confusing. |
| `docs/adversarial_audit.md` | Title "Adversarial Security Audit — SplitEase Payment System" plus the same stale `file:///` link pattern. |
| `docs/_old_friends.txt` | Single mention. |
| `backend/DATABASE_GUIDE.md` lines 11, 21, 25, 103 | References to `backend/splitease.db`. Same rename as 1c. |

### 1f. Stale repo URL

`check_status.py` line 6 still hits `api.github.com/repos/Vedantdave66/splitease`. The repo is now `Vedantdave66/Tandempay` (per the Antigravity push earlier). Change the URL or delete the script if you don't use it.

### 1g. Intentionally not renamed (left for your decision)

- `backend/.env` line 9: `SMTP_USERNAME=splitease.ca@gmail.com` is the actual Gmail account name. Renaming the variable doesn't change the inbox; you'd have to create a new Gmail account and migrate. Up to you.
- The Resend "from" address is already `noreply@send.tandempay.ca`, so external-facing email is correct.

---

## 2. Phase 1 Audit — Production Safety

| # | Prompt | Status | Notes |
|---|---|---|---|
| 1 | Fix `_compute_balances()` to subtract settled payments | ✅ Applied, **better than spec** | Returns `settlement_adjustments` separately from `total_paid` / `total_owed` rather than baking them in. Cleaner — raw expense figures stay accurate for display. Greedy algorithm preserved. Also implements the Phase 2-5 ghost-debt filter (`active_member_ids`) — see comment block at lines 80–87. |
| 2 | Authenticate `/stripe/cleanup` and `/stripe/reconcile/{id}` | ✅ Applied | Both check `x_admin_secret` against `settings.ADMIN_SECRET` (lines 342, 412). Same pattern as `auth.py` admin routes. |
| 3 | Fix Stripe idempotency key | ✅ Applied | `payments.py` line 175: `f"pi_{data.settlement_id or 'none'}_{current_user.id}"`. The `or 'none'` fallback wasn't in the spec but is a safety net for payments without a settlement_id. |
| 4 | ZeroDivisionError on empty participants | ✅ Applied | `expenses.py` lines 40–43 — both guards (amount > 0, len > 0) before any DB ops. |
| 5 | Remove debug prints leaking reset tokens | ✅ Applied | Zero `print()` calls remain in `backend/app/`. `logger.info("forgot_password: reset link generated for user_id=…")` (auth.py line 243) logs the user ID only — not the link. Clean. |
| 6 | Fix Tutorial screen crash | ✅ Applied | `mobile/src/screens/TutorialScreen.tsx` exists, registered in `RootNavigator.tsx` line 86–87. |
| 7 | Password min-length + login rate limit | ⚠ Mostly applied, **one drift** | `Field(min_length=8)` on `UserRegister.password` (schemas.py line 11) ✅. `@limiter.limit("10/minute")` on login ✅. `@limiter.limit("3/hour")` on forgot-password ✅. **Drift:** the custom error message `"Password must be at least 8 characters"` is set via `json_schema_extra={"error_messages": {…}}` — that key is not respected by Pydantic v2's validation. The 422 response will show Pydantic's default `"String should have at least 8 characters"` instead. Either accept the default or use a `@field_validator`. |

**Phase 1 verdict:** clean. One small correctness drift (7's custom error message) and a lot of correct work. The "AI feel" risk in this phase is low.

---

## 3. Phase 2 Audit — Beta Safety

| # | Prompt | Status | Notes |
|---|---|---|---|
| 1 | Expense ownership checks on PUT/DELETE | ✅ Applied | `expenses.py` lines 202 and 293 — both check `expense.paid_by != current_user.id` before mutating. 404 for non-existent, 403 for not-owner. |
| 2 | Group join requires invite token | ✅ Applied | `Group.invite_token` (models.py line 39) defaults to `secrets.token_urlsafe(16)`. Join endpoint uses `secrets.compare_digest` (groups.py line 169) — constant-time compare, good. Token exposed only to creator (line 105). |
| 3 | Mobile Stripe payment flow | ✅ Applied | `App.tsx` wraps in `StripeProvider`. `PaymentsScreen.tsx` uses `usePaymentSheet`, `initPaymentSheet`, `presentPaymentSheet`. |
| 4 | Webhook 3DS / dispute / account.updated handlers + reconciliation cleanup | ✅ Applied | `stripe_routes.py` lines 239 (requires_action), 255 (charge.dispute.created), 294 (account.updated). `payment_reconciliation.py` has the >1h `requires_action` expiry pass (lines 59–99). |
| 5 | Removed-member balance ghost | ✅ Applied | Both layers: primary guard in `groups.py` line 250–265 blocks removal if balance is non-zero; defensive filter in `balance_service.py` lines 84–87 skips ghost participants. |
| 6 | Penny-rounding fix + SettlementRecord architecture comment | ✅ Applied | `expenses.py` lines 73–86 use `ROUND_DOWN` + remainder-to-first-participant + `sum(shares) == amount` invariant assertion. `models.py` line 85 has the architecture-note comment block above `SettlementRecord`. |
| 7 | Migrate to Alembic | ⚠ Partial | `backend/alembic/` exists, `env.py` configured to read `DATABASE_URL` from env and convert async→sync (good). Lifespan no longer runs `ALTER TABLE` (good). **Two gaps:** (a) only 2 migrations exist (`add_invite_token_to_groups`, `unique_constraint_settlement_group_`) — there's no "initial schema" migration, so a fresh DB cannot be brought up by `alembic upgrade head` alone; tables are still created by `init_db.py` or by the ORM on first run. (b) `render.yaml` was supposed to gain a `preDeployCommand: alembic upgrade head` per the prompt — it does not. (Less critical since you're on Vercel now; but if you ever spin up a new prod DB you'll need to run migrations manually.) |

**Phase 2 verdict:** also clean. The Alembic migration is the one thing that needs follow-up — it's a half-finished bridge.

---

## 4. AI-Boilerplate Patterns to Watch

These aren't bugs, but they're the "feels AI-generated" texture. None are urgent; flagging them so you know where the seams are.

- **Multi-paragraph block comments above every code section.** `balance_service.py` `_compute_balances` is the main offender — three multi-line block comments inside a single function. The code is correct; the comments are a third of the function. Trim to 1–2 lines each, or remove where the code is self-explanatory.
- **Triple-redundant defensive checks.** Phase 2-5 implements the ghost-debt fix at *three* layers (primary balance guard on remove, defensive filter in `_compute_balances`, comment marking the second one as a safety net). Belt + suspenders + parachute. Functional, but a lot.
- **`or 'none'` style fallbacks** (Phase 1-3 idempotency key) — silent fallbacks paper over data invariants. If `settlement_id` is missing on a payment that was supposed to have one, you'd rather know loudly than have Stripe see a `pi_none_<user>` key.
- **`error_messages` inside `json_schema_extra`** (Phase 1-7) — looks like a config but does nothing. Cargo-culted from another framework's pattern.
- **`json_schema_extra={"error_messages": ...}`** type stuff appears in a few places; would benefit from a sweep.

---

## 5. Recommended Cleanup Actions, Ordered by Impact

When you greenlight an item below, I'll apply it. Each is independently committable.

1. **Logger rename sweep (1a)** — 12 line edits, zero behavioral change, makes log filtering coherent. **Highest leverage, lowest risk.** ~5 min.
2. **Frontend package.json rename (1b)** — 1 line in `package.json`, regenerate `package-lock.json` with `npm install`. ~2 min.
3. **Doc filename + content rewrite (1e)** — Rename `splitease_pitch_deck.md` → `tandempay_pitch_deck.md` and replace every "SplitEase" with "TandemPay"; same in `system_evolution.md`, `adversarial_audit.md`, `README.md`. **Most visible "feel" improvement.** ~15 min.
4. **Render config (1d)** — recommend deleting `render.yaml` outright since you deploy on Vercel. Removes a stale source of truth. ~1 min.
5. **Fix Phase 1-7 password error message (P1-7 drift)** — small correctness fix; either accept Pydantic default and remove the dead `error_messages` key, or use a `@field_validator`. ~3 min.
6. **Generate initial Alembic migration (P2-7 gap)** — `alembic revision --autogenerate -m "initial schema"` against an empty DB, commit the file. Lets fresh-DB setups skip `init_db.py`. ~10 min, requires running locally with a clean Postgres.
7. **Docker DB rename (1c)** — only if you want full coherence. Will require dropping local `pgdata` volume. ~5 min + reseed time.
8. **Comment-density trim** — opinionated, takes a careful eye. Skip unless you actually want it.
9. **`check_status.py` (1f)** — fix the GitHub URL, or delete if unused. ~30 sec.

Items 1, 2, 3, 4 give you the biggest "this codebase feels mine again" boost for the smallest effort. Suggested batch: do 1+2+3+4+5 in one cleanup PR, then do 6 separately when you have a clean DB to migrate against.

---

## 6. What's Already Good

So you don't lose perspective on this — a lot of the codebase is solid:

- The exception-handler we added to `main.py` during the login fix gives you visible tracebacks for free, forever. Keep it.
- `database.py` is now properly tuned for asyncpg + Supabase Transaction Pooler.
- Phase 1 P0 bugs are all closed, Phase 2 P1 bugs are mostly closed.
- Constant-time invite-token compare, secure share calculation, atomic balance service, idempotent Stripe payments — all real engineering.
- The split between `SettlementRecord` (intent) and `Payment` (Stripe PaymentIntent) is documented now (P2-6).

When you come back to this codebase next, this audit doc plus the existing `system_evolution.md` (once renamed) should give you full context inside ~10 min of reading.
