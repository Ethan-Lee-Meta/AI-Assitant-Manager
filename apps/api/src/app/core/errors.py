from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.types import ASGIApp, Scope, Receive, Send

from .request_id import get_request_id, new_request_id, set_request_id


class ErrorBody(BaseModel):
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None


class ErrorEnvelope(BaseModel):
    error: ErrorBody
    request_id: str


class AppError(Exception):
    def __init__(
        self,
        *,
        code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        status_code: int = 400,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details
        self.status_code = status_code


def _ensure_request_id() -> str:
    rid = get_request_id()
    if rid:
        return rid
    rid = new_request_id()
    set_request_id(rid)
    return rid


def error_response(
    *,
    status_code: int,
    code: str,
    message: str,
    details: Optional[Dict[str, Any]] = None,
) -> JSONResponse:
    rid = _ensure_request_id()
    payload = ErrorEnvelope(
        error=ErrorBody(code=code, message=message, details=details),
        request_id=rid,
    ).model_dump()

    return JSONResponse(
        status_code=status_code,
        content=payload,
        headers={
            "X-Request-Id": rid,   # body/header must match
            "X-Error-Code": code,  # for logging middleware
        },
    )


def _map_http_exception(exc: StarletteHTTPException) -> tuple[int, str, str, Optional[Dict[str, Any]]]:
    status = int(getattr(exc, "status_code", 500) or 500)

    if status == 404:
        code, message = "NOT_FOUND", "Not Found"
    elif status == 401:
        code, message = "UNAUTHORIZED", "Unauthorized"
    elif status == 403:
        code, message = "FORBIDDEN", "Forbidden"
    elif status == 405:
        code, message = "METHOD_NOT_ALLOWED", "Method Not Allowed"
    else:
        code, message = "HTTP_ERROR", "HTTP Error"

    detail = getattr(exc, "detail", None)
    details = {"detail": detail} if detail is not None else None
    return status, code, message, details


class ErrorEnvelopeMiddleware:
    """
    平台兜底：确保任何漏网异常都被转成 ErrorEnvelope（避免 TestClient re-raise）。
    这不替代 FastAPI exception handlers；只是最后一道保险。
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        try:
            await self.app(scope, receive, send)
        except RequestValidationError as exc:
            resp = error_response(
                status_code=422,
                code="VALIDATION_ERROR",
                message="Request validation failed",
                details={"errors": exc.errors()},
            )
            await resp(scope, receive, send)
        except AppError as exc:
            resp = error_response(
                status_code=exc.status_code,
                code=exc.code,
                message=exc.message,
                details=exc.details,
            )
            await resp(scope, receive, send)
        except StarletteHTTPException as exc:
            status, code, message, details = _map_http_exception(exc)
            resp = error_response(status_code=status, code=code, message=message, details=details)
            await resp(scope, receive, send)
        except Exception:
            resp = error_response(
                status_code=500,
                code="INTERNAL_ERROR",
                message="Internal Server Error",
                details=None,
            )
            await resp(scope, receive, send)


def add_exception_handlers(app: FastAPI) -> None:
    """
    仍然提供 FastAPI exception handlers（冻结要求）。
    """

    @app.exception_handler(RequestValidationError)
    async def _validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        return error_response(
            status_code=422,
            code="VALIDATION_ERROR",
            message="Request validation failed",
            details={"errors": exc.errors()},
        )

    @app.exception_handler(AppError)
    async def _app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return error_response(
            status_code=exc.status_code,
            code=exc.code,
            message=exc.message,
            details=exc.details,
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        status, code, message, details = _map_http_exception(exc)
        return error_response(status_code=status, code=code, message=message, details=details)

    @app.exception_handler(Exception)
    async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        return error_response(
            status_code=500,
            code="INTERNAL_ERROR",
            message="Internal Server Error",
            details=None,
        )
