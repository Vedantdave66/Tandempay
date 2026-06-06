---
source_file: "backend/tests/test_stripe_idempotency.py"
type: "code"
community: "Idempotency & Ledger"
location: "L91"
tags:
  - graphify/code
  - graphify/INFERRED
  - community/Idempotency__Ledger
---

# AsyncClient

## Connections
- [[Base]] - `uses` [INFERRED]
- [[IdempotencyKey]] - `uses` [INFERRED]
- [[ProviderAccount]] - `uses` [INFERRED]
- [[User_1]] - `uses` [INFERRED]
- [[client()_5]] - `calls` [EXTRACTED]
- [[test_a_retry_same_payment()]] - `references` [EXTRACTED]
- [[test_b_missing_idempotency_key()]] - `references` [EXTRACTED]
- [[test_c_simulated_network_retry()]] - `references` [EXTRACTED]

#graphify/code #graphify/INFERRED #community/Idempotency__Ledger