from __future__ import annotations

import json
import os
import sqlite3
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional


def _default_db_path() -> str:
    return os.getenv("AAM_SQLITE_PATH") or os.getenv("SQLITE_PATH") or str(Path("apps/api/.data/app.sqlite").resolve())


def _connect() -> sqlite3.Connection:
    path = _default_db_path()
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def _utc_now_iso() -> str:
    # keep consistent with existing modules: ISO-ish string with Z
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _ensure(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS series (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          name TEXT NOT NULL,
          style_text TEXT,
          continuity_text TEXT,
          prompt_ids TEXT NOT NULL DEFAULT '[]',
          role_ids TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL,
          updated_at TEXT,
          archived_at TEXT
        );
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_series_project_id ON series(project_id);")

    # migrate older DBs
    cur = conn.cursor()
    for col, ddl in [
        ("prompt_ids", "ALTER TABLE series ADD COLUMN prompt_ids TEXT NOT NULL DEFAULT '[]'"),
        ("role_ids", "ALTER TABLE series ADD COLUMN role_ids TEXT NOT NULL DEFAULT '[]'"),
    ]:
        try:
            cur.execute(ddl)
        except sqlite3.OperationalError:
            # already exists or table definition different; ignore
            pass


def _row_to_dict(r: sqlite3.Row) -> Dict[str, Any]:
    d = dict(r)
    for k in ("prompt_ids", "role_ids"):
        v = d.get(k)
        if v is None or v == "":
            d[k] = []
        elif isinstance(v, str):
            try:
                d[k] = json.loads(v)
            except Exception:
                d[k] = []
        elif isinstance(v, list):
            d[k] = v
        else:
            d[k] = []
    return d


# ---- normalization helpers (avoid 500 caused by key-name mismatch) ----
_KEYMAP = {
    # canonical <- possible aliases
    "project_id": ("project_id", "projectId"),
    "name": ("name",),
    "style_text": ("style_text", "styleText", "style_profile_text", "styleProfileText"),
    "continuity_text": ("continuity_text", "continuityText", "continuity_notes", "continuityNotes"),
    "prompt_ids": ("prompt_ids", "promptIds"),
    "role_ids": ("role_ids", "roleIds"),
    "archived_at": ("archived_at", "archivedAt"),
}


def _pick(payload: Dict[str, Any], canonical: str) -> Any:
    for k in _KEYMAP.get(canonical, (canonical,)):
        if k in payload:
            return payload.get(k)
    return None


def _normalize_create(payload: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = dict(payload)

    # map known aliases into canonical keys (do not drop original keys)
    for canonical in _KEYMAP.keys():
        if canonical not in out:
            v = _pick(payload, canonical)
            if v is not None or any(k in payload for k in _KEYMAP[canonical]):
                out[canonical] = v

    # normalize arrays
    out["prompt_ids"] = out.get("prompt_ids") or []
    out["role_ids"] = out.get("role_ids") or []
    return out


def _normalize_patch(patch: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for canonical, keys in _KEYMAP.items():
        for k in keys:
            if k in patch:
                # IMPORTANT: keep explicit null (e.g., archived_at: None)
                out[canonical] = patch.get(k)
                break

    # keep any already-canonical keys that we didn't map above
    for k, v in patch.items():
        if k in _KEYMAP:
            out[k] = v
    return out


def create(payload: Dict[str, Any]) -> Dict[str, Any]:
    conn = _connect()
    _ensure(conn)

    p = _normalize_create(payload)

    sid = p.get("id") or f"s_{uuid.uuid4().hex[:12]}"
    now = _utc_now_iso()

    conn.execute(
        """
        INSERT INTO series (id, project_id, name, style_text, continuity_text, prompt_ids, role_ids, created_at, updated_at, archived_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            sid,
            p["project_id"],
            p["name"],
            p.get("style_text"),
            p.get("continuity_text"),
            json.dumps(p.get("prompt_ids") or [], ensure_ascii=False),
            json.dumps(p.get("role_ids") or [], ensure_ascii=False),
            now,
            now,
            p.get("archived_at"),
        ),
    )
    conn.commit()

    return get(sid)


def get(series_id: str) -> Dict[str, Any]:
    conn = _connect()
    _ensure(conn)

    r = conn.execute("SELECT * FROM series WHERE id = ?", (series_id,)).fetchone()
    if not r:
        raise KeyError("NOT_FOUND")
    return _row_to_dict(r)


def update(series_id: str, patch: Dict[str, Any]) -> Dict[str, Any]:
    conn = _connect()
    _ensure(conn)

    cur = conn.cursor()
    old = cur.execute("SELECT * FROM series WHERE id = ?", (series_id,)).fetchone()
    if not old:
        raise KeyError("NOT_FOUND")
    merged = _row_to_dict(old)

    p = _normalize_patch(patch)

    # apply patch (preserve ability to clear archived_at via explicit null)
    for k, v in p.items():
        if k in ("prompt_ids", "role_ids"):
            merged[k] = v or []
        else:
            merged[k] = v

    merged["updated_at"] = _utc_now_iso()

    cur.execute(
        """
        UPDATE series
        SET
          project_id = ?,
          name = ?,
          style_text = ?,
          continuity_text = ?,
          prompt_ids = ?,
          role_ids = ?,
          updated_at = ?,
          archived_at = ?
        WHERE id = ?
        """,
        (
            merged["project_id"],
            merged["name"],
            merged.get("style_text"),
            merged.get("continuity_text"),
            json.dumps(merged.get("prompt_ids") or [], ensure_ascii=False),
            json.dumps(merged.get("role_ids") or [], ensure_ascii=False),
            merged.get("updated_at"),
            merged.get("archived_at"),
            series_id,
        ),
    )
    conn.commit()
    return get(series_id)


def delete(series_id: str) -> None:
    conn = _connect()
    _ensure(conn)
    cur = conn.cursor()
    cur.execute("DELETE FROM series WHERE id = ?", (series_id,))
    conn.commit()


def list_items(
    project_id: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Dict[str, Any]:
    conn = _connect()
    _ensure(conn)

    where: List[str] = []
    args: List[Any] = []

    # project_id optional: if missing, list across all projects (per your latest requirement)
    if project_id:
        where.append("project_id = ?")
        args.append(project_id)

    if q:
        where.append("name LIKE ?")
        args.append(f"%{q}%")

    where_sql = (" WHERE " + " AND ".join(where)) if where else ""
    total = conn.execute(f"SELECT COUNT(1) AS c FROM series{where_sql}", tuple(args)).fetchone()["c"]

    rows = conn.execute(
        f"""
        SELECT *
        FROM series
        {where_sql}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        """,
        tuple(args + [limit, offset]),
    ).fetchall()

    return {
        "total": int(total),
        "items": [_row_to_dict(r) for r in rows],
        "limit": int(limit),
        "offset": int(offset),
    }
