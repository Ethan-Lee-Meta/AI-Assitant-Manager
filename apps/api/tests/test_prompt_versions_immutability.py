from fastapi.testclient import TestClient

from app.main import app


def test_prompt_version_update_is_disallowed():
    c = TestClient(app)

    # If GET /api/prompt_versions/{id} exists, PUT/PATCH should be 405 (method not allowed).
    # This test enforces "Update: NONE" behavior.
    rid = "00000000-0000-0000-0000-000000000000"

    r = c.put(f"/api/prompt_versions/{rid}", json={"version_label": "hacked"})
    assert r.status_code == 405

    r = c.patch(f"/api/prompt_versions/{rid}", json={"version_label": "hacked"})
    assert r.status_code == 405
