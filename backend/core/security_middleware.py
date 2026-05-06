import time
from collections import defaultdict, deque
from fastapi import Request, HTTPException
from backend.core.config import settings

request_log: dict[str, deque] = defaultdict(deque)


def verify_token(request: Request):
    if request.url.path in {"/healthz", "/readyz"}:
        return
    token = request.headers.get("x-divya-token", "")
    if token != settings.admin_token:
        raise HTTPException(status_code=401, detail="Invalid token")


def enforce_rate_limit(request: Request):
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    q = request_log[ip]
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= settings.rate_limit_per_minute:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    q.append(now)
