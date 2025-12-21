from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Query

from .dto import (
    Prompt,
    PromptCreate,
    PromptListResponse,
    PromptPatch,
    PromptVersion,
    PromptVersionCreate,
    PromptVersionListResponse,
    PromptKind,
)
from .service import PromptsService

router = APIRouter(tags=["prompts"])
svc = PromptsService()

# ----------------------------
# Prompts
# ----------------------------
@router.post("/api/prompts", response_model=Prompt)
def create_prompt(req: PromptCreate) -> Prompt:
    return svc.create_prompt(req)


@router.get("/api/prompts/{prompt_id}", response_model=Prompt)
def get_prompt(prompt_id: str) -> Prompt:
    return svc.get_prompt(prompt_id)


@router.patch("/api/prompts/{prompt_id}", response_model=Prompt)
def patch_prompt(prompt_id: str, req: PromptPatch) -> Prompt:
    return svc.patch_prompt(prompt_id, req)


@router.get("/api/prompts", response_model=PromptListResponse)
def list_prompts(
    q: Optional[str] = Query(default=None),
    prompt_kind: Optional[PromptKind] = Query(default=None),
    project_id: Optional[str] = Query(default=None),
    archived: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    sort: Optional[str] = Query(default=None),
) -> PromptListResponse:
    return svc.list_prompts(
        q=q,
        prompt_kind=prompt_kind.value if prompt_kind is not None else None,
        project_id=project_id,
        archived=archived,
        limit=limit,
        offset=offset,
        sort=sort,
    )


# ----------------------------
# PromptVersions (immutable snapshots)
# ----------------------------
@router.post("/api/prompt_versions", response_model=PromptVersion)
def create_prompt_version(req: PromptVersionCreate) -> PromptVersion:
    return svc.create_prompt_version(req)


@router.get("/api/prompt_versions/{prompt_version_id}", response_model=PromptVersion)
def get_prompt_version(prompt_version_id: str) -> PromptVersion:
    return svc.get_prompt_version(prompt_version_id)


@router.get("/api/prompt_versions", response_model=PromptVersionListResponse)
def list_prompt_versions(
    project_id: str = Query(..., min_length=1),
    prompt_id: Optional[str] = Query(default=None),
    prompt_kind: Optional[PromptKind] = Query(default=None),
    q: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    sort: Optional[str] = Query(default=None),
) -> PromptVersionListResponse:
    return svc.list_prompt_versions(
        project_id=project_id,
        prompt_id=prompt_id,
        prompt_kind=prompt_kind.value if prompt_kind is not None else None,
        q=q,
        limit=limit,
        offset=offset,
        sort=sort,
    )

# --- M05 PromptVersions router include ---
from .prompt_versions_router import router as prompt_versions_router
router.include_router(prompt_versions_router)

