from fastapi.testclient import TestClient
from app.main import app


def test_internal_error_on_meta_crash_platform_regression():
    c = TestClient(app)
    r = c.get("/api/_meta/crash")
    assert r.status_code == 500

    hdr_rid = r.headers.get("X-Request-Id")
    assert hdr_rid and isinstance(hdr_rid, str)

    j = r.json()
    assert "error" in j and "request_id" in j
    err = j["error"]
    assert "code" in err and "message" in err and "details" in err

    assert err["code"] == "INTERNAL_ERROR"
    assert isinstance(err["message"], str) and err["message"]
    assert j["request_id"] == hdr_rid
