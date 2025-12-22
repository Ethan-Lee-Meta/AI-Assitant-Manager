import os
from fastapi.testclient import TestClient


def test_m03_list_archived_semantics_and_sort(tmp_path):
    # isolate sqlite per-test
    db_path = tmp_path / "m03_list_semantics.sqlite"
    os.environ["AAM_SQLITE_PATH"] = str(db_path)

    from app.main import app  # import after env best-effort

    client = TestClient(app)

    # create two items
    base = {
        "project_id": "p1",
        "series_id": "s1",
        "title": "t",
        "kind": "episode",
        "synopsis_text": "syn",
        "order_index": 1,
        "script_text": "script",
        "assembly_preset_id": "preset-1",
    }

    r1 = client.post("/api/episodes_or_videos", json={**base, "title": "active"}, headers={"X-Request-Id": "t-m03-s1"})
    assert r1.status_code in (200, 201), r1.text
    active_id = r1.json()["id"]

    r2 = client.post("/api/episodes_or_videos", json={**base, "title": "arch"}, headers={"X-Request-Id": "t-m03-s2"})
    assert r2.status_code in (200, 201), r2.text
    arch_id = r2.json()["id"]

    # archive one
    r_arch = client.patch(
        f"/api/episodes_or_videos/{arch_id}",
        json={"archived_at": "2025-01-01T00:00:00Z"},
        headers={"X-Request-Id": "t-m03-s3"},
    )
    assert r_arch.status_code == 200, r_arch.text
    assert r_arch.json()["archived_at"] is not None

    # archived=false should return only active
    r_list_active = client.get(
        "/api/episodes_or_videos",
        params={"project_id": "p1", "archived": "false", "sort": "-created_at"},
        headers={"X-Request-Id": "t-m03-s4"},
    )
    assert r_list_active.status_code == 200, r_list_active.text
    items_active = r_list_active.json()["items"]
    ids_active = {x["id"] for x in items_active}
    assert active_id in ids_active
    assert arch_id not in ids_active

    # archived=true should return only archived
    r_list_arch = client.get(
        "/api/episodes_or_videos",
        params={"project_id": "p1", "archived": "true", "sort": "created_at:desc"},
        headers={"X-Request-Id": "t-m03-s5"},
    )
    assert r_list_arch.status_code == 200, r_list_arch.text
    items_arch = r_list_arch.json()["items"]
    ids_arch = {x["id"] for x in items_arch}
    assert arch_id in ids_arch
    assert active_id not in ids_arch

    # sort whitelist / fallback: should not error even if invalid
    r_bad_sort = client.get(
        "/api/episodes_or_videos",
        params={"project_id": "p1", "archived": "false", "sort": "-__nope__"},
        headers={"X-Request-Id": "t-m03-s6"},
    )
    assert r_bad_sort.status_code == 200, r_bad_sort.text
