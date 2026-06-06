---
type: community
cohesion: 0.50
members: 4
---

# Database Session

**Cohesion:** 0.50 - moderately connected
**Members:** 4 nodes

## Members
- [[AsyncSession]] - code - backend/app/database.py
- [[Yields an async database session.      Transaction strategy       - The sess]] - rationale - backend/app/database.py
- [[database.py]] - code - backend/app/database.py
- [[get_db()]] - code - backend/app/database.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Database_Session
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_Idempotency & Ledger]]

## Top bridge nodes
- [[database.py]] - degree 2, connects to 1 community