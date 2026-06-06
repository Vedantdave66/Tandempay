---
type: community
cohesion: 0.67
members: 3
---

# Initial Schema Migration

**Cohesion:** 0.67 - moderately connected
**Members:** 3 nodes

## Members
- [[1a2b3c4d5e6f_initial_schema.py]] - code - backend/alembic/versions/1a2b3c4d5e6f_initial_schema.py
- [[downgrade()]] - code - backend/alembic/versions/1a2b3c4d5e6f_initial_schema.py
- [[upgrade()]] - code - backend/alembic/versions/1a2b3c4d5e6f_initial_schema.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Initial_Schema_Migration
SORT file.name ASC
```
