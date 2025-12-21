from __future__ import annotations
from typing import Any, Optional, List, Dict
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field

class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

class ProviderType(str, Enum):
    http_api = "http_api"
    local_workflow_runner = "local_workflow_runner"
    hybrid = "hybrid"

class SupportedKind(str, Enum):
    text2image = "text2image"
    image2image = "image2image"
    text2video = "text2video"
    image2video = "image2video"
    general = "general"

class Provider(StrictModel):
    id: str
    name: str
    provider_type: ProviderType
    supported_kinds: List[SupportedKind]
    endpoint_config: Optional[Dict[str, Any]] = None
    is_enabled: bool
    created_at: str
    updated_at: Optional[str] = None
    archived_at: Optional[str] = None

class ProviderCreate(StrictModel):
    name: str = Field(min_length=1, max_length=200)
    provider_type: ProviderType
    supported_kinds: List[SupportedKind]
    endpoint_config: Optional[Dict[str, Any]] = None
    is_enabled: bool = True

class ProviderUpdate(StrictModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    supported_kinds: Optional[List[SupportedKind]] = None
    endpoint_config: Optional[Dict[str, Any]] = None
    is_enabled: Optional[bool] = None
    archived_at: Optional[str] = None

class ListResp(StrictModel):
    items: list
    total: int
    limit: int
    offset: int
