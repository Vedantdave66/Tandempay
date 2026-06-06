---
source_file: "backend/tests/test_idempotency_concurrency.py"
type: "rationale"
community: "Idempotency Concurrency Tests"
location: "L428"
tags:
  - graphify/rationale
  - graphify/EXTRACTED
  - community/Idempotency_Concurrency_Tests
---

# Withdraw $100, retry with same key → balance decreases exactly once.

## Connections
- [[test_f_withdraw_idempotency()]] - `rationale_for` [EXTRACTED]

#graphify/rationale #graphify/EXTRACTED #community/Idempotency_Concurrency_Tests