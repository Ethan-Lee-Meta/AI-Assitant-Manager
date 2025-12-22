from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class EpisodeOrVideoKind(str, Enum):
    episode = "episode"
    video = "video"


class EpisodeOrVideoCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    project_id: str = Field(..., min_length=1)
    series_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    kind: EpisodeOrVideoKind

    synopsis_text: Optional[str] = None
    order_index: Optional[int] = None
    script_text: Optional[str] = None
    assembly_preset_id: Optional[str] = None


class EpisodeOrVideoPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Optional[str] = None
    synopsis_text: Optional[str] = None
    order_index: Optional[int] = None
    script_text: Optional[str] = None
    assembly_preset_id: Optional[str] = None

    archived_at: Optional[datetime] = None


class EpisodeOrVideo(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    project_id: str
    series_id: str
    title: str
    kind: EpisodeOrVideoKind

    synopsis_text: Optional[str] = None
    order_index: Optional[int] = None
    script_text: Optional[str] = None
    assembly_preset_id: Optional[str] = None

    created_at: datetime
    updated_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None


class EpisodeOrVideoListResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: List[EpisodeOrVideo]
    total: int
    limit: int
    offset: int
