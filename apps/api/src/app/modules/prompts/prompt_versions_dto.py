from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class PromptKind(str, Enum):
    text2image = "text2image"
    image2image = "image2image"
    text2video = "text2video"
    image2video = "image2video"
    general = "general"


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class WorkflowRef(StrictModel):
    workflow_id: Optional[str] = None
    workflow_version: Optional[str] = None
    workflow_blob_ref: Optional[str] = None


class RoleBinding(StrictModel):
    role_id: str
    weight: Optional[float] = None
    notes: Optional[str] = None


class PromptVersion(StrictModel):
    id: str
    project_id: str
    prompt_id: Optional[str] = None

    version_label: str
    prompt_kind: PromptKind

    resolved_prompt_text: str
    resolved_params: Optional[Dict[str, Any]] = None
    role_bindings: Optional[List[RoleBinding]] = None
    workflow_ref: Optional[WorkflowRef] = None

    created_at: datetime


class PromptVersionCreate(StrictModel):
    project_id: str = Field(min_length=1)
    prompt_id: Optional[str] = None

    version_label: str = Field(min_length=1)
    prompt_kind: PromptKind

    resolved_prompt_text: str = Field(min_length=1)
    resolved_params: Optional[Dict[str, Any]] = None
    role_bindings: Optional[List[RoleBinding]] = None
    workflow_ref: Optional[WorkflowRef] = None


class PromptVersionListResponse(StrictModel):
    items: List[PromptVersion]
    total: int
    offset: int
    limit: int
