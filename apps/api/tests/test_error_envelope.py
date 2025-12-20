from fastapi.testclient import TestClient
from app.main import app


def test_404_error_envelope_and_request_id_consistency():
    c = TestClient(app)
    r = c.get("/this-path-should-not-exist")
    assert r.status_code == 404

    hdr_rid = r.headers.get("X-Request-Id")
    assert hdr_rid

    j = r.json()
    assert "error" in j
    assert j["error"]["code"] == "NOT_FOUND"
    assert isinstance(j["error"]["message"], str)
    assert j["request_id"] == hdr_rid
