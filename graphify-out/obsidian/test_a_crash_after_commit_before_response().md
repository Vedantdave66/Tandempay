---
source_file: "backend/tests/test_pg_failure_injection.py"
type: "code"
community: "DB Failure Injection Tests"
location: "L271"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/DB_Failure_Injection_Tests
---

# test_a_crash_after_commit_before_response()

## Connections
- [[Decimal_2]] - `calls` [EXTRACTED]
- [[Simulate process crash after DB commit but before HTTP response.     Verify idem]] - `rationale_for` [EXTRACTED]
- [[assert_ledger_consistency()_1]] - `calls` [EXTRACTED]
- [[count_transactions()_1]] - `calls` [EXTRACTED]
- [[get_wallet_balance()_3]] - `calls` [EXTRACTED]
- [[make_request()]] - `calls` [EXTRACTED]
- [[test_pg_failure_injection.py]] - `contains` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/DB_Failure_Injection_Tests