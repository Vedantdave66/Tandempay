---
source_file: "backend/tests/test_idempotency_concurrency.py"
type: "rationale"
community: "Idempotency Concurrency Tests"
location: "L172"
tags:
  - graphify/rationale
  - graphify/EXTRACTED
  - community/Idempotency_Concurrency_Tests
---

# Count completed deposit transactions (excluding the initial $1000 funding).

## Connections
- [[count_deposit_transactions()]] - `rationale_for` [EXTRACTED]

#graphify/rationale #graphify/EXTRACTED #community/Idempotency_Concurrency_Tests