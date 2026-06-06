---
type: community
cohesion: 0.20
members: 11
---

# Security Audit Findings

**Cohesion:** 0.20 - loosely connected
**Members:** 11 nodes

## Members
- [[@idempotent Decorator (SHA-256 body hashing)]] - rationale - README.md
- [[Adversarial Security Audit Document]] - document - docs/adversarial_audit.md
- [[Idempotency Infrastructure Redesign]] - rationale - docs/system_evolution.md
- [[IdempotencyKey ORM Model]] - rationale - README.md
- [[SettlementRecord ORM Model]] - rationale - README.md
- [[StripeEvent ORM Model (Webhook Idempotency)]] - rationale - README.md
- [[TC-11 No Orphaned Pending Transaction Cleanup]] - rationale - docs/adversarial_audit.md
- [[TC-1 Idempotency Race Condition (Double Spend)]] - rationale - docs/adversarial_audit.md
- [[TC-5 Settlement Record Has No Row-Level Locking]] - rationale - docs/adversarial_audit.md
- [[TC-7 Admin Endpoints Unauthenticated]] - rationale - docs/adversarial_audit.md
- [[TC-8 Stripe Webhook No Idempotency]] - rationale - docs/adversarial_audit.md

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Security_Audit_Findings
SORT file.name ASC
```

## Connections to other communities
- 5 edges to [[_COMMUNITY_Security Audit & Pitch]]
- 3 edges to [[_COMMUNITY_Monetary Precision Fixes]]
- 1 edge to [[_COMMUNITY_Migration & Refactor Docs]]

## Top bridge nodes
- [[Adversarial Security Audit Document]] - degree 9, connects to 3 communities
- [[@idempotent Decorator (SHA-256 body hashing)]] - degree 4, connects to 1 community
- [[Idempotency Infrastructure Redesign]] - degree 3, connects to 1 community
- [[IdempotencyKey ORM Model]] - degree 2, connects to 1 community
- [[StripeEvent ORM Model (Webhook Idempotency)]] - degree 2, connects to 1 community