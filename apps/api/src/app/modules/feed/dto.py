from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel


class FeedItem(BaseModel):
    item_type: Literal["episode_or_video"] = "episode_or_video"

    id: str
    project_id: str
    series_id: str
    kind: Literal["episode", "video"]

    title: str
    synopsis_text: Optional[str] = None
    order_index: Optional[int] = None

    created_at: str
    updated_at: Optional[str] = None
    archived_at: Optional[str] = None


class FeedListResponse(BaseModel):
    items: List[FeedItem]
    total: int
    limit: int
    offset: int
