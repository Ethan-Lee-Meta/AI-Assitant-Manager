from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .dto import EncryptionPolicy, FaceMode, Project, ProjectType

# =========================
# M01 internal constants (frozen)
# =========================
# DB path MUST be: apps/api/.data/app.db
_APPS_API_DIR = Path(__file__).resolve().parents[5]  # .../apps/api
DB_PATH: Path = _APPS_API_DIR / ".data" / "app.db"
TABLE_PROJECTS = "projects"

ALLOWED_SORT_FIELDS = {"created_at", "updated_at", "name"}


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    try:
        conn.execute(
            f"""
            CREATE TABLE IF NOT EXISTS {TABLE_PROJECTS} (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                project_type TEXT NOT NULL,
                encryption_policy TEXT NOT NULL,
                default_face_mode TEXT NOT NULL,
                tags TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                archived_at TEXT
            )
            """
        )
        conn.execute(f"CREATE INDEX IF NOT EXISTS idx_{TABLE_PROJECTS}_archived ON {TABLE_PROJECTS}(archived_at)")
        conn.execute(f"CREATE INDEX IF NOT EXISTS idx_{TABLE_PROJECTS}_name ON {TABLE_PROJECTS}(name)")
        conn.commit()
    finally:
        conn.close()


def _connect() -> sqlite3.Connection:
    _ensure_db()
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _dt_to_iso(dt: Optional[datetime]) -> Optional[str]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def _iso_to_dt(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    return datetime.fromisoformat(s)


def _tags_to_text(tags: Optional[List[str]]) -> Optional[str]:
    if tags is None:
        return None
    return json.dumps(tags, ensure_ascii=False)


def _text_to_tags(s: Optional[str]) -> Optional[List[str]]:
    if not s:
        return None
    try:
        v = json.loads(s)
        if isinstance(v, list):
            return [str(x) for x in v]
    except Exception:
        return None
    return None


def _row_to_project(r: sqlite3.Row) -> Project:
    return Project(
        id=str(r["id"]),
        name=str(r["name"]),
        description=r["description"],
        project_type=ProjectType(str(r["project_type"])),
        encryption_policy=EncryptionPolicy(str(r["encryption_policy"])),
        default_face_mode=FaceMode(str(r["default_face_mode"])),
        tags=_text_to_tags(r["tags"]),
        created_at=_iso_to_dt(r["created_at"]) or _now_utc(),
        updated_at=_iso_to_dt(r["updated_at"]) or _now_utc(),
        archived_at=_iso_to_dt(r["archived_at"]),
    )


def insert_project(
    *,
    project_id: str,
    name: str,
    description: Optional[str],
    project_type: ProjectType,
    encryption_policy: EncryptionPolicy,
    default_face_mode: FaceMode,
    tags: Optional[List[str]],
) -> Project:
    now = _dt_to_iso(_now_utc())
    conn = _connect()
    try:
        conn.execute(
            f"""
            INSERT INTO {TABLE_PROJECTS}
            (id, name, description, project_type, encryption_policy, default_face_mode, tags, created_at, updated_at, archived_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                project_id,
                name,
                description,
                project_type.value,
                encryption_policy.value,
                default_face_mode.value,
                _tags_to_text(tags),
                now,
                now,
                None,
            ),
        )
        conn.commit()
        row = conn.execute(f"SELECT * FROM {TABLE_PROJECTS} WHERE id = ?", (project_id,)).fetchone()
        assert row is not None
        return _row_to_project(row)
    finally:
        conn.close()


def get_project(project_id: str) -> Optional[Project]:
    conn = _connect()
    try:
        row = conn.execute(f"SELECT * FROM {TABLE_PROJECTS} WHERE id = ?", (project_id,)).fetchone()
        if not row:
            return None
        return _row_to_project(row)
    finally:
        conn.close()


def update_project(project_id: str, updates: Dict[str, Any]) -> Optional[Project]:
    if not updates:
        return get_project(project_id)

    # always bump updated_at on any update
    updates = dict(updates)
    updates["updated_at"] = _dt_to_iso(_now_utc())

    cols = []
    vals = []
    for k, v in updates.items():
        if k == "tags":
            v = _tags_to_text(v)
        if k in ("created_at", "updated_at", "archived_at"):
            v = _dt_to_iso(v) if isinstance(v, datetime) else v
        cols.append(f"{k} = ?")
        vals.append(v)

    vals.append(project_id)

    conn = _connect()
    try:
        cur = conn.execute(f"UPDATE {TABLE_PROJECTS} SET {', '.join(cols)} WHERE id = ?", tuple(vals))
        conn.commit()
        if cur.rowcount == 0:
            return None
        row = conn.execute(f"SELECT * FROM {TABLE_PROJECTS} WHERE id = ?", (project_id,)).fetchone()
        if not row:
            return None
        return _row_to_project(row)
    finally:
        conn.close()


def list_projects(
    *,
    q: Optional[str],
    project_type: Optional[ProjectType],
    archived: bool,
    limit: int,
    offset: int,
    sort_field: str,
    sort_dir: str,
) -> Tuple[List[Project], int]:
    where = []
    params: List[Any] = []

    if archived:
        where.append("archived_at IS NOT NULL")
    else:
        where.append("archived_at IS NULL")

    if project_type is not None:
        where.append("project_type = ?")
        params.append(project_type.value)

    if q:
        where.append("(name LIKE ? OR COALESCE(description,'') LIKE ?)")
        like = f"%{q}%"
        params.extend([like, like])

    where_sql = (" WHERE " + " AND ".join(where)) if where else ""
    order_sql = f" ORDER BY {sort_field} {sort_dir}"

    conn = _connect()
    try:
        total_row = conn.execute(
            f"SELECT COUNT(1) AS cnt FROM {TABLE_PROJECTS}{where_sql}", tuple(params)
        ).fetchone()
        total = int(total_row["cnt"]) if total_row else 0

        rows = conn.execute(
            f"SELECT * FROM {TABLE_PROJECTS}{where_sql}{order_sql} LIMIT ? OFFSET ?",
            tuple(params + [int(limit), int(offset)]),
        ).fetchall()

        items = [_row_to_project(r) for r in rows]
        return items, total
    finally:
        conn.close()
