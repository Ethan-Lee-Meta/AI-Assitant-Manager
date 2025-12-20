import re
from fastapi.testclient import TestClient
from app.main import app

UUID_RE = re.compile(r"^[0-9a-fA-F-]{36}$")


def test_request_id_roundtrip_valid_header():
    c = TestClient(app)
    r = c.get("/health", headers={"X-Request-Id": "abc-123"})
    assert r.status_code == 200
    assert r.headers.get("X-Request-Id") == "abc-123"


def test_request_id_invalid_header_replaced():
    c = TestClient(app)
    r = c.get("/health", headers={"X-Request-Id": "bad id with spaces"})
    assert r.status_code == 200
    rid = r.headers.get("X-Request-Id")
    assert rid is not None
    assert rid != "bad id with spaces"
    assert UUID_RE.match(rid)
