from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple
from pathlib import Path
import json
import os
import sqlite3
from datetime import datetime, timezone
import uuid

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()

def _default_db_path() -> str:
    return os.getenv("AAM_SQLITE_PATH") or os.getenv("SQLITE_PATH") or str(Path("apps/api/.data/app.sqlite").resolve())

def _connect() -> sqlite3.Connection:
    path = _default_db_path()
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn

def _ensure(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS workflows (
          id TEXT PRIMARY KEY,
          project_id TEXT,
          name TEXT NOT NULL,
          workflow_type TEXT NOT NULL,
          workflow_blob_asset_id TEXT,
          default_params TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT,
          archived_at TEXT
        )
        """
    )
    conn.commit()

def create(payload: Dict[str, Any]) -> Dict[str, Any]:
    conn = _connect()
    _ensure(conn)
    wid = uuid.uuid4().hex
    now = _now()
    conn.execute(
        """
        INSERT INTO workflows(id,project_id,name,workflow_type,workflow_blob_asset_id,default_params,created_at,updated_at,archived_at)
        VALUES(?,?,?,?,?,?,?,?,?)
        """,
        (
            wid,
            payload.get("project_id"),
            payload["name"],
            payload["workflow_type"],
            payload.get("workflow_blob_asset_id"),
            json.dumps(payload.get("default_params")) if payload.get("default_params") is not None else None,
            now,
            now,
            None,
        ),
    )
    conn.commit()
    return get(wid)

def get(workflow_id: str) -> Dict[str, Any]:
    conn = _connect()
    _ensure(conn)
    row = conn.execute("SELECT * FROM workflows WHERE id=?", (workflow_id,)).fetchone()
    if row is None:
        raise KeyError("NOT_FOUND")
    d = dict(row)
    d["default_params"] = json.loads(d["default_params"]) if d.get("default_params") else None
    return d

def update(workflow_id: str, patch: Dict[str, Any]) -> Dict[str, Any]:
    cur = get(workflow_id)
    conn = _connect()
    _ensure(conn)
    merged = {**cur, **patch}
    merged["updated_at"] = _now()
    conn.execute(
        """
        UPDATE workflows
        SET project_id=?, name=?, workflow_type=?, workflow_blob_asset_id=?, default_params=?, updated_at=?, archived_at=?
        WHERE id=?
        """,
        (
            merged.get("project_id"),
            merged["name"],
            merged["workflow_type"],
            merged.get("workflow_blob_asset_id"),
            json.dumps(merged.get("default_params")) if merged.get("default_params") is not None else None,
            merged["updated_at"],
            merged.get("archived_at"),
            workflow_id,
        ),
    )
    conn.commit()
    return get(workflow_id)

def list_items(
    *,
    q: Optional[str],
    workflow_type: Optional[str],
    project_id: Optional[str],
    archived: bool,
    limit: int,
    offset: int,
) -> Tuple[List[Dict[str, Any]], int]:
    conn = _connect()
    _ensure(conn)
    where = []
    args: list[Any] = []
    if not archived:
        where.append("archived_at IS NULL")
    if q:
        where.append("name LIKE ?")
        args.append(f"%{q}%")
    if workflow_type:
        where.append("workflow_type=?")
        args.append(workflow_type)
    if project_id:
        where.append("project_id=?")
        args.append(project_id)
    where_sql = (" WHERE " + " AND ".join(where)) if where else ""
    total = conn.execute(f"SELECT COUNT(1) AS c FROM workflows{where_sql}", args).fetchone()["c"]
    rows = conn.execute(
        f"SELECT * FROM workflows{where_sql} ORDER BY created_at DESC LIMIT ? OFFSET ?",
        [*args, limit, offset],
    ).fetchall()
    items: List[Dict[str, Any]] = []
    for r in rows:
        d = dict(r)
        d["default_params"] = json.loads(d["default_params"]) if d.get("default_params") else None
        items.append(d)
    return items, int(total)
