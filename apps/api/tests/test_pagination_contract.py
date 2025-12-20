from fastapi.testclient import TestClient
from app.main import app


def test_validation_error_on_bad_limit_in_meta_echo():
    c = TestClient(app)
    r = c.get("/api/_meta/echo?limit=-1")
    assert r.status_code == 422

    hdr_rid = r.headers.get("X-Request-Id")
    assert hdr_rid

    j = r.json()
    assert j["error"]["code"] == "VALIDATION_ERROR"
    assert j["request_id"] == hdr_rid

    details = j["error"].get("details") or {}
    errs = details.get("errors") or []
    assert isinstance(errs, list) and errs
    assert any("limit" in map(str, e.get("loc", [])) for e in errs)
