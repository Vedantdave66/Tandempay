---
type: community
cohesion: 0.07
members: 56
---

# Recurring Expense Engine

**Cohesion:** 0.07 - loosely connected
**Members:** 56 nodes

## Members
- [[AsyncClient_4]] - code - backend/tests/test_recurring_expenses.py
- [[AsyncSession_13]] - code - backend/app/routes/recurring_routes.py
- [[Cannot update a recurring expense owned by someone else.]] - rationale - backend/tests/test_recurring_expenses.py
- [[Insert a Pro user, a group, and a group member. Returns (user, group).]] - rationale - backend/tests/test_recurring_scheduler.py
- [[RecurrenceFrequency]] - code - backend/app/models.py
- [[RecurrenceFrequency_1]] - code - backend/app/scheduler.py
- [[Recurring Expense Scheduler Tests  Tests for process_due_recurring_expenses() —]] - rationale - backend/tests/test_recurring_scheduler.py
- [[Recurring Expense Scheduler — Background job that auto-creates Expense records]] - rationale - backend/app/scheduler.py
- [[Recurring Expenses Tests  Tests for the apirecurring endpoints (Pro feature)]] - rationale - backend/tests/test_recurring_expenses.py
- [[RecurringExpense]] - code - backend/app/models.py
- [[RecurringExpense_1]] - code - backend/app/scheduler.py
- [[RecurringExpenseCreate]] - code - backend/app/schemas.py
- [[RecurringExpenseCreate_1]] - code - backend/app/routes/recurring_routes.py
- [[RecurringExpenseOut]] - code - backend/app/schemas.py
- [[RecurringExpenseUpdate]] - code - backend/app/schemas.py
- [[RecurringExpenseUpdate_1]] - code - backend/app/routes/recurring_routes.py
- [[Template for an expense that auto-fires on a recurring schedule (Pro only).]] - rationale - backend/app/models.py
- [[Unit-test the date advancement helper directly.]] - rationale - backend/tests/test_recurring_expenses.py
- [[User_14]] - code - backend/app/routes/recurring_routes.py
- [[User_26]] - code - backend/tests/test_recurring_expenses.py
- [[_advance_date()]] - code - backend/app/scheduler.py
- [[_fire_recurring()]] - code - backend/app/scheduler.py
- [[_make_free_user()]] - code - backend/tests/test_recurring_expenses.py
- [[_make_pro_setup()]] - code - backend/tests/test_recurring_scheduler.py
- [[_make_pro_user()]] - code - backend/tests/test_recurring_expenses.py
- [[client()_4]] - code - backend/tests/test_recurring_expenses.py
- [[create_recurring_expense()]] - code - backend/app/routes/recurring_routes.py
- [[date]] - code - backend/app/scheduler.py
- [[delete_recurring_expense()]] - code - backend/app/routes/recurring_routes.py
- [[free_user()_1]] - code - backend/tests/test_recurring_expenses.py
- [[int_5]] - code - backend/app/routes/recurring_routes.py
- [[list_recurring_expenses()]] - code - backend/app/routes/recurring_routes.py
- [[override_get_db()_4]] - code - backend/tests/test_recurring_expenses.py
- [[pro_user()_1]] - code - backend/tests/test_recurring_expenses.py
- [[process_due_recurring_expenses()]] - code - backend/app/scheduler.py
- [[recurring_routes.py]] - code - backend/app/routes/recurring_routes.py
- [[scheduler.py]] - code - backend/app/scheduler.py
- [[setup_database()_4]] - code - backend/tests/test_recurring_expenses.py
- [[setup_database()_5]] - code - backend/tests/test_recurring_scheduler.py
- [[str_11]] - code - backend/app/routes/recurring_routes.py
- [[str_24]] - code - backend/tests/test_recurring_expenses.py
- [[test_a_due_expense_creates_expense()]] - code - backend/tests/test_recurring_scheduler.py
- [[test_b_not_due_expense_is_skipped()]] - code - backend/tests/test_recurring_scheduler.py
- [[test_c_free_user_expense_is_skipped()]] - code - backend/tests/test_recurring_scheduler.py
- [[test_create_recurring_expense_free_user_forbidden()]] - code - backend/tests/test_recurring_expenses.py
- [[test_create_recurring_expense_pro()]] - code - backend/tests/test_recurring_expenses.py
- [[test_d_next_run_date_advances_after_processing()]] - code - backend/tests/test_recurring_scheduler.py
- [[test_delete_recurring_expense_deactivates()]] - code - backend/tests/test_recurring_expenses.py
- [[test_e_disabled_expense_is_skipped()]] - code - backend/tests/test_recurring_scheduler.py
- [[test_list_recurring_expenses()]] - code - backend/tests/test_recurring_expenses.py
- [[test_recurring_expenses.py]] - code - backend/tests/test_recurring_expenses.py
- [[test_recurring_scheduler.py]] - code - backend/tests/test_recurring_scheduler.py
- [[test_scheduler_advance_date_logic()]] - code - backend/tests/test_recurring_expenses.py
- [[test_update_other_users_recurring_expense_returns_404()]] - code - backend/tests/test_recurring_expenses.py
- [[test_update_recurring_expense()]] - code - backend/tests/test_recurring_expenses.py
- [[update_recurring_expense()]] - code - backend/app/routes/recurring_routes.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Recurring_Expense_Engine
SORT file.name ASC
```

## Connections to other communities
- 18 edges to [[_COMMUNITY_Core Expense & Group Models]]
- 13 edges to [[_COMMUNITY_User & Subscription]]
- 8 edges to [[_COMMUNITY_Payment & Banking Models]]
- 5 edges to [[_COMMUNITY_Idempotency & Ledger]]
- 4 edges to [[_COMMUNITY_Auth & Notification Layer]]
- 2 edges to [[_COMMUNITY_Audit Logging]]

## Top bridge nodes
- [[User_26]] - degree 12, connects to 3 communities
- [[AsyncClient_4]] - degree 11, connects to 3 communities
- [[RecurrenceFrequency]] - degree 9, connects to 3 communities
- [[date]] - degree 8, connects to 3 communities
- [[RecurrenceFrequency_1]] - degree 8, connects to 3 communities