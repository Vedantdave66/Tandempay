---
source_file: "backend/tests/test_idempotency_concurrency.py"
type: "code"
community: "Idempotency Concurrency Tests"
location: "L263"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Idempotency_Concurrency_Tests
---

# test_b_same_key_different_payload_rejected()

## Connections
- [[AsyncClient_2]] - `references` [EXTRACTED]
- [[Use key K with payload A, then key K with payload B.     Second request MUST be]] - `rationale_for` [EXTRACTED]
- [[auth_headers()]] - `calls` [EXTRACTED]
- [[count_deposit_transactions()]] - `calls` [EXTRACTED]
- [[get_wallet_balance()]] - `calls` [EXTRACTED]
- [[test_idempotency_concurrency.py]] - `contains` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Idempotency_Concurrency_Tests