---
source_file: "backend/tests/test_stripe_webhook.py"
type: "code"
community: "Stripe Integration Tests"
location: "L102"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Stripe_Integration_Tests
---

# AsyncClient

## Connections
- [[Base]] - `uses` [INFERRED]
- [[Payment]] - `uses` [INFERRED]
- [[PaymentStatus]] - `uses` [INFERRED]
- [[StripeEvent]] - `uses` [INFERRED]
- [[User_1]] - `uses` [INFERRED]
- [[client()_6]] - `calls` [EXTRACTED]
- [[test_a_payment_success_marks_settlement_paid()]] - `references` [EXTRACTED]
- [[test_b_payment_failed_updates_status()]] - `references` [EXTRACTED]
- [[test_c_duplicate_event_is_idempotent()]] - `references` [EXTRACTED]
- [[test_d_invalid_signature_returns_400()]] - `references` [EXTRACTED]
- [[test_e_unknown_event_type_returns_200()]] - `references` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Stripe_Integration_Tests