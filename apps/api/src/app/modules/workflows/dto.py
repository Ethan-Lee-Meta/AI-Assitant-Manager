from __future__ import annotations
from typing import Any, Optional, Dict
from enum import Enum
from pydantic import BaseModel, ConfigDict, Field

class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

class WorkflowType(str, Enum):
    provider_http_template = "provider_http_template"
    comfyui_workflow = "comfyui_workflow"

class Workflow(StrictModel):
    id: str
    project_id: Optional[str] = None
    name: str = Field(min_length=1)
    workflow_type: WorkflowType
    workflow_blob_asset_id: Optional[str] = None
    default_params: Optional[Dict[str, Any]] = None
    created_at: str
    updated_at: Optional[str] = None
    archived_at: Optional[str] = None

class WorkflowCreate(StrictModel):
    project_id: Optional[str] = None
    name: str = Field(min_length=1)
    workflow_type: WorkflowType
    workflow_blob_asset_id: Optional[str] = None
    default_params: Optional[Dict[str, Any]] = None

class WorkflowUpdate(StrictModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    workflow_blob_asset_id: Optional[str] = None
    default_params: Optional[Dict[str, Any]] = None
    archived_at: Optional[str] = None
    archived: Optional[bool] = None

class ListResp(StrictModel):
    items: list
    total: int
    limit: int
    offset: int
