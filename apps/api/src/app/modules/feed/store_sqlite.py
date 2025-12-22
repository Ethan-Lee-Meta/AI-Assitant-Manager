from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple

from app.modules.episodes_or_videos import store_sqlite as eov_store
from app.modules.episodes_or_videos.dto import EpisodeOrVideoKind

# Keep a small whitelist to avoid SQL injection via ORDER BY
ALLOWED_SORT_FIELDS = {"created_at", "updated_at", "order_index", "title"}


def _parse_sort(sort: Optional[str]) -> Tuple[str, str]:
    """
    Accept:
      - "-created_at"
      - "created_at"
      - "created_at:asc|desc"
      - "created_at:ASC|DESC"
    Fallback: created_at DESC
    """
    s = (sort or "").strip()
    if not s:
        return ("created_at", "DESC")

    field = "created_at"
    direction = "DESC"

    if ":" in s:
        a, b = s.split(":", 1)
        a = (a or "").strip()
        b = (b or "").strip().lower()
        if a:
            field = a
        if b in ("asc", "desc"):
            direction = b.upper()
    elif s.startswith("-"):
        field = s[1:].strip() or "created_at"
        direction = "DESC"
    else:
        field = s
        direction = "ASC"

    if field not in ALLOWED_SORT_FIELDS:
        return ("created_at", "DESC")

    return (field, direction)


def _norm_kind_param(kind: Any) -> Optional[str]:
    """
    Normalize input kind into 'episode'|'video' (lowercase).
    Accept Enum, raw strings, and defensive cases.
    """
    if kind is None:
        return None
    if hasattr(kind, "value"):
        kind = getattr(kind, "value")
    s = str(kind).strip()
    if not s:
        return None
    # tolerate "EpisodeOrVideoKind.video" style
    if "." in s:
        s = s.split(".")[-1]
    return s.strip().lower()


def _norm_kind_db(v: Any) -> str:
    """
    Normalize db kind value into 'episode'|'video' where possible.
    """
    s = str(v or "").strip()
    if "." in s:
        s = s.split(".")[-1]
    return s.strip().lower()


def list_feed_items(
    *,
    project_id: Optional[str],
    series_id: Optional[str],
    kind: Optional[EpisodeOrVideoKind],
    q: Optional[str],
    archived: bool,
    limit: int,
    offset: int,
    sort: Optional[str],
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Read-only aggregation over episodes_or_videos table.
    Filters:
      - project_id (optional)
      - series_id  (optional)
      - kind       (optional)
      - q          (optional, matches title or synopsis_text)
      - archived   (False => archived_at IS NULL, True => archived_at IS NOT NULL)
    """
    conn = eov_store._connect()
    eov_store._ensure(conn)

    where: List[str] = []
    params: List[Any] = []

    pid = (project_id or "").strip()
    sid = (series_id or "").strip()
    k = _norm_kind_param(kind)
    text = (q or "").strip()

    if pid:
        where.append("project_id = ?")
        params.append(pid)

    if sid:
        where.append("series_id = ?")
        params.append(sid)

    # HARDEN: tolerate different enum string shapes / casing.
    # We compare both the raw lower(kind) and the suffix-after-dot lower(substr(...)).
    if k:
        where.append("(lower(kind) = ? OR lower(substr(kind, instr(kind, '.') + 1)) = ?)")
        params.extend([k, k])

    if text:
        like = f"%{text}%"
        where.append("(title LIKE ? OR synopsis_text LIKE ?)")
        params.extend([like, like])

    if archived:
        where.append("archived_at IS NOT NULL")
    else:
        where.append("archived_at IS NULL")

    where_sql = (" WHERE " + " AND ".join(where)) if where else ""

    sort_field, sort_dir = _parse_sort(sort)
    # stable-ish secondary order
    order_sql = f" ORDER BY {sort_field} {sort_dir}, created_at DESC"

    total = conn.execute(f"SELECT COUNT(1) FROM episodes_or_videos{where_sql}", params).fetchone()[0]

    rows = conn.execute(
        f"""
        SELECT
          id,
          project_id,
          series_id,
          kind,
          title,
          order_index,
          created_at,
          updated_at,
          archived_at
        FROM episodes_or_videos
        {where_sql}
        {order_sql}
        LIMIT ? OFFSET ?
        """,
        [*params, int(limit), int(offset)],
    ).fetchall()

    items: List[Dict[str, Any]] = []
    for r in rows:
        items.append(
            {
                "item_type": "episode_or_video",
                "id": r[0],
                "project_id": r[1],
                "series_id": r[2],
                "kind": _norm_kind_db(r[3]),
                "title": r[4],
                "order_index": r[5],
                "created_at": r[6],
                "updated_at": r[7],
                "archived_at": r[8],
            }
        )

    return items, int(total)
