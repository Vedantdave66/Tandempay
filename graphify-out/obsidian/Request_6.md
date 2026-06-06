---
source_file: "backend/app/routes/wallet.py"
type: "code"
community: "Audit Logging"
location: "L50"
tags:
  - graphify/code
  - graphify/INFERRED
  - community/Audit_Logging
---

# Request

## Connections
- [[AuditActions]] - `uses` [INFERRED]
- [[AuditLog]] - `uses` [INFERRED]
- [[Notification]] - `uses` [INFERRED]
- [[PaginatedResponse]] - `uses` [INFERRED]
- [[User_1]] - `uses` [INFERRED]
- [[UserOut]] - `uses` [INFERRED]
- [[WalletTransaction]] - `uses` [INFERRED]
- [[WalletTransactionOut]] - `uses` [INFERRED]
- [[add_funds()]] - `references` [EXTRACTED]
- [[withdraw_funds()]] - `references` [EXTRACTED]

#graphify/code #graphify/INFERRED #community/Audit_Logging