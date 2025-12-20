"""
M01 Projects - DTO & Enums (Frozen Contract Surface)

This module intentionally contains only:
- Enums required by the frozen Projects contract
- Request/Response DTOs for Create/Patch/Get/List

Business rules (defaults, sorting parse, q matching, tag normalization, archive semantics)
MUST live in service.py in later steps.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


# -----------------------------
# Enums (frozen)
# -----------------------------

class ProjectType(str, Enum):
    series_collection = "series_collection"
    story_project = "story_project"


class EncryptionPolicy(str, Enum):
    none = "none"
    bundle_only = "bundle_only"
    at_rest_placeholder = "at_rest_placeholder"


class DefaultFaceMode(str, Enum):
    strict = "strict"
    assisted = "assisted"
    off = "off"


# -----------------------------
# Request DTOs (frozen)
# -----------------------------

class ProjectCreateRequest(BaseModel):
    """
    Create request (frozen):
      - name (required)
      - description? (optional)
      - project_type (required)
      - default_face_mode? (optional; service will default to assisted)
      - tags? (optional)
    Note: encryption_policy is NOT in create request; service must default to bundle_only.
    """
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    project_type: ProjectType
    default_face_mode: Optional[DefaultFaceMode] = Field(default=None)
    tags: Optional[List[str]] = Field(default=None)

    class Config:
        extra = "forbid"


class ProjectPatchRequest(BaseModel):
    """
    Patch request (frozen):
      - name?
      - description?
      - default_face_mode?
      - tags?
      - archived_at?
    IMPORTANT: service must use fields-set tracking to distinguish:
      - field omitted  -> no change
      - field present null -> explicit unarchive (if you decide to support)
    """
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    default_face_mode: Optional[DefaultFaceMode] = Field(default=None)
    tags: Optional[List[str]] = Field(default=None)
    archived_at: Optional[datetime] = Field(default=None)

    class Config:
        extra = "forbid"


# -----------------------------
# Response DTOs (frozen)
# -----------------------------

class ProjectOut(BaseModel):
    """
    Project response fields (frozen minimum set):
      id, name, description?, project_type, encryption_policy, default_face_mode, tags?,
      created_at, updated_at, archived_at?
    """
    id: str
    name: str
    description: Optional[str] = None

    project_type: ProjectType
    encryption_policy: EncryptionPolicy
    default_face_mode: DefaultFaceMode

    # Implementation constant (recommended):
    # keep tags always present as list (default []) to simplify UI & avoid null-branches.
    tags: List[str] = Field(default_factory=list)

    created_at: datetime
    updated_at: datetime
    archived_at: Optional[datetime] = None

    class Config:
        extra = "forbid"


class ProjectListResponse(BaseModel):
    """
    ListResponse (platform-frozen):
      { items, total, limit, offset }
    """
    items: List[ProjectOut]
    total: int
    limit: int
    offset: int

    class Config:
        extra = "forbid"


# -----------------------------
# Constants for later steps
# -----------------------------
ALLOWED_SORT_FIELDS = {"created_at", "updated_at", "name"}
DEFAULT_SORT = "-created_at"
