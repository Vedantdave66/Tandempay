---
source_file: "backend/app/scheduler.py"
type: "code"
community: "Recurring Expense Engine"
location: "L41"
tags:
  - graphify/code
  - graphify/INFERRED
  - community/Recurring_Expense_Engine
---

# process_due_recurring_expenses()

## Connections
- [[_advance_date()]] - `calls` [EXTRACTED]
- [[_fire_recurring()]] - `calls` [EXTRACTED]
- [[scheduler.py]] - `contains` [EXTRACTED]
- [[test_a_due_expense_creates_expense()]] - `calls` [INFERRED]
- [[test_b_not_due_expense_is_skipped()]] - `calls` [INFERRED]
- [[test_c_free_user_expense_is_skipped()]] - `calls` [INFERRED]
- [[test_d_next_run_date_advances_after_processing()]] - `calls` [INFERRED]
- [[test_e_disabled_expense_is_skipped()]] - `calls` [INFERRED]

#graphify/code #graphify/INFERRED #community/Recurring_Expense_Engine