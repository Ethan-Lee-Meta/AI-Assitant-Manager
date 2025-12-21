from fastapi.testclient import TestClient
from app.main import app

def test_series_list_requires_project_id():
    c = TestClient(app)
    r = c.get("/api/series")
    assert r.status_code == 422

def test_series_crud_and_project_filtering():
    c = TestClient(app)

    r = c.post("/api/series", json={
        "project_id": "p_a",
        "name": "SeriesA",
        "style_text": "style a",
        "continuity_text": "cont a"
    })
    assert r.status_code == 200, r.text
    sid_a = r.json()["id"]

    r = c.post("/api/series", json={
        "project_id": "p_b",
        "name": "SeriesB",
        "style_text": "style b",
        "continuity_text": "cont b"
    })
    assert r.status_code == 200, r.text

    r = c.get("/api/series", params={"project_id": "p_a"})
    assert r.status_code == 200
    js = r.json()
    assert js["total"] >= 1
    assert all(x["project_id"] == "p_a" for x in js["items"])

    # patch style_text
    r = c.patch(f"/api/series/{sid_a}", json={"style_text": "style a2"})
    assert r.status_code == 200, r.text
    assert r.json()["style_text"] == "style a2"

def test_series_archived_at_restore_null():
    c = TestClient(app)

    r = c.post("/api/series", json={"project_id": "p_demo", "name": "S1"})
    assert r.status_code == 200
    sid = r.json()["id"]

    r = c.patch(f"/api/series/{sid}", json={"archived_at": "2025-01-01T00:00:00Z"})
    assert r.status_code == 200
    assert r.json().get("archived_at") is not None

    r = c.patch(f"/api/series/{sid}", json={"archived_at": None})
    assert r.status_code == 200, r.text

    r = c.get(f"/api/series/{sid}")
    assert r.status_code == 200
    assert r.json().get("archived_at") is None
