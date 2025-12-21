from fastapi.testclient import TestClient

from app.main import app


def test_prompt_versions_create_get_list_and_immutable():
    c = TestClient(app)

    # prompt_id is optional by contract, but we still create a Prompt to simulate typical flow
    pr = c.post(
        "/api/prompts",
        json={
            "project_id": "proj_demo",
            "name": "Demo Prompt",
            "prompt_kind": "text2image",
            "content_text": "A cat, studio lighting",
            "searchable_text": "cat studio",
        },
    )
    assert pr.status_code == 200, pr.text
    prompt_id = pr.json()["id"]

    vr = c.post(
        "/api/prompt_versions",
        json={
            "project_id": "proj_demo",
            "prompt_id": prompt_id,
            "version_label": "v1",
            "prompt_kind": "text2image",
            "resolved_prompt_text": "A cat, studio lighting",
            "resolved_params": {"width": 512, "height": 512},
        },
    )
    assert vr.status_code == 200, vr.text
    vid = vr.json()["id"]
    assert "created_at" in vr.json()
    assert "updated_at" not in vr.json()

    gr = c.get(f"/api/prompt_versions/{vid}")
    assert gr.status_code == 200, gr.text
    assert gr.json()["id"] == vid

    lr = c.get(f"/api/prompt_versions?project_id=proj_demo&prompt_id={prompt_id}&limit=10&offset=0")
    assert lr.status_code == 200, lr.text
    body = lr.json()
    assert body["total"] >= 1
    assert any(x["id"] == vid for x in body["items"])

    # immutable: no update endpoint
    ur = c.patch(f"/api/prompt_versions/{vid}", json={"version_label": "v2"})
    assert ur.status_code in (404, 405)

    # project_id required for list
    bad = c.get("/api/prompt_versions")
    assert bad.status_code == 422
