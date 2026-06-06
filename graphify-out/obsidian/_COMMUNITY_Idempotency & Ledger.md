---
type: community
cohesion: 0.15
members: 25
---

# Idempotency & Ledger

**Cohesion:** 0.15 - loosely connected
**Members:** 25 nodes

## Members
- [[AsyncClient_2]] - code - backend/tests/test_idempotency_concurrency.py
- [[AsyncClient_5]] - code - backend/tests/test_stripe_idempotency.py
- [[Base]] - code - backend/app/database.py
- [[Create two test users in a group, with balances and a payment request.]] - rationale - backend/tests/test_payment_concurrency.py
- [[DeclarativeBase]] - code
- [[Decode the test JWT and return the User ORM object from the test DB.]] - rationale - backend/tests/test_idempotency_concurrency.py
- [[Decode the test JWT and return the User ORM object from the test DB._1]] - rationale - backend/tests/test_payment_concurrency.py
- [[HTTPAuthorizationCredentials_1]] - code - backend/tests/test_idempotency_concurrency.py
- [[HTTPAuthorizationCredentials_2]] - code - backend/tests/test_payment_concurrency.py
- [[IdempotencyKey]] - code - backend/app/idempotency.py
- [[Stores idempotency keys, request hashes, and cached responses.]] - rationale - backend/app/idempotency.py
- [[The internal ledger representing all money movement in and out of user wallets.]] - rationale - backend/app/models.py
- [[User_24]] - code - backend/tests/test_idempotency_concurrency.py
- [[User_25]] - code - backend/tests/test_payment_concurrency.py
- [[WalletTransaction]] - code - backend/app/models.py
- [[count_idempotency_records()]] - code - backend/tests/test_idempotency_concurrency.py
- [[float]] - code - backend/tests/test_idempotency_concurrency.py
- [[float_2]] - code - backend/tests/test_pg_failure_injection.py
- [[int_9]] - code - backend/tests/test_idempotency_concurrency.py
- [[int_11]] - code - backend/tests/test_pg_concurrency.py
- [[int_12]] - code - backend/tests/test_pg_failure_injection.py
- [[override_get_current_user()]] - code - backend/tests/test_idempotency_concurrency.py
- [[override_get_current_user()_1]] - code - backend/tests/test_payment_concurrency.py
- [[str_20]] - code - backend/tests/test_idempotency_concurrency.py
- [[test_data()]] - code - backend/tests/test_payment_concurrency.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Idempotency__Ledger
SORT file.name ASC
```

## Connections to other communities
- 16 edges to [[_COMMUNITY_Payment & Banking Models]]
- 16 edges to [[_COMMUNITY_Idempotency Concurrency Tests]]
- 15 edges to [[_COMMUNITY_Core Expense & Group Models]]
- 14 edges to [[_COMMUNITY_User & Subscription]]
- 13 edges to [[_COMMUNITY_Notifications & Payment Requests]]
- 10 edges to [[_COMMUNITY_Payment Concurrency Tests]]
- 8 edges to [[_COMMUNITY_Audit Logging]]
- 7 edges to [[_COMMUNITY_Stripe Integration Tests]]
- 6 edges to [[_COMMUNITY_DB Failure Injection Tests]]
- 6 edges to [[_COMMUNITY_App Configuration]]
- 5 edges to [[_COMMUNITY_Recurring Expense Engine]]
- 5 edges to [[_COMMUNITY_PostgreSQL Concurrency Tests]]
- 4 edges to [[_COMMUNITY_Financial Safety Core]]
- 3 edges to [[_COMMUNITY_Idempotency Infrastructure]]
- 2 edges to [[_COMMUNITY_Friend & Reminder System]]
- 2 edges to [[_COMMUNITY_Auth & Notification Layer]]
- 1 edge to [[_COMMUNITY_Database Session]]
- 1 edge to [[_COMMUNITY_Export Functionality Tests]]

## Top bridge nodes
- [[Base]] - degree 60, connects to 15 communities
- [[WalletTransaction]] - degree 46, connects to 8 communities
- [[int_11]] - degree 7, connects to 4 communities
- [[IdempotencyKey]] - degree 17, connects to 3 communities
- [[User_25]] - degree 8, connects to 3 communities