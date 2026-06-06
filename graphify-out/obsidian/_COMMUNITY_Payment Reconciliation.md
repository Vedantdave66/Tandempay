---
type: community
cohesion: 0.67
members: 3
---

# Payment Reconciliation

**Cohesion:** 0.67 - moderately connected
**Members:** 3 nodes

## Members
- [[Background job to reconcile stuck payments and cleanup expired ones.      Three]] - rationale - backend/app/services/payment_reconciliation.py
- [[payment_reconciliation.py]] - code - backend/app/services/payment_reconciliation.py
- [[run_payment_reconciliation()]] - code - backend/app/services/payment_reconciliation.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Payment_Reconciliation
SORT file.name ASC
```
