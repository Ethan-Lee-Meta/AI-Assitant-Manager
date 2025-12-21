from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Query

from .prompt_versions_dto import PromptKind, PromptVersion, PromptVersionCreate, PromptVersionListResponse
from .prompt_versions_service import create_prompt_version, get_prompt_version_or_404, list_prompt_versions_service

router = APIRouter(prefix="/api", tags=["prompt_versions"])


@router.post("/prompt_versions", response_model=PromptVersion)
def create_prompt_version_api(body: PromptVersionCreate) -> PromptVersion:
    got = create_prompt_version(body.model_dump())
    return PromptVersion.model_validate(got)


@router.get("/prompt_versions/{prompt_version_id}", response_model=PromptVersion)
def get_prompt_version_api(prompt_version_id: str) -> PromptVersion:
    got = get_prompt_version_or_404(prompt_version_id)
    return PromptVersion.model_validate(got)


@router.get("/prompt_versions", response_model=PromptVersionListResponse)
def list_prompt_versions_api(
    project_id: str = Query(..., min_length=1),
    prompt_id: Optional[str] = None,
    prompt_kind: Optional[PromptKind] = None,
    q: Optional[str] = None,
    offset: int = 0,
    limit: int = 50,
    sort: Optional[str] = None,
) -> PromptVersionListResponse:
    rows, total = list_prompt_versions_service(
        project_id=project_id,
        prompt_id=prompt_id,
        prompt_kind=prompt_kind.value if prompt_kind else None,
        q=q,
        offset=offset,
        limit=limit,
        sort=sort,
    )
    items = [PromptVersion.model_validate(r) for r in rows]
    return PromptVersionListResponse(items=items, total=total, offset=offset, limit=limit)
