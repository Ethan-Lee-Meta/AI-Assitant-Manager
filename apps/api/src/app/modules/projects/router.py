from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Query

from .dto import Project, ProjectCreate, ProjectListResponse, ProjectPatch, ProjectType
from .service import create_project, get_project, list_projects, patch_project

# IMPORTANT:
# main.py mounts module routers directly (no global /api wrapper),
# so this router must include "/api" in its prefix to satisfy platform contract.
router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.post("", response_model=Project)
def projects_create(payload: ProjectCreate) -> Project:
    return create_project(payload)


@router.patch("/{project_id}", response_model=Project)
def projects_patch(project_id: str, payload: ProjectPatch) -> Project:
    return patch_project(project_id, payload)


@router.get("/{project_id}", response_model=Project)
def projects_get(project_id: str) -> Project:
    return get_project(project_id)


@router.get("", response_model=ProjectListResponse)
def projects_list(
    q: Optional[str] = None,
    project_type: Optional[ProjectType] = None,
    archived: bool = False,
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    sort: str = Query(default="-created_at"),
) -> ProjectListResponse:
    return list_projects(
        q=q,
        project_type=project_type,
        archived=archived,
        limit=limit,
        offset=offset,
        sort=sort,
    )
