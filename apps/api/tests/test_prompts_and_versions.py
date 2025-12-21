from fastapi.testclient import TestClient

from app.main import app


def test_prompts_crud_and_archived_filter_and_invalid_sort():
    c = TestClient(app)

    r = c.post("/api/prompts", json={"name": "DemoPrompt", "prompt_kind": "general", "content_text": "hello"})
    assert r.status_code == 200
    prompt = r.json()
    pid = prompt["id"]
    assert prompt["name"] == "DemoPrompt"
    assert prompt["prompt_kind"] == "general"
    assert isinstance(prompt["searchable_text"], str) and prompt["searchable_text"]

    hdr_rid = r.headers.get("X-Request-Id")
    assert hdr_rid and isinstance(hdr_rid, str)

    # list default (archived=false)
    r = c.get("/api/prompts?limit=50")
    assert r.status_code == 200
    items = r.json()["items"]
    assert any(it["id"] == pid for it in items)

    # archive it
    r = c.patch(f"/api/prompts/{pid}", json={"archived_at": "2025-01-01T00:00:00+00:00"})
    assert r.status_code == 200
    assert r.json()["archived_at"] == "2025-01-01T00:00:00+00:00"

    # should be filtered out by default
    r = c.get("/api/prompts?limit=50")
    assert r.status_code == 200
    items = r.json()["items"]
    assert all(it["id"] != pid for it in items)

    # archived=true should include
    r = c.get("/api/prompts?limit=50&archived=true")
    assert r.status_code == 200
    items = r.json()["items"]
    assert any(it["id"] == pid for it in items)

    # invalid sort -> 422 validation envelope
    r = c.get("/api/prompts?sort=badfield:asc")
    assert r.status_code == 422
    j = r.json()
    assert j["error"]["code"] == "VALIDATION_ERROR"
    assert "request_id" in j


def test_prompt_versions_create_get_list_and_no_update_endpoint():
    c = TestClient(app)
    project_id = "proj-test-prompts"

    r = c.post(
        "/api/prompt_versions",
        json={
            "project_id": project_id,
            "prompt_id": None,
            "version_label": "v1",
            "prompt_kind": "text2image",
            "resolved_prompt_text": "a cat in a hat",
            "resolved_params": {"width": 1024, "height": 1024},
            "role_bindings": [{"role_id": "r1", "weight": 1.0}],
            "workflow_ref": {"workflow_id": "wf1", "workflow_version": "1", "workflow_blob_ref": None},
        },
    )
    assert r.status_code == 200
    pv = r.json()
    pv_id = pv["id"]
    assert pv["project_id"] == project_id
    assert pv["version_label"] == "v1"
    assert pv["prompt_kind"] == "text2image"
    assert isinstance(pv["created_at"], str) and pv["created_at"]

    # get
    r = c.get(f"/api/prompt_versions/{pv_id}")
    assert r.status_code == 200
    assert r.json()["id"] == pv_id

    # list
    r = c.get(f"/api/prompt_versions?project_id={project_id}&limit=50")
    assert r.status_code == 200
    items = r.json()["items"]
    assert any(it["id"] == pv_id for it in items)

    # immutability: update endpoint should not exist (404) or method not allowed (405)
    r = c.patch(f"/api/prompt_versions/{pv_id}", json={"version_label": "v2"})
    assert r.status_code in (404, 405)
