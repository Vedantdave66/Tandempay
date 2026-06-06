---
type: community
cohesion: 0.12
members: 28
---

# User & Subscription

**Cohesion:** 0.12 - loosely connected
**Members:** 28 nodes

## Members
- [[AsyncSession_2]] - code - backend/app/routes/audit_log.py
- [[AsyncSession_12]] - code - backend/app/routes/plaid_routes.py
- [[AsyncSession_23]] - code - backend/app/services/reconciliation.py
- [[AuditLogEntry]] - code - backend/app/routes/audit_log.py
- [[Fallback reconciliation Finds Payment intents stuck in 'processing'     for ove]] - rationale - backend/app/services/reconciliation.py
- [[FastAPI]] - code - backend/app/main.py
- [[Fetch the audit log for a group, newest-first.      - limit how many rows t]] - rationale - backend/app/routes/audit_log.py
- [[GET groups{group_id}audit-log  Returns the immutable audit feed for a group,]] - rationale - backend/app/routes/audit_log.py
- [[Group_1]] - code - backend/app/routes/audit_log.py
- [[PublicTokenRequest]] - code - backend/app/routes/plaid_routes.py
- [[User_1]] - code - backend/app/models.py
- [[User_2]] - code - backend/app/dependencies/subscription.py
- [[User_3]] - code - backend/app/routes/audit_log.py
- [[User_13]] - code - backend/app/routes/plaid_routes.py
- [[User_23]] - code - backend/app/services/reconciliation.py
- [[_verify_membership()]] - code - backend/app/routes/audit_log.py
- [[audit_log.py_1]] - code - backend/app/routes/audit_log.py
- [[create_link_token()]] - code - backend/app/routes/plaid_routes.py
- [[datetime]] - code - backend/app/routes/audit_log.py
- [[get_audit_log()]] - code - backend/app/routes/audit_log.py
- [[int]] - code - backend/app/routes/audit_log.py
- [[plaid_routes.py]] - code - backend/app/routes/plaid_routes.py
- [[reconcile_stuck_payments()]] - code - backend/app/services/reconciliation.py
- [[reconciliation.py]] - code - backend/app/services/reconciliation.py
- [[require_pro()]] - code - backend/app/dependencies/subscription.py
- [[set_access_token()]] - code - backend/app/routes/plaid_routes.py
- [[str_4]] - code - backend/app/routes/audit_log.py
- [[subscription.py]] - code - backend/app/dependencies/subscription.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/User__Subscription
SORT file.name ASC
```

## Connections to other communities
- 50 edges to [[_COMMUNITY_Core Expense & Group Models]]
- 19 edges to [[_COMMUNITY_Audit Logging]]
- 17 edges to [[_COMMUNITY_Auth & Notification Layer]]
- 15 edges to [[_COMMUNITY_Payment & Banking Models]]
- 14 edges to [[_COMMUNITY_Idempotency & Ledger]]
- 13 edges to [[_COMMUNITY_Friend & Reminder System]]
- 13 edges to [[_COMMUNITY_Recurring Expense Engine]]
- 9 edges to [[_COMMUNITY_Notifications & Payment Requests]]
- 5 edges to [[_COMMUNITY_Bank Linking Routes]]
- 5 edges to [[_COMMUNITY_Backend Notifications]]
- 5 edges to [[_COMMUNITY_Payment Concurrency Tests]]
- 4 edges to [[_COMMUNITY_Financial Safety Core]]
- 4 edges to [[_COMMUNITY_Subscription Routes]]
- 3 edges to [[_COMMUNITY_CSV Export Routes]]
- 3 edges to [[_COMMUNITY_Stripe Integration Tests]]
- 2 edges to [[_COMMUNITY_App Configuration]]
- 2 edges to [[_COMMUNITY_PostgreSQL Concurrency Tests]]
- 2 edges to [[_COMMUNITY_DB Failure Injection Tests]]
- 1 edge to [[_COMMUNITY_Idempotency Infrastructure]]
- 1 edge to [[_COMMUNITY_Idempotency Concurrency Tests]]
- 1 edge to [[_COMMUNITY_Export Functionality Tests]]

## Top bridge nodes
- [[User_1]] - degree 153, connects to 18 communities
- [[FastAPI]] - degree 28, connects to 16 communities
- [[AuditLogEntry]] - degree 5, connects to 2 communities
- [[str_4]] - degree 5, connects to 2 communities
- [[AsyncSession_2]] - degree 5, connects to 2 communities