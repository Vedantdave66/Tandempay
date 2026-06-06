---
source_file: "backend/tests/test_pg_concurrency.py"
type: "rationale"
community: "PostgreSQL Concurrency Tests"
location: "L516"
tags:
  - graphify/rationale
  - graphify/EXTRACTED
  - community/PostgreSQL_Concurrency_Tests
---

# 3 concurrent $50 withdrawals on a $100 balance.     SELECT FOR UPDATE serializes

## Connections
- [[test_c_wallet_drain()]] - `rationale_for` [EXTRACTED]

#graphify/rationale #graphify/EXTRACTED #community/PostgreSQL_Concurrency_Tests