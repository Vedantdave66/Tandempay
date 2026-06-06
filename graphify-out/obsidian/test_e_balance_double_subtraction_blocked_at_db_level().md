---
source_file: "backend/tests/test_settlement_constraints.py"
type: "code"
community: "Settlement Constraint Tests"
location: "L270"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Settlement_Constraint_Tests
---

# test_e_balance_double_subtraction_blocked_at_db_level()

## Connections
- [[balance_service._compute_balances() subtracts ALL 'settled' records.     If two]] - `rationale_for` [EXTRACTED]
- [[make_settlement()]] - `calls` [EXTRACTED]
- [[test_settlement_constraints.py]] - `contains` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Settlement_Constraint_Tests