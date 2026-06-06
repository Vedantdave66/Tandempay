---
source_file: "backend/tests/test_pg_concurrency.py"
type: "rationale"
community: "PostgreSQL Concurrency Tests"
location: "L116"
tags:
  - graphify/rationale
  - graphify/EXTRACTED
  - community/PostgreSQL_Concurrency_Tests
---

# Create all tables before each test, drop after.

## Connections
- [[setup_pg_database()]] - `rationale_for` [EXTRACTED]

#graphify/rationale #graphify/EXTRACTED #community/PostgreSQL_Concurrency_Tests