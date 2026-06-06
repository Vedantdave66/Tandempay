---
source_file: "backend/tests/test_pg_concurrency.py"
type: "code"
community: "PostgreSQL Concurrency Tests"
location: "L419"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/PostgreSQL_Concurrency_Tests
---

# test_b_payment_request_double_spend()

## Connections
- [[5 truly parallel attempts to pay the same PaymentRequest.     PostgreSQL's SELEC]] - `rationale_for` [EXTRACTED]
- [[assert_ledger_consistency()]] - `calls` [EXTRACTED]
- [[count_transactions()]] - `calls` [EXTRACTED]
- [[get_wallet_balance()_2]] - `calls` [EXTRACTED]
- [[test_pg_concurrency.py]] - `contains` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/PostgreSQL_Concurrency_Tests