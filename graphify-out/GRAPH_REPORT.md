# Graph Report - .  (2026-05-27)

## Corpus Check
- 196 files · ~130,740 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1350 nodes · 3024 edges · 103 communities (86 shown, 17 thin omitted)
- Extraction: 65% EXTRACTED · 35% INFERRED · 0% AMBIGUOUS · INFERRED: 1062 edges (avg confidence: 0.52)
- Token cost: 5,221 input · 960 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Core Expense & Group Models|Core Expense & Group Models]]
- [[_COMMUNITY_Recurring Expense Engine|Recurring Expense Engine]]
- [[_COMMUNITY_Auth & Notification Layer|Auth & Notification Layer]]
- [[_COMMUNITY_Friend & Reminder System|Friend & Reminder System]]
- [[_COMMUNITY_Web Frontend Modals|Web Frontend Modals]]
- [[_COMMUNITY_Mobile Social Screens|Mobile Social Screens]]
- [[_COMMUNITY_Theme & Styling System|Theme & Styling System]]
- [[_COMMUNITY_Frontend UI Dependencies|Frontend UI Dependencies]]
- [[_COMMUNITY_Frontend UI Components|Frontend UI Components]]
- [[_COMMUNITY_Mobile App Dependencies|Mobile App Dependencies]]
- [[_COMMUNITY_Financial Safety Core|Financial Safety Core]]
- [[_COMMUNITY_Mobile App Assets|Mobile App Assets]]
- [[_COMMUNITY_PostgreSQL Concurrency Tests|PostgreSQL Concurrency Tests]]
- [[_COMMUNITY_Stripe Integration Tests|Stripe Integration Tests]]
- [[_COMMUNITY_Audit Logging|Audit Logging]]
- [[_COMMUNITY_User & Subscription|User & Subscription]]
- [[_COMMUNITY_UI Primitive Components|UI Primitive Components]]
- [[_COMMUNITY_React Native Auth Context|React Native Auth Context]]
- [[_COMMUNITY_Payment & Banking Models|Payment & Banking Models]]
- [[_COMMUNITY_Idempotency & Ledger|Idempotency & Ledger]]
- [[_COMMUNITY_Expo Build Config|Expo Build Config]]
- [[_COMMUNITY_App Configuration|App Configuration]]
- [[_COMMUNITY_Idempotency Concurrency Tests|Idempotency Concurrency Tests]]
- [[_COMMUNITY_DB Failure Injection Tests|DB Failure Injection Tests]]
- [[_COMMUNITY_Notifications & Payment Requests|Notifications & Payment Requests]]
- [[_COMMUNITY_Mobile Navigation & Notifications|Mobile Navigation & Notifications]]
- [[_COMMUNITY_Expense UI Components|Expense UI Components]]
- [[_COMMUNITY_Pro Subscription UI|Pro Subscription UI]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Payment Concurrency Tests|Payment Concurrency Tests]]
- [[_COMMUNITY_Mobile Group Navigation|Mobile Group Navigation]]
- [[_COMMUNITY_Export Functionality Tests|Export Functionality Tests]]
- [[_COMMUNITY_Web Frontend Auth|Web Frontend Auth]]
- [[_COMMUNITY_Settlement Constraint Tests|Settlement Constraint Tests]]
- [[_COMMUNITY_Web Layout Components|Web Layout Components]]
- [[_COMMUNITY_Web Registration Flow|Web Registration Flow]]
- [[_COMMUNITY_Web Password Recovery|Web Password Recovery]]
- [[_COMMUNITY_Mobile Theme System|Mobile Theme System]]
- [[_COMMUNITY_Security Audit & Pitch|Security Audit & Pitch]]
- [[_COMMUNITY_Backend Notifications|Backend Notifications]]
- [[_COMMUNITY_Bank Linking Routes|Bank Linking Routes]]
- [[_COMMUNITY_Subscription Routes|Subscription Routes]]
- [[_COMMUNITY_Security Audit Findings|Security Audit Findings]]
- [[_COMMUNITY_Monetary Precision Fixes|Monetary Precision Fixes]]
- [[_COMMUNITY_Web Recurring Page|Web Recurring Page]]
- [[_COMMUNITY_Backend CI Pipeline|Backend CI Pipeline]]
- [[_COMMUNITY_Idempotency Infrastructure|Idempotency Infrastructure]]
- [[_COMMUNITY_CSV Export Routes|CSV Export Routes]]
- [[_COMMUNITY_Error Boundary|Error Boundary]]
- [[_COMMUNITY_Brand Identity|Brand Identity]]
- [[_COMMUNITY_Product Strategy|Product Strategy]]
- [[_COMMUNITY_Infrastructure & Monitoring|Infrastructure & Monitoring]]
- [[_COMMUNITY_Database Migrations|Database Migrations]]
- [[_COMMUNITY_Auth UI Components|Auth UI Components]]
- [[_COMMUNITY_Migration & Refactor Docs|Migration & Refactor Docs]]
- [[_COMMUNITY_Database Infrastructure|Database Infrastructure]]
- [[_COMMUNITY_Frontend Vercel Config|Frontend Vercel Config]]
- [[_COMMUNITY_Database Session|Database Session]]
- [[_COMMUNITY_Backend Vercel Config|Backend Vercel Config]]
- [[_COMMUNITY_Mobile Pro Hub|Mobile Pro Hub]]
- [[_COMMUNITY_Mobile TypeScript Config|Mobile TypeScript Config]]
- [[_COMMUNITY_PostgreSQL Test Config|PostgreSQL Test Config]]
- [[_COMMUNITY_Payment Reconciliation|Payment Reconciliation]]
- [[_COMMUNITY_Brand Assets|Brand Assets]]
- [[_COMMUNITY_Web Frontend Entry|Web Frontend Entry]]
- [[_COMMUNITY_Request Context|Request Context]]
- [[_COMMUNITY_Rate Limiter|Rate Limiter]]
- [[_COMMUNITY_Duplicate Settlement Fix|Duplicate Settlement Fix]]
- [[_COMMUNITY_Stripe Verify Scripts|Stripe Verify Scripts]]
- [[_COMMUNITY_Backend Build Script|Backend Build Script]]
- [[_COMMUNITY_Frontend CI Pipeline|Frontend CI Pipeline]]
- [[_COMMUNITY_Expo Devices Config|Expo Devices Config]]
- [[_COMMUNITY_Expo Settings|Expo Settings]]
- [[_COMMUNITY_Expo README|Expo README]]
- [[_COMMUNITY_Android Icon Background|Android Icon Background]]
- [[_COMMUNITY_Android Icon Foreground|Android Icon Foreground]]
- [[_COMMUNITY_Android Monochrome Icon|Android Monochrome Icon]]
- [[_COMMUNITY_TandemPay Favicon|TandemPay Favicon]]
- [[_COMMUNITY_Mobile App Icon|Mobile App Icon]]
- [[_COMMUNITY_Splash Screen Icon|Splash Screen Icon]]

## God Nodes (most connected - your core abstractions)
1. `User` - 153 edges
2. `GroupMember` - 66 edges
3. `Base` - 60 edges
4. `Group` - 57 edges
5. `PaginatedResponse` - 54 edges
6. `Notification` - 53 edges
7. `useTheme()` - 51 edges
8. `WalletTransaction` - 46 edges
9. `Expense` - 36 edges
10. `AuditActions` - 30 edges

## Surprising Connections (you probably didn't know these)
- `Greedy Settlement Algorithm (Pitch)` --semantically_similar_to--> `Greedy Debt Simplification Algorithm`  [INFERRED] [semantically similar]
  docs/tandempay_pitch_deck.md → README.md
- `Vercel Deployment (backend + frontend)` --semantically_similar_to--> `Render Cloud Deployment (render.yaml Blueprint)`  [INFERRED] [semantically similar]
  docs/SESSION_HANDOFF.md → README.md
- `Stage 1: Sequential SQLite Tests` --semantically_similar_to--> `SQLite-backed CI Test Suite`  [INFERRED] [semantically similar]
  docs/system_evolution.md → .github/workflows/backend-ci.yml
- `Supabase PostgreSQL via Transaction Pooler` --semantically_similar_to--> `PostgreSQL Production Database (Render)`  [INFERRED] [semantically similar]
  docs/SESSION_HANDOFF.md → backend/DATABASE_GUIDE.md
- `Docker Compose Test PostgreSQL (port 5433)` --conceptually_related_to--> `Docker Compose PostgreSQL Service`  [INFERRED]
  backend/docker-compose.test.yml → docker-compose.yml

## Hyperedges (group relationships)
- **Financial Safety Triad: Idempotency + Row Locking + Double-Entry Ledger** — readme_idempotency_decorator, readme_pessimistic_locking, readme_double_entry_ledger [INFERRED 0.95]
- **Priority Audit Fixes: Critical Vulnerabilities Addressed** — audit_idempotency_race, audit_float_money, audit_toctou_payment_request, audit_stripe_var_shadow [EXTRACTED 1.00]
- **Testing Pyramid: SQLite → PostgreSQL → Failure Injection** — sysevo_test_sqlite_stage1, sysevo_test_pg_stage2, sysevo_test_failure_stage3 [EXTRACTED 1.00]

## Communities (103 total, 17 thin omitted)

### Community 0 - "Core Expense & Group Models"
Cohesion: 0.08
Nodes (98): Any, Expense, ExpenseParticipant, Group, GroupMember, Tracks actual payment transactions between users within a group., SettlementRecord, ExpenseCreate (+90 more)

### Community 1 - "Recurring Expense Engine"
Cohesion: 0.07
Nodes (49): Template for an expense that auto-fires on a recurring schedule (Pro only)., RecurrenceFrequency, RecurringExpense, _advance_date(), _fire_recurring(), process_due_recurring_expenses(), Recurring Expense Scheduler — Background job that auto-creates Expense records, RecurringExpenseCreate (+41 more)

### Community 2 - "Auth & Notification Layer"
Cohesion: 0.11
Nodes (53): PasswordResetToken, Single-use, time-limited password reset token stored as a SHA-256 hash.      T, no_duplicate_participants(), NotificationOut, PasswordResetConfirm, PasswordResetRequest, PaymentMethod, TandemPay Pydantic v2 schemas.  REQUEST schemas enforce strict input constrain (+45 more)

### Community 3 - "Friend & Reminder System"
Cohesion: 0.09
Nodes (41): ExpenseReminder, FriendRequest, Recurring reminder for an expense. Only the payer can create one., Tracks friend requests sent via email., FriendRequestCreate, FriendRequestOut, ReminderCreate, ReminderOut (+33 more)

### Community 4 - "Web Frontend Modals"
Cohesion: 0.05
Nodes (31): LinkBankModalProps, ReminderPopoverProps, StripeOnboardingModalProps, authApi, balancesApi, Expense, ExpenseParticipant, expensesApi (+23 more)

### Community 5 - "Mobile Social Screens"
Cohesion: 0.07
Nodes (29): authApi, balancesApi, Expense, ExpenseParticipant, expensesApi, Friend, Group, GroupListItem (+21 more)

### Community 6 - "Theme & Styling System"
Cohesion: 0.09
Nodes (25): styles, useTheme(), ThemeToggle(), RootNavigator(), Stack, CreateGroupScreen(), styles, ForgotPasswordScreen() (+17 more)

### Community 7 - "Frontend UI Dependencies"
Cohesion: 0.06
Nodes (31): dependencies, class-variance-authority, clsx, lucide-react, @radix-ui/react-checkbox, @radix-ui/react-label, @radix-ui/react-slot, react (+23 more)

### Community 8 - "Frontend UI Components"
Cohesion: 0.10
Nodes (18): AvatarProps, BalanceBubbleProps, PaymentRecordCardProps, PaymentStatusBadgeProps, statusConfig, RequestMoneyModalProps, SettleUpModalProps, Step (+10 more)

### Community 9 - "Mobile App Dependencies"
Cohesion: 0.06
Nodes (31): dependencies, expo, expo-blur, expo-dev-client, expo-linear-gradient, expo-status-bar, lucide-react-native, react (+23 more)

### Community 10 - "Financial Safety Core"
Cohesion: 0.11
Nodes (29): assert_conservation_of_money(), compute_wallet_balance(), lock_user_for_update(), lock_users_sorted(), pre_validate_balance(), Ledger utilities for financial correctness.  Production-grade guarantees:   - co, Read-only post-commit verification. Called AFTER commit with a fresh query., Acquire a pessimistic row-level lock on the User row.      On PostgreSQL: uses S (+21 more)

### Community 11 - "Mobile App Assets"
Cohesion: 0.06
Nodes (30): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, projectId (+22 more)

### Community 12 - "PostgreSQL Concurrency Tests"
Cohesion: 0.13
Nodes (29): Decimal, str, assert_ledger_consistency(), compute_ledger_balance(), count_transactions(), drain_user(), get_wallet_balance(), payment_test_data() (+21 more)

### Community 13 - "Stripe Integration Tests"
Cohesion: 0.11
Nodes (23): AsyncClient, str, MagicMock, client(), mock_stripe_env(), Test Suite: Stripe Idempotency and External API Protection  Validates that: 1. V, Test B — Missing idempotency key     Expected: system logs warning, safe fallbac, Test C — Simulated network retry     Force our decorator to bypass cache (as if (+15 more)

### Community 14 - "Audit Logging"
Cohesion: 0.17
Nodes (25): AuditActions, AuditLog, AuditLog model — immutable record of every financial action in TandemPay.  Des, String constants for the `action` column.      Using plain class-level strings, Immutable audit trail for all financial actions.      IMPORTANT — no updated_a, WalletTransactionOut, AsyncSession, Request (+17 more)

### Community 15 - "User & Subscription"
Cohesion: 0.12
Nodes (24): User, User, AsyncSession, datetime, Group, int, str, User (+16 more)

### Community 16 - "UI Primitive Components"
Cohesion: 0.08
Nodes (19): cn(), BUBBLE_STYLE, EyeBallProps, LOGIN_KAI_PHRASES, LOGIN_MAX_PHRASES, LOGIN_RUE_PHRASES, LOGIN_ZO_PHRASES, PupilProps (+11 more)

### Community 17 - "React Native Auth Context"
Cohesion: 0.08
Nodes (7): AuthContext, AuthContextType, FREE_FEATURES, PRO_FEATURES, PRO_FEATURES, FORBIDDEN, _SENTRY_DSN

### Community 18 - "Payment & Banking Models"
Cohesion: 0.16
Nodes (25): Payment, PaymentStatus, ProviderAccount, Represents a linked bank account via an external provider (e.g., Plaid)., Core transaction tracker representing a real Stripe PaymentIntent., Tracks processed Stripe event IDs to ensure webhook idempotency., SettlementMethod, SettlementStatus (+17 more)

### Community 19 - "Idempotency & Ledger"
Cohesion: 0.15
Nodes (25): Base, IdempotencyKey, Stores idempotency keys, request hashes, and cached responses., The internal ledger representing all money movement in and out of user wallets., WalletTransaction, AsyncClient, float, HTTPAuthorizationCredentials (+17 more)

### Community 20 - "Expo Build Config"
Cohesion: 0.09
Nodes (24): build, development, preview, production, cli, appVersionSource, version, channel (+16 more)

### Community 21 - "App Configuration"
Cohesion: 0.10
Nodes (19): Config, get_settings(), Settings, _before_send(), _configure_logging(), JsonFormatter, lifespan(), _log_unhandled_exception() (+11 more)

### Community 22 - "Idempotency Concurrency Tests"
Cohesion: 0.14
Nodes (22): auth_headers(), client(), count_deposit_transactions(), get_wallet_balance(), Idempotency system tests — proving financial safety under all scenarios.  Thes, Create a test user with $1000 balance backed by a ledger transaction., Count completed deposit transactions (excluding the initial $1000 funding)., Send the same request twice with the same idempotency key and payload.     Seco (+14 more)

### Community 23 - "DB Failure Injection Tests"
Cohesion: 0.18
Nodes (23): Decimal, str, assert_ledger_consistency(), compute_ledger_balance(), count_transactions(), get_db_crashable(), get_wallet_balance(), make_request() (+15 more)

### Community 24 - "Notifications & Payment Requests"
Cohesion: 0.24
Nodes (21): Notification, PaymentRequest, In-app notification for group activity events., Tracks direct peer-to-peer money requests within groups., PaymentRequestCreate, PaymentRequestOut, AsyncSession, int (+13 more)

### Community 25 - "Mobile Navigation & Notifications"
Cohesion: 0.13
Nodes (15): CustomTabBar(), styles, NotificationContext, NotificationContextType, NotificationProvider(), styles, useNotifications(), ActivityScreen() (+7 more)

### Community 26 - "Expense UI Components"
Cohesion: 0.12
Nodes (10): AddExpenseModalProps, ExpenseCardProps, GroupCardProps, SettlementCardProps, getStripeForAccount(), stripeCache, StripePaymentModal(), StripePaymentModalProps (+2 more)

### Community 27 - "Pro Subscription UI"
Cohesion: 0.14
Nodes (10): FEATURES, useAutoRefresh(), DashboardPage(), FriendsPage(), PaymentsPage(), AppNotification, FriendRequest, friendRequestsApi (+2 more)

### Community 28 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module, moduleDetection (+10 more)

### Community 29 - "Payment Concurrency Tests"
Cohesion: 0.15
Nodes (16): AsyncClient, float, int, str, client(), count_transfer_transactions(), get_wallet_balance(), Payment Request TOCTOU (Time-of-Check to Time-of-Use) concurrency tests.  These (+8 more)

### Community 30 - "Mobile Group Navigation"
Cohesion: 0.14
Nodes (12): Tab, GroupDetailScreen(), styles, GroupsScreen(), styles, PaymentsScreen(), SettleStep, styles (+4 more)

### Community 31 - "Export Functionality Tests"
Cohesion: 0.15
Nodes (13): AsyncClient, client(), Export endpoint tests.  Tests for GET /api/export/csv and GET /api/export/pdf, CSV with no expenses still returns a valid CSV with just the header row., PDF with no expenses still returns a valid PDF document., Create a group with one expense for the pro_user., seeded_expenses(), test_csv_export_empty_returns_header_only() (+5 more)

### Community 32 - "Web Frontend Auth"
Cohesion: 0.12
Nodes (11): AuthContext, AuthContextType, AddExpenseScreen(), Props, styles, EXPORT_OPTIONS, ExportScreen(), styles (+3 more)

### Community 33 - "Settlement Constraint Tests"
Cohesion: 0.12
Nodes (15): base_data(), Test Suite: SettlementRecord Partial Index Constraints  Validates the behaviour, Two 'pending' rows for the same (group, payer, payee) must raise IntegrityError., Two 'sent' rows for the same pair must raise IntegrityError.     A user cannot c, A 'settled' row for the same pair must NOT block a new 'pending' row.     This i, A 'declined' row for the same pair must NOT block a new 'pending' row.     If Bo, balance_service._compute_balances() subtracts ALL 'settled' records.     If two, Create all tables before each test, drop after. (+7 more)

### Community 34 - "Web Layout Components"
Cohesion: 0.14
Nodes (5): useScrollReveal(), UseScrollRevealOptions, phrases, Reveal(), steps

### Community 35 - "Web Registration Flow"
Cohesion: 0.14
Nodes (10): BUBBLE_STYLE, EyeBallProps, PupilProps, REG_KAI_PHRASES, REG_MAX_PHRASES, REG_RUE_PHRASES, REG_ZO_PHRASES, Speaker (+2 more)

### Community 36 - "Web Password Recovery"
Cohesion: 0.15
Nodes (9): BUBBLE_STYLE, EyeBallProps, FORGOT_KAI_PHRASES, FORGOT_MAX_PHRASES, FORGOT_RUE_PHRASES, PupilProps, Speaker, TAIL_BORDER (+1 more)

### Community 37 - "Mobile Theme System"
Cohesion: 0.19
Nodes (7): Colors, Theme, ThemeContext, ThemeContextType, ThemeProvider(), ConnectedApp(), FORBIDDEN

### Community 38 - "Security Audit & Pitch"
Cohesion: 0.19
Nodes (13): TC-2: Stripe request Variable Shadowing Bug, TandemPay Pitch Deck, Greedy Settlement Algorithm (Pitch), Double-Entry Wallet Ledger, Greedy Debt Simplification Algorithm, Payment ORM Model (Stripe PaymentIntent Tracker), React Native + Expo Mobile App, Resend API Transactional Email (+5 more)

### Community 39 - "Backend Notifications"
Cohesion: 0.23
Nodes (12): AsyncSession, int, str, User, list_notifications(), mark_all_read(), mark_read(), List notifications for the current user, newest first. (+4 more)

### Community 40 - "Bank Linking Routes"
Cohesion: 0.29
Nodes (11): ProviderAccountOut, AsyncSession, str, User, BankLinkRequest, get_linked_accounts(), link_bank_account(), Simulates the callback from a provider like Plaid Link.     Creates a new linke (+3 more)

### Community 41 - "Subscription Routes"
Cohesion: 0.27
Nodes (11): AsyncSession, str, User, create_checkout_session(), create_portal_session(), _get_or_create_stripe_customer(), get_subscription_status(), Return existing stripe_customer_id or create a new Stripe Customer and persist i (+3 more)

### Community 42 - "Security Audit Findings"
Cohesion: 0.20
Nodes (11): Adversarial Security Audit Document, TC-7: Admin Endpoints Unauthenticated, TC-1: Idempotency Race Condition (Double Spend), TC-11: No Orphaned Pending Transaction Cleanup, TC-5: Settlement Record Has No Row-Level Locking, TC-8: Stripe Webhook No Idempotency, @idempotent Decorator (SHA-256 body hashing), IdempotencyKey ORM Model (+3 more)

### Community 43 - "Monetary Precision Fixes"
Cohesion: 0.20
Nodes (11): TC-9: Float Used for Money (Rounding Drift), TC-6: PaymentRequest TOCTOU (Status Checked Before Lock), Numeric(12,2) Monetary Column Convention, Pessimistic Row-Level Locking (Sorted UUID Order), 9-Step Payment Protocol (TOCTOU Fix), Conservation of Money Invariant, Float to Numeric(12,2) Decimal Precision Upgrade, Flush vs Commit Pattern (+3 more)

### Community 44 - "Web Recurring Page"
Cohesion: 0.22
Nodes (7): EMPTY_FORM, FormState, FREQUENCY_LABELS, SAMPLE_ROWS, RecurrenceFrequency, recurringApi, RecurringExpense

### Community 45 - "Backend CI Pipeline"
Cohesion: 0.22
Nodes (9): Pytest Test Runner (backend CI), SQLite-backed CI Test Suite, Backend CI Workflow (GitHub Actions), SQLite Local Development Database, Docker Compose Test PostgreSQL (port 5433), SQLite (dev) / PostgreSQL (prod) Strategy, Backend Test Dependencies (requirements-test.txt), Stage 2: PostgreSQL Concurrency Tests (asyncio.gather) (+1 more)

### Community 46 - "Idempotency Infrastructure"
Cohesion: 0.25
Nodes (7): _compute_request_hash(), idempotent(), Idempotency infrastructure for payment-critical endpoints.  Race-condition-safe, Compute a deterministic SHA-256 hash of the raw request body., Decorator that adds race-condition-safe idempotency to a FastAPI route handler., str, bytes

### Community 47 - "CSV Export Routes"
Cohesion: 0.46
Nodes (7): AsyncSession, User, export_csv(), export_pdf(), _load_rows(), Export routes — Pro feature.  GET /api/export/csv  — download all user expense, Return expense rows for the current user, suitable for CSV/PDF.

### Community 48 - "Error Boundary"
Cohesion: 0.29
Nodes (3): ErrorBoundary, Props, State

### Community 49 - "Brand Identity"
Cohesion: 0.38
Nodes (7): Brand Icon / Logo Mark, Brand Color: #3ECF8E (Green), Payment Card Symbol, Rounded Rectangle Container (rx=8), TandemPay Favicon SVG, Frontend Public Directory, TandemPay Brand

### Community 50 - "Product Strategy"
Cohesion: 0.29
Nodes (7): Free vs Pro Feature Tier Split, HTTP Security Headers (Vercel CSP/HSTS), Interac e-Transfer Primary Settlement Strategy, Vercel Deployment (backend + frontend), Interac e-Transfer Canadian Market Wedge, Render Cloud Deployment (render.yaml Blueprint), Session Handoff Document

### Community 51 - "Infrastructure & Monitoring"
Cohesion: 0.40
Nodes (6): Backend API Vercel Layer Requirements, Sentry Error Monitoring (all 3 layers), APScheduler Background Jobs, Plaid Bank Linking Integration, Backend Production Dependencies (requirements.txt), Reconciliation Service (Safety Net)

### Community 52 - "Database Migrations"
Cohesion: 0.40
Nodes (4): Generate SQL without connecting to the database.      Useful for reviewing what, Apply pending migrations to the database.      Uses create_engine() directly (no, run_migrations_offline(), run_migrations_online()

### Community 54 - "Migration & Refactor Docs"
Cohesion: 0.40
Nodes (5): Alembic Migration Partial Implementation, splitease → tandempay Rename Sweep, Backend Audit & Cleanup Plan Document, Alembic Schema Migration Tool, SQLAlchemy 2.0 Async ORM

### Community 55 - "Database Infrastructure"
Cohesion: 0.40
Nodes (5): PostgreSQL Production Database (Render), Docker Compose PostgreSQL Service, Supabase PostgreSQL via Transaction Pooler, FastAPI Backend, Python Runtime Version (python3.12)

### Community 56 - "Frontend Vercel Config"
Cohesion: 0.40
Nodes (4): buildCommand, headers, outputDirectory, rewrites

### Community 57 - "Database Session"
Cohesion: 0.50
Nodes (3): get_db(), Yields an async database session.      Transaction strategy:       - The sess, AsyncSession

### Community 58 - "Backend Vercel Config"
Cohesion: 0.50
Nodes (3): builds, headers, routes

### Community 59 - "Mobile Pro Hub"
Cohesion: 0.50
Nodes (3): PRO_FEATURES, ProHubScreen(), styles

### Community 60 - "Mobile TypeScript Config"
Cohesion: 0.50
Nodes (3): compilerOptions, strict, extends

### Community 61 - "PostgreSQL Test Config"
Cohesion: 0.50
Nodes (3): pg_override_get_db(), Shared test configuration for PostgreSQL-based concurrency tests.  This conftest, Dependency override for get_db that uses the PG test database.

### Community 67 - "Brand Assets"
Cohesion: 0.67
Nodes (3): TandemPay Brand, TandemPay App Favicon (48px), Expo Web Production Build

### Community 68 - "Web Frontend Entry"
Cohesion: 0.67
Nodes (3): FriendsPage Component (frontend), Frontend index.html Entry Point, React 19 Frontend (tandempay.ca)

## Knowledge Gaps
- **291 isolated node(s):** `buildCommand`, `outputDirectory`, `headers`, `rewrites`, `build.sh script` (+286 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `User` connect `User & Subscription` to `Core Expense & Group Models`, `Recurring Expense Engine`, `Auth & Notification Layer`, `Friend & Reminder System`, `Backend Notifications`, `Bank Linking Routes`, `Subscription Routes`, `Financial Safety Core`, `PostgreSQL Concurrency Tests`, `Stripe Integration Tests`, `Audit Logging`, `CSV Export Routes`, `Payment & Banking Models`, `Idempotency & Ledger`, `DB Failure Injection Tests`, `Notifications & Payment Requests`, `Payment Concurrency Tests`, `Export Functionality Tests`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Why does `UUID` connect `Audit Logging` to `Core Expense & Group Models`, `Recurring Expense Engine`, `Settlement Constraint Tests`, `Financial Safety Core`, `PostgreSQL Concurrency Tests`, `Stripe Integration Tests`, `Idempotency Infrastructure`, `Payment & Banking Models`, `App Configuration`, `Idempotency Concurrency Tests`, `DB Failure Injection Tests`, `Payment Concurrency Tests`, `Export Functionality Tests`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `FastAPI` connect `User & Subscription` to `Core Expense & Group Models`, `Recurring Expense Engine`, `Auth & Notification Layer`, `Friend & Reminder System`, `Backend Notifications`, `Bank Linking Routes`, `Subscription Routes`, `Idempotency Infrastructure`, `CSV Export Routes`, `Audit Logging`, `Payment & Banking Models`, `Idempotency & Ledger`, `App Configuration`, `Idempotency Concurrency Tests`, `Notifications & Payment Requests`, `Payment Concurrency Tests`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Are the 152 inferred relationships involving `User` (e.g. with `Base` and `User`) actually correct?**
  _`User` has 152 INFERRED edges - model-reasoned connections that need verification._
- **Are the 65 inferred relationships involving `GroupMember` (e.g. with `Base` and `AsyncSession`) actually correct?**
  _`GroupMember` has 65 INFERRED edges - model-reasoned connections that need verification._
- **Are the 58 inferred relationships involving `Base` (e.g. with `AuditActions` and `AuditLog`) actually correct?**
  _`Base` has 58 INFERRED edges - model-reasoned connections that need verification._
- **Are the 56 inferred relationships involving `Group` (e.g. with `Base` and `AsyncSession`) actually correct?**
  _`Group` has 56 INFERRED edges - model-reasoned connections that need verification._