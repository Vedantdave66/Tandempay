---
source_file: "backend/app/routes/auth.py"
type: "code"
community: "Auth & Notification Layer"
location: "L324"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Auth__Notification_Layer
---

# admin_reset_all_passwords()

## Connections
- [[Admin-only endpoint sends a password reset email to every user in the database.]] - `rationale_for` [EXTRACTED]
- [[AsyncSession_3]] - `references` [EXTRACTED]
- [[PasswordResetToken]] - `calls` [INFERRED]
- [[auth.py]] - `contains` [EXTRACTED]
- [[str_5]] - `references` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Auth__Notification_Layer