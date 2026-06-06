---
type: community
cohesion: 0.40
members: 6
---

# Infrastructure & Monitoring

**Cohesion:** 0.40 - moderately connected
**Members:** 6 nodes

## Members
- [[APScheduler Background Jobs]] - rationale - README.md
- [[Backend API Vercel Layer Requirements]] - code - backend/api/requirements.txt
- [[Backend Production Dependencies (requirements.txt)]] - code - backend/requirements.txt
- [[Plaid Bank Linking Integration]] - rationale - README.md
- [[Reconciliation Service (Safety Net)]] - rationale - docs/system_evolution.md
- [[Sentry Error Monitoring (all 3 layers)]] - rationale - docs/SESSION_HANDOFF.md

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Infrastructure__Monitoring
SORT file.name ASC
```

## Connections to other communities
- 3 edges to [[_COMMUNITY_Security Audit & Pitch]]
- 1 edge to [[_COMMUNITY_Database Infrastructure]]
- 1 edge to [[_COMMUNITY_Backend CI Pipeline]]
- 1 edge to [[_COMMUNITY_Product Strategy]]
- 1 edge to [[_COMMUNITY_Monetary Precision Fixes]]

## Top bridge nodes
- [[Backend Production Dependencies (requirements.txt)]] - degree 7, connects to 3 communities
- [[APScheduler Background Jobs]] - degree 3, connects to 1 community
- [[Sentry Error Monitoring (all 3 layers)]] - degree 3, connects to 1 community
- [[Plaid Bank Linking Integration]] - degree 2, connects to 1 community
- [[Reconciliation Service (Safety Net)]] - degree 2, connects to 1 community