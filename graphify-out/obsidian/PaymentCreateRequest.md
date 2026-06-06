---
source_file: "backend/app/routes/payments.py"
type: "code"
community: "Audit Logging"
location: "L26"
tags:
  - graphify/code
  - graphify/INFERRED
  - community/Audit_Logging
---

# PaymentCreateRequest

## Connections
- [[AuditActions]] - `uses` [INFERRED]
- [[AuditLog]] - `uses` [INFERRED]
- [[BaseModel]] - `inherits` [EXTRACTED]
- [[Notification]] - `uses` [INFERRED]
- [[Payment]] - `uses` [INFERRED]
- [[User_1]] - `uses` [INFERRED]
- [[create_payment()]] - `references` [EXTRACTED]
- [[payments.py]] - `contains` [EXTRACTED]

#graphify/code #graphify/INFERRED #community/Audit_Logging