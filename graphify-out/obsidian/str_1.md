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

# str

## Connections
- [[User_1]] - `uses` [INFERRED]
- [[WalletTransaction]] - `uses` [INFERRED]
- [[assert_conservation_of_money()]] - `references` [EXTRACTED]
- [[compute_wallet_balance()]] - `references` [EXTRACTED]
- [[lock_user_for_update()]] - `references` [EXTRACTED]
- [[lock_users_sorted()]] - `references` [EXTRACTED]
- [[pre_validate_balance()]] - `references` [EXTRACTED]
- [[validate_balance_integrity()]] - `references` [EXTRACTED]
- [[verify_post_commit()]] - `references` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Financial_Safety_Core