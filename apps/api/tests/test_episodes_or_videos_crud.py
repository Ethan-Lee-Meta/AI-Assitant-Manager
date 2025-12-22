import os
from fastapi.testclient import TestClient


def test_episodes_or_videos_crud(tmp_path):
    # isolate sqlite for this test (module reads env at call time)
    db_path = tmp_path / "m03_eov.sqlite"
    os.environ["AAM_SQLITE_PATH"] = str(db_path)

    from app.main import app  # import after env best-effort

    client = TestClient(app)

    # create
    payload = {
        "project_id": "p1",
        "series_id": "s1",
        "title": "ep1",
        "kind": "episode",
        "synopsis_text": "hello",
        "order_index": 1,
        "script_text": "script v1",
        "assembly_preset_id": "preset-1",
    }
    r = client.post("/api/episodes_or_videos", json=payload, headers={"X-Request-Id": "test-m03-1"})
    assert r.status_code in (200, 201), r.text
    item = r.json()
    eid = item["id"]
    assert item["project_id"] == "p1"
    assert item["series_id"] == "s1"
    assert item["kind"] == "episode"

    # get
    r = client.get(f"/api/episodes_or_videos/{eid}", headers={"X-Request-Id": "test-m03-2"})
    assert r.status_code == 200, r.text
    assert r.json()["id"] == eid

    # list (project_id required)
    r = client.get("/api/episodes_or_videos", params={"project_id": "p1"}, headers={"X-Request-Id": "test-m03-3"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["limit"] == 50
    assert data["offset"] == 0

    assert data["total"] >= 1
    assert any(x["id"] == eid for x in data["items"])

    # filter by kind
    r = client.get(
        "/api/episodes_or_videos",
        params={"project_id": "p1", "kind": "video"},
        headers={"X-Request-Id": "test-m03-4"},
    )
    assert r.status_code == 200, r.text
    assert all(x["kind"] == "video" for x in r.json()["items"])

    # patch script_text
    r = client.patch(
        f"/api/episodes_or_videos/{eid}",
        json={"script_text": "script v2"},
        headers={"X-Request-Id": "test-m03-5"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["script_text"] == "script v2"

    # openapi defaults should align with global ListQuery (limit=50, sort=-created_at)
    spec = client.get("/openapi.json", headers={"X-Request-Id": "test-m03-openapi"}).json()
    op = spec["paths"]["/api/episodes_or_videos"]["get"]
    params = {p["name"]: p for p in op.get("parameters", [])}
    assert params["limit"]["schema"]["default"] == 50
    assert params["sort"]["schema"]["default"] == "-created_at"
