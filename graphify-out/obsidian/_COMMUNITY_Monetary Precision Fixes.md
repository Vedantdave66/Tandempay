---
type: community
cohesion: 0.20
members: 11
---

# Monetary Precision Fixes

**Cohesion:** 0.20 - loosely connected
**Members:** 11 nodes

## Members
- [[9-Step Payment Protocol (TOCTOU Fix)]] - rationale - docs/system_evolution.md
- [[Conservation of Money Invariant]] - rationale - docs/system_evolution.md
- [[Float to Numeric(12,2) Decimal Precision Upgrade]] - rationale - docs/system_evolution.md
- [[Flush vs Commit Pattern]] - rationale - docs/system_evolution.md
- [[Numeric(12,2) Monetary Column Convention]] - rationale - README.md
- [[Pessimistic Row-Level Locking (Sorted UUID Order)]] - rationale - README.md
- [[Sorted-Order Row Lock Strategy (Deadlock Prevention)]] - rationale - docs/system_evolution.md
- [[Stage 3 Failure Injection Tests]] - rationale - docs/system_evolution.md
- [[System Evolution Document]] - document - docs/system_evolution.md
- [[TC-6 PaymentRequest TOCTOU (Status Checked Before Lock)]] - rationale - docs/adversarial_audit.md
- [[TC-9 Float Used for Money (Rounding Drift)]] - rationale - docs/adversarial_audit.md

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Monetary_Precision_Fixes
SORT file.name ASC
```

## Connections to other communities
- 3 edges to [[_COMMUNITY_Security Audit & Pitch]]
- 3 edges to [[_COMMUNITY_Security Audit Findings]]
- 2 edges to [[_COMMUNITY_Backend CI Pipeline]]
- 1 edge to [[_COMMUNITY_Product Strategy]]
- 1 edge to [[_COMMUNITY_Infrastructure & Monitoring]]

## Top bridge nodes
- [[System Evolution Document]] - degree 12, connects to 5 communities
- [[TC-9 Float Used for Money (Rounding Drift)]] - degree 3, connects to 1 community
- [[Numeric(12,2) Monetary Column Convention]] - degree 3, connects to 1 community
- [[Pessimistic Row-Level Locking (Sorted UUID Order)]] - degree 2, connects to 1 community
- [[TC-6 PaymentRequest TOCTOU (Status Checked Before Lock)]] - degree 2, connects to 1 community