---
source_file: "backend/tests/test_idempotency_concurrency.py"
type: "code"
community: "Idempotency Concurrency Tests"
location: "L164"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Idempotency_Concurrency_Tests
---

# get_wallet_balance()

## Connections
- [[float]] - `references` [EXTRACTED]
- [[str_20]] - `references` [EXTRACTED]
- [[test_a_same_key_same_payload_returns_cached()]] - `calls` [EXTRACTED]
- [[test_b_same_key_different_payload_rejected()]] - `calls` [EXTRACTED]
- [[test_c_multiple_retries_all_cached()]] - `calls` [EXTRACTED]
- [[test_d_no_key_executes_normally()]] - `calls` [EXTRACTED]
- [[test_e_different_keys_same_payload()]] - `calls` [EXTRACTED]
- [[test_f_withdraw_idempotency()]] - `calls` [EXTRACTED]
- [[test_idempotency_concurrency.py]] - `contains` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Idempotency_Concurrency_Tests