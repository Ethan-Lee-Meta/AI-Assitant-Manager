import os

from fastapi.testclient import TestClient


def test_feed_archived_semantics_and_sort_whitelist(tmp_path):
    db_path = tmp_path / "feed_semantics.sqlite"
    os.environ["AAM_SQLITE_PATH"] = str(db_path)

    from app.main import app  # import after env

    client = TestClient(app)

    # create one episode + one video
    ep = client.post(
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
        headers={"X-Request-Id": "test-feed-sem-1"},
    )
    assert ep.status_code in (200, 201), ep.text
    ep_id = ep.json()["id"]

    vid = client.post(
        "/api/episodes_or_videos",
        json={
            "project_id": "p1",
            "series_id": "s1",
            "title": "vid1",
            "kind": "video",
            "synopsis_text": "world",
            "order_index": 2,
            "script_text": "script v2",
            "assembly_preset_id": "preset-1",
        },
        headers={"X-Request-Id": "test-feed-sem-2"},
    )
    assert vid.status_code in (200, 201), vid.text
    vid_id = vid.json()["id"]

    # archive the episode
    p = client.patch(
        f"/api/episodes_or_videos/{ep_id}",
        json={"archived_at": "2020-01-01T00:00:00Z"},
        headers={"X-Request-Id": "test-feed-sem-3"},
    )
    assert p.status_code == 200, p.text

    # archived=false => only non-archived items (should include vid, exclude ep)
    f0 = client.get(
        "/api/feed?project_id=p1&limit=50&offset=0&archived=false&sort=-created_at",
        headers={"X-Request-Id": "test-feed-sem-4"},
    )
    assert f0.status_code == 200, f0.text
    ids0 = [it["id"] for it in f0.json()["items"]]
    assert vid_id in ids0
    assert ep_id not in ids0

    # archived=true => only archived items (should include ep, exclude vid)
    f1 = client.get(
        "/api/feed?project_id=p1&limit=50&offset=0&archived=true&sort=-created_at",
        headers={"X-Request-Id": "test-feed-sem-5"},
    )
    assert f1.status_code == 200, f1.text
    ids1 = [it["id"] for it in f1.json()["items"]]
    assert ep_id in ids1
    assert vid_id not in ids1

    # invalid sort should not 500; must fallback to default
    f2 = client.get(
        "/api/feed?project_id=p1&limit=50&offset=0&archived=false&sort=__bad__:asc",
        headers={"X-Request-Id": "test-feed-sem-6"},
    )
    assert f2.status_code == 200, f2.text
