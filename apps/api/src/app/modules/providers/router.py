from __future__ import annotations
from fastapi import APIRouter, Query, HTTPException
from .dto import Provider, ProviderCreate, ProviderUpdate, ListResp
from . import store_sqlite as store

router = APIRouter(prefix="/api/providers", tags=["providers"])

@router.post("", response_model=Provider)
def create_provider(body: ProviderCreate):
    item = store.create(body.model_dump())
    return item

@router.get("/{provider_id}", response_model=Provider)
def get_provider(provider_id: str):
    try:
        return store.get(provider_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Provider not found")

@router.patch("/{provider_id}", response_model=Provider)
def update_provider(provider_id: str, body: ProviderUpdate):
    try:
        return store.update(provider_id, body.model_dump(exclude_unset=True))
    except KeyError:
        raise HTTPException(status_code=404, detail="Provider not found")

@router.get("", response_model=ListResp)
def list_providers(
    q: str | None = Query(default=None),
    provider_type: str | None = Query(default=None),
    is_enabled: bool | None = Query(default=None),
    archived: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    items, total = store.list_items(
        q=q,
        provider_type=provider_type,
        is_enabled=is_enabled,
        archived=archived,
        limit=limit,
        offset=offset,
    )
    return {"items": items, "total": total, "limit": limit, "offset": offset}
