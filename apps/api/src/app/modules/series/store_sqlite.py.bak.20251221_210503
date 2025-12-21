from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
from pathlib import Path
import os
import sqlite3
from datetime import datetime, timezone
import uuid

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()

def _default_db_path() -> str:
    # keep consistent with existing modules (env override first)
    return os.getenv("AAM_SQLITE_PATH") or os.getenv("SQLITE_PATH") or str(Path("apps/api/.data/app.sqlite").resolve())

def _connect() -> sqlite3.Connection:
    db_path = _default_db_path()
    Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def _ensure(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS series (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            name TEXT NOT NULL,
            style_text TEXT NOT NULL DEFAULT '',
            continuity_text TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            archived_at TEXT NULL
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_series_project_id ON series(project_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_series_created_at ON series(created_at)")

def create_series(data: Dict[str, Any]) -> Dict[str, Any]:
    conn = _connect()
    try:
        _ensure(conn)
        sid = uuid.uuid4().hex
        now = _now()
        row = {
            "id": sid,
            "project_id": data["project_id"],
            "name": data["name"],
            "style_text": data.get("style_text") or "",
            "continuity_text": data.get("continuity_text") or "",
            "created_at": now,
            "updated_at": now,
            "archived_at": None,
        }
        conn.execute(
            """
            INSERT INTO series (id, project_id, name, style_text, continuity_text, created_at, updated_at, archived_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                row["id"], row["project_id"], row["name"], row["style_text"], row["continuity_text"],
                row["created_at"], row["updated_at"], row["archived_at"],
            ],
        )
        conn.commit()
        return row
    finally:
        conn.close()

def get_series(series_id: str) -> Optional[Dict[str, Any]]:
    conn = _connect()
    try:
        _ensure(conn)
        r = conn.execute("SELECT * FROM series WHERE id=?", [series_id]).fetchone()
        return dict(r) if r else None
    finally:
        conn.close()

def list_series(
    *,
    project_id: str,
    q: Optional[str],
    archived: Optional[bool],
    limit: int,
    offset: int,
) -> Tuple[List[Dict[str, Any]], int]:
    conn = _connect()
    try:
        _ensure(conn)
        where = ["project_id=?"]
        args: List[Any] = [project_id]

        if q:
            where.append("name LIKE ?")
            args.append(f"%{q}%")

        if archived is True:
            where.append("archived_at IS NOT NULL")
        elif archived is False:
            where.append("archived_at IS NULL")

        where_sql = " WHERE " + " AND ".join(where)
        total = conn.execute(f"SELECT COUNT(1) AS c FROM series{where_sql}", args).fetchone()["c"]

        rows = conn.execute(
            f"SELECT * FROM series{where_sql} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            [*args, int(limit), int(offset)],
        ).fetchall()
        items = [dict(r) for r in rows]
        return items, int(total)
    finally:
        conn.close()

def update_series(series_id: str, patch: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    conn = _connect()
    try:
        _ensure(conn)
        current = conn.execute("SELECT * FROM series WHERE id=?", [series_id]).fetchone()
        if not current:
            return None

        # apply patch (including explicit None)
        allowed = {"name", "style_text", "continuity_text", "archived_at"}
        sets = []
        args: List[Any] = []
        for k, v in patch.items():
            if k not in allowed:
                continue
            sets.append(f"{k}=?")
            args.append(v)

        # always update updated_at if anything patched
        if sets:
            sets.append("updated_at=?")
            args.append(_now())
            args.append(series_id)
            sql = f"UPDATE series SET {', '.join(sets)} WHERE id=?"
            conn.execute(sql, args)
            conn.commit()

        r = conn.execute("SELECT * FROM series WHERE id=?", [series_id]).fetchone()
        return dict(r) if r else None
    finally:
        conn.close()
