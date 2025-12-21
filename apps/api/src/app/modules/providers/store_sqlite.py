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
    # best-effort: align with existing env if present; otherwise local file under apps/api
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
        CREATE TABLE IF NOT EXISTS providers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          provider_type TEXT NOT NULL,
          supported_kinds TEXT NOT NULL,
          endpoint_config TEXT,
          is_enabled INTEGER NOT NULL,
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
    pid = uuid.uuid4().hex
    now = _now()
    conn.execute(
        """
        INSERT INTO providers(id,name,provider_type,supported_kinds,endpoint_config,is_enabled,created_at,updated_at,archived_at)
        VALUES(?,?,?,?,?,?,?,?,?)
        """,
        (
            pid,
            payload["name"],
            payload["provider_type"],
            json.dumps(payload["supported_kinds"]),
            json.dumps(payload.get("endpoint_config")) if payload.get("endpoint_config") is not None else None,
            1 if payload.get("is_enabled", True) else 0,
            now,
            now,
            None,
        ),
    )
    conn.commit()
    return get(pid)

def get(provider_id: str) -> Dict[str, Any]:
    conn = _connect()
    _ensure(conn)
    row = conn.execute("SELECT * FROM providers WHERE id=?", (provider_id,)).fetchone()
    if row is None:
        raise KeyError("NOT_FOUND")
    d = dict(row)
    d["supported_kinds"] = json.loads(d["supported_kinds"]) if d.get("supported_kinds") else []
    d["endpoint_config"] = json.loads(d["endpoint_config"]) if d.get("endpoint_config") else None
    d["is_enabled"] = bool(d["is_enabled"])
    return d

def update(provider_id: str, patch: Dict[str, Any]) -> Dict[str, Any]:
    cur = get(provider_id)  # raises if missing
    conn = _connect()
    _ensure(conn)

    merged = {**cur, **patch}
    merged["updated_at"] = _now()

    conn.execute(
        """
        UPDATE providers
        SET name=?, provider_type=?, supported_kinds=?, endpoint_config=?, is_enabled=?, updated_at=?, archived_at=?
        WHERE id=?
        """,
        (
            merged["name"],
            merged["provider_type"],
            json.dumps(merged["supported_kinds"]),
            json.dumps(merged.get("endpoint_config")) if merged.get("endpoint_config") is not None else None,
            1 if merged.get("is_enabled", True) else 0,
            merged["updated_at"],
            merged.get("archived_at"),
            provider_id,
        ),
    )
    conn.commit()
    return get(provider_id)

def list_items(
    *,
    q: Optional[str],
    provider_type: Optional[str],
    is_enabled: Optional[bool],
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

    if provider_type:
        where.append("provider_type = ?")
        args.append(provider_type)

    if is_enabled is not None:
        where.append("is_enabled = ?")
        args.append(1 if is_enabled else 0)

    where_sql = (" WHERE " + " AND ".join(where)) if where else ""
    total = conn.execute(f"SELECT COUNT(1) AS c FROM providers{where_sql}", args).fetchone()["c"]

    rows = conn.execute(
        f"SELECT * FROM providers{where_sql} ORDER BY created_at DESC LIMIT ? OFFSET ?",
        [*args, limit, offset],
    ).fetchall()

    items: List[Dict[str, Any]] = []
    for r in rows:
        d = dict(r)
        d["supported_kinds"] = json.loads(d["supported_kinds"]) if d.get("supported_kinds") else []
        d["endpoint_config"] = json.loads(d["endpoint_config"]) if d.get("endpoint_config") else None
        d["is_enabled"] = bool(d["is_enabled"])
        items.append(d)

    return items, int(total)
