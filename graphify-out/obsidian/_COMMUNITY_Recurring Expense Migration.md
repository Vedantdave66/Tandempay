---
type: community
cohesion: 0.67
members: 3
---

# Recurring Expense Migration

**Cohesion:** 0.67 - moderately connected
**Members:** 3 nodes

## Members
- [[20260522_add_recurring_expenses.py]] - code - backend/alembic/versions/20260522_add_recurring_expenses.py
- [[downgrade()_2]] - code - backend/alembic/versions/20260522_add_recurring_expenses.py
- [[upgrade()_2]] - code - backend/alembic/versions/20260522_add_recurring_expenses.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Recurring_Expense_Migration
SORT file.name ASC
```
