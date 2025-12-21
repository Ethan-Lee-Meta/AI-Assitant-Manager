from __future__ import annotations

from typing import Any, Dict, Optional, Tuple, List
from .store_sqlite import create_series, get_series, list_series, update_series

def create(data: Dict[str, Any]) -> Dict[str, Any]:
    return create_series(data)

def get(series_id: str) -> Optional[Dict[str, Any]]:
    return get_series(series_id)

def list_(
    *,
    project_id: str,
    q: Optional[str],
    archived: Optional[bool],
    limit: int,
    offset: int,
) -> Tuple[List[Dict[str, Any]], int]:
    return list_series(project_id=project_id, q=q, archived=archived, limit=limit, offset=offset)

def patch(series_id: str, patch_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    return update_series(series_id, patch_data)
