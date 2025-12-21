from __future__ import annotations
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from .dto import SeriesCreate, SeriesListResp, SeriesOut, SeriesPatch
from .service import create_series, delete_series, get_series, list_series, update_series

router = APIRouter(prefix="/api/series", tags=["series"])


@router.get("", response_model=SeriesListResp)
def api_list_series(
    project_id: str | None = Query(None),
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
):
    return list_series(project_id=project_id, q=q, limit=limit, offset=offset)


@router.post("", response_model=SeriesOut)
def api_create_series(body: SeriesCreate):
    return create_series(body.model_dump())


@router.get("/{series_id}", response_model=SeriesOut)
def api_get_series(series_id: str):
    try:
        return get_series(series_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="NOT_FOUND")


@router.patch("/{series_id}", response_model=SeriesOut)
def api_patch_series(series_id: str, body: SeriesPatch):
    patch = body.model_dump(exclude_unset=True)  # keep explicit nulls
    try:
        return update_series(series_id, patch)
    except KeyError:
        raise HTTPException(status_code=404, detail="NOT_FOUND")


@router.delete("/{series_id}")
def api_delete_series(series_id: str):
    try:
        delete_series(series_id)
        return {"ok": True}
    except KeyError:
        raise HTTPException(status_code=404, detail="NOT_FOUND")
