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

    # --- M05 Prompts begin ---
    from .prompts.router import router as prompts_router
    routers.append(prompts_router)
    # --- M05 Prompts end ---

    # --- M07 Providers begin ---
    from .providers.router import router as providers_router
    routers.append(providers_router)
    # --- M07 Providers end ---

    # --- M07 Workflows begin ---
    from .workflows.router import router as workflows_router
    routers.append(workflows_router)
    # --- M07 Workflows end ---

    # --- M07 Tools begin ---
    from .tools.router import router as tools_router
    routers.append(tools_router)
    # --- M07 Tools end ---

    # --- M02 Series begin ---
    from .series.router import router as series_router
    routers.append(series_router)
    # --- M02 Series end ---

    # --- M03 Episodes/Videos begin ---
    from .episodes_or_videos.router import router as episodes_or_videos_router
    routers.append(episodes_or_videos_router)
    # --- M03 Episodes/Videos end ---


    # feed (read-only aggregate)


    from app.modules.feed.router import router as feed_router


    routers.append(feed_router)



    return routers