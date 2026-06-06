---
source_file: "backend/tests/test_pg_failure_injection.py"
type: "code"
community: "DB Failure Injection Tests"
location: "L199"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/DB_Failure_Injection_Tests
---

# Decimal

## Connections
- [[Base]] - `uses` [INFERRED]
- [[User_1]] - `uses` [INFERRED]
- [[WalletTransaction]] - `uses` [INFERRED]
- [[assert_ledger_consistency()_1]] - `calls` [EXTRACTED]
- [[compute_ledger_balance()_1]] - `references` [EXTRACTED]
- [[get_wallet_balance()_3]] - `references` [EXTRACTED]
- [[test_a_crash_after_commit_before_response()]] - `calls` [EXTRACTED]
- [[test_b_network_timeout_in_flight_retry()]] - `calls` [EXTRACTED]
- [[test_c_partial_failure_rollback()]] - `calls` [EXTRACTED]
- [[test_d_retry_storm()]] - `calls` [EXTRACTED]
- [[test_pg_failure_injection.py]] - `imports_from` [EXTRACTED]
- [[test_user()_2]] - `calls` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/DB_Failure_Injection_Tests