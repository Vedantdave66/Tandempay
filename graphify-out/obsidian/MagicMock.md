---
source_file: "backend/tests/test_stripe_webhook.py"
type: "code"
community: "Stripe Integration Tests"
location: "L87"
tags:
  - graphify/code
  - graphify/INFERRED
  - community/Stripe_Integration_Tests
---

# MagicMock

## Connections
- [[Base]] - `uses` [INFERRED]
- [[Payment]] - `uses` [INFERRED]
- [[PaymentStatus]] - `uses` [INFERRED]
- [[StripeEvent]] - `uses` [INFERRED]
- [[User_1]] - `uses` [INFERRED]
- [[_mock_succeeded_event()]] - `references` [EXTRACTED]
- [[mock_stripe_env()]] - `calls` [INFERRED]
- [[test_b_payment_failed_updates_status()]] - `calls` [EXTRACTED]
- [[test_c_duplicate_event_is_idempotent()]] - `calls` [EXTRACTED]
- [[test_e_unknown_event_type_returns_200()]] - `calls` [EXTRACTED]

#graphify/code #graphify/INFERRED #community/Stripe_Integration_Tests