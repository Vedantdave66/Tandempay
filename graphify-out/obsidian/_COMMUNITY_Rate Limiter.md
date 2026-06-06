---
type: community
cohesion: 1.00
members: 2
---

# Rate Limiter

**Cohesion:** 1.00 - tightly connected
**Members:** 2 nodes

## Members
- [[Shared rate-limiter instance.  Defined in its own module to avoid circular impor]] - rationale - backend/app/limiter.py
- [[limiter.py]] - code - backend/app/limiter.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Rate_Limiter
SORT file.name ASC
```
