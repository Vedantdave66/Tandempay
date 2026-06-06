---
source_file: "backend/app/routes/auth.py"
type: "code"
community: "Auth & Notification Layer"
location: "L231"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Auth__Notification_Layer
---

# forgot_password()

## Connections
- [[AsyncSession_3]] - `references` [EXTRACTED]
- [[PasswordResetRequest_1]] - `references` [EXTRACTED]
- [[PasswordResetToken]] - `calls` [INFERRED]
- [[Request_1]] - `references` [EXTRACTED]
- [[auth.py]] - `contains` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Auth__Notification_Layer