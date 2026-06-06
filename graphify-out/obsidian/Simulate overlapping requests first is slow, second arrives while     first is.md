---
source_file: "backend/tests/test_pg_failure_injection.py"
type: "rationale"
community: "DB Failure Injection Tests"
location: "L355"
tags:
  - graphify/rationale
  - graphify/EXTRACTED
  - community/DB_Failure_Injection_Tests
---

# Simulate overlapping requests: first is slow, second arrives while     first is

## Connections
- [[test_b_network_timeout_in_flight_retry()]] - `rationale_for` [EXTRACTED]

#graphify/rationale #graphify/EXTRACTED #community/DB_Failure_Injection_Tests