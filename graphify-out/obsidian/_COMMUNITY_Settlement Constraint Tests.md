---
type: community
cohesion: 0.12
members: 16
---

# Settlement Constraint Tests

**Cohesion:** 0.12 - loosely connected
**Members:** 16 nodes

## Members
- [[A 'declined' row for the same pair must NOT block a new 'pending' row.     If Bo]] - rationale - backend/tests/test_settlement_constraints.py
- [[A 'settled' row for the same pair must NOT block a new 'pending' row.     This i]] - rationale - backend/tests/test_settlement_constraints.py
- [[Create all tables before each test, drop after._1]] - rationale - backend/tests/test_settlement_constraints.py
- [[Creates two users (Alice, Bob) and a group they both belong to.     Returns a di]] - rationale - backend/tests/test_settlement_constraints.py
- [[Test Suite SettlementRecord Partial Index Constraints  Validates the behaviour]] - rationale - backend/tests/test_settlement_constraints.py
- [[Two 'pending' rows for the same (group, payer, payee) must raise IntegrityError.]] - rationale - backend/tests/test_settlement_constraints.py
- [[Two 'sent' rows for the same pair must raise IntegrityError.     A user cannot c]] - rationale - backend/tests/test_settlement_constraints.py
- [[balance_service._compute_balances() subtracts ALL 'settled' records.     If two]] - rationale - backend/tests/test_settlement_constraints.py
- [[base_data()]] - code - backend/tests/test_settlement_constraints.py
- [[setup_schema()]] - code - backend/tests/test_settlement_constraints.py
- [[test_a_duplicate_pending_blocked()]] - code - backend/tests/test_settlement_constraints.py
- [[test_b_duplicate_sent_blocked()]] - code - backend/tests/test_settlement_constraints.py
- [[test_c_settled_does_not_block_new_settlement()]] - code - backend/tests/test_settlement_constraints.py
- [[test_d_declined_does_not_block_new_settlement()]] - code - backend/tests/test_settlement_constraints.py
- [[test_e_balance_double_subtraction_blocked_at_db_level()]] - code - backend/tests/test_settlement_constraints.py
- [[test_settlement_constraints.py]] - code - backend/tests/test_settlement_constraints.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Settlement_Constraint_Tests
SORT file.name ASC
```

## Connections to other communities
- 6 edges to [[_COMMUNITY_Core Expense & Group Models]]
- 1 edge to [[_COMMUNITY_Audit Logging]]

## Top bridge nodes
- [[test_settlement_constraints.py]] - degree 10, connects to 2 communities
- [[test_a_duplicate_pending_blocked()]] - degree 3, connects to 1 community
- [[test_b_duplicate_sent_blocked()]] - degree 3, connects to 1 community
- [[test_c_settled_does_not_block_new_settlement()]] - degree 3, connects to 1 community
- [[test_d_declined_does_not_block_new_settlement()]] - degree 3, connects to 1 community