---
type: community
cohesion: 0.13
members: 30
---

# PostgreSQL Concurrency Tests

**Cohesion:** 0.13 - loosely connected
**Members:** 30 nodes

## Members
- [[10 truly parallel add-funds requests with the SAME idempotency key.     PostgreS]] - rationale - backend/tests/test_pg_concurrency.py
- [[3 concurrent $50 withdrawals on a $100 balance.     SELECT FOR UPDATE serializes]] - rationale - backend/tests/test_pg_concurrency.py
- [[5 truly parallel add-funds with DIFFERENT idempotency keys.     All 5 should suc]] - rationale - backend/tests/test_pg_concurrency.py
- [[5 truly parallel attempts to pay the same PaymentRequest.     PostgreSQL's SELEC]] - rationale - backend/tests/test_pg_concurrency.py
- [[Assert that cached balance == ledger sum (the golden invariant).]] - rationale - backend/tests/test_pg_concurrency.py
- [[Compute the true balance by summing all completed WalletTransactions.]] - rationale - backend/tests/test_pg_concurrency.py
- [[Count completed transactions of a given type for a user.]] - rationale - backend/tests/test_pg_concurrency.py
- [[Create a test user with $1000 balance backed by a ledger transaction._1]] - rationale - backend/tests/test_pg_concurrency.py
- [[Create a user with exactly $100 for wallet drain testing.]] - rationale - backend/tests/test_pg_concurrency.py
- [[Create all tables before each test, drop after.]] - rationale - backend/tests/test_pg_concurrency.py
- [[Create payer + requester in a group with a pending PaymentRequest.]] - rationale - backend/tests/test_pg_concurrency.py
- [[Decimal_1]] - code - backend/tests/test_pg_concurrency.py
- [[PostgreSQL Real Concurrency Tests — proving financial safety under true contenti]] - rationale - backend/tests/test_pg_concurrency.py
- [[Prove that SELECT FOR UPDATE on PostgreSQL actually blocks a second session.]] - rationale - backend/tests/test_pg_concurrency.py
- [[Read the cached wallet_balance from the User row.]] - rationale - backend/tests/test_pg_concurrency.py
- [[assert_ledger_consistency()]] - code - backend/tests/test_pg_concurrency.py
- [[compute_ledger_balance()]] - code - backend/tests/test_pg_concurrency.py
- [[count_transactions()]] - code - backend/tests/test_pg_concurrency.py
- [[drain_user()]] - code - backend/tests/test_pg_concurrency.py
- [[get_wallet_balance()_2]] - code - backend/tests/test_pg_concurrency.py
- [[payment_test_data()]] - code - backend/tests/test_pg_concurrency.py
- [[setup_pg_database()]] - code - backend/tests/test_pg_concurrency.py
- [[str_22]] - code - backend/tests/test_pg_concurrency.py
- [[test_a_idempotency_race()]] - code - backend/tests/test_pg_concurrency.py
- [[test_b_payment_request_double_spend()]] - code - backend/tests/test_pg_concurrency.py
- [[test_c_wallet_drain()]] - code - backend/tests/test_pg_concurrency.py
- [[test_d_row_level_lock_proof()]] - code - backend/tests/test_pg_concurrency.py
- [[test_e_concurrent_deposits_different_keys()]] - code - backend/tests/test_pg_concurrency.py
- [[test_pg_concurrency.py]] - code - backend/tests/test_pg_concurrency.py
- [[test_user()_1]] - code - backend/tests/test_pg_concurrency.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/PostgreSQL_Concurrency_Tests
SORT file.name ASC
```

## Connections to other communities
- 5 edges to [[_COMMUNITY_Idempotency & Ledger]]
- 4 edges to [[_COMMUNITY_Core Expense & Group Models]]
- 3 edges to [[_COMMUNITY_Auth & Notification Layer]]
- 2 edges to [[_COMMUNITY_User & Subscription]]
- 2 edges to [[_COMMUNITY_Notifications & Payment Requests]]
- 1 edge to [[_COMMUNITY_Audit Logging]]

## Top bridge nodes
- [[Decimal_1]] - degree 16, connects to 4 communities
- [[str_22]] - degree 10, connects to 4 communities
- [[test_pg_concurrency.py]] - degree 16, connects to 1 community
- [[count_transactions()]] - degree 8, connects to 1 community
- [[test_user()_1]] - degree 4, connects to 1 community