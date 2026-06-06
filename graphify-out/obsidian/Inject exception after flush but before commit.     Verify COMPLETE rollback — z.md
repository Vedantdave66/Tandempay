---
source_file: "backend/tests/test_pg_failure_injection.py"
type: "rationale"
community: "DB Failure Injection Tests"
location: "L441"
tags:
  - graphify/rationale
  - graphify/EXTRACTED
  - community/DB_Failure_Injection_Tests
---

# Inject exception after flush but before commit.     Verify COMPLETE rollback — z

## Connections
- [[test_c_partial_failure_rollback()]] - `rationale_for` [EXTRACTED]

#graphify/rationale #graphify/EXTRACTED #community/DB_Failure_Injection_Tests