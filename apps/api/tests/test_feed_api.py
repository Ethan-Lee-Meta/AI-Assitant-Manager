import os
import importlib
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


def _load_app():
    # Try common entrypoints; avoids hard-coding your API entry file.
    candidates = ["app.main", "app.api", "app.server", "app.app"]
    for name in candidates:
        try:
            mod = importlib.import_module(name)
            app = getattr(mod, "app", None)
            if app is not None:
                return app
        except Exception:
            continue
    raise RuntimeError("Cannot locate FastAPI app. Add the real module to candidates in test_feed_api.py")


@pytest.fixture()
def client(tmp_path: Path):
    db_path = tmp_path / "test.sqlite"
    os.environ["AAM_SQLITE_PATH"] = str(db_path)

    app = _load_app()
    return TestClient(app)


def test_feed_defaults_and_filters(client: TestClient):
    # Create sample data via existing episodes_or_videos store.
    from app.modules.episodes_or_videos import store_sqlite as eov_store

    a = eov_store.create(
        {"project_id": "p1", "series_id": "s1", "title": "Ep A", "kind": "episode"}
    )
    b = eov_store.create(
        {"project_id": "p2", "series_id": "s2", "title": "Vid B", "kind": "video"}
    )

    # Default: archived=false, sort=-created_at (desc). We only assert it returns both.
    r = client.get("/api/feed?limit=50&offset=0")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] >= 2
    ids = [x["id"] for x in data["items"]]
    assert a["id"] in ids
    assert b["id"] in ids

    # Filter by project_id
    r2 = client.get("/api/feed?project_id=p1")
    assert r2.status_code == 200
    data2 = r2.json()
    assert all(x["project_id"] == "p1" for x in data2["items"])

    # Filter by kind
    r3 = client.get("/api/feed?kind=video")
    assert r3.status_code == 200
    data3 = r3.json()
    assert all(x["kind"] == "video" for x in data3["items"])
