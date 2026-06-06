---
source_file: "backend/app/routes/payments.py"
type: "code"
community: "Audit Logging"
location: "L33"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Audit_Logging
---

# create_payment()

## Connections
- [[AsyncSession_11]] - `references` [EXTRACTED]
- [[AuditLog]] - `calls` [INFERRED]
- [[PaymentCreateRequest]] - `references` [EXTRACTED]
- [[Request_2]] - `references` [EXTRACTED]
- [[User_12]] - `references` [EXTRACTED]
- [[payments.py]] - `contains` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Audit_Logging