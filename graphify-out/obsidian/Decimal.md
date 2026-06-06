---
source_file: "backend/app/ledger.py"
type: "code"
community: "Financial Safety Core"
location: "L24"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Financial_Safety_Core
---

# Decimal

## Connections
- [[User_1]] - `uses` [INFERRED]
- [[WalletTransaction]] - `uses` [INFERRED]
- [[assert_conservation_of_money()]] - `references` [EXTRACTED]
- [[compute_wallet_balance()]] - `references` [EXTRACTED]
- [[ledger.py]] - `imports_from` [EXTRACTED]
- [[pre_validate_balance()]] - `calls` [EXTRACTED]
- [[validate_balance_integrity()]] - `calls` [EXTRACTED]
- [[verify_post_commit()]] - `references` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Financial_Safety_Core