---
source_file: "backend/tests/test_idempotency_concurrency.py"
type: "code"
community: "Idempotency Concurrency Tests"
location: "L427"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Idempotency_Concurrency_Tests
---

# test_f_withdraw_idempotency()

## Connections
- [[AsyncClient_2]] - `references` [EXTRACTED]
- [[Withdraw $100, retry with same key → balance decreases exactly once.]] - `rationale_for` [EXTRACTED]
- [[auth_headers()]] - `calls` [EXTRACTED]
- [[get_wallet_balance()]] - `calls` [EXTRACTED]
- [[test_idempotency_concurrency.py]] - `contains` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Idempotency_Concurrency_Tests