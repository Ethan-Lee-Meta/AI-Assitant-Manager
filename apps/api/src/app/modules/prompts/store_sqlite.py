from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def _api_root() -> Path:
    # .../apps/api/src/app/modules/prompts/store_sqlite.py -> parents[4] == apps/api
    return Path(__file__).resolve().parents[4]


def _db_path() -> Path:
    p = _api_root() / ".data" / "app.db"
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


@contextmanager
def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(_db_path()))
    conn.row_factory = sqlite3.Row
    try:
        conn.execute("PRAGMA foreign_keys=ON;")
        yield conn
        conn.commit()
    finally:
        conn.close()


def _ensure_tables(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS prompts (
            id TEXT PRIMARY KEY,
            project_id TEXT NULL,
            name TEXT NOT NULL,
            prompt_kind TEXT NOT NULL,
            content_text TEXT NOT NULL,
            composition_blocks_json TEXT NULL,
            searchable_text TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            archived_at TEXT NULL
        );
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS prompt_versions (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            prompt_id TEXT NULL,
            version_label TEXT NOT NULL,
            prompt_kind TEXT NOT NULL,
            resolved_prompt_text TEXT NOT NULL,
            resolved_params_json TEXT NULL,
            role_bindings_json TEXT NULL,
            workflow_ref_json TEXT NULL,
            created_at TEXT NOT NULL
        );
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_prompts_project_id ON prompts(project_id);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_prompts_kind ON prompts(prompt_kind);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_prompts_archived ON prompts(archived_at);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_prompt_versions_project_id ON prompt_versions(project_id);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_id ON prompt_versions(prompt_id);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_prompt_versions_kind ON prompt_versions(prompt_kind);")


def _dumps(v: Any) -> Optional[str]:
    if v is None:
        return None
    return json.dumps(v, ensure_ascii=False, separators=(",", ":"))


def _loads(s: Optional[str]) -> Any:
    if s is None or s == "":
        return None
    try:
        return json.loads(s)
    except Exception:
        return None


# ----------------------------
# Prompts
# ----------------------------
def insert_prompt(row: Dict[str, Any]) -> None:
    with _conn() as conn:
        _ensure_tables(conn)
        conn.execute(
            """
            INSERT INTO prompts (
                id, project_id, name, prompt_kind, content_text, composition_blocks_json,
                searchable_text, created_at, updated_at, archived_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                row["id"],
                row.get("project_id"),
                row["name"],
                row["prompt_kind"],
                row["content_text"],
                _dumps(row.get("composition_blocks")),
                row["searchable_text"],
                row["created_at"],
                row["updated_at"],
                row.get("archived_at"),
            ),
        )


def get_prompt(prompt_id: str) -> Optional[Dict[str, Any]]:
    with _conn() as conn:
        _ensure_tables(conn)
        cur = conn.execute("SELECT * FROM prompts WHERE id = ?;", (prompt_id,))
        r = cur.fetchone()
        if not r:
            return None
        d = dict(r)
        d["composition_blocks"] = _loads(d.pop("composition_blocks_json", None))
        return d


def update_prompt(prompt_id: str, patch: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    fields = []
    values: List[Any] = []
    for k in ["name", "content_text", "searchable_text", "archived_at", "updated_at"]:
        if k in patch:
            fields.append(f"{k} = ?")
            values.append(patch[k])

    if "composition_blocks" in patch:
        fields.append("composition_blocks_json = ?")
        values.append(_dumps(patch.get("composition_blocks")))

    if not fields:
        return get_prompt(prompt_id)

    values.append(prompt_id)

    with _conn() as conn:
        _ensure_tables(conn)
        conn.execute(f"UPDATE prompts SET {', '.join(fields)} WHERE id = ?;", tuple(values))
    return get_prompt(prompt_id)


def list_prompts(
    *,
    q: Optional[str],
    prompt_kind: Optional[str],
    project_id: Optional[str],
    archived: bool,
    limit: int,
    offset: int,
    sort_sql: str,
    sort_params: Tuple[Any, ...],
) -> Dict[str, Any]:
    where = []
    params: List[Any] = []

    if project_id is not None:
        where.append("project_id = ?")
        params.append(project_id)

    if prompt_kind is not None:
        where.append("prompt_kind = ?")
        params.append(prompt_kind)

    if q:
        where.append("(name LIKE ? OR searchable_text LIKE ? OR content_text LIKE ?)")
        like = f"%{q}%"
        params.extend([like, like, like])

    if not archived:
        where.append("archived_at IS NULL")

    where_sql = ("WHERE " + " AND ".join(where)) if where else ""

    with _conn() as conn:
        _ensure_tables(conn)
        cur = conn.execute(f"SELECT COUNT(1) AS cnt FROM prompts {where_sql};", tuple(params))
        total = int(cur.fetchone()["cnt"])

        cur = conn.execute(
            f"""
            SELECT * FROM prompts
            {where_sql}
            ORDER BY {sort_sql}
            LIMIT ? OFFSET ?;
            """,
            tuple(params) + sort_params + (limit, offset),
        )
        rows = []
        for r in cur.fetchall():
            d = dict(r)
            d["composition_blocks"] = _loads(d.pop("composition_blocks_json", None))
            rows.append(d)

    return {"items": rows, "total": total, "limit": limit, "offset": offset}


# ----------------------------
# PromptVersions (immutable)
# ----------------------------
def insert_prompt_version(row: Dict[str, Any]) -> None:
    with _conn() as conn:
        _ensure_tables(conn)
        conn.execute(
            """
            INSERT INTO prompt_versions (
                id, project_id, prompt_id, version_label, prompt_kind, resolved_prompt_text,
                resolved_params_json, role_bindings_json, workflow_ref_json, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                row["id"],
                row["project_id"],
                row.get("prompt_id"),
                row["version_label"],
                row["prompt_kind"],
                row["resolved_prompt_text"],
                _dumps(row.get("resolved_params")),
                _dumps(row.get("role_bindings")),
                _dumps(row.get("workflow_ref")),
                row["created_at"],
            ),
        )


def get_prompt_version(pv_id: str) -> Optional[Dict[str, Any]]:
    with _conn() as conn:
        _ensure_tables(conn)
        cur = conn.execute("SELECT * FROM prompt_versions WHERE id = ?;", (pv_id,))
        r = cur.fetchone()
        if not r:
            return None
        d = dict(r)
        d["resolved_params"] = _loads(d.pop("resolved_params_json", None))
        d["role_bindings"] = _loads(d.pop("role_bindings_json", None))
        d["workflow_ref"] = _loads(d.pop("workflow_ref_json", None))
        return d


def list_prompt_versions(
    *,
    project_id: str,
    prompt_id: Optional[str],
    prompt_kind: Optional[str],
    q: Optional[str],
    limit: int,
    offset: int,
    sort_sql: str,
    sort_params: Tuple[Any, ...],
) -> Dict[str, Any]:
    where = ["project_id = ?"]
    params: List[Any] = [project_id]

    if prompt_id is not None:
        where.append("prompt_id = ?")
        params.append(prompt_id)

    if prompt_kind is not None:
        where.append("prompt_kind = ?")
        params.append(prompt_kind)

    if q:
        where.append("(version_label LIKE ? OR resolved_prompt_text LIKE ?)")
        like = f"%{q}%"
        params.extend([like, like])

    where_sql = "WHERE " + " AND ".join(where)

    with _conn() as conn:
        _ensure_tables(conn)
        cur = conn.execute(f"SELECT COUNT(1) AS cnt FROM prompt_versions {where_sql};", tuple(params))
        total = int(cur.fetchone()["cnt"])

        cur = conn.execute(
            f"""
            SELECT * FROM prompt_versions
            {where_sql}
            ORDER BY {sort_sql}
            LIMIT ? OFFSET ?;
            """,
            tuple(params) + sort_params + (limit, offset),
        )
        rows = []
        for r in cur.fetchall():
            d = dict(r)
            d["resolved_params"] = _loads(d.pop("resolved_params_json", None))
            d["role_bindings"] = _loads(d.pop("role_bindings_json", None))
            d["workflow_ref"] = _loads(d.pop("workflow_ref_json", None))
            rows.append(d)

    return {"items": rows, "total": total, "limit": limit, "offset": offset}
