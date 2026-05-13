"""
Shared contextvars for the TandemPay request lifecycle.

Defined in a standalone module so both the logging formatter and the
request-ID middleware can import from here without circular-import risk.
"""

from contextvars import ContextVar

# Set by RequestIdMiddleware at the top of every ASGI request.
# Value is a UUID4 string, or None when accessed outside a request context
# (e.g. during app startup or background scheduler tasks).
request_id_var: ContextVar[str | None] = ContextVar("request_id_var", default=None)
