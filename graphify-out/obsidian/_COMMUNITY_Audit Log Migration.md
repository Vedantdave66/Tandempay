---
type: community
cohesion: 0.67
members: 3
---

# Audit Log Migration

**Cohesion:** 0.67 - moderately connected
**Members:** 3 nodes

## Members
- [[20260513_add_audit_logs.py]] - code - backend/alembic/versions/20260513_add_audit_logs.py
- [[downgrade()_1]] - code - backend/alembic/versions/20260513_add_audit_logs.py
- [[upgrade()_1]] - code - backend/alembic/versions/20260513_add_audit_logs.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Audit_Log_Migration
SORT file.name ASC
```
