from __future__ import annotations

from typing import Optional

from app.core.errors import AppError
from . import store_sqlite
from .dto import EpisodeOrVideoCreate, EpisodeOrVideoPatch, EpisodeOrVideoKind


def create_episode_or_video(payload: EpisodeOrVideoCreate):
    d = payload.model_dump()
    d["kind"] = d["kind"].value if isinstance(d.get("kind"), EpisodeOrVideoKind) else d.get("kind")
    return store_sqlite.create(d)


def get_episode_or_video(episode_or_video_id: str):
    try:
        return store_sqlite.get(episode_or_video_id)
    except KeyError:
        raise AppError("NOT_FOUND", "EpisodeOrVideo not found", status_code=404)


def patch_episode_or_video(episode_or_video_id: str, patch: EpisodeOrVideoPatch):
    try:
        d = patch.model_dump(exclude_unset=True)
        if "archived_at" in d and d["archived_at"] is not None:
            d["archived_at"] = d["archived_at"].isoformat()
        if "kind" in d and isinstance(d.get("kind"), EpisodeOrVideoKind):
            d["kind"] = d["kind"].value
        return store_sqlite.update(episode_or_video_id, d)
    except KeyError:
        raise AppError("NOT_FOUND", "EpisodeOrVideo not found", status_code=404)


def list_episodes_or_videos(
    *,
    project_id: str,
    series_id: Optional[str],
    kind: Optional[EpisodeOrVideoKind],
    q: Optional[str],
    archived: bool,
    limit: int,
    offset: int,
    sort: str,
):
    kind_s = kind.value if kind is not None else None
    items, total = store_sqlite.list_items(
        project_id=project_id,
        series_id=series_id,
        kind=kind_s,
        q=q,
        archived=archived,
        limit=limit,
        offset=offset,
        sort=sort,
    )
    return items, total
