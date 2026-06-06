---
source_file: "backend/tests/test_pg_concurrency.py"
type: "rationale"
community: "PostgreSQL Concurrency Tests"
location: "L420"
tags:
  - graphify/rationale
  - graphify/EXTRACTED
  - community/PostgreSQL_Concurrency_Tests
---

# 5 truly parallel attempts to pay the same PaymentRequest.     PostgreSQL's SELEC

## Connections
- [[test_b_payment_request_double_spend()]] - `rationale_for` [EXTRACTED]

#graphify/rationale #graphify/EXTRACTED #community/PostgreSQL_Concurrency_Tests