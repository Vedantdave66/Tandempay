---
source_file: "backend/app/idempotency.py"
type: "rationale"
community: "Idempotency Infrastructure"
location: "L67"
tags:
  - graphify/rationale
  - graphify/EXTRACTED
  - community/Idempotency_Infrastructure
---

# Compute a deterministic SHA-256 hash of the raw request body.

## Connections
- [[_compute_request_hash()]] - `rationale_for` [EXTRACTED]

#graphify/rationale #graphify/EXTRACTED #community/Idempotency_Infrastructure