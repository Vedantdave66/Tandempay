---
type: community
cohesion: 0.40
members: 5
---

# Migration & Refactor Docs

**Cohesion:** 0.40 - moderately connected
**Members:** 5 nodes

## Members
- [[Alembic Migration Partial Implementation]] - rationale - docs/BACKEND_AUDIT.md
- [[Alembic Schema Migration Tool]] - rationale - backend/DATABASE_GUIDE.md
- [[Backend Audit & Cleanup Plan Document]] - document - docs/BACKEND_AUDIT.md
- [[SQLAlchemy 2.0 Async ORM]] - rationale - README.md
- [[splitease → tandempay Rename Sweep]] - rationale - docs/BACKEND_AUDIT.md

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Migration__Refactor_Docs
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_Security Audit & Pitch]]
- 1 edge to [[_COMMUNITY_Security Audit Findings]]
- 1 edge to [[_COMMUNITY_Product Strategy]]

## Top bridge nodes
- [[Backend Audit & Cleanup Plan Document]] - degree 4, connects to 2 communities
- [[SQLAlchemy 2.0 Async ORM]] - degree 2, connects to 1 community