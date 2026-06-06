---
type: community
cohesion: 0.40
members: 5
---

# Database Infrastructure

**Cohesion:** 0.40 - moderately connected
**Members:** 5 nodes

## Members
- [[Docker Compose PostgreSQL Service]] - code - docker-compose.yml
- [[FastAPI Backend]] - rationale - README.md
- [[PostgreSQL Production Database (Render)]] - document - backend/DATABASE_GUIDE.md
- [[Python Runtime Version (python3.12)]] - code - backend/runtime.txt
- [[Supabase PostgreSQL via Transaction Pooler]] - rationale - docs/SESSION_HANDOFF.md

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Database_Infrastructure
SORT file.name ASC
```

## Connections to other communities
- 2 edges to [[_COMMUNITY_Security Audit & Pitch]]
- 1 edge to [[_COMMUNITY_Backend CI Pipeline]]
- 1 edge to [[_COMMUNITY_Infrastructure & Monitoring]]
- 1 edge to [[_COMMUNITY_Product Strategy]]

## Top bridge nodes
- [[FastAPI Backend]] - degree 4, connects to 2 communities
- [[Docker Compose PostgreSQL Service]] - degree 3, connects to 2 communities
- [[Supabase PostgreSQL via Transaction Pooler]] - degree 2, connects to 1 community