from __future__ import annotations

import logging
import time
from typing import Optional

from starlette.types import ASGIApp, Scope, Receive, Send, Message

from .request_id import get_request_id


def init_logging(log_level: str) -> None:
    level = getattr(logging, (log_level or "INFO").upper(), logging.INFO)
    logging.basicConfig(level=level, format="ts=%(asctime)s level=%(levelname)s msg=%(message)s")


class RequestLogMiddleware:
    """
    ASGI middleware (NOT BaseHTTPMiddleware)

    Ensures at least one log line per request:
      request_id, method, path, status_code, latency_ms, optional error_code (X-Error-Code)
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start = time.perf_counter()
        status_code: int = 500
        error_code: Optional[str] = None

        method = scope.get("method", "?")
        path = scope.get("path", "?")

        async def send_wrapper(message: Message) -> None:
            nonlocal status_code, error_code
            if message["type"] == "http.response.start":
                status_code = int(message.get("status", 500) or 500)
                for k, v in message.get("headers", []):
                    if k.lower() == b"x-error-code":
                        error_code = v.decode("utf-8", errors="ignore")
                        break
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            latency_ms = int((time.perf_counter() - start) * 1000)
            rid = get_request_id()
            logging.getLogger("app.request").info(
                "request_id=%s method=%s path=%s status_code=%s latency_ms=%s%s",
                rid,
                method,
                path,
                status_code,
                latency_ms,
                (f" error_code={error_code}" if error_code else ""),
            )
