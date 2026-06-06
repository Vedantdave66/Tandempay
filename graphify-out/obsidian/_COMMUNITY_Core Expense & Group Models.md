---
type: community
cohesion: 0.08
members: 104
---

# Core Expense & Group Models

**Cohesion:** 0.08 - loosely connected
**Members:** 104 nodes

## Members
- [[NOTE We do NOT filter paid_by by active_member_ids here because a]] - rationale - backend/app/services/balance_service.py
- [[Any]] - code - backend/app/services/audit.py
- [[AsyncClient_1]] - code - backend/tests/test_financial_precision.py
- [[AsyncSession_5]] - code - backend/app/routes/expenses.py
- [[AsyncSession_8]] - code - backend/app/routes/groups.py
- [[AsyncSession_9]] - code - backend/app/routes/me.py
- [[AsyncSession_16]] - code - backend/app/routes/settlements.py
- [[AsyncSession_21]] - code - backend/app/services/audit.py
- [[AsyncSession_22]] - code - backend/app/services/balance_service.py
- [[Audit logging service for TandemPay financial actions.  PRIVACY CONTRACT — the]] - rationale - backend/app/services/audit.py
- [[BaseModel]] - code
- [[Client-initiated status transition.  Only the three valid moves are accepted.]] - rationale - backend/app/schemas.py
- [[Compute net balance for each user in the group.      Returns a dict with three]] - rationale - backend/app/services/balance_service.py
- [[Expense]] - code - backend/app/models.py
- [[ExpenseCreate]] - code - backend/app/schemas.py
- [[ExpenseCreate_1]] - code - backend/app/routes/expenses.py
- [[ExpenseOut]] - code - backend/app/schemas.py
- [[ExpenseParticipant]] - code - backend/app/models.py
- [[ExpenseParticipantOut]] - code - backend/app/schemas.py
- [[Generic paginated envelope returned by all list endpoints.]] - rationale - backend/app/schemas.py
- [[Get all settlement records where the user is either the payer or the payee.]] - rationale - backend/app/routes/me.py
- [[Get all users the current user shares a group with OR has an accepted friend req]] - rationale - backend/app/routes/me.py
- [[Group]] - code - backend/app/models.py
- [[Group_2]] - code - backend/app/routes/expenses.py
- [[Group_3]] - code - backend/app/routes/settlements.py
- [[Group_4]] - code - backend/app/services/balance_service.py
- [[GroupCreate]] - code - backend/app/schemas.py
- [[GroupCreate_1]] - code - backend/app/routes/groups.py
- [[GroupListOut]] - code - backend/app/schemas.py
- [[GroupMember]] - code - backend/app/models.py
- [[GroupMemberOut]] - code - backend/app/schemas.py
- [[GroupOut]] - code - backend/app/schemas.py
- [[Initiate a settlement — payer starts the process.]] - rationale - backend/app/routes/settlements.py
- [[Insert one AuditLog row in the current session.      This call MUST happen wit]] - rationale - backend/app/services/audit.py
- [[Join a group using its invite token.      The invite token is shared by the gr]] - rationale - backend/app/routes/groups.py
- [[JoinGroup]] - code - backend/app/schemas.py
- [[JoinGroup_1]] - code - backend/app/routes/groups.py
- [[List settlement records for a group, newest first.]] - rationale - backend/app/routes/settlements.py
- [[MemberAdd]] - code - backend/app/schemas.py
- [[MemberAdd_1]] - code - backend/app/routes/groups.py
- [[Notification_1]] - code - backend/app/routes/settlements.py
- [[PaginatedResponse]] - code - backend/app/schemas.py
- [[Request_4]] - code - backend/app/routes/settlements.py
- [[Request body for POST apigroups{group_id}join.]] - rationale - backend/app/schemas.py
- [[Settlement]] - code - backend/app/schemas.py
- [[SettlementRecord]] - code - backend/app/models.py
- [[SettlementRecord_1]] - code - backend/app/routes/settlements.py
- [[SettlementRecordCreate]] - code - backend/app/schemas.py
- [[SettlementRecordCreate_1]] - code - backend/app/routes/settlements.py
- [[SettlementRecordOut]] - code - backend/app/schemas.py
- [[SettlementRecordOut_1]] - code - backend/app/routes/settlements.py
- [[SettlementStatusUpdate]] - code - backend/app/schemas.py
- [[SettlementStatusUpdate_1]] - code - backend/app/routes/settlements.py
- [[Tracks actual payment transactions between users within a group.]] - rationale - backend/app/models.py
- [[Update the status of a settlement record.          - Payer can update pending]] - rationale - backend/app/routes/settlements.py
- [[User_6]] - code - backend/app/routes/expenses.py
- [[User_9]] - code - backend/app/routes/groups.py
- [[User_10]] - code - backend/app/routes/me.py
- [[User_17]] - code - backend/app/routes/settlements.py
- [[User_22]] - code - backend/app/services/balance_service.py
- [[UserBalance]] - code - backend/app/schemas.py
- [[_build_settlement_out()]] - code - backend/app/routes/settlements.py
- [[_compute_balances()]] - code - backend/app/services/balance_service.py
- [[_create_notification()]] - code - backend/app/routes/settlements.py
- [[_verify_membership()_1]] - code - backend/app/routes/expenses.py
- [[_verify_membership()_2]] - code - backend/app/routes/settlements.py
- [[_verify_membership()_3]] - code - backend/app/services/balance_service.py
- [[add_member()]] - code - backend/app/routes/groups.py
- [[audit.py]] - code - backend/app/services/audit.py
- [[balance_service.py]] - code - backend/app/services/balance_service.py
- [[create_expense()]] - code - backend/app/routes/expenses.py
- [[create_group()]] - code - backend/app/routes/groups.py
- [[create_settlement()]] - code - backend/app/routes/settlements.py
- [[delete_expense()]] - code - backend/app/routes/expenses.py
- [[delete_group()]] - code - backend/app/routes/groups.py
- [[expenses.py]] - code - backend/app/routes/expenses.py
- [[float_3]] - code - backend/tests/test_settlement_constraints.py
- [[get_balances()]] - code - backend/app/services/balance_service.py
- [[get_group()]] - code - backend/app/routes/groups.py
- [[get_my_friends()]] - code - backend/app/routes/me.py
- [[get_my_payments()]] - code - backend/app/routes/me.py
- [[get_settlements()]] - code - backend/app/services/balance_service.py
- [[groups.py]] - code - backend/app/routes/groups.py
- [[int_1]] - code - backend/app/routes/expenses.py
- [[int_2]] - code - backend/app/routes/groups.py
- [[int_3]] - code - backend/app/routes/me.py
- [[int_7]] - code - backend/app/routes/settlements.py
- [[join_group()]] - code - backend/app/routes/groups.py
- [[list_expenses()]] - code - backend/app/routes/expenses.py
- [[list_groups()]] - code - backend/app/routes/groups.py
- [[list_settlements()]] - code - backend/app/routes/settlements.py
- [[log_action()]] - code - backend/app/services/audit.py
- [[make_settlement()]] - code - backend/tests/test_settlement_constraints.py
- [[me.py]] - code - backend/app/routes/me.py
- [[remove_member()]] - code - backend/app/routes/groups.py
- [[settlements.py]] - code - backend/app/routes/settlements.py
- [[str_7]] - code - backend/app/routes/expenses.py
- [[str_9]] - code - backend/app/routes/groups.py
- [[str_14]] - code - backend/app/routes/settlements.py
- [[str_18]] - code - backend/app/services/audit.py
- [[str_19]] - code - backend/app/services/balance_service.py
- [[str_25]] - code - backend/tests/test_settlement_constraints.py
- [[update_expense()]] - code - backend/app/routes/expenses.py
- [[update_settlement_status()]] - code - backend/app/routes/settlements.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Core_Expense__Group_Models
SORT file.name ASC
```

## Connections to other communities
- 50 edges to [[_COMMUNITY_User & Subscription]]
- 35 edges to [[_COMMUNITY_Notifications & Payment Requests]]
- 33 edges to [[_COMMUNITY_Audit Logging]]
- 29 edges to [[_COMMUNITY_Friend & Reminder System]]
- 27 edges to [[_COMMUNITY_Auth & Notification Layer]]
- 18 edges to [[_COMMUNITY_Recurring Expense Engine]]
- 15 edges to [[_COMMUNITY_Idempotency & Ledger]]
- 11 edges to [[_COMMUNITY_Payment & Banking Models]]
- 8 edges to [[_COMMUNITY_Payment Concurrency Tests]]
- 6 edges to [[_COMMUNITY_Settlement Constraint Tests]]
- 4 edges to [[_COMMUNITY_Export Functionality Tests]]
- 4 edges to [[_COMMUNITY_PostgreSQL Concurrency Tests]]
- 4 edges to [[_COMMUNITY_CSV Export Routes]]
- 4 edges to [[_COMMUNITY_Backend Notifications]]
- 2 edges to [[_COMMUNITY_Bank Linking Routes]]
- 2 edges to [[_COMMUNITY_Financial Safety Core]]

## Top bridge nodes
- [[GroupMember]] - degree 66, connects to 8 communities
- [[BaseModel]] - degree 42, connects to 8 communities
- [[Group]] - degree 57, connects to 7 communities
- [[Expense]] - degree 36, connects to 6 communities
- [[ExpenseParticipant]] - degree 24, connects to 6 communities