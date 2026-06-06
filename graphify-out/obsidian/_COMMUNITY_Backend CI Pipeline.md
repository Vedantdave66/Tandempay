---
type: community
cohesion: 0.22
members: 9
---

# Backend CI Pipeline

**Cohesion:** 0.22 - loosely connected
**Members:** 9 nodes

## Members
- [[Backend CI Workflow (GitHub Actions)]] - code - .github/workflows/backend-ci.yml
- [[Backend Test Dependencies (requirements-test.txt)]] - code - backend/requirements-test.txt
- [[Docker Compose Test PostgreSQL (port 5433)]] - code - backend/docker-compose.test.yml
- [[Pytest Test Runner (backend CI)]] - rationale - .github/workflows/backend-ci.yml
- [[SQLite (dev)  PostgreSQL (prod) Strategy]] - rationale - README.md
- [[SQLite Local Development Database]] - document - backend/DATABASE_GUIDE.md
- [[SQLite-backed CI Test Suite]] - rationale - .github/workflows/backend-ci.yml
- [[Stage 1 Sequential SQLite Tests]] - rationale - docs/system_evolution.md
- [[Stage 2 PostgreSQL Concurrency Tests (asyncio.gather)]] - rationale - docs/system_evolution.md

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Backend_CI_Pipeline
SORT file.name ASC
```

## Connections to other communities
- 2 edges to [[_COMMUNITY_Monetary Precision Fixes]]
- 1 edge to [[_COMMUNITY_Database Infrastructure]]
- 1 edge to [[_COMMUNITY_Security Audit & Pitch]]
- 1 edge to [[_COMMUNITY_Infrastructure & Monitoring]]

## Top bridge nodes
- [[Backend CI Workflow (GitHub Actions)]] - degree 4, connects to 1 community
- [[SQLite (dev)  PostgreSQL (prod) Strategy]] - degree 3, connects to 1 community
- [[Docker Compose Test PostgreSQL (port 5433)]] - degree 3, connects to 1 community
- [[Stage 1 Sequential SQLite Tests]] - degree 2, connects to 1 community
- [[Stage 2 PostgreSQL Concurrency Tests (asyncio.gather)]] - degree 2, connects to 1 community