---
source_file: "backend/app/routes/auth.py"
type: "code"
community: "Auth & Notification Layer"
location: "L44"
tags:
  - graphify/code
  - graphify/INFERRED
  - community/Auth__Notification_Layer
---

# create_access_token()

## Connections
- [[auth.py]] - `contains` [EXTRACTED]
- [[drain_user()]] - `calls` [INFERRED]
- [[login()]] - `calls` [EXTRACTED]
- [[payment_test_data()]] - `calls` [INFERRED]
- [[register()]] - `calls` [EXTRACTED]
- [[str_5]] - `references` [EXTRACTED]
- [[test_a_retry_same_payment()]] - `calls` [INFERRED]
- [[test_b_missing_idempotency_key()]] - `calls` [INFERRED]
- [[test_c_simulated_network_retry()]] - `calls` [INFERRED]
- [[test_data()]] - `calls` [INFERRED]
- [[test_user()]] - `calls` [INFERRED]
- [[test_user()_1]] - `calls` [INFERRED]
- [[test_user()_2]] - `calls` [INFERRED]

#graphify/code #graphify/INFERRED #community/Auth__Notification_Layer