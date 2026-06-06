---
source_file: "backend/tests/test_idempotency_concurrency.py"
type: "rationale"
community: "Idempotency Concurrency Tests"
location: "L264"
tags:
  - graphify/rationale
  - graphify/EXTRACTED
  - community/Idempotency_Concurrency_Tests
---

# Use key K with payload A, then key K with payload B.     Second request MUST be

## Connections
- [[test_b_same_key_different_payload_rejected()]] - `rationale_for` [EXTRACTED]

#graphify/rationale #graphify/EXTRACTED #community/Idempotency_Concurrency_Tests