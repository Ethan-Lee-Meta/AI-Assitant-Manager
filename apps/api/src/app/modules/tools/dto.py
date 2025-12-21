from __future__ import annotations
from typing import Any, Optional, Dict
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field

class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

class ToolType(str, Enum):
    control = "control"
    postprocess = "postprocess"
    subtitle_preset = "subtitle_preset"
    transition_preset = "transition_preset"
    other = "other"

class Tool(StrictModel):
    id: str
    project_id: Optional[str] = None
    name: str = Field(min_length=1)
    tool_type: ToolType
    config: Dict[str, Any]
    description: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    archived_at: Optional[str] = None

class ToolCreate(StrictModel):
    project_id: Optional[str] = None
    name: str = Field(min_length=1)
    tool_type: ToolType
    config: Dict[str, Any]
    description: Optional[str] = None

class ToolUpdate(StrictModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    config: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    archived_at: Optional[str] = None
    archived: Optional[bool] = None

class ListResp(StrictModel):
    items: list
    total: int
    limit: int
    offset: int
