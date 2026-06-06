---
type: community
cohesion: 0.40
members: 5
---

# Database Migrations

**Cohesion:** 0.40 - moderately connected
**Members:** 5 nodes

## Members
- [[Apply pending migrations to the database.      Uses create_engine() directly (no]] - rationale - backend/alembic/env.py
- [[Generate SQL without connecting to the database.      Useful for reviewing what]] - rationale - backend/alembic/env.py
- [[env.py]] - code - backend/alembic/env.py
- [[run_migrations_offline()]] - code - backend/alembic/env.py
- [[run_migrations_online()]] - code - backend/alembic/env.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Database_Migrations
SORT file.name ASC
```
