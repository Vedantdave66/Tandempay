---
source_file: "backend/tests/test_pg_failure_injection.py"
type: "rationale"
community: "DB Failure Injection Tests"
location: "L140"
tags:
  - graphify/rationale
  - graphify/EXTRACTED
  - community/DB_Failure_Injection_Tests
---

# Create tables before each test, drop after.

## Connections
- [[setup_pg_database()_1]] - `rationale_for` [EXTRACTED]

#graphify/rationale #graphify/EXTRACTED #community/DB_Failure_Injection_Tests