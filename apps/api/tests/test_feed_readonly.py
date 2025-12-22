from __future__ import annotations

import os

from fastapi.testclient import TestClient


def test_feed_lists_eov_items(tmp_path):
    db_path = tmp_path / "feed.sqlite"
    os.environ["AAM_SQLITE_PATH"] = str(db_path)

    from app.main import app  # import after env

    client = TestClient(app)

    # Create two items (episode + video) under different projects/series
    r1 = client.post(
        "/api/episodes_or_videos",
        json={
            "project_id": "p1",
            "series_id": "s1",
            "title": "ep1",
            "kind": "episode",
            "synopsis_text": "hello",
            "order_index": 1,
            "script_text": "script v1",
            "assembly_preset_id": "preset-1",
        },
        headers={"X-Request-Id": "test-feed-1"},
    )
    assert r1.status_code in (200, 201), r1.text
    ep_id = r1.json()["id"]

    r2 = client.post(
        "/api/episodes_or_videos",
        json={
            "project_id": "p2",
            "series_id": "s2",
            "title": "vid1",
            "kind": "video",
            "synopsis_text": "world",
            "order_index": 2,
            "script_text": "script v2",
            "assembly_preset_id": "preset-1",
        },
        headers={"X-Request-Id": "test-feed-2"},
    )
    assert r2.status_code in (200, 201), r2.text
    vid_id = r2.json()["id"]

    # Feed (all projects)
    f = client.get("/api/feed?limit=50&offset=0&archived=false&sort=-created_at", headers={"X-Request-Id": "test-feed-3"})
    assert f.status_code == 200, f.text
    j = f.json()
    assert "items" in j and "total" in j
    ids = [it["id"] for it in j["items"]]
    assert ep_id in ids
    assert vid_id in ids

    # Filter by project_id
    f1 = client.get("/api/feed?project_id=p1&limit=50&offset=0&archived=false&sort=-created_at", headers={"X-Request-Id": "test-feed-4"})
    assert f1.status_code == 200, f1.text
    ids1 = [it["id"] for it in f1.json()["items"]]
    assert ep_id in ids1
    assert vid_id not in ids1

    # Filter by kind
    f2 = client.get("/api/feed?kind=video&limit=50&offset=0&archived=false&sort=-created_at", headers={"X-Request-Id": "test-feed-5"})
    assert f2.status_code == 200, f2.text
    ids2 = [it["id"] for it in f2.json()["items"]]
    assert vid_id in ids2
    assert ep_id not in ids2

    # Archive one item, ensure archived semantics
    p = client.patch(f"/api/episodes_or_videos/{ep_id}", json={"archived_at": "2025-01-01T00:00:00Z"}, headers={"X-Request-Id": "test-feed-6"})
    assert p.status_code == 200, p.text

    fa = client.get("/api/feed?archived=true&limit=50&offset=0&sort=-created_at", headers={"X-Request-Id": "test-feed-7"})
    assert fa.status_code == 200, fa.text
    ida = [it["id"] for it in fa.json()["items"]]
    assert ep_id in ida
