# TandemPay — Session Handoff

Last updated: 2026-05-12. Use this to bring a fresh Claude conversation up to speed without scrolling chat history.

---

## Where the project stands right now

- **Production is live and healthy.** Backend at `api.tandempay.ca`, frontend at `www.tandempay.ca`, both on Vercel.
- **Login works.** The asyncpg + Supabase Transaction Pooler + connect_args issue was fixed; production has been stable since then.
- **Backend audit is complete.** Phase 1 (P0 safety) and Phase 2 (P1 beta) prompt-suite outputs were all reviewed and applied. The `splitease` → `tandempay` rename is done. A consolidated Alembic baseline (`1a2b3c4d5e6f`) replaced two broken older migrations and is stamped on prod.
- **Security headers landed.** HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and CSP are all live. `www.tandempay.ca` scores **A** on securityheaders.com.
- **Diagnostic exception handler in `backend/app/main.py` (`_log_unhandled_exception`) catches unhandled errors and surfaces them through `tandempay.*` loggers.** Keep it.

## Current strategic direction

Read `project_tandempay_strategy.md` in memory for the full version. One-paragraph summary:

TandemPay = "Splitwise for Canadian roommates, free settlement on Interac." The wedge audience is roommates with recurring shared bills. Interac e-Transfer is the primary settlement path, free for the user, with auto-confirmation via email parsing as the unique magic. Stripe Connect stays as a backup "Pay by card" option. Monetization is a Pro subscription at $3.99/mo or $29.99/yr via regular Stripe Subscriptions. Pro headline feature is recurring expenses for shared bills.

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

## Execution sequence — Phase 3 trust/security pass (current focus)

| # | Prompt | Status |
|---|---|---|
| 1 | Security headers (vercel.json, both projects) | DONE — A grade on securityheaders.com |
| 2 | Sentry error monitoring (backend + frontend + mobile) | Prompt written and given to Vedant; awaiting Antigravity run |
| 3 | Audit log for financial actions | Next after Sentry |
| 4 | Structured JSON logging (slimmed — rename portion already done) | After audit log |
| 5 | Input validation hardening | After structured logging |
| 6 | CI/CD pipeline | After validation |
| 7 | Refund endpoint | Optional — depends on whether Stripe Connect stays as backup |

## After Phase 3 — product revamp (the new direction)

| # | Prompt | Notes |
|---|---|---|
| R1 | Settle Up modal redesign (Interac primary, card secondary) | Prompt already written, given to Vedant prior to Phase 3 start |
| R2 | Interac email-parsing backend service | The big one — SendGrid Inbound Parse webhook, bank-email regex parsers (RBC/TD/Scotia/BMO/CIBC/NBC), matches against pending SettlementRecord. ~1-2 weeks. |
| R3 | Pro subscription billing infrastructure | Regular Stripe Subscriptions, paywall middleware, `User.subscription_tier` column |
| R4 | Recurring expenses feature | Pro headline. `RecurringExpense` model + scheduler + UI |
| R5+ | Remaining Pro features | Multi-currency, itemized split, OCR, CSV export, dashboard, push notifs, categories |

## Working agreements with Claude

1. **No direct code edits.** Claude produces scoped Antigravity prompts in Vedant's existing Phase 1/2/3/4 suite style (file references, PROBLEM, TASK, RULES, "Show me..."). Vedant pastes, Antigravity executes.
2. **No git operations from bash.** Windows file-lock contention with `.git/index`. Hand off git operations to Antigravity.
3. **Conserve usage.** Short responses when sufficient. Skip mockups unless explicitly requested. Batch related questions.
4. **One prompt at a time.** Don't merge unrelated changes into mega-prompts. Each prompt should be scoped to one concern.

## Critical reference points

- **Repo path (Windows):** `C:\Users\vedan\.gemini\antigravity\playground\TandemPay`
- **GitHub:** `github.com/Vedantdave66/Tandempay`
- **Vercel projects:** `tandempay-api` (backend), `tandempay` (frontend) — both deployed
- **Database:** Supabase Postgres via Transaction Pooler. `DATABASE_URL` uses `postgresql+asyncpg://` scheme on port 6543. Local uses `tandempay/tandempay/tandempay` setup per `docker-compose.yml`.
- **Alembic baseline:** `1a2b3c4d5e6f_initial_schema.py`. Future migrations build on top.
- **Original prompt suite:** Uploaded as `TandemPay_Prompts.md` — Vedant's preferred format for all prompts
- **Audit doc:** `docs/BACKEND_AUDIT.md` — covers what was reviewed during the Phase 1/2 cleanup pass

## What to do first in the new session

Open with: "I'm picking up TandemPay work. Memory has the full context. Where we stopped: I'm in the middle of Phase 3 trust pass. Security headers landed (A grade). Sentry prompt was written and given to me — I need to actually run it through Antigravity. After that, the next prompt to write is the audit log for financial actions (Phase 3 #3)."

The new Claude will read memory, pick up immediately, and won't need re-orientation.
