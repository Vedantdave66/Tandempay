---
source_file: "backend/app/routes/wallet.py"
type: "code"
community: "Audit Logging"
location: "L45"
tags:
  - graphify/code
  - graphify/INFERRED
  - community/Audit_Logging
---

# WithdrawRequest

## Connections
- [[AuditActions]] - `uses` [INFERRED]
- [[AuditLog]] - `uses` [INFERRED]
- [[BaseModel]] - `inherits` [EXTRACTED]
- [[Notification]] - `uses` [INFERRED]
- [[PaginatedResponse]] - `uses` [INFERRED]
- [[User_1]] - `uses` [INFERRED]
- [[UserOut]] - `uses` [INFERRED]
- [[WalletTransaction]] - `uses` [INFERRED]
- [[WalletTransactionOut]] - `uses` [INFERRED]
- [[wallet.py]] - `contains` [EXTRACTED]
- [[withdraw_funds()]] - `references` [EXTRACTED]

#graphify/code #graphify/INFERRED #community/Audit_Logging