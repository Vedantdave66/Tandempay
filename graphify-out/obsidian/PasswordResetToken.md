---
source_file: "backend/app/models.py"
type: "code"
community: "Auth & Notification Layer"
location: "L352"
tags:
  - graphify/code
  - graphify/INFERRED
  - community/Auth__Notification_Layer
---

# PasswordResetToken

## Connections
- [[AsyncSession_3]] - `uses` [INFERRED]
- [[Base]] - `uses` [INFERRED]
- [[HTTPAuthorizationCredentials]] - `uses` [INFERRED]
- [[PasswordResetConfirm_1]] - `uses` [INFERRED]
- [[PasswordResetRequest_1]] - `uses` [INFERRED]
- [[Request_1]] - `uses` [INFERRED]
- [[Single-use, time-limited password reset token stored as a SHA-256 hash.      T]] - `rationale_for` [EXTRACTED]
- [[User_4]] - `uses` [INFERRED]
- [[UserLogin_1]] - `uses` [INFERRED]
- [[UserRegister_1]] - `uses` [INFERRED]
- [[UserUpdate_1]] - `uses` [INFERRED]
- [[admin_reset_all_passwords()]] - `calls` [INFERRED]
- [[bool]] - `uses` [INFERRED]
- [[forgot_password()]] - `calls` [INFERRED]
- [[models.py]] - `contains` [EXTRACTED]
- [[str_5]] - `uses` [INFERRED]

#graphify/code #graphify/INFERRED #community/Auth__Notification_Layer