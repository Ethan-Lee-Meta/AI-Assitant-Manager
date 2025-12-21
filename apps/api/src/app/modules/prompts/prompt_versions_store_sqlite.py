from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def _repo_api_root_from_here() -> Path:
    # .../apps/api/src/app/modules/prompts/<this_file>
    p = Path(__file__).resolve()
    # parents: prompts(0)->modules(1)->app(2)->src(3)->api(4)->apps(5)-><repo>(6)
    # We want .../apps/api
    return p.parents[4]


def _db_path() -> Path:
    api_root = _repo_api_root_from_here()  # .../apps/api
    data_dir = api_root / ".data"
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / "app.db"


def connect() -> sqlite3.Connection:
    db = str(_db_path())
    conn = sqlite3.connect(db, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_tables(conn: sqlite3.Connection) -> None:
    # Create prompt_versions table only; it can coexist with existing prompts table created elsewhere.
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS prompt_versions (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          prompt_id TEXT NULL,
          version_label TEXT NOT NULL,
          prompt_kind TEXT NOT NULL,
          resolved_prompt_text TEXT NOT NULL,
          resolved_params TEXT NULL,
          role_bindings TEXT NULL,
          workflow_ref TEXT NULL,
          created_at TEXT NOT NULL
        )
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS ix_prompt_versions_project_id ON prompt_versions(project_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS ix_prompt_versions_prompt_id ON prompt_versions(prompt_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS ix_prompt_versions_kind ON prompt_versions(prompt_kind)")
    conn.execute("CREATE INDEX IF NOT EXISTS ix_prompt_versions_created_at ON prompt_versions(created_at)")


def _jdump(v: Any) -> Optional[str]:
    if v is None:
        return None
    return json.dumps(v, ensure_ascii=False, separators=(",", ":"))


def _jload(s: Optional[str]) -> Any:
    if s is None:
        return None
    try:
        return json.loads(s)
    except Exception:
        return None


def insert_prompt_version(conn: sqlite3.Connection, row: Dict[str, Any]) -> None:
    ensure_tables(conn)
    conn.execute(
        """
        INSERT INTO prompt_versions (
          id, project_id, prompt_id, version_label, prompt_kind,
          resolved_prompt_text, resolved_params, role_bindings, workflow_ref, created_at
        ) VALUES (
          :id, :project_id, :prompt_id, :version_label, :prompt_kind,
          :resolved_prompt_text, :resolved_params, :role_bindings, :workflow_ref, :created_at
        )
        """,
        {
            **row,
            "resolved_params": _jdump(row.get("resolved_params")),
            "role_bindings": _jdump(row.get("role_bindings")),
            "workflow_ref": _jdump(row.get("workflow_ref")),
        },
    )


def get_prompt_version(conn: sqlite3.Connection, pv_id: str) -> Optional[Dict[str, Any]]:
    ensure_tables(conn)
    cur = conn.execute("SELECT * FROM prompt_versions WHERE id = ?", (pv_id,))
    r = cur.fetchone()
    if not r:
        return None
    d = dict(r)
    d["resolved_params"] = _jload(d.get("resolved_params"))
    d["role_bindings"] = _jload(d.get("role_bindings"))
    d["workflow_ref"] = _jload(d.get("workflow_ref"))
    return d


def list_prompt_versions(
    conn: sqlite3.Connection,
    *,
    project_id: str,
    prompt_id: Optional[str],
    prompt_kind: Optional[str],
    q: Optional[str],
    offset: int,
    limit: int,
    order_by_sql: str,
) -> Tuple[List[Dict[str, Any]], int]:
    ensure_tables(conn)

    where = ["project_id = ?"]
    args: List[Any] = [project_id]

    if prompt_id:
        where.append("prompt_id = ?")
        args.append(prompt_id)
    if prompt_kind:
        where.append("prompt_kind = ?")
        args.append(prompt_kind)
    if q:
        where.append("resolved_prompt_text LIKE ?")
        args.append(f"%{q}%")

    where_sql = " AND ".join(where)

    cur = conn.execute(f"SELECT COUNT(1) AS c FROM prompt_versions WHERE {where_sql}", args)
    total = int(cur.fetchone()["c"])

    cur = conn.execute(
        f"""
        SELECT * FROM prompt_versions
        WHERE {where_sql}
        ORDER BY {order_by_sql}
        LIMIT ? OFFSET ?
        """,
        args + [int(limit), int(offset)],
    )
    rows = [dict(r) for r in cur.fetchall()]
    for d in rows:
        d["resolved_params"] = _jload(d.get("resolved_params"))
        d["role_bindings"] = _jload(d.get("role_bindings"))
        d["workflow_ref"] = _jload(d.get("workflow_ref"))
    return rows, total
