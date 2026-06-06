---
source_file: "backend/tests/test_settlement_constraints.py"
type: "rationale"
community: "Settlement Constraint Tests"
location: "L140"
tags:
  - graphify/rationale
  - graphify/EXTRACTED
  - community/Settlement_Constraint_Tests
---

# Two 'pending' rows for the same (group, payer, payee) must raise IntegrityError.

## Connections
- [[test_a_duplicate_pending_blocked()]] - `rationale_for` [EXTRACTED]

#graphify/rationale #graphify/EXTRACTED #community/Settlement_Constraint_Tests