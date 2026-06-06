---
source_file: "backend/tests/test_payment_concurrency.py"
type: "code"
community: "Payment Concurrency Tests"
location: "L194"
tags:
  - graphify/code
  - graphify/INFERRED
  - community/Payment_Concurrency_Tests
---

# AsyncClient

## Connections
- [[Base]] - `uses` [INFERRED]
- [[Group]] - `uses` [INFERRED]
- [[GroupMember]] - `uses` [INFERRED]
- [[PaymentRequest]] - `uses` [INFERRED]
- [[User_1]] - `uses` [INFERRED]
- [[WalletTransaction]] - `uses` [INFERRED]
- [[client()_3]] - `calls` [EXTRACTED]
- [[test_a_two_requests_same_payment()]] - `references` [EXTRACTED]
- [[test_b_five_concurrent_attempts()]] - `references` [EXTRACTED]
- [[test_c_sequential_retry_after_success()]] - `references` [EXTRACTED]

#graphify/code #graphify/INFERRED #community/Payment_Concurrency_Tests