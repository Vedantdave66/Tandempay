---
source_file: "backend/tests/test_idempotency_concurrency.py"
type: "code"
community: "Idempotency & Ledger"
location: "L67"
tags:
  - graphify/code
  - graphify/INFERRED
  - community/Idempotency__Ledger
---

# User

## Connections
- [[Base]] - `uses` [INFERRED]
- [[IdempotencyKey]] - `uses` [INFERRED]
- [[User_1]] - `uses` [INFERRED]
- [[WalletTransaction]] - `uses` [INFERRED]
- [[override_get_current_user()]] - `references` [EXTRACTED]
- [[test_user()]] - `calls` [EXTRACTED]

#graphify/code #graphify/INFERRED #community/Idempotency__Ledger