from __future__ import annotations

from fastapi import FastAPI

from app.api.health import health_router, meta_router
from app.core.config import get_settings
from app.core.cors import apply_cors
from app.core.errors import ErrorEnvelopeMiddleware, add_exception_handlers
from app.core.logging import RequestLogMiddleware, init_logging
from app.core.request_id import RequestIdMiddleware
from app.modules._registry import get_module_routers


def create_app() -> FastAPI:
    settings = get_settings()

    init_logging(settings.LOG_LEVEL)
    app = FastAPI(debug=False)

    # 先注册 handlers（冻结要求）
    add_exception_handlers(app)

    # CORS
    apply_cors(app, settings.CORS_ALLOW_ORIGINS)

    # 关键：ErrorEnvelopeMiddleware 作为“兜底”，要包住路由层
    # middleware stack：最后 add 的最外层
    app.add_middleware(ErrorEnvelopeMiddleware)
    app.add_middleware(RequestLogMiddleware)
    app.add_middleware(RequestIdMiddleware)

    # 平台路由
    app.include_router(health_router)
    app.include_router(meta_router)

    # 业务模块（初始为空）
    for r in get_module_routers():
        app.include_router(r)

    return app


app = create_app()
