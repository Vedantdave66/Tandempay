---
source_file: "backend/tests/test_pg_concurrency.py"
type: "rationale"
community: "PostgreSQL Concurrency Tests"
location: "L319"
tags:
  - graphify/rationale
  - graphify/EXTRACTED
  - community/PostgreSQL_Concurrency_Tests
---

# Assert that cached balance == ledger sum (the golden invariant).

## Connections
- [[assert_ledger_consistency()]] - `rationale_for` [EXTRACTED]

#graphify/rationale #graphify/EXTRACTED #community/PostgreSQL_Concurrency_Tests