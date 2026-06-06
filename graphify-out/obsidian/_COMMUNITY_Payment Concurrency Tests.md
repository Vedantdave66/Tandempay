---
type: community
cohesion: 0.15
members: 18
---

# Payment Concurrency Tests

**Cohesion:** 0.15 - loosely connected
**Members:** 18 nodes

## Members
- [[AsyncClient_3]] - code - backend/tests/test_payment_concurrency.py
- [[Create tables before each test, drop after._2]] - rationale - backend/tests/test_payment_concurrency.py
- [[Payment Request TOCTOU (Time-of-Check to Time-of-Use) concurrency tests.  These]] - rationale - backend/tests/test_payment_concurrency.py
- [[Test A Simulate 2 concurrent calls (using different idempotency keys to bypass]] - rationale - backend/tests/test_payment_concurrency.py
- [[Test B 5 concurrent attempts (using sequential requests for SQLite safety)]] - rationale - backend/tests/test_payment_concurrency.py
- [[Test C Sequential retry (without idempotency key)     First call succeeds. Seco]] - rationale - backend/tests/test_payment_concurrency.py
- [[client()_3]] - code - backend/tests/test_payment_concurrency.py
- [[count_transfer_transactions()]] - code - backend/tests/test_payment_concurrency.py
- [[float_1]] - code - backend/tests/test_payment_concurrency.py
- [[get_wallet_balance()_1]] - code - backend/tests/test_payment_concurrency.py
- [[int_10]] - code - backend/tests/test_payment_concurrency.py
- [[override_get_db()_3]] - code - backend/tests/test_payment_concurrency.py
- [[setup_database()_3]] - code - backend/tests/test_payment_concurrency.py
- [[str_21]] - code - backend/tests/test_payment_concurrency.py
- [[test_a_two_requests_same_payment()]] - code - backend/tests/test_payment_concurrency.py
- [[test_b_five_concurrent_attempts()]] - code - backend/tests/test_payment_concurrency.py
- [[test_c_sequential_retry_after_success()]] - code - backend/tests/test_payment_concurrency.py
- [[test_payment_concurrency.py]] - code - backend/tests/test_payment_concurrency.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Payment_Concurrency_Tests
SORT file.name ASC
```

## Connections to other communities
- 10 edges to [[_COMMUNITY_Idempotency & Ledger]]
- 8 edges to [[_COMMUNITY_Core Expense & Group Models]]
- 5 edges to [[_COMMUNITY_User & Subscription]]
- 4 edges to [[_COMMUNITY_Notifications & Payment Requests]]
- 1 edge to [[_COMMUNITY_Audit Logging]]

## Top bridge nodes
- [[AsyncClient_3]] - degree 10, connects to 4 communities
- [[str_21]] - degree 8, connects to 4 communities
- [[float_1]] - degree 7, connects to 4 communities
- [[int_10]] - degree 7, connects to 4 communities
- [[test_payment_concurrency.py]] - degree 13, connects to 3 communities