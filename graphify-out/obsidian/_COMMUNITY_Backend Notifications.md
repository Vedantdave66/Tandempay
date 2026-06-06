---
type: community
cohesion: 0.23
members: 13
---

# Backend Notifications

**Cohesion:** 0.23 - loosely connected
**Members:** 13 nodes

## Members
- [[AsyncSession_10]] - code - backend/app/routes/notifications.py
- [[Get the count of unread notifications.]] - rationale - backend/app/routes/notifications.py
- [[List notifications for the current user, newest first.]] - rationale - backend/app/routes/notifications.py
- [[Mark a single notification as read.]] - rationale - backend/app/routes/notifications.py
- [[Mark all notifications as read for the current user.]] - rationale - backend/app/routes/notifications.py
- [[User_11]] - code - backend/app/routes/notifications.py
- [[int_4]] - code - backend/app/routes/notifications.py
- [[list_notifications()]] - code - backend/app/routes/notifications.py
- [[mark_all_read()]] - code - backend/app/routes/notifications.py
- [[mark_read()]] - code - backend/app/routes/notifications.py
- [[notifications.py]] - code - backend/app/routes/notifications.py
- [[str_10]] - code - backend/app/routes/notifications.py
- [[unread_count()]] - code - backend/app/routes/notifications.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Backend_Notifications
SORT file.name ASC
```

## Connections to other communities
- 5 edges to [[_COMMUNITY_User & Subscription]]
- 4 edges to [[_COMMUNITY_Notifications & Payment Requests]]
- 4 edges to [[_COMMUNITY_Core Expense & Group Models]]
- 4 edges to [[_COMMUNITY_Auth & Notification Layer]]

## Top bridge nodes
- [[User_11]] - degree 8, connects to 4 communities
- [[AsyncSession_10]] - degree 8, connects to 4 communities
- [[int_4]] - degree 5, connects to 4 communities
- [[str_10]] - degree 5, connects to 4 communities
- [[notifications.py]] - degree 5, connects to 1 community