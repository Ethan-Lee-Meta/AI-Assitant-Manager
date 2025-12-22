from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import os
import sqlite3
import uuid


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _default_db_path() -> str:
    # Align with other sqlite-based modules (best-effort)
    # Use env if present; otherwise local file under apps/api/.data
    return (
        os.getenv("AAM_SQLITE_PATH")
        or os.getenv("SQLITE_PATH")
        or str(Path("apps/api/.data/app.sqlite").resolve())
    )


def _connect() -> sqlite3.Connection:
    path = _default_db_path()
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def _ensure(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS episodes_or_videos (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          series_id TEXT NOT NULL,
          title TEXT NOT NULL,
          synopsis_text TEXT,
          kind TEXT NOT NULL,
          order_index INTEGER,
          script_text TEXT,
          assembly_preset_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT,
          archived_at TEXT
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_eov_project ON episodes_or_videos(project_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_eov_series ON episodes_or_videos(series_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_eov_kind ON episodes_or_videos(kind)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_eov_archived ON episodes_or_videos(archived_at)")
    conn.commit()


def create(payload: Dict[str, Any]) -> Dict[str, Any]:
    conn = _connect()
    _ensure(conn)
    eid = uuid.uuid4().hex
    now = _now_iso()

    conn.execute(
        """
        INSERT INTO episodes_or_videos(
          id, project_id, series_id, title, synopsis_text, kind,
          order_index, script_text, assembly_preset_id,
          created_at, updated_at, archived_at
        )
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
        """,
        (
            eid,
            payload["project_id"],
            payload["series_id"],
            payload["title"],
            payload.get("synopsis_text"),
            payload["kind"],
            payload.get("order_index"),
            payload.get("script_text"),
            payload.get("assembly_preset_id"),
            now,
            now,
            None,
        ),
    )
    conn.commit()
    return get(eid)


def get(episode_or_video_id: str) -> Dict[str, Any]:
    conn = _connect()
    _ensure(conn)
    row = conn.execute(
        "SELECT * FROM episodes_or_videos WHERE id=?",
        (episode_or_video_id,),
    ).fetchone()
    if row is None:
        raise KeyError("NOT_FOUND")
    return dict(row)


def update(episode_or_video_id: str, patch: Dict[str, Any]) -> Dict[str, Any]:
    cur = get(episode_or_video_id)  # raises if missing
    conn = _connect()
    _ensure(conn)

    merged = {**cur, **patch}
    merged["updated_at"] = _now_iso()

    conn.execute(
        """
        UPDATE episodes_or_videos
        SET
          title=?,
          synopsis_text=?,
          order_index=?,
          script_text=?,
          assembly_preset_id=?,
          kind=?,
          series_id=?,
          project_id=?,
          updated_at=?,
          archived_at=?
        WHERE id=?
        """,
        (
            merged["title"],
            merged.get("synopsis_text"),
            merged.get("order_index"),
            merged.get("script_text"),
            merged.get("assembly_preset_id"),
            merged["kind"],
            merged["series_id"],
            merged["project_id"],
            merged["updated_at"],
            merged.get("archived_at"),
            episode_or_video_id,
        ),
    )
    conn.commit()
    return get(episode_or_video_id)


_ALLOWED_SORT_FIELDS = {"created_at", "updated_at", "order_index", "title"}


def _parse_sort(sort: Optional[str]) -> Tuple[str, str]:
    """
    Supports:
      - "-created_at" / "+title"
      - "created_at:desc" / "title:asc"
      - "title" (defaults asc)
    Invalid -> created_at desc
    """
    s = (sort or "").strip()
    if not s:
        return "created_at", "desc"

    field = ""
    direction = ""

    if ":" in s:
        field, _, direction = s.partition(":")
        field = field.strip()
        direction = (direction or "").strip().lower()
    elif s.startswith("-"):
        field = s[1:].strip()
        direction = "desc"
    elif s.startswith("+"):
        field = s[1:].strip()
        direction = "asc"
    else:
        field = s.strip()
        direction = "asc"

    if field not in _ALLOWED_SORT_FIELDS:
        return "created_at", "desc"
    if direction not in {"asc", "desc"}:
        direction = "desc"
    return field, direction


def list_items(
    *,
    project_id: str,
    series_id: Optional[str],
    kind: Optional[str],
    q: Optional[str],
    archived: bool,
    limit: int,
    offset: int,
    sort: str,
) -> Tuple[List[Dict[str, Any]], int]:
    conn = _connect()
    _ensure(conn)

    where: List[str] = []
    args: List[Any] = []

    where.append("project_id = ?")
    args.append(project_id)

    # archived semantics alignment:
    #   archived=false -> active only
    #   archived=true  -> archived only
    if archived:
        where.append("archived_at IS NOT NULL")
    else:
        where.append("archived_at IS NULL")

    if series_id:
        where.append("series_id = ?")
        args.append(series_id)

    if kind:
        where.append("kind = ?")
        args.append(kind)

    if q:
        where.append("(title LIKE ? OR synopsis_text LIKE ? OR script_text LIKE ?)")
        like = f"%{q}%"
        args.extend([like, like, like])

    where_sql = " WHERE " + " AND ".join(where)

    field, direction = _parse_sort(sort)

    # Stable ordering: always tie-break by created_at desc then id asc
    if field == "order_index":
        order_sql = f"""
        ORDER BY (order_index IS NULL) ASC,
                 order_index {direction},
                 created_at DESC,
                 id ASC
        """
    elif field == "updated_at":
        # Put NULLs last for updated_at
        order_sql = f"""
        ORDER BY (updated_at IS NULL) ASC,
                 updated_at {direction},
                 created_at DESC,
                 id ASC
        """
    elif field == "title":
        order_sql = f"""
        ORDER BY title {direction},
                 created_at DESC,
                 id ASC
        """
    else:
        order_sql = f"""
        ORDER BY {field} {direction},
                 id ASC
        """

    total_row = conn.execute(
        f"SELECT COUNT(1) AS c FROM episodes_or_videos{where_sql}",
        args,
    ).fetchone()
    total = int(total_row["c"]) if total_row else 0

    rows = conn.execute(
        f"""
        SELECT * FROM episodes_or_videos
        {where_sql}
        {order_sql}
        LIMIT ? OFFSET ?
        """,
        [*args, limit, offset],
    ).fetchall()

    return [dict(r) for r in rows], total
