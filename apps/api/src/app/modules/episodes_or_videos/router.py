from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.core.pagination import ListQuery, list_query

from .dto import (
    EpisodeOrVideo,
    EpisodeOrVideoCreate,
    EpisodeOrVideoKind,
    EpisodeOrVideoListResponse,
    EpisodeOrVideoPatch,
)
from .service import (
    create_episode_or_video,
    get_episode_or_video,
    list_episodes_or_videos,
    patch_episode_or_video,
)

router = APIRouter(prefix="/api/episodes_or_videos", tags=["episodes_or_videos"])

def _to_colon_sort(sort: str | None) -> str:
    """Compat: accept '-created_at' (global default) but keep internal 'field:dir' style."""
    s = (sort or "").strip()
    if not s:
        return "created_at:desc"
    # already 'field:asc|desc'
    if ":" in s:
        return s
    if s.startswith("-") and len(s) > 1:
        return f"{s[1:]}:desc"
    if s.startswith("+") and len(s) > 1:
        return f"{s[1:]}:asc"
    # plain field -> asc (consistent with +field)
    return f"{s}:asc"



@router.post("", response_model=EpisodeOrVideo)
def create(payload: EpisodeOrVideoCreate):
    return create_episode_or_video(payload)


@router.get("/{episode_or_video_id}", response_model=EpisodeOrVideo)
def get_one(episode_or_video_id: str):
    return get_episode_or_video(episode_or_video_id)


@router.patch("/{episode_or_video_id}", response_model=EpisodeOrVideo)
def patch_one(episode_or_video_id: str, patch: EpisodeOrVideoPatch):
    return patch_episode_or_video(episode_or_video_id, patch)


@router.get("", response_model=EpisodeOrVideoListResponse)
def list_all(
    project_id: str = Query(..., min_length=1),
    series_id: Optional[str] = None,
    kind: Optional[EpisodeOrVideoKind] = None,
    query: ListQuery = Depends(list_query),
):
    items, total = list_episodes_or_videos(
        project_id=project_id,
        series_id=series_id,
        kind=kind,
        q=query.q,
        archived=query.archived,
        limit=query.limit,
        offset=query.offset,
        sort=_to_colon_sort(query.sort),
    )
    return {"items": items, "total": total, "limit": query.limit, "offset": query.offset}
