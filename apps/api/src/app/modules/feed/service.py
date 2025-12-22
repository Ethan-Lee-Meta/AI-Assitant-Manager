from __future__ import annotations

from typing import List, Optional, Tuple

from app.core.pagination import ListQuery
from app.modules.episodes_or_videos.dto import EpisodeOrVideoKind

from .dto import FeedItem
from .store_sqlite import list_feed_items


def list_feed(
    *,
    project_id: Optional[str],
    series_id: Optional[str],
    kind: Optional[EpisodeOrVideoKind],
    pagination: ListQuery,
) -> Tuple[List[FeedItem], int]:
    items, total = list_feed_items(
        project_id=project_id,
        series_id=series_id,
        kind=kind,
        q=pagination.q,
        archived=bool(pagination.archived),
        limit=int(pagination.limit),
        offset=int(pagination.offset),
        sort=pagination.sort,
    )
    return items, total
