---
type: community
cohesion: 0.17
members: 28
---

# Audit Logging

**Cohesion:** 0.17 - loosely connected
**Members:** 28 nodes

## Members
- [[AddFundsRequest]] - code - backend/app/routes/wallet.py
- [[AsyncSession_11]] - code - backend/app/routes/payments.py
- [[AsyncSession_20]] - code - backend/app/routes/wallet.py
- [[AuditActions]] - code - backend/app/audit_log.py
- [[AuditLog]] - code - backend/app/audit_log.py
- [[AuditLog model — immutable record of every financial action in TandemPay.  Des]] - rationale - backend/app/audit_log.py
- [[Immutable audit trail for all financial actions.      IMPORTANT — no updated_a]] - rationale - backend/app/audit_log.py
- [[PaymentCreateRequest]] - code - backend/app/routes/payments.py
- [[Request_2]] - code - backend/app/routes/payments.py
- [[Request_6]] - code - backend/app/routes/wallet.py
- [[Return the current user's wallet profile.          Read-only if a mismatch is]] - rationale - backend/app/routes/wallet.py
- [[Return the paginated ledger feed for this user.]] - rationale - backend/app/routes/wallet.py
- [[String constants for the `action` column.      Using plain class-level strings]] - rationale - backend/app/audit_log.py
- [[UUID]] - code - backend/app/services/audit.py
- [[User_12]] - code - backend/app/routes/payments.py
- [[User_21]] - code - backend/app/routes/wallet.py
- [[Wallet routes — add funds, withdraw, check balance, transaction history.  Prod]] - rationale - backend/app/routes/wallet.py
- [[WalletTransactionOut]] - code - backend/app/schemas.py
- [[WithdrawRequest]] - code - backend/app/routes/wallet.py
- [[add_funds()]] - code - backend/app/routes/wallet.py
- [[audit_log.py]] - code - backend/app/audit_log.py
- [[create_payment()]] - code - backend/app/routes/payments.py
- [[get_balance()]] - code - backend/app/routes/wallet.py
- [[get_transactions()]] - code - backend/app/routes/wallet.py
- [[int_8]] - code - backend/app/routes/wallet.py
- [[payments.py]] - code - backend/app/routes/payments.py
- [[wallet.py]] - code - backend/app/routes/wallet.py
- [[withdraw_funds()]] - code - backend/app/routes/wallet.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Audit_Logging
SORT file.name ASC
```

## Connections to other communities
- 33 edges to [[_COMMUNITY_Core Expense & Group Models]]
- 19 edges to [[_COMMUNITY_User & Subscription]]
- 10 edges to [[_COMMUNITY_Notifications & Payment Requests]]
- 8 edges to [[_COMMUNITY_Idempotency & Ledger]]
- 7 edges to [[_COMMUNITY_Auth & Notification Layer]]
- 5 edges to [[_COMMUNITY_Payment & Banking Models]]
- 2 edges to [[_COMMUNITY_Financial Safety Core]]
- 2 edges to [[_COMMUNITY_Recurring Expense Engine]]
- 2 edges to [[_COMMUNITY_Stripe Integration Tests]]
- 1 edge to [[_COMMUNITY_Idempotency Infrastructure]]
- 1 edge to [[_COMMUNITY_App Configuration]]
- 1 edge to [[_COMMUNITY_Export Functionality Tests]]
- 1 edge to [[_COMMUNITY_Idempotency Concurrency Tests]]
- 1 edge to [[_COMMUNITY_Payment Concurrency Tests]]
- 1 edge to [[_COMMUNITY_PostgreSQL Concurrency Tests]]
- 1 edge to [[_COMMUNITY_DB Failure Injection Tests]]
- 1 edge to [[_COMMUNITY_Settlement Constraint Tests]]

## Top bridge nodes
- [[UUID]] - degree 19, connects to 13 communities
- [[User_21]] - degree 12, connects to 5 communities
- [[AsyncSession_20]] - degree 12, connects to 5 communities
- [[AddFundsRequest]] - degree 11, connects to 5 communities
- [[WithdrawRequest]] - degree 11, connects to 5 communities