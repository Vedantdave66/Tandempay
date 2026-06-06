---
type: community
cohesion: 0.11
members: 56
---

# Auth & Notification Layer

**Cohesion:** 0.11 - loosely connected
**Members:** 56 nodes

## Members
- [[Admin-only endpoint checks the integrity of all password hashes in the database]] - rationale - backend/app/routes/auth.py
- [[Admin-only endpoint sends a password reset email to every user in the database.]] - rationale - backend/app/routes/auth.py
- [[AsyncSession_3]] - code - backend/app/routes/auth.py
- [[AsyncSession_19]] - code - backend/app/routes/users.py
- [[Enum]] - code
- [[HTTPAuthorizationCredentials]] - code - backend/app/routes/auth.py
- [[NotificationOut]] - code - backend/app/schemas.py
- [[Partial update of the current user's profile.      Only the following fields m]] - rationale - backend/app/routes/auth.py
- [[PasswordResetConfirm]] - code - backend/app/schemas.py
- [[PasswordResetConfirm_1]] - code - backend/app/routes/auth.py
- [[PasswordResetRequest]] - code - backend/app/schemas.py
- [[PasswordResetRequest_1]] - code - backend/app/routes/auth.py
- [[PasswordResetToken]] - code - backend/app/models.py
- [[PaymentMethod]] - code - backend/app/schemas.py
- [[RecurrenceFrequency_2]] - code - backend/app/schemas.py
- [[Request_1]] - code - backend/app/routes/auth.py
- [[Safe partial-update schema for PATCH apiauthme.      Only these three field]] - rationale - backend/app/schemas.py
- [[Sends a password reset email via Resend and returns the full API response.]] - rationale - backend/app/routes/auth.py
- [[SettlementStatus_1]] - code - backend/app/schemas.py
- [[Single-use, time-limited password reset token stored as a SHA-256 hash.      T]] - rationale - backend/app/models.py
- [[SplitType]] - code - backend/app/schemas.py
- [[TandemPay Pydantic v2 schemas.  REQUEST schemas enforce strict input constrain]] - rationale - backend/app/schemas.py
- [[Token]] - code - backend/app/schemas.py
- [[User_4]] - code - backend/app/routes/auth.py
- [[User_20]] - code - backend/app/routes/users.py
- [[UserLogin]] - code - backend/app/schemas.py
- [[UserLogin_1]] - code - backend/app/routes/auth.py
- [[UserOut]] - code - backend/app/schemas.py
- [[UserRegister]] - code - backend/app/schemas.py
- [[UserRegister_1]] - code - backend/app/routes/auth.py
- [[UserSearchResult]] - code - backend/app/routes/users.py
- [[UserUpdate]] - code - backend/app/schemas.py
- [[UserUpdate_1]] - code - backend/app/routes/auth.py
- [[Valid incoming status transitions from a client PUT request.]] - rationale - backend/app/schemas.py
- [[admin_diagnose_hashes()]] - code - backend/app/routes/auth.py
- [[admin_reset_all_passwords()]] - code - backend/app/routes/auth.py
- [[auth.py]] - code - backend/app/routes/auth.py
- [[bool]] - code - backend/app/routes/auth.py
- [[create_access_token()]] - code - backend/app/routes/auth.py
- [[forgot_password()]] - code - backend/app/routes/auth.py
- [[get_current_user()]] - code - backend/app/routes/auth.py
- [[hash_password()]] - code - backend/app/routes/auth.py
- [[login()]] - code - backend/app/routes/auth.py
- [[me()]] - code - backend/app/routes/auth.py
- [[no_duplicate_participants()]] - code - backend/app/schemas.py
- [[register()]] - code - backend/app/routes/auth.py
- [[reset_password()]] - code - backend/app/routes/auth.py
- [[schemas.py]] - code - backend/app/schemas.py
- [[search_users()]] - code - backend/app/routes/users.py
- [[send_reset_email_sync()]] - code - backend/app/routes/auth.py
- [[str_3]] - code
- [[str_5]] - code - backend/app/routes/auth.py
- [[str_17]] - code - backend/app/routes/users.py
- [[update_me()]] - code - backend/app/routes/auth.py
- [[users.py]] - code - backend/app/routes/users.py
- [[verify_password()]] - code - backend/app/routes/auth.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Auth__Notification_Layer
SORT file.name ASC
```

## Connections to other communities
- 27 edges to [[_COMMUNITY_Core Expense & Group Models]]
- 17 edges to [[_COMMUNITY_User & Subscription]]
- 8 edges to [[_COMMUNITY_Friend & Reminder System]]
- 7 edges to [[_COMMUNITY_Audit Logging]]
- 6 edges to [[_COMMUNITY_Payment & Banking Models]]
- 4 edges to [[_COMMUNITY_Recurring Expense Engine]]
- 4 edges to [[_COMMUNITY_Backend Notifications]]
- 3 edges to [[_COMMUNITY_PostgreSQL Concurrency Tests]]
- 3 edges to [[_COMMUNITY_Stripe Integration Tests]]
- 2 edges to [[_COMMUNITY_Idempotency & Ledger]]
- 2 edges to [[_COMMUNITY_Notifications & Payment Requests]]
- 1 edge to [[_COMMUNITY_Bank Linking Routes]]
- 1 edge to [[_COMMUNITY_Idempotency Concurrency Tests]]
- 1 edge to [[_COMMUNITY_DB Failure Injection Tests]]

## Top bridge nodes
- [[schemas.py]] - degree 41, connects to 6 communities
- [[create_access_token()]] - degree 13, connects to 5 communities
- [[UserOut]] - degree 30, connects to 3 communities
- [[PasswordResetToken]] - degree 16, connects to 2 communities
- [[str_3]] - degree 10, connects to 2 communities