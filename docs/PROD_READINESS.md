# TandemPay — Production Readiness Report
Generated: 2026-06-11

---

## Feature Completeness

### ✅ Built & Working

- **Auth** — Register, login, JWT refresh, forgot/reset password
- **Groups** — Create, list, get, delete, leave, member add/remove, join by invite
- **Expenses** — Create, list, delete (by payer only), penny-correct equal splits, audit-logged
- **Expense update** — Backend PUT endpoint fully implemented with ownership check
- **Balances** — Per-group net balance computation via greedy debt simplification
- **Settlements** — Suggested Interac e-Transfer pairs (minimum transactions)
- **Settle Up screen** — Full payment flow: Interac instructions + Stripe card path
- **Friends** — Send/accept/decline requests, list friends with shared group count
- **Notifications** — In-app feed, mark read, mark all read, badge count via context
- **Activity screen** — Grouped notification feed with date sections and icon types
- **Wallet balance** — Read-only display of current balance
- **Wallet transactions** — Paginated ledger history
- **Character system** — 4 shapes × unlimited colors × nickname; renders on all group cards, canvas, balances
- **Canvas mode** — Physics bubbles, drag-to-assign, hub net balance line, dock
- **Dashboard** — Net balance widget, squad cards, recent activity, balance breakdown modal
- **Profile (ProHub)** — Character customisation, Pro upgrade CTA, settings navigation
- **Appearance screen** — 6 accent presets, light/dark theme, live preview
- **Export backend** — CSV + PDF generation working for Pro users
- **Recurring expenses backend** — Full scheduler with `_fire_recurring()` and APScheduler
- **Audit log** — Immutable trail for all financial actions
- **Idempotency** — SHA-256 body-hashing decorator on all payment-critical routes
- **Row-level locking** — Sorted UUID pessimistic locking on concurrent wallet mutations
- **Stripe integration** — PaymentIntent creation, webhook idempotency, subscription checkout/portal
- **Rate limiting** — 5 payments/minute per user enforced in payments route

### 🟡 Built but Incomplete / Buggy

- **Export screen (mobile)** — UI shows "Coming soon" Alert for Pro users; the backend `/api/export/csv` and `/api/export/pdf` routes work correctly but the mobile screen never calls them
- **Recurring screen (mobile)** — Shows preview rows and upsell; the "Add" button triggers a "Coming soon" Alert even for Pro users; backend `POST /api/recurring` exists and works
- **Receipt scan** — Real OCR parsing works; `MOCK_MEMBERS` array hardcoded in `ReceiptScanScreen.tsx` instead of fetching real group members, so participant assignment uses fake names
- **Friends "Settle up" button** — Visible on friend cards in FriendsScreen but `onPress` has no handler (TouchableOpacity with no action wired up)
- **Wallet funding** — `POST /api/wallet/add-funds` returns HTTP 503 intentionally disabled; users cannot top up their wallet balance in-app
- **Plaid bank linking** — Backend routes simulate a Plaid callback without real OAuth; `POST /api/bank-links/link` creates a `ProviderAccount` row but never contacts Plaid API
- **Expense edit** — Backend `PUT /api/groups/{id}/expenses/{eid}` is fully implemented with ownership check; no mobile UI exists to trigger it (no edit button on expense rows)

### ❌ Not Yet Built

- **Push notifications** — No APNs/FCM token registration; all notifications are in-app pull only (30s polling in ActivityScreen)
- **Smart Split** — `SmartSplitScreen` is a "Coming Soon" placeholder; no AI parsing of expense descriptions
- **Real-time updates** — No WebSocket or server-sent events; data freshness depends on focus-refetch and manual pull-to-refresh
- **Expense edit UI** — No way for users to edit an expense title, amount, or participants from the mobile app despite the backend supporting it
- **Group expense categorization** — No tags, categories, or filters on expense lists
- **Multi-currency** — All amounts are CAD; no currency selection or conversion
- **Payment request flow** — `PaymentRequest` model and routes exist but are not wired to any mobile screen; users can't request money from a specific person within a group
- **MFA / 2FA** — No multi-factor authentication
- **Email notifications** — `Notification` model exists and Resend API is in requirements; no email is sent when a new expense is added or a payment is received
- **Interac auto-match** — `InteracMatcher` service exists to parse e-Transfer confirmation emails, but no webhook from a real email provider is connected
- **Stripe payout to recipients** — Currently charges the payer's card; no mechanism to transfer funds to the payee's bank account via Stripe Connect

---

## Screen Inventory

| Screen | Status | Notes |
|--------|--------|-------|
| LandingScreen | Done | Onboarding carousel, sign up / log in |
| LoginScreen | Done | Email + password, forgot password link |
| RegisterScreen | Done | Name, email, password with strength indicator |
| ForgotPasswordScreen | Done | Email reset flow |
| DashboardScreen | Done | Net balance widget, squad cards, activity feed |
| GroupsScreen | Done | List all groups, delete/leave, create shortcut |
| GroupDetailScreen | Done | Expenses, balances, settlements, members modal, canvas mode |
| AddExpenseScreen | Done | Two-step: amount/title → participant select |
| SettleUpScreen | Done | Interac instructions + Stripe card path |
| ActivityScreen | Done | Grouped notification feed with 30s polling |
| FriendsScreen | Partial | Activity, friends list, pending — "Settle up" button unhooked |
| PendingRequestsScreen | Done | Accept/decline friend requests with loading state |
| AddFriendScreen | Done | Send friend request by email |
| PaymentsScreen | Done | Wallet balance, transaction history |
| NotificationsScreen | Done | Full notifications with mark-read, badge sync |
| ProHubScreen | Done | Profile, Pro upsell card, settings list |
| AppearanceScreen | Done | Accent + theme picker with live phone preview |
| ExportScreen | Partial | UI works but never calls the real API endpoint |
| RecurringScreen | Partial | View + upsell; create flow gated by "Coming soon" |
| TutorialScreen | Done | Step-by-step onboarding guide |
| SmartSplitScreen | Stub | "Coming Soon" placeholder, no implementation |
| ReceiptScanScreen | Partial | OCR works; member list is hardcoded mock data |
| CanvasModeView | Done | Full physics, drag-to-assign, expense sheet |
| CharacterSetupModal | Done | Shape/color/nickname picker with live preview |
| RootNavigator | Done | Auth gate, hold screen, full screen map |

---

## Backend Endpoint Inventory

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| /auth/register | POST | Working | Validates unique email, hashes password |
| /auth/login | POST | Working | Returns JWT, sets avatar_color |
| /auth/me | GET | Working | Returns full User profile |
| /auth/me | PATCH | Working | Updates name, interac_email, character fields |
| /auth/forgot-password | POST | Working | Sends reset token via Resend |
| /auth/reset-password | POST | Working | Verifies token, updates hash |
| /api/groups | GET | Working | Paginated group list with member count |
| /api/groups | POST | Working | Creates group, adds creator as member |
| /api/groups/{id} | GET | Working | Full group with members + character fields |
| /api/groups/{id} | PATCH | Working | Rename group (creator only) |
| /api/groups/{id} | DELETE | Working | Deletes group + all expenses (creator only) |
| /api/groups/{id}/members | POST | Working | Add member by email |
| /api/groups/{id}/members/{uid} | DELETE | Working | Remove member; creator transfer if needed |
| /api/groups/{id}/expenses | GET | Working | Paginated expense list |
| /api/groups/{id}/expenses | POST | Working | Penny-correct split, audit logged |
| /api/groups/{id}/expenses/{eid} | PUT | Working | Update expense (payer only) |
| /api/groups/{id}/expenses/{eid} | DELETE | Working | Delete expense (payer only, 403 otherwise) |
| /api/groups/{id}/balances | GET | Working | Net balances per member |
| /api/groups/{id}/settlements | GET | Working | Greedy minimum-transactions settlement plan |
| /api/notifications | GET | Working | Newest-first, paginated |
| /api/notifications/{id}/read | PATCH | Working | Mark single notification read |
| /api/notifications/read-all | PATCH | Working | Mark all read for current user |
| /api/wallet/balance | GET | Working | Current balance + ledger hash |
| /api/wallet/transactions | GET | Working | Paginated transaction history |
| /api/wallet/add-funds | POST | Stub | Returns 503 — intentionally disabled |
| /api/wallet/withdraw | POST | Partial | Exists; real Stripe payout not wired |
| /api/payments/create | POST | Working | Stripe PaymentIntent, idempotent, rate-limited |
| /api/friends | GET | Working | Friend list with shared group count |
| /api/friends/request | POST | Working | Send request by email |
| /api/friends/{id}/accept | PATCH | Working | Accept + create bidirectional friendship |
| /api/friends/{id}/decline | PATCH | Working | Decline request |
| /api/export/csv | GET | Working | Pro-gated CSV export via StreamingResponse |
| /api/export/pdf | GET | Working | Pro-gated PDF export (basic layout) |
| /api/recurring | GET | Working | List recurring expenses |
| /api/recurring | POST | Working | Create recurring with frequency/next_fire |
| /api/recurring/{id} | DELETE | Working | Delete recurring template |
| /api/subscription/status | GET | Working | Returns tier + Stripe customer ID |
| /api/subscription/checkout | POST | Working | Creates Stripe Checkout session |
| /api/subscription/portal | POST | Working | Creates Stripe Customer Portal session |
| /api/stripe/webhook | POST | Working | Handles checkout.session.completed, idempotent |
| /api/audit-log | GET | Working | Immutable financial action trail |
| /api/bank-links/link | POST | Partial | Simulates Plaid callback, no real OAuth |
| /api/bank-links | GET | Partial | Returns simulated linked accounts |
| /api/receipts/parse | POST | Partial | GPT-4 Vision OCR; accuracy untested in prod |
| /api/reminders | POST | Working | Schedule reminder for an expense |
| /api/requests | POST | Working | Create payment request (not wired to mobile) |
| /api/requests/{id}/accept | PATCH | Working | Accept payment request |
| /api/users/search | GET | Working | Find user by email for friend/group flows |
| /api/interac/match | POST | Partial | Parses e-Transfer emails; no live email source |

---

## Critical Path to Production

### Must-fix before launch (P0)

1. **Wire ExportScreen to the real API** — Pro users tap the button and see "Coming soon" despite `/api/export/csv` and `/api/export/pdf` working correctly. One `expensesApi` call and a `Linking.openURL` to the streamed response is all that's needed.
2. **Fix ReceiptScanScreen member list** — `MOCK_MEMBERS` must be replaced with `route.params.members` (the real group members). Currently shows fake names in the split review.
3. **Remove "Coming soon" from RecurringScreen Add button for Pro users** — Backend works; UI blocks Pro users from using a feature they paid for.
4. **Push notification token registration** — Without APNs/FCM, users never get notified of new expenses or payments when the app is backgrounded. This is table-stakes for a group finance app.
5. **Fix FriendsScreen "Settle up" button** — Visible and tappable but does nothing. Either wire it to SettleUp navigation or remove it.
6. **Email notification delivery** — Backend creates `Notification` rows but never sends email. Users who miss the in-app badge will never know a friend added an expense.

### Should-fix before launch (P1)

7. **Expense edit UI** — Users have no way to fix a typo in an expense title or correct a wrong amount from mobile. The backend is ready.
8. **Real-time or shorter-interval update** — 30s polling in ActivityScreen means a user can wait 30 seconds to see a new expense their friend just added. Consider `useFocusEffect` with a shorter fallback or WebSocket.
9. **Payment request flow** — The `PaymentRequest` model, backend routes, and notification type are fully built but unreachable from the app. A dedicated "Request money" screen would unlock the full peer-to-peer flow.
10. **Wallet funding** — `add-funds` returns 503. Either connect Stripe Checkout for top-ups or remove wallet balance entirely from the UI to avoid confusing users.
11. **Expense categorization** — Without categories or search, group expense lists become unusable at scale. At minimum, a text search filter on the expense list.
12. **Group join by invite link** — Backend has `/api/groups/{id}/join` but there is no UI to generate a shareable link or QR code for a new member to join.

### Nice to have (P2)

13. **Smart Split** — Replace "Coming Soon" with actual GPT-4 parsing of natural language descriptions ("Thai food for 4, Lakshit didn't have drinks").
14. **Plaid real bank linking** — Replace the simulated callback with the real Plaid Link SDK; gives users a genuine bank balance view.
15. **Multi-currency** — Add a currency field to expenses with CAD as default; display conversion at time of settlement.
16. **MFA** — TOTP or email OTP on login for higher-security users.
17. **Expense receipts** — Allow users to attach a photo to any expense (not just AI-parsed); stored in S3/R2.
18. **Interac auto-confirmation** — Wire the Interac email parser to a Resend inbound webhook so settlements can be marked "confirmed" automatically when the transfer email arrives.
19. **Offline support** — Cache the last-loaded group state so the app is navigable without a connection.

---

## Estimated % Complete

| Dimension | % | Rationale |
|-----------|---|-----------|
| Feature coverage | 62% | Core split-settle loop works; payment requests, push notifs, expense edit, and export UI connection are missing |
| UI polish | 82% | Character system, canvas mode, skeleton loaders, theme system all production-quality; stub screens pull it down |
| Backend reliability | 85% | Idempotency, row-level locking, audit log, penny-correct arithmetic, Sentry; wallet funding disabled, no email delivery confirmed |
| **Overall** | **72%** | Launchable as a closed beta; not ready for open public launch without P0 items resolved |

> These numbers reflect honest assessment for a founder making a launch decision. The core group-expense-split-settle flow is end-to-end functional and well-tested. The gaps are real but bounded — none require architectural changes, only wiring existing pieces together.
