---
source_file: "backend/app/routes/auth.py"
type: "code"
community: "Auth & Notification Layer"
location: "L51"
tags:
  - graphify/code
  - graphify/INFERRED
  - community/Auth__Notification_Layer
---

# AsyncSession

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
- [[forgot_password()]] - `references` [EXTRACTED]
- [[get_current_user()]] - `references` [EXTRACTED]
- [[login()]] - `references` [EXTRACTED]
- [[register()]] - `references` [EXTRACTED]
- [[reset_password()]] - `references` [EXTRACTED]
- [[update_me()]] - `references` [EXTRACTED]

#graphify/code #graphify/INFERRED #community/Auth__Notification_Layer