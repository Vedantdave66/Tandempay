---
source_file: "backend/app/ledger.py"
type: "code"
community: "Financial Safety Core"
location: "L41"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Financial_Safety_Core
---

# User

## Connections
- [[User_1]] - `uses` [INFERRED]
- [[WalletTransaction]] - `uses` [INFERRED]
- [[lock_user_for_update()]] - `references` [EXTRACTED]
- [[lock_users_sorted()]] - `references` [EXTRACTED]
- [[pre_validate_balance()]] - `references` [EXTRACTED]
- [[validate_balance_integrity()]] - `references` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Financial_Safety_Core