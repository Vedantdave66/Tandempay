"""
Shared rate-limiter instance.

Defined in its own module to avoid circular imports between main.py
(which sets up the FastAPI app) and routes (which need the limiter).

Usage in routes:
    from app.limiter import limiter

Usage in main.py:
    from app.limiter import limiter
    from slowapi import _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
