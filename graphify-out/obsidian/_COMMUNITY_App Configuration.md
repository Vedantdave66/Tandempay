---
type: community
cohesion: 0.10
members: 24
---

# App Configuration

**Cohesion:** 0.10 - loosely connected
**Members:** 24 nodes

## Members
- [[.format()]] - code - backend/app/main.py
- [[BaseSettings]] - code
- [[Config]] - code - backend/app/config.py
- [[Drop events whose exception message or log message contains sensitive data.]] - rationale - backend/app/main.py
- [[Emits one JSON object per log record on a single line.      Fields         t]] - rationale - backend/app/main.py
- [[Exception]] - code - backend/app/main.py
- [[JsonFormatter]] - code - backend/app/main.py
- [[LogRecord]] - code - backend/app/main.py
- [[Replace the root logger's handlers with a single StreamHandler that uses     Js]] - rationale - backend/app/main.py
- [[Request]] - code - backend/app/main.py
- [[RequestValidationError]] - code - backend/app/main.py
- [[Settings]] - code - backend/app/config.py
- [[_before_send()]] - code - backend/app/main.py
- [[_configure_logging()]] - code - backend/app/main.py
- [[_log_unhandled_exception()]] - code - backend/app/main.py
- [[_request_id_middleware()]] - code - backend/app/main.py
- [[_validation_error_handler()]] - code - backend/app/main.py
- [[config.py]] - code - backend/app/config.py
- [[get_settings()]] - code - backend/app/config.py
- [[health()]] - code - backend/app/main.py
- [[lifespan()]] - code - backend/app/main.py
- [[main.py]] - code - backend/app/main.py
- [[root()]] - code - backend/app/main.py
- [[str_2]] - code - backend/app/main.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/App_Configuration
SORT file.name ASC
```

## Connections to other communities
- 6 edges to [[_COMMUNITY_Idempotency & Ledger]]
- 2 edges to [[_COMMUNITY_User & Subscription]]
- 1 edge to [[_COMMUNITY_Audit Logging]]

## Top bridge nodes
- [[main.py]] - degree 11, connects to 2 communities
- [[JsonFormatter]] - degree 5, connects to 1 community
- [[Request]] - degree 4, connects to 1 community
- [[LogRecord]] - degree 2, connects to 1 community
- [[str_2]] - degree 2, connects to 1 community