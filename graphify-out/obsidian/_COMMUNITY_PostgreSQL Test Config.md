---
type: community
cohesion: 0.50
members: 4
---

# PostgreSQL Test Config

**Cohesion:** 0.50 - moderately connected
**Members:** 4 nodes

## Members
- [[Dependency override for get_db that uses the PG test database.]] - rationale - backend/tests/conftest.py
- [[Shared test configuration for PostgreSQL-based concurrency tests.  This conftest]] - rationale - backend/tests/conftest.py
- [[conftest.py]] - code - backend/tests/conftest.py
- [[pg_override_get_db()]] - code - backend/tests/conftest.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/PostgreSQL_Test_Config
SORT file.name ASC
```
