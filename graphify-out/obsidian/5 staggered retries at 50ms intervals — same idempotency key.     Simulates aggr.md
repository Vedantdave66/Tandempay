---
source_file: "backend/tests/test_pg_failure_injection.py"
type: "rationale"
community: "DB Failure Injection Tests"
location: "L541"
tags:
  - graphify/rationale
  - graphify/EXTRACTED
  - community/DB_Failure_Injection_Tests
---

# 5 staggered retries at 50ms intervals — same idempotency key.     Simulates aggr

## Connections
- [[test_d_retry_storm()]] - `rationale_for` [EXTRACTED]

#graphify/rationale #graphify/EXTRACTED #community/DB_Failure_Injection_Tests