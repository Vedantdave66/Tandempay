---
type: community
cohesion: 0.67
members: 3
---

# Subscription Schema Migration

**Cohesion:** 0.67 - moderately connected
**Members:** 3 nodes

## Members
- [[20260522_add_subscription_fields.py]] - code - backend/alembic/versions/20260522_add_subscription_fields.py
- [[downgrade()_3]] - code - backend/alembic/versions/20260522_add_subscription_fields.py
- [[upgrade()_3]] - code - backend/alembic/versions/20260522_add_subscription_fields.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Subscription_Schema_Migration
SORT file.name ASC
```
