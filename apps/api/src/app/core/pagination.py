from __future__ import annotations

from typing import Optional

from fastapi import Query
from pydantic import BaseModel, Field


class ListQuery(BaseModel):
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)
    sort: Optional[str] = "-created_at"
    q: Optional[str] = None
    archived: bool = False


def list_query(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    sort: Optional[str] = Query(default="-created_at"),
    q: Optional[str] = Query(default=None),
    archived: bool = Query(default=False),
) -> ListQuery:
    return ListQuery(limit=limit, offset=offset, sort=sort, q=q, archived=archived)
