from __future__ import annotations

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from .dto import SeriesCreate, SeriesPatch, SeriesOut, SeriesListResponse
from . import service

router = APIRouter(prefix="/api/series", tags=["series"])

@router.post("", response_model=SeriesOut)
def create_series(body: SeriesCreate):
    row = service.create(body.model_dump())
    return row

@router.get("/{series_id}", response_model=SeriesOut)
def get_series(series_id: str):
    row = service.get(series_id)
    if not row:
        raise HTTPException(status_code=404, detail="series not found")
    return row

@router.get("", response_model=SeriesListResponse)
def list_series(
    project_id: str = Query(..., min_length=1),
    q: Optional[str] = Query(default=None),
    archived: Optional[bool] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    items, total = service.list_(project_id=project_id, q=q, archived=archived, limit=limit, offset=offset)
    return {"items": items, "total": total, "limit": int(limit), "offset": int(offset)}

@router.patch("/{series_id}", response_model=SeriesOut)
def patch_series(series_id: str, body: SeriesPatch):
    # keep explicit null (restore) if user explicitly set archived_at=null
    patch_data = body.model_dump(exclude_unset=True)
    if "archived_at" in getattr(body, "model_fields_set", set()):
        patch_data["archived_at"] = body.archived_at

    row = service.patch(series_id, patch_data)
    if not row:
        raise HTTPException(status_code=404, detail="series not found")
    return row
