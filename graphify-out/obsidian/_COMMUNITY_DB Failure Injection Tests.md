---
type: community
cohesion: 0.18
members: 24
---

# DB Failure Injection Tests

**Cohesion:** 0.18 - loosely connected
**Members:** 24 nodes

## Members
- [[5 staggered retries at 50ms intervals — same idempotency key.     Simulates aggr]] - rationale - backend/tests/test_pg_failure_injection.py
- [[Create a test user with $1000 balance backed by a ledger transaction._2]] - rationale - backend/tests/test_pg_failure_injection.py
- [[Create tables before each test, drop after._3]] - rationale - backend/tests/test_pg_failure_injection.py
- [[Decimal_2]] - code - backend/tests/test_pg_failure_injection.py
- [[Fire a single add-funds request and return the response.]] - rationale - backend/tests/test_pg_failure_injection.py
- [[Inject exception after flush but before commit.     Verify COMPLETE rollback — z]] - rationale - backend/tests/test_pg_failure_injection.py
- [[PostgreSQL Failure Injection Tests — simulating real-world distributed system fa]] - rationale - backend/tests/test_pg_failure_injection.py
- [[Simulate overlapping requests first is slow, second arrives while     first is]] - rationale - backend/tests/test_pg_failure_injection.py
- [[Simulate process crash after DB commit but before HTTP response.     Verify idem]] - rationale - backend/tests/test_pg_failure_injection.py
- [[assert_ledger_consistency()_1]] - code - backend/tests/test_pg_failure_injection.py
- [[compute_ledger_balance()_1]] - code - backend/tests/test_pg_failure_injection.py
- [[count_transactions()_1]] - code - backend/tests/test_pg_failure_injection.py
- [[get_db with optional crash-after-commit simulation.]] - rationale - backend/tests/test_pg_failure_injection.py
- [[get_db_crashable()]] - code - backend/tests/test_pg_failure_injection.py
- [[get_wallet_balance()_3]] - code - backend/tests/test_pg_failure_injection.py
- [[make_request()]] - code - backend/tests/test_pg_failure_injection.py
- [[setup_pg_database()_1]] - code - backend/tests/test_pg_failure_injection.py
- [[str_23]] - code - backend/tests/test_pg_failure_injection.py
- [[test_a_crash_after_commit_before_response()]] - code - backend/tests/test_pg_failure_injection.py
- [[test_b_network_timeout_in_flight_retry()]] - code - backend/tests/test_pg_failure_injection.py
- [[test_c_partial_failure_rollback()]] - code - backend/tests/test_pg_failure_injection.py
- [[test_d_retry_storm()]] - code - backend/tests/test_pg_failure_injection.py
- [[test_pg_failure_injection.py]] - code - backend/tests/test_pg_failure_injection.py
- [[test_user()_2]] - code - backend/tests/test_pg_failure_injection.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/DB_Failure_Injection_Tests
SORT file.name ASC
```

## Connections to other communities
- 6 edges to [[_COMMUNITY_Idempotency & Ledger]]
- 2 edges to [[_COMMUNITY_User & Subscription]]
- 1 edge to [[_COMMUNITY_Auth & Notification Layer]]
- 1 edge to [[_COMMUNITY_Audit Logging]]

## Top bridge nodes
- [[Decimal_2]] - degree 12, connects to 2 communities
- [[str_23]] - degree 8, connects to 2 communities
- [[test_pg_failure_injection.py]] - degree 15, connects to 1 community
- [[count_transactions()_1]] - degree 7, connects to 1 community
- [[make_request()]] - degree 6, connects to 1 community