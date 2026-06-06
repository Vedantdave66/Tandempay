---
source_file: "backend/tests/test_idempotency_concurrency.py"
type: "code"
community: "Idempotency Concurrency Tests"
location: "L205"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Idempotency_Concurrency_Tests
---

# test_a_same_key_same_payload_returns_cached()

## Connections
- [[AsyncClient_2]] - `references` [EXTRACTED]
- [[Send the same request twice with the same idempotency key and payload.     Seco]] - `rationale_for` [EXTRACTED]
- [[auth_headers()]] - `calls` [EXTRACTED]
- [[count_deposit_transactions()]] - `calls` [EXTRACTED]
- [[count_idempotency_records()]] - `calls` [EXTRACTED]
- [[get_wallet_balance()]] - `calls` [EXTRACTED]
- [[test_idempotency_concurrency.py]] - `contains` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Idempotency_Concurrency_Tests