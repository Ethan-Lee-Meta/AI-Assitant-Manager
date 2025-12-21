from __future__ import annotations
from fastapi import APIRouter, Query, HTTPException
from .dto import Workflow, WorkflowCreate, WorkflowUpdate, ListResp
from . import store_sqlite as store

router = APIRouter(prefix="/api/workflows", tags=["workflows"])

@router.post("", response_model=Workflow)
def create_workflow(body: WorkflowCreate):
    return store.create(body.model_dump())

@router.get("/{workflow_id}", response_model=Workflow)
def get_workflow(workflow_id: str):
    try:
        return store.get(workflow_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Workflow not found")

@router.patch("/{workflow_id}", response_model=Workflow)
def update_workflow(workflow_id: str, body: WorkflowUpdate):
    try:
        return store.update(workflow_id, {k: v for k, v in body.model_dump().items() if v is not None})
    except KeyError:
        raise HTTPException(status_code=404, detail="Workflow not found")

@router.get("", response_model=ListResp)
def list_workflows(
    q: str | None = Query(default=None),
    workflow_type: str | None = Query(default=None),
    project_id: str | None = Query(default=None),
    archived: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    items, total = store.list_items(
        q=q,
        workflow_type=workflow_type,
        project_id=project_id,
        archived=archived,
        limit=limit,
        offset=offset,
    )
    return {"items": items, "total": total, "limit": limit, "offset": offset}
