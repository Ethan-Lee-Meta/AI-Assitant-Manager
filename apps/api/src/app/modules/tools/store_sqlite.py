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
        CREATE TABLE IF NOT EXISTS tools (
          id TEXT PRIMARY KEY,
          project_id TEXT,
          name TEXT NOT NULL,
          tool_type TEXT NOT NULL,
          config TEXT NOT NULL,
          description TEXT,
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
    tid = uuid.uuid4().hex
    now = _now()
    conn.execute(
        """
        INSERT INTO tools(id,project_id,name,tool_type,config,description,created_at,updated_at,archived_at)
        VALUES(?,?,?,?,?,?,?,?,?)
        """,
        (
            tid,
            payload.get("project_id"),
            payload["name"],
            payload["tool_type"],
            json.dumps(payload["config"]),
            payload.get("description"),
            now,
            now,
            None,
        ),
    )
    conn.commit()
    return get(tid)

def get(tool_id: str) -> Dict[str, Any]:
    conn = _connect()
    _ensure(conn)
    row = conn.execute("SELECT * FROM tools WHERE id=?", (tool_id,)).fetchone()
    if row is None:
        raise KeyError("NOT_FOUND")
    d = dict(row)
    d["config"] = json.loads(d["config"]) if d.get("config") else {}
    return d

def update(tool_id: str, patch: Dict[str, Any]) -> Dict[str, Any]:
    cur = get(tool_id)
    conn = _connect()
    _ensure(conn)
    merged = {**cur, **patch}
    merged["updated_at"] = _now()
    conn.execute(
        """
        UPDATE tools
        SET project_id=?, name=?, tool_type=?, config=?, description=?, updated_at=?, archived_at=?
        WHERE id=?
        """,
        (
            merged.get("project_id"),
            merged["name"],
            merged["tool_type"],
            json.dumps(merged.get("config") or {}),
            merged.get("description"),
            merged["updated_at"],
            merged.get("archived_at"),
            tool_id,
        ),
    )
    conn.commit()
    return get(tool_id)

def list_items(
    *,
    q: Optional[str],
    tool_type: Optional[str],
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
    if tool_type:
        where.append("tool_type=?")
        args.append(tool_type)
    if project_id:
        where.append("project_id=?")
        args.append(project_id)
    where_sql = (" WHERE " + " AND ".join(where)) if where else ""
    total = conn.execute(f"SELECT COUNT(1) AS c FROM tools{where_sql}", args).fetchone()["c"]
    rows = conn.execute(
        f"SELECT * FROM tools{where_sql} ORDER BY created_at DESC LIMIT ? OFFSET ?",
        [*args, limit, offset],
    ).fetchall()
    items: List[Dict[str, Any]] = []
    for r in rows:
        d = dict(r)
        d["config"] = json.loads(d["config"]) if d.get("config") else {}
        items.append(d)
    return items, int(total)
