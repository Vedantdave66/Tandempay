---
type: community
cohesion: 1.00
members: 2
---

# Duplicate Settlement Fix

**Cohesion:** 1.00 - tightly connected
**Members:** 2 nodes

## Members
- [[Resolve duplicate active settlement rows blocking the Alembic partial index.  Th]] - rationale - backend/resolve_duplicate_settlements.py
- [[resolve_duplicate_settlements.py]] - code - backend/resolve_duplicate_settlements.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Duplicate_Settlement_Fix
SORT file.name ASC
```
