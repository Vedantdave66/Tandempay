---
type: community
cohesion: 1.00
members: 2
---

# Stripe Verify Scripts

**Cohesion:** 1.00 - tightly connected
**Members:** 2 nodes

## Members
- [[One-time script to provide test verification data for sandbox Stripe Connect acc]] - rationale - backend/verify_test_accounts.py
- [[verify_test_accounts.py]] - code - backend/verify_test_accounts.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Stripe_Verify_Scripts
SORT file.name ASC
```
