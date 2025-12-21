from fastapi.testclient import TestClient
from app.main import app

ARCHIVE_TS = "2025-01-01T00:00:00Z"

def test_m07_archive_patch_tool():
    c = TestClient(app)

    r = c.post("/api/tools", json={
        "project_id": "p_demo",
        "name": "ToolArchive",
        "tool_type": "postprocess",
        "config": {"strength": 0.5},
        "description": "demo"
    })
    assert r.status_code == 200
    tid = r.json()["id"]

    r = c.patch(f"/api/tools/{tid}", json={"archived_at": ARCHIVE_TS})
    assert r.status_code == 200, r.text

    r = c.get(f"/api/tools/{tid}")
    assert r.status_code == 200
    assert r.json().get("archived_at") is not None

    # restore (explicit null)
    r = c.patch(f"/api/tools/{tid}", json={"archived_at": None})
    assert r.status_code == 200, r.text

    r = c.get(f"/api/tools/{tid}")
    assert r.status_code == 200
    assert r.json().get("archived_at") is None

def test_m07_archive_patch_provider():
    c = TestClient(app)

    r = c.post("/api/providers", json={
        "name": "ProviderArchive",
        "provider_type": "http_api",
        "supported_kinds": ["text2image"],
        "endpoint_config": {"base_url": "http://example"},
        "is_enabled": True
    })
    assert r.status_code == 200
    pid = r.json()["id"]

    r = c.patch(f"/api/providers/{pid}", json={"archived_at": ARCHIVE_TS})
    assert r.status_code == 200, r.text

    r = c.get(f"/api/providers/{pid}")
    assert r.status_code == 200
    assert r.json().get("archived_at") is not None

    r = c.patch(f"/api/providers/{pid}", json={"archived_at": None})
    assert r.status_code == 200, r.text

    r = c.get(f"/api/providers/{pid}")
    assert r.status_code == 200
    assert r.json().get("archived_at") is None

def test_m07_archive_patch_workflow():
    c = TestClient(app)

    r = c.post("/api/workflows", json={
        "project_id": "p_demo",
        "name": "WFArchive",
        "workflow_type": "comfyui_workflow",
        "workflow_blob_asset_id": "asset_wf_1",
        "default_params": {"steps": 20}
    })
    assert r.status_code == 200
    wid = r.json()["id"]

    r = c.patch(f"/api/workflows/{wid}", json={"archived_at": ARCHIVE_TS})
    assert r.status_code == 200, r.text

    r = c.get(f"/api/workflows/{wid}")
    assert r.status_code == 200
    assert r.json().get("archived_at") is not None

    r = c.patch(f"/api/workflows/{wid}", json={"archived_at": None})
    assert r.status_code == 200, r.text

    r = c.get(f"/api/workflows/{wid}")
    assert r.status_code == 200
    assert r.json().get("archived_at") is None
