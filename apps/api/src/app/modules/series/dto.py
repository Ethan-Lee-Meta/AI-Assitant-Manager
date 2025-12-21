from __future__ import annotations

from typing import Any, Dict, List, Optional, Literal
from pydantic import BaseModel, Field

class SeriesCreate(BaseModel):
    project_id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    style_text: str = Field(default="")
    continuity_text: str = Field(default="")

class SeriesPatch(BaseModel):
    # partial update; explicit null for archived_at is allowed (restore)
    name: Optional[str] = Field(default=None, min_length=1)
    style_text: Optional[str] = None
    continuity_text: Optional[str] = None
    archived_at: Optional[str] = None  # ISO string or null

class SeriesOut(BaseModel):
    id: str
    project_id: str
    name: str
    style_text: str
    continuity_text: str
    created_at: str
    updated_at: str
    archived_at: Optional[str] = None

class SeriesListResponse(BaseModel):
    items: List[SeriesOut]
    total: int
    limit: int
    offset: int
