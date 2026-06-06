---
source_file: "backend/app/services/audit.py"
type: "code"
community: "Core Expense & Group Models"
location: "L30"
tags:
  - graphify/code
  - graphify/INFERRED
  - community/Core_Expense__Group_Models
---

# log_action()

## Connections
- [[Any]] - `references` [EXTRACTED]
- [[AsyncSession_21]] - `references` [EXTRACTED]
- [[AuditLog]] - `calls` [INFERRED]
- [[Insert one AuditLog row in the current session.      This call MUST happen wit]] - `rationale_for` [EXTRACTED]
- [[UUID]] - `references` [EXTRACTED]
- [[audit.py]] - `contains` [EXTRACTED]
- [[create_expense()]] - `calls` [INFERRED]
- [[create_settlement()]] - `calls` [INFERRED]
- [[delete_expense()]] - `calls` [INFERRED]
- [[str_18]] - `references` [EXTRACTED]
- [[update_expense()]] - `calls` [INFERRED]
- [[update_settlement_status()]] - `calls` [INFERRED]

#graphify/code #graphify/INFERRED #community/Core_Expense__Group_Models