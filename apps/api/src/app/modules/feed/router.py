from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.core.pagination import ListQuery, list_query
from app.modules.episodes_or_videos.dto import EpisodeOrVideoKind

from .dto import FeedListResponse
from .service import list_feed

router = APIRouter(prefix="/api/feed", tags=["feed"])


@router.get("", response_model=FeedListResponse)
def list_all(
    project_id: Optional[str] = Query(default=None),
    series_id: Optional[str] = Query(default=None),
    kind: Optional[EpisodeOrVideoKind] = Query(default=None),
    pagination: ListQuery = Depends(list_query),
):
    items, total = list_feed(
        project_id=project_id,
        series_id=series_id,
        kind=kind,
        pagination=pagination,
    )
    return {"items": items, "total": total, "limit": pagination.limit, "offset": pagination.offset}
