from __future__ import annotations

from typing import List

from fastapi import APIRouter


def get_module_routers() -> List[APIRouter]:
    # 后续模块只能在此文件追加注册
    routers: List[APIRouter] = []

    # --- M01 Projects begin ---
    from .projects.router import router as projects_router
    routers.append(projects_router)
    # --- M01 Projects end ---

    return routers
