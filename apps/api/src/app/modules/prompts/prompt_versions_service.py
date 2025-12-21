from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple, List
from uuid import uuid4

from app.core.errors import AppError

from .prompt_versions_store_sqlite import connect, insert_prompt_version, get_prompt_version, list_prompt_versions


_ALLOWED_SORT_FIELDS = {"created_at", "version_label"}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_sort(sort: Optional[str]) -> str:
    """
    Accept:
      - "created_at:desc" / "created_at:asc"
      - "version_label:asc"
      - "-created_at"
    Default: created_at DESC
    """
    if not sort:
        return "created_at DESC"

    s = sort.strip()
    direction = "ASC"

    if s.startswith("-"):
        field = s[1:]
        direction = "DESC"
    else:
        if ":" in s:
            field, dir_ = s.split(":", 1)
            field = field.strip()
            dir_ = dir_.strip().lower()
            direction = "ASC" if dir_ == "asc" else "DESC" if dir_ == "desc" else ""
            if not direction:
                raise AppError(
                    code="VALIDATION_ERROR",
                    message="Invalid sort direction",
                    status_code=422,
                    details={"sort": sort},
                )
        else:
            field = s
            direction = "ASC"

    if field not in _ALLOWED_SORT_FIELDS:
        raise AppError(
            code="VALIDATION_ERROR",
            message="Invalid sort field",
            status_code=422,
            details={"sort": sort, "allowed": sorted(_ALLOWED_SORT_FIELDS)},
        )

    return f"{field} {direction}"


def create_prompt_version(payload: Dict[str, Any]) -> Dict[str, Any]:
    pv_id = str(uuid4())
    row = {
        "id": pv_id,
        "project_id": payload["project_id"],
        "prompt_id": payload.get("prompt_id"),
        "version_label": payload["version_label"],
        "prompt_kind": payload["prompt_kind"],
        "resolved_prompt_text": payload["resolved_prompt_text"],
        "resolved_params": payload.get("resolved_params"),
        "role_bindings": payload.get("role_bindings"),
        "workflow_ref": payload.get("workflow_ref"),
        "created_at": _now().isoformat(),
    }

    with connect() as conn:
        insert_prompt_version(conn, row)
        conn.commit()

        got = get_prompt_version(conn, pv_id)
        assert got is not None
        return got


def get_prompt_version_or_404(pv_id: str) -> Dict[str, Any]:
    with connect() as conn:
        got = get_prompt_version(conn, pv_id)
        if not got:
            raise AppError(code="NOT_FOUND", message="PromptVersion not found", status_code=404, details={"id": pv_id})
        return got


def list_prompt_versions_service(
    *,
    project_id: str,
    prompt_id: Optional[str],
    prompt_kind: Optional[str],
    q: Optional[str],
    offset: int,
    limit: int,
    sort: Optional[str],
) -> Tuple[List[Dict[str, Any]], int]:
    if offset < 0:
        raise AppError(code="VALIDATION_ERROR", message="offset must be >= 0", status_code=422, details={"offset": offset})
    if limit <= 0 or limit > 200:
        raise AppError(code="VALIDATION_ERROR", message="limit must be 1..200", status_code=422, details={"limit": limit})

    order_by = _parse_sort(sort)

    with connect() as conn:
        rows, total = list_prompt_versions(
            conn,
            project_id=project_id,
            prompt_id=prompt_id,
            prompt_kind=prompt_kind,
            q=q,
            offset=offset,
            limit=limit,
            order_by_sql=order_by,
        )
        return rows, total
