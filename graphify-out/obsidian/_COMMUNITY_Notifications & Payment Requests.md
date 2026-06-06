---
type: community
cohesion: 0.24
members: 22
---

# Notifications & Payment Requests

**Cohesion:** 0.24 - loosely connected
**Members:** 22 nodes

## Members
- [[AsyncSession_15]] - code - backend/app/routes/requests.py
- [[Creates a direct peer-to-peer payment request within a group.]] - rationale - backend/app/routes/requests.py
- [[Helper to build PaymentRequestOut from a loaded PaymentRequest with relationship]] - rationale - backend/app/routes/requests.py
- [[In-app notification for group activity events.]] - rationale - backend/app/models.py
- [[Notification]] - code - backend/app/models.py
- [[Payment Request routes — create, list, and pay peer-to-peer requests.  Product]] - rationale - backend/app/routes/requests.py
- [[PaymentRequest]] - code - backend/app/models.py
- [[PaymentRequest_1]] - code - backend/app/routes/requests.py
- [[PaymentRequestCreate]] - code - backend/app/schemas.py
- [[PaymentRequestCreate_1]] - code - backend/app/routes/requests.py
- [[PaymentRequestOut]] - code - backend/app/schemas.py
- [[PaymentRequestOut_1]] - code - backend/app/routes/requests.py
- [[Request_3]] - code - backend/app/routes/requests.py
- [[Retrieves all requests in a group for the current user.]] - rationale - backend/app/routes/requests.py
- [[Tracks direct peer-to-peer money requests within groups.]] - rationale - backend/app/models.py
- [[User_16]] - code - backend/app/routes/requests.py
- [[_build_payment_request_out()]] - code - backend/app/routes/requests.py
- [[create_payment_request()]] - code - backend/app/routes/requests.py
- [[get_group_requests()]] - code - backend/app/routes/requests.py
- [[int_6]] - code - backend/app/routes/requests.py
- [[requests.py]] - code - backend/app/routes/requests.py
- [[str_13]] - code - backend/app/routes/requests.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Notifications__Payment_Requests
SORT file.name ASC
```

## Connections to other communities
- 35 edges to [[_COMMUNITY_Core Expense & Group Models]]
- 13 edges to [[_COMMUNITY_Idempotency & Ledger]]
- 10 edges to [[_COMMUNITY_Audit Logging]]
- 9 edges to [[_COMMUNITY_User & Subscription]]
- 7 edges to [[_COMMUNITY_Payment & Banking Models]]
- 6 edges to [[_COMMUNITY_Friend & Reminder System]]
- 4 edges to [[_COMMUNITY_Backend Notifications]]
- 4 edges to [[_COMMUNITY_Payment Concurrency Tests]]
- 2 edges to [[_COMMUNITY_PostgreSQL Concurrency Tests]]
- 2 edges to [[_COMMUNITY_Auth & Notification Layer]]

## Top bridge nodes
- [[Notification]] - degree 53, connects to 6 communities
- [[PaymentRequest]] - degree 20, connects to 4 communities
- [[PaymentRequest_1]] - degree 10, connects to 3 communities
- [[str_13]] - degree 10, connects to 3 communities
- [[AsyncSession_15]] - degree 10, connects to 3 communities