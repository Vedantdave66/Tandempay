---
source_file: "backend/tests/test_pg_concurrency.py"
type: "code"
community: "PostgreSQL Concurrency Tests"
location: "L283"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/PostgreSQL_Concurrency_Tests
---

# Decimal

## Connections
- [[Base]] - `uses` [INFERRED]
- [[Group]] - `uses` [INFERRED]
- [[GroupMember]] - `uses` [INFERRED]
- [[PaymentRequest]] - `uses` [INFERRED]
- [[User_1]] - `uses` [INFERRED]
- [[WalletTransaction]] - `uses` [INFERRED]
- [[assert_ledger_consistency()]] - `calls` [EXTRACTED]
- [[compute_ledger_balance()]] - `references` [EXTRACTED]
- [[drain_user()]] - `calls` [EXTRACTED]
- [[get_wallet_balance()_2]] - `references` [EXTRACTED]
- [[payment_test_data()]] - `calls` [EXTRACTED]
- [[test_a_idempotency_race()]] - `calls` [EXTRACTED]
- [[test_c_wallet_drain()]] - `calls` [EXTRACTED]
- [[test_e_concurrent_deposits_different_keys()]] - `calls` [EXTRACTED]
- [[test_pg_concurrency.py]] - `imports_from` [EXTRACTED]
- [[test_user()_1]] - `calls` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/PostgreSQL_Concurrency_Tests