from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    # pydantic v2 style (do NOT define inner class Config)
    model_config = ConfigDict(extra="forbid")


class PromptKind(str, Enum):
    text2image = "text2image"
    image2image = "image2image"
    text2video = "text2video"
    image2video = "image2video"
    general = "general"


class WorkflowRef(StrictModel):
    workflow_id: Optional[str] = None
    workflow_version: Optional[str] = None
    workflow_blob_ref: Optional[str] = None


# ----------------------------
# Prompt (mutable, archived via archived_at)
# ----------------------------
class Prompt(StrictModel):
    id: str
    project_id: Optional[str] = None  # optional => global template library
    name: str
    prompt_kind: PromptKind
    content_text: str
    composition_blocks: Optional[List[Dict[str, Any]]] = None
    searchable_text: str

    created_at: str
    updated_at: str
    archived_at: Optional[str] = None


class PromptCreate(StrictModel):
    project_id: Optional[str] = None
    name: str = Field(min_length=1)
    prompt_kind: PromptKind
    content_text: str = Field(min_length=1)
    composition_blocks: Optional[List[Dict[str, Any]]] = None
    searchable_text: Optional[str] = None


class PromptPatch(StrictModel):
    name: Optional[str] = Field(default=None, min_length=1)
    content_text: Optional[str] = Field(default=None, min_length=1)
    composition_blocks: Optional[List[Dict[str, Any]]] = None
    searchable_text: Optional[str] = None
    archived_at: Optional[str] = None


class PromptListResponse(StrictModel):
    items: List[Prompt]
    total: int
    limit: int
    offset: int


# ----------------------------
# PromptVersion (immutable snapshot)
# ----------------------------
class PromptVersion(StrictModel):
    id: str
    project_id: str
    prompt_id: Optional[str] = None

    version_label: str
    prompt_kind: PromptKind

    resolved_prompt_text: str
    resolved_params: Optional[Dict[str, Any]] = None
    role_bindings: Optional[List[Dict[str, Any]]] = None
    workflow_ref: Optional[WorkflowRef] = None

    created_at: str  # required; updated_at not used


class PromptVersionCreate(StrictModel):
    project_id: str = Field(min_length=1)
    prompt_id: Optional[str] = None

    version_label: str = Field(min_length=1)
    prompt_kind: PromptKind

    resolved_prompt_text: str = Field(min_length=1)
    resolved_params: Optional[Dict[str, Any]] = None
    role_bindings: Optional[List[Dict[str, Any]]] = None
    workflow_ref: Optional[WorkflowRef] = None


class PromptVersionListResponse(StrictModel):
    items: List[PromptVersion]
    total: int
    limit: int
    offset: int
