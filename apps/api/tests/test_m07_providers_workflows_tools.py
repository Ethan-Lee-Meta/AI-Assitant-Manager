from __future__ import annotations
from fastapi.testclient import TestClient
from app.main import app

def test_m07_providers_crud():
    c = TestClient(app)

    r = c.post("/api/providers", json={
        "name": "DemoProvider",
        "provider_type": "http_api",
        "supported_kinds": ["text2image", "text2video"],
        "endpoint_config": {"base_url": "http://example"},
        "is_enabled": True
    })
    assert r.status_code == 200
    pid = r.json()["id"]

    r = c.get(f"/api/providers/{pid}")
    assert r.status_code == 200
    assert r.json()["name"] == "DemoProvider"

    r = c.get("/api/providers?limit=20&offset=0")
    assert r.status_code == 200
    assert r.json()["total"] >= 1

    r = c.patch(f"/api/providers/{pid}", json={"is_enabled": False})
    assert r.status_code == 200
    assert r.json()["is_enabled"] is False

def test_m07_workflows_crud():
    c = TestClient(app)

    r = c.post("/api/workflows", json={
        "project_id": "p_demo",
        "name": "WF1",
        "workflow_type": "comfyui_workflow",
        "workflow_blob_asset_id": "asset_wf_1",
        "default_params": {"steps": 20}
    })
    assert r.status_code == 200
    wid = r.json()["id"]

    r = c.get(f"/api/workflows/{wid}")
    assert r.status_code == 200

    r = c.get("/api/workflows?project_id=p_demo&limit=20&offset=0")
    assert r.status_code == 200
    assert r.json()["total"] >= 1

def test_m07_tools_crud():
    c = TestClient(app)

    r = c.post("/api/tools", json={
        "project_id": "p_demo",
        "name": "Tool1",
        "tool_type": "postprocess",
        "config": {"strength": 0.5},
        "description": "demo"
    })
    assert r.status_code == 200
    tid = r.json()["id"]

    r = c.get(f"/api/tools/{tid}")
    assert r.status_code == 200

    r = c.get("/api/tools?tool_type=postprocess&limit=20&offset=0")
    assert r.status_code == 200
    assert r.json()["total"] >= 1
