from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app


def _apps_api_dir() -> Path:
    # .../apps/api/tests/test_x.py -> parents[1] == .../apps/api
    return Path(__file__).resolve().parents[1]


DB_PATH = _apps_api_dir() / ".data" / "app.db"


@pytest.fixture(autouse=True)
def _clean_db():
    try:
        DB_PATH.unlink(missing_ok=True)  # py3.8+ supports missing_ok
    except TypeError:
        if DB_PATH.exists():
            DB_PATH.unlink()
    yield
    try:
        DB_PATH.unlink(missing_ok=True)
    except TypeError:
        if DB_PATH.exists():
            DB_PATH.unlink()


def _assert_request_id_header(r):
    rid = r.headers.get("X-Request-Id")
    assert rid and isinstance(rid, str)
    return rid


def _assert_error_envelope_matches_request_id(r):
    rid = _assert_request_id_header(r)
    j = r.json()
    assert "error" in j and "request_id" in j
    assert j["request_id"] == rid
    assert "code" in j["error"] and "message" in j["error"] and "details" in j["error"]
    return j


def test_create_defaults_and_list_archived_filters():
    c = TestClient(app)

    r = c.post("/api/projects", json={"name": "Demo", "project_type": "series_collection"})
    assert r.status_code == 200
    _assert_request_id_header(r)

    p = r.json()
    assert p["name"] == "Demo"
    assert p["project_type"] == "series_collection"
    assert p["encryption_policy"] == "bundle_only"
    assert p["default_face_mode"] == "assisted"
    assert "id" in p and isinstance(p["id"], str)

    pid = p["id"]

    # default archived=false -> should include
    lr = c.get("/api/projects?limit=50&offset=0")
    assert lr.status_code == 200
    items = lr.json()["items"]
    assert any(x["id"] == pid for x in items)

    # archive it
    archived_at = datetime(2025, 1, 1, 0, 0, 0, tzinfo=timezone.utc).isoformat()
    pr = c.patch(f"/api/projects/{pid}", json={"archived_at": archived_at})
    assert pr.status_code == 200

    # archived=false -> should NOT include
    lr2 = c.get("/api/projects?limit=50&offset=0&archived=false")
    assert lr2.status_code == 200
    items2 = lr2.json()["items"]
    assert all(x["id"] != pid for x in items2)

    # archived=true -> should include
    lr3 = c.get("/api/projects?limit=50&offset=0&archived=true")
    assert lr3.status_code == 200
    items3 = lr3.json()["items"]
    assert any(x["id"] == pid for x in items3)

    # get still works
    gr = c.get(f"/api/projects/{pid}")
    assert gr.status_code == 200
    assert gr.json()["id"] == pid


def test_404_returns_not_found_and_request_id_matches():
    c = TestClient(app)
    r = c.get("/api/projects/does-not-exist")
    assert r.status_code == 404
    j = _assert_error_envelope_matches_request_id(r)
    assert j["error"]["code"] == "NOT_FOUND"


def test_invalid_sort_returns_validation_error_and_request_id_matches():
    c = TestClient(app)
    r = c.get("/api/projects?sort=badfield:asc")
    assert r.status_code == 422
    j = _assert_error_envelope_matches_request_id(r)
    assert j["error"]["code"] == "VALIDATION_ERROR"
