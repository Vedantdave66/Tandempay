---
source_file: "backend/app/routes/auth.py"
type: "code"
community: "Auth & Notification Layer"
location: "L32"
tags:
  - graphify/code
  - graphify/INFERRED
  - community/Auth__Notification_Layer
---

# str

## Connections
- [[PasswordResetConfirm]] - `uses` [INFERRED]
- [[PasswordResetRequest]] - `uses` [INFERRED]
- [[PasswordResetToken]] - `uses` [INFERRED]
- [[Token]] - `uses` [INFERRED]
- [[User_1]] - `uses` [INFERRED]
- [[UserLogin]] - `uses` [INFERRED]
- [[UserOut]] - `uses` [INFERRED]
- [[UserRegister]] - `uses` [INFERRED]
- [[UserUpdate]] - `uses` [INFERRED]
- [[admin_diagnose_hashes()]] - `references` [EXTRACTED]
- [[admin_reset_all_passwords()]] - `references` [EXTRACTED]
- [[create_access_token()]] - `references` [EXTRACTED]
- [[hash_password()]] - `references` [EXTRACTED]
- [[send_reset_email_sync()]] - `references` [EXTRACTED]
- [[verify_password()]] - `references` [EXTRACTED]

#graphify/code #graphify/INFERRED #community/Auth__Notification_Layer