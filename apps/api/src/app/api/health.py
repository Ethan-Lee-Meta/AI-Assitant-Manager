from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.core.pagination import ListQuery, list_query

health_router = APIRouter(tags=["health"])
meta_router = APIRouter(prefix="/api/_meta", tags=["_meta"])


@health_router.get("/health")
def health(settings: Settings = Depends(get_settings)) -> Dict[str, Any]:
    return {
        "status": "ok",
        "service": settings.SERVICE_NAME,
        "time": datetime.now(timezone.utc).isoformat(),
    }


@meta_router.get("/echo")
def meta_echo(params: ListQuery = Depends(list_query)) -> Dict[str, Any]:
    return {"ok": True, "parsed": params.model_dump()}


@meta_router.get("/crash")
def meta_crash() -> Dict[str, Any]:
    raise RuntimeError("intentional crash for platform validation")
