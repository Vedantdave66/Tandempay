---
type: community
cohesion: 0.11
members: 32
---

# Financial Safety Core

**Cohesion:** 0.11 - loosely connected
**Members:** 32 nodes

## Members
- [[Acquire a pessimistic row-level lock on the User row.      On PostgreSQL uses S]] - rationale - backend/app/ledger.py
- [[Assert that the cached `wallet_balance` matches the ledger sum AFTER mutation.]] - rationale - backend/app/ledger.py
- [[Assert that the cached `wallet_balance` matches the ledger sum BEFORE any mutati]] - rationale - backend/app/ledger.py
- [[AsyncSession_1]] - code - backend/app/ledger.py
- [[Compute the wallet balance by summing all completed WalletTransactions.     This]] - rationale - backend/app/ledger.py
- [[Create tables before each test, drop after.]] - rationale - backend/tests/test_financial_precision.py
- [[Decimal]] - code - backend/app/ledger.py
- [[Financial Precision Tests  These tests prove that we have completely eliminated]] - rationale - backend/tests/test_financial_precision.py
- [[Ledger utilities for financial correctness.  Production-grade guarantees   - co]] - rationale - backend/app/ledger.py
- [[Lock multiple users in deterministic sorted order to prevent deadlocks.     Retu]] - rationale - backend/app/ledger.py
- [[Read-only post-commit verification. Called AFTER commit with a fresh query.]] - rationale - backend/app/ledger.py
- [[Test A Split $10 among 3 users.     Expected Exact sum = 10.00, no drift.]] - rationale - backend/tests/test_financial_precision.py
- [[Test B 10,000 transactions.     Expected balance remains exact, no cumulative]] - rationale - backend/tests/test_financial_precision.py
- [[Test C Integrity check.     Compare cached balance against ledger sum. Expected]] - rationale - backend/tests/test_financial_precision.py
- [[User]] - code - backend/app/ledger.py
- [[Verify the conservation-of-money invariant       total_before == total_after (n]] - rationale - backend/app/ledger.py
- [[assert_conservation_of_money()]] - code - backend/app/ledger.py
- [[client()_1]] - code - backend/tests/test_financial_precision.py
- [[compute_wallet_balance()]] - code - backend/app/ledger.py
- [[ledger.py]] - code - backend/app/ledger.py
- [[lock_user_for_update()]] - code - backend/app/ledger.py
- [[lock_users_sorted()]] - code - backend/app/ledger.py
- [[override_get_db()_1]] - code - backend/tests/test_financial_precision.py
- [[pre_validate_balance()]] - code - backend/app/ledger.py
- [[setup_database()_1]] - code - backend/tests/test_financial_precision.py
- [[str_1]] - code - backend/app/ledger.py
- [[test_a_split_10_dollars_among_3_users()]] - code - backend/tests/test_financial_precision.py
- [[test_b_10000_transactions()]] - code - backend/tests/test_financial_precision.py
- [[test_c_integrity_check_cached_vs_ledger()]] - code - backend/tests/test_financial_precision.py
- [[test_financial_precision.py]] - code - backend/tests/test_financial_precision.py
- [[validate_balance_integrity()]] - code - backend/app/ledger.py
- [[verify_post_commit()]] - code - backend/app/ledger.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Financial_Safety_Core
SORT file.name ASC
```

## Connections to other communities
- 4 edges to [[_COMMUNITY_User & Subscription]]
- 4 edges to [[_COMMUNITY_Idempotency & Ledger]]
- 2 edges to [[_COMMUNITY_Audit Logging]]
- 2 edges to [[_COMMUNITY_Core Expense & Group Models]]

## Top bridge nodes
- [[str_1]] - degree 9, connects to 2 communities
- [[AsyncSession_1]] - degree 8, connects to 2 communities
- [[Decimal]] - degree 8, connects to 2 communities
- [[User]] - degree 6, connects to 2 communities
- [[compute_wallet_balance()]] - degree 10, connects to 1 community