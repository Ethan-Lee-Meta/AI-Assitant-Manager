from __future__ import annotations

import contextvars
import re
import uuid
from typing import Callable, Iterable, List, Optional, Tuple

Header = Tuple[bytes, bytes]

_request_id_var: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("request_id", default=None)

_ALLOWED_RE = re.compile(r"^[A-Za-z0-9\-_.]{1,128}$")


def get_request_id() -> Optional[str]:
    return _request_id_var.get()


def set_request_id(value: str) -> None:
    _request_id_var.set(value)


def new_request_id() -> str:
    return str(uuid.uuid4())


def _is_valid_request_id(v: str) -> bool:
    if not v:
        return False
    v = v.strip()
    if not (1 <= len(v) <= 128):
        return False
    return _ALLOWED_RE.match(v) is not None


def _get_header(scope_headers: Iterable[Header], name: bytes) -> Optional[str]:
    name_l = name.lower()
    for k, v in scope_headers:
        if k.lower() == name_l:
            try:
                return v.decode("utf-8", errors="ignore")
            except Exception:
                return None
    return None


def _set_or_replace_header(headers: List[Header], name: bytes, value: str) -> List[Header]:
    """
    IMPORTANT: do NOT drop/overwrite other headers (e.g. CORS headers).
    Only replace the specific header name case-insensitively.
    """
    name_l = name.lower()
    out: List[Header] = []
    for k, v in headers:
        if k.lower() != name_l:
            out.append((k, v))
    out.append((name, value.encode("utf-8")))
    return out


class RequestIdMiddleware:
    """
    ASGI middleware that:
    - reads X-Request-Id from incoming request (if valid), else generates a new one
    - stores it in contextvar for logging/error envelope
    - ensures X-Request-Id is present in EVERY response
    - NEVER overwrites other response headers (so CORS headers are preserved)
    """

    def __init__(self, app: Callable):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        incoming = _get_header(scope.get("headers", []), b"x-request-id")
        rid = incoming.strip() if isinstance(incoming, str) else ""
        if not _is_valid_request_id(rid):
            rid = new_request_id()

        # --- M00-HOTFIX-REQID-STATE persist validated ---
        try:
            st = scope.get('state')
            if st is None:
                scope['state'] = {}
                st = scope['state']
            if isinstance(st, dict):
                st['request_id'] = rid
            else:
                setattr(st, 'request_id', rid)
        except Exception:
            pass
        # --- M00-HOTFIX-REQID-STATE persist validated end ---

        token = _request_id_var.set(rid)

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                # --- M00-HOTFIX-REQID-STATE response: validated state rid ---
                state_rid = None
                try:
                    _st = scope.get('state')
                    if isinstance(_st, dict):
                        state_rid = _st.get('request_id')
                    else:
                        state_rid = getattr(_st, 'request_id', None)
                except Exception:
                    state_rid = None
                use_state = isinstance(state_rid, str) and _is_valid_request_id(state_rid)
                _rid_for_response = state_rid if use_state else rid
                try:
                    _st = scope.get('state')
                    if _st is None:
                        scope['state'] = {}
                        _st = scope['state']
                    if isinstance(_st, dict):
                        _st['request_id'] = _rid_for_response
                    else:
                        setattr(_st, 'request_id', _rid_for_response)
                except Exception:
                    pass
                headers = _set_or_replace_header(headers, b"x-request-id", _rid_for_response)
                # --- M00-HOTFIX-REQID-STATE response end ---
                message["headers"] = headers
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            _request_id_var.reset(token)
