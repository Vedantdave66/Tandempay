---
type: community
cohesion: 0.16
members: 27
---

# Payment & Banking Models

**Cohesion:** 0.16 - loosely connected
**Members:** 27 nodes

## Members
- [[Admin-only expire payments older than 24 h that never reached a terminal state.]] - rationale - backend/app/routes/stripe_routes.py
- [[Admin-only manually reconcile a payment using Stripe as the source of truth.]] - rationale - backend/app/routes/stripe_routes.py
- [[AsyncSession_17]] - code - backend/app/routes/stripe_routes.py
- [[Core transaction tracker representing a real Stripe PaymentIntent.]] - rationale - backend/app/models.py
- [[Creates a Stripe Express account for the user so they can receive payouts.]] - rationale - backend/app/routes/stripe_routes.py
- [[Payment]] - code - backend/app/models.py
- [[Payment_1]] - code - backend/tests/test_stripe_webhook.py
- [[PaymentIntentRequest]] - code - backend/app/routes/stripe_routes.py
- [[PaymentStatus]] - code - backend/app/models.py
- [[ProviderAccount]] - code - backend/app/models.py
- [[Represents a linked bank account via an external provider (e.g., Plaid).]] - rationale - backend/app/models.py
- [[Request_5]] - code - backend/app/routes/stripe_routes.py
- [[SettlementMethod]] - code - backend/app/models.py
- [[SettlementStatus]] - code - backend/app/models.py
- [[StripeEvent]] - code - backend/app/models.py
- [[SubscriptionTier]] - code - backend/app/models.py
- [[Tracks processed Stripe event IDs to ensure webhook idempotency.]] - rationale - backend/app/models.py
- [[User_18]] - code - backend/app/routes/stripe_routes.py
- [[User_27]] - code - backend/tests/test_stripe_webhook.py
- [[cleanup_payments()]] - code - backend/app/routes/stripe_routes.py
- [[get_onboarding_status()]] - code - backend/app/routes/stripe_routes.py
- [[models.py]] - code - backend/app/models.py
- [[onboard_user()]] - code - backend/app/routes/stripe_routes.py
- [[reconcile_payment()]] - code - backend/app/routes/stripe_routes.py
- [[str_15]] - code - backend/app/routes/stripe_routes.py
- [[stripe_routes.py]] - code - backend/app/routes/stripe_routes.py
- [[stripe_webhook()]] - code - backend/app/routes/stripe_routes.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Payment__Banking_Models
SORT file.name ASC
```

## Connections to other communities
- 16 edges to [[_COMMUNITY_Idempotency & Ledger]]
- 15 edges to [[_COMMUNITY_User & Subscription]]
- 11 edges to [[_COMMUNITY_Core Expense & Group Models]]
- 11 edges to [[_COMMUNITY_Stripe Integration Tests]]
- 8 edges to [[_COMMUNITY_Recurring Expense Engine]]
- 7 edges to [[_COMMUNITY_Notifications & Payment Requests]]
- 6 edges to [[_COMMUNITY_Auth & Notification Layer]]
- 5 edges to [[_COMMUNITY_Audit Logging]]
- 4 edges to [[_COMMUNITY_Bank Linking Routes]]
- 2 edges to [[_COMMUNITY_Friend & Reminder System]]
- 1 edge to [[_COMMUNITY_Export Functionality Tests]]

## Top bridge nodes
- [[models.py]] - degree 23, connects to 8 communities
- [[SubscriptionTier]] - degree 16, connects to 5 communities
- [[Payment]] - degree 19, connects to 4 communities
- [[AsyncSession_17]] - degree 13, connects to 4 communities
- [[str_15]] - degree 11, connects to 4 communities