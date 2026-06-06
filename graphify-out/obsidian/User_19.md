---
source_file: "backend/app/routes/subscription_routes.py"
type: "code"
community: "Subscription Routes"
location: "L20"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Subscription_Routes
---

# User

## Connections
- [[User_1]] - `uses` [INFERRED]
- [[_get_or_create_stripe_customer()]] - `references` [EXTRACTED]
- [[create_checkout_session()]] - `references` [EXTRACTED]
- [[create_portal_session()]] - `references` [EXTRACTED]
- [[get_subscription_status()]] - `references` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Subscription_Routes