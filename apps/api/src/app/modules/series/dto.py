from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class SeriesBase(BaseModel):
    project_id: str
    name: str
    style_text: Optional[str] = None
    continuity_text: Optional[str] = None
    prompt_ids: List[str] = Field(default_factory=list)
    role_ids: List[str] = Field(default_factory=list)


class SeriesCreate(SeriesBase):
    pass


    style_text: str = ""
    continuity_text: str = ""
class SeriesPatch(BaseModel):
    name: Optional[str] = None
    style_text: Optional[str] = None
    continuity_text: Optional[str] = None
    prompt_ids: Optional[List[str]] = None
    role_ids: Optional[List[str]] = None
    # allow explicit null to clear archived_at
    archived_at: Optional[str] = None


class SeriesOut(SeriesBase):
    id: str
    created_at: str
    updated_at: Optional[str] = None
    archived_at: Optional[str] = None


class SeriesListResp(BaseModel):
    total: int
    items: List[SeriesOut]
    limit: int
    offset: int
