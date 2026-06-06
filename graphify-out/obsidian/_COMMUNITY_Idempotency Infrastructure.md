---
type: community
cohesion: 0.25
members: 8
---

# Idempotency Infrastructure

**Cohesion:** 0.25 - loosely connected
**Members:** 8 nodes

## Members
- [[Compute a deterministic SHA-256 hash of the raw request body.]] - rationale - backend/app/idempotency.py
- [[Decorator that adds race-condition-safe idempotency to a FastAPI route handler.]] - rationale - backend/app/idempotency.py
- [[Idempotency infrastructure for payment-critical endpoints.  Race-condition-safe]] - rationale - backend/app/idempotency.py
- [[_compute_request_hash()]] - code - backend/app/idempotency.py
- [[bytes]] - code - backend/app/idempotency.py
- [[idempotency.py]] - code - backend/app/idempotency.py
- [[idempotent()]] - code - backend/app/idempotency.py
- [[str]] - code - backend/app/idempotency.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Idempotency_Infrastructure
SORT file.name ASC
```

## Connections to other communities
- 3 edges to [[_COMMUNITY_Idempotency & Ledger]]
- 1 edge to [[_COMMUNITY_User & Subscription]]
- 1 edge to [[_COMMUNITY_Audit Logging]]

## Top bridge nodes
- [[idempotency.py]] - degree 6, connects to 3 communities
- [[bytes]] - degree 2, connects to 1 community
- [[str]] - degree 2, connects to 1 community