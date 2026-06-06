---
source_file: "backend/tests/test_pg_concurrency.py"
type: "rationale"
community: "PostgreSQL Concurrency Tests"
location: "L625"
tags:
  - graphify/rationale
  - graphify/EXTRACTED
  - community/PostgreSQL_Concurrency_Tests
---

# Prove that SELECT FOR UPDATE on PostgreSQL actually blocks a second session.

## Connections
- [[test_d_row_level_lock_proof()]] - `rationale_for` [EXTRACTED]

#graphify/rationale #graphify/EXTRACTED #community/PostgreSQL_Concurrency_Tests