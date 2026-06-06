---
type: community
cohesion: 0.09
members: 44
---

# Friend & Reminder System

**Cohesion:** 0.09 - loosely connected
**Members:** 44 nodes

## Members
- [[Accept a friend request and notify the sender.]] - rationale - backend/app/routes/friends.py
- [[AsyncSession_7]] - code - backend/app/routes/friends.py
- [[AsyncSession_14]] - code - backend/app/routes/reminders.py
- [[Cancel (delete) a reminder. Only the payer can do this.]] - rationale - backend/app/routes/reminders.py
- [[Core scheduler tick. Called every ~60 minutes by APScheduler.     Finds all due]] - rationale - backend/app/services/reminder_scheduler.py
- [[Create or update a recurring reminder for an expense.]] - rationale - backend/app/routes/reminders.py
- [[Decline a friend request.]] - rationale - backend/app/routes/friends.py
- [[Expense_1]] - code - backend/app/routes/reminders.py
- [[Expense Reminder routes — create, view, and cancel recurring reminders.  Only th]] - rationale - backend/app/routes/reminders.py
- [[ExpenseReminder]] - code - backend/app/models.py
- [[ExpenseReminder_1]] - code - backend/app/services/reminder_scheduler.py
- [[FriendRequest]] - code - backend/app/models.py
- [[FriendRequestCreate]] - code - backend/app/schemas.py
- [[FriendRequestCreate_1]] - code - backend/app/routes/friends.py
- [[FriendRequestOut]] - code - backend/app/schemas.py
- [[Get all pending sent and received requests.]] - rationale - backend/app/routes/friends.py
- [[Get the current reminder for an expense (any group member can view).]] - rationale - backend/app/routes/reminders.py
- [[Process a single due reminder create notifications and advance the schedule.]] - rationale - backend/app/services/reminder_scheduler.py
- [[Recurring reminder for an expense. Only the payer can create one.]] - rationale - backend/app/models.py
- [[Reminder Scheduler — Background job that fires expense reminder notifications.]] - rationale - backend/app/services/reminder_scheduler.py
- [[ReminderCreate]] - code - backend/app/schemas.py
- [[ReminderCreate_1]] - code - backend/app/routes/reminders.py
- [[ReminderOut]] - code - backend/app/schemas.py
- [[Send a friend request to an email address.]] - rationale - backend/app/routes/friends.py
- [[Tracks friend requests sent via email.]] - rationale - backend/app/models.py
- [[User_8]] - code - backend/app/routes/friends.py
- [[User_15]] - code - backend/app/routes/reminders.py
- [[Verify the user is a group member AND the payer of this expense.]] - rationale - backend/app/routes/reminders.py
- [[_fire_reminder()]] - code - backend/app/services/reminder_scheduler.py
- [[_verify_payer()]] - code - backend/app/routes/reminders.py
- [[accept_request()]] - code - backend/app/routes/friends.py
- [[cancel_reminder()]] - code - backend/app/routes/reminders.py
- [[create_reminder()]] - code - backend/app/routes/reminders.py
- [[datetime_1]] - code - backend/app/services/reminder_scheduler.py
- [[decline_request()]] - code - backend/app/routes/friends.py
- [[friends.py]] - code - backend/app/routes/friends.py
- [[get_pending_requests()]] - code - backend/app/routes/friends.py
- [[get_reminder()]] - code - backend/app/routes/reminders.py
- [[process_due_reminders()]] - code - backend/app/services/reminder_scheduler.py
- [[reminder_scheduler.py]] - code - backend/app/services/reminder_scheduler.py
- [[reminders.py]] - code - backend/app/routes/reminders.py
- [[send_friend_request()]] - code - backend/app/routes/friends.py
- [[str_8]] - code - backend/app/routes/friends.py
- [[str_12]] - code - backend/app/routes/reminders.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Friend__Reminder_System
SORT file.name ASC
```

## Connections to other communities
- 29 edges to [[_COMMUNITY_Core Expense & Group Models]]
- 13 edges to [[_COMMUNITY_User & Subscription]]
- 8 edges to [[_COMMUNITY_Auth & Notification Layer]]
- 6 edges to [[_COMMUNITY_Notifications & Payment Requests]]
- 2 edges to [[_COMMUNITY_Idempotency & Ledger]]
- 2 edges to [[_COMMUNITY_Payment & Banking Models]]

## Top bridge nodes
- [[User_8]] - degree 12, connects to 4 communities
- [[AsyncSession_7]] - degree 12, connects to 4 communities
- [[str_8]] - degree 10, connects to 4 communities
- [[FriendRequestCreate_1]] - degree 9, connects to 4 communities
- [[FriendRequest]] - degree 10, connects to 3 communities