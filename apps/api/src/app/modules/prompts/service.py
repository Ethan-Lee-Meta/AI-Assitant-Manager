from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
from uuid import uuid4

from app.core.errors import AppError

from .dto import (
    Prompt,
    PromptCreate,
    PromptListResponse,
    PromptPatch,
    PromptVersion,
    PromptVersionCreate,
    PromptVersionListResponse,
)
from . import store_sqlite as store


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _validation_error_for_sort(field: str, allowed: list[str]) -> AppError:
    # Align with platform error envelope shape via AppError (handled by add_exception_handlers)
    return AppError(
        code="VALIDATION_ERROR",
        message="Request validation failed",
        details={
            "errors": [
                {
                    "loc": ["query", "sort"],
                    "msg": f"Invalid sort field '{field}'. Allowed: {', '.join(allowed)}",
                    "type": "value_error",
                }
            ]
        },
        status_code=422,
    )


def _parse_sort(sort: Optional[str], *, allowed_fields: list[str], default: str) -> Tuple[str, Tuple[Any, ...]]:
    """
    Returns:
      (sql_order_by, params_tuple)
    We do not use params for ORDER BY; keep tuple for API symmetry.
    Supported formats:
      - "-created_at" (desc)
      - "created_at" (asc)
      - "created_at:desc" / "created_at:asc"
    """
    if not sort:
        return (default, ())

    s = sort.strip()
    direction = "ASC"
    field = s

    if s.startswith("-"):
        field = s[1:]
        direction = "DESC"
    elif ":" in s:
        parts = s.split(":", 1)
        field = parts[0].strip()
        dir_raw = (parts[1] or "").strip().lower()
        if dir_raw in ("asc", "ascending"):
            direction = "ASC"
        elif dir_raw in ("desc", "descending"):
            direction = "DESC"
        else:
            raise _validation_error_for_sort(field, allowed_fields)

    if field not in allowed_fields:
        raise _validation_error_for_sort(field, allowed_fields)

    return (f"{field} {direction}", ())


def _default_searchable_text(name: str, content_text: str) -> str:
    return (name.strip() + "\n" + content_text.strip()).strip()


class PromptsService:
    # ----------------------------
    # Prompts
    # ----------------------------
    def create_prompt(self, req: PromptCreate) -> Prompt:
        pid = str(uuid4())
        now = _now_iso()
        searchable = (req.searchable_text or "").strip() or _default_searchable_text(req.name, req.content_text)

        row = {
            "id": pid,
            "project_id": req.project_id,
            "name": req.name,
            "prompt_kind": req.prompt_kind.value,
            "content_text": req.content_text,
            "composition_blocks": req.composition_blocks,
            "searchable_text": searchable,
            "created_at": now,
            "updated_at": now,
            "archived_at": None,
        }
        store.insert_prompt(row)
        return Prompt(**store.get_prompt(pid))

    def get_prompt(self, prompt_id: str) -> Prompt:
        row = store.get_prompt(prompt_id)
        if not row:
            raise AppError(code="NOT_FOUND", message="Not Found", status_code=404)
        return Prompt(**row)

    def patch_prompt(self, prompt_id: str, req: PromptPatch) -> Prompt:
        existing = store.get_prompt(prompt_id)
        if not existing:
            raise AppError(code="NOT_FOUND", message="Not Found", status_code=404)

        patch: Dict[str, Any] = {"updated_at": _now_iso()}

        if req.name is not None:
            patch["name"] = req.name
        if req.content_text is not None:
            patch["content_text"] = req.content_text
        if req.searchable_text is not None:
            patch["searchable_text"] = req.searchable_text
        if req.archived_at is not None:
            patch["archived_at"] = req.archived_at
        if req.composition_blocks is not None:
            patch["composition_blocks"] = req.composition_blocks

        # If caller updated name/content_text but didn't specify searchable_text,
        # keep old searchable_text (do not auto-overwrite).
        updated = store.update_prompt(prompt_id, patch) or store.get_prompt(prompt_id)
        return Prompt(**updated)

    def list_prompts(
        self,
        *,
        q: Optional[str],
        prompt_kind: Optional[str],
        project_id: Optional[str],
        archived: bool,
        limit: int,
        offset: int,
        sort: Optional[str],
    ) -> PromptListResponse:
        sort_sql, sort_params = _parse_sort(
            sort,
            allowed_fields=["created_at", "updated_at", "name", "id", "prompt_kind"],
            default="created_at DESC",
        )
        out = store.list_prompts(
            q=q,
            prompt_kind=prompt_kind,
            project_id=project_id,
            archived=archived,
            limit=limit,
            offset=offset,
            sort_sql=sort_sql,
            sort_params=sort_params,
        )
        items = [Prompt(**r) for r in out["items"]]
        return PromptListResponse(items=items, total=out["total"], limit=out["limit"], offset=out["offset"])

    # ----------------------------
    # PromptVersions (immutable)
    # ----------------------------
    def create_prompt_version(self, req: PromptVersionCreate) -> PromptVersion:
        pv_id = str(uuid4())
        now = _now_iso()
        row = {
            "id": pv_id,
            "project_id": req.project_id,
            "prompt_id": req.prompt_id,
            "version_label": req.version_label,
            "prompt_kind": req.prompt_kind.value,
            "resolved_prompt_text": req.resolved_prompt_text,
            "resolved_params": req.resolved_params,
            "role_bindings": req.role_bindings,
            "workflow_ref": req.workflow_ref.model_dump() if req.workflow_ref is not None else None,
            "created_at": now,
        }
        store.insert_prompt_version(row)
        got = store.get_prompt_version(pv_id)
        return PromptVersion(**got)

    def get_prompt_version(self, pv_id: str) -> PromptVersion:
        row = store.get_prompt_version(pv_id)
        if not row:
            raise AppError(code="NOT_FOUND", message="Not Found", status_code=404)
        return PromptVersion(**row)

    def list_prompt_versions(
        self,
        *,
        project_id: str,
        prompt_id: Optional[str],
        prompt_kind: Optional[str],
        q: Optional[str],
        limit: int,
        offset: int,
        sort: Optional[str],
    ) -> PromptVersionListResponse:
        sort_sql, sort_params = _parse_sort(
            sort,
            allowed_fields=["created_at", "version_label", "id"],
            default="created_at DESC",
        )
        out = store.list_prompt_versions(
            project_id=project_id,
            prompt_id=prompt_id,
            prompt_kind=prompt_kind,
            q=q,
            limit=limit,
            offset=offset,
            sort_sql=sort_sql,
            sort_params=sort_params,
        )
        items = [PromptVersion(**r) for r in out["items"]]
        return PromptVersionListResponse(items=items, total=out["total"], limit=out["limit"], offset=out["offset"])
