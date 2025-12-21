from __future__ import annotations
from fastapi import APIRouter, Query, HTTPException
from .dto import Tool, ToolCreate, ToolUpdate, ListResp
from . import store_sqlite as store

router = APIRouter(prefix="/api/tools", tags=["tools"])

@router.post("", response_model=Tool)
def create_tool(body: ToolCreate):
    return store.create(body.model_dump())

@router.get("/{tool_id}", response_model=Tool)
def get_tool(tool_id: str):
    try:
        return store.get(tool_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Tool not found")

@router.patch("/{tool_id}", response_model=Tool)
def update_tool(tool_id: str, body: ToolUpdate):
    try:
        return store.update(tool_id, {k: v for k, v in body.model_dump().items() if v is not None})
    except KeyError:
        raise HTTPException(status_code=404, detail="Tool not found")

@router.get("", response_model=ListResp)
def list_tools(
    q: str | None = Query(default=None),
    tool_type: str | None = Query(default=None),
    project_id: str | None = Query(default=None),
    archived: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    items, total = store.list_items(
        q=q,
        tool_type=tool_type,
        project_id=project_id,
        archived=archived,
        limit=limit,
        offset=offset,
    )
    return {"items": items, "total": total, "limit": limit, "offset": offset}
