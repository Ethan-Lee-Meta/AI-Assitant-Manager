from __future__ import annotations

import re
import uuid
from contextvars import ContextVar
from typing import Optional, Callable, Awaitable, Any

from starlette.types import ASGIApp, Scope, Receive, Send, Message

_REQUEST_ID: ContextVar[Optional[str]] = ContextVar("request_id", default=None)

_ALLOWED_RE = re.compile(r"^[A-Za-z0-9\-_.]{1,128}$")


def get_request_id() -> Optional[str]:
    return _REQUEST_ID.get()


def set_request_id(value: str) -> None:
    _REQUEST_ID.set(value)


def new_request_id() -> str:
    return str(uuid.uuid4())


def _is_valid_request_id(value: str) -> bool:
    if not value:
        return False
    if len(value) > 128:
        return False
    return _ALLOWED_RE.match(value) is not None


class RequestIdMiddleware:
    """
    ASGI middleware (NOT BaseHTTPMiddleware)

    - reads X-Request-Id; validates; generates if invalid/missing
    - stores in contextvar
    - always writes X-Request-Id into response headers (overwrite any existing)
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        inbound: Optional[str] = None
        for k, v in scope.get("headers", []):
            if k.lower() == b"x-request-id":
                inbound = v.decode("utf-8", errors="ignore")
                break

        rid = inbound if inbound and _is_valid_request_id(inbound) else new_request_id()
        token = _REQUEST_ID.set(rid)

        async def send_wrapper(message: Message) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                # overwrite X-Request-Id to guarantee consistency
                headers = [(k, v) for (k, v) in headers if k.lower() != b"x-request-id"]
                headers.append((b"x-request-id", rid.encode("utf-8")))
                message["headers"] = headers
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            _REQUEST_ID.reset(token)
