---
source_file: "backend/tests/test_pg_failure_injection.py"
type: "rationale"
community: "DB Failure Injection Tests"
location: "L272"
tags:
  - graphify/rationale
  - graphify/EXTRACTED
  - community/DB_Failure_Injection_Tests
---

# Simulate process crash after DB commit but before HTTP response.     Verify idem

## Connections
- [[test_a_crash_after_commit_before_response()]] - `rationale_for` [EXTRACTED]

#graphify/rationale #graphify/EXTRACTED #community/DB_Failure_Injection_Tests