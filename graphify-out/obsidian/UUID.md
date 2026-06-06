---
source_file: "backend/app/services/audit.py"
type: "code"
community: "Audit Logging"
location: "L30"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Audit_Logging
---

# UUID

## Connections
- [[AuditLog]] - `uses` [INFERRED]
- [[audit.py]] - `imports_from` [EXTRACTED]
- [[audit_log.py]] - `imports` [EXTRACTED]
- [[idempotency.py]] - `imports` [EXTRACTED]
- [[log_action()]] - `references` [EXTRACTED]
- [[main.py]] - `imports` [EXTRACTED]
- [[models.py]] - `imports` [EXTRACTED]
- [[payments.py]] - `imports` [EXTRACTED]
- [[test_export.py]] - `imports` [EXTRACTED]
- [[test_financial_precision.py]] - `imports` [EXTRACTED]
- [[test_idempotency_concurrency.py]] - `imports` [EXTRACTED]
- [[test_payment_concurrency.py]] - `imports` [EXTRACTED]
- [[test_pg_concurrency.py]] - `imports` [EXTRACTED]
- [[test_pg_failure_injection.py]] - `imports` [EXTRACTED]
- [[test_recurring_expenses.py]] - `imports` [EXTRACTED]
- [[test_recurring_scheduler.py]] - `imports` [EXTRACTED]
- [[test_settlement_constraints.py]] - `imports` [EXTRACTED]
- [[test_stripe_idempotency.py]] - `imports` [EXTRACTED]
- [[test_stripe_webhook.py]] - `imports` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Audit_Logging