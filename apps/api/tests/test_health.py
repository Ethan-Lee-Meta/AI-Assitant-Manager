from fastapi.testclient import TestClient
from app.main import app


def test_health_ok():
    c = TestClient(app)
    r = c.get("/health")
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "ok"
    assert isinstance(j["service"], str) and j["service"]
    assert isinstance(j["time"], str) and j["time"]
    assert "X-Request-Id" in r.headers
