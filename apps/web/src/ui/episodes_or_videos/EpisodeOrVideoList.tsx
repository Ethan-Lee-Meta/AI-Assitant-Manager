"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listEpisodesOrVideos, EpisodeOrVideo, EpisodeOrVideoKind } from "../../lib/api/episodes_or_videos";

export default function EpisodeOrVideoList(props: {
  projectId: string;
  seriesId: string;
  kind?: EpisodeOrVideoKind;
}) {
  const { projectId, seriesId, kind } = props;

  const [items, setItems] = useState<EpisodeOrVideo[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const title = useMemo(() => {
    if (kind === "episode") return "Episodes";
    if (kind === "video") return "Videos";
    return "Episodes / Videos";
  }, [kind]);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const resp = await listEpisodesOrVideos({
        project_id: projectId,
        series_id: seriesId,
        kind,
        limit: 50,
        offset: 0,
        sort: "-created_at",
        archived: false,
      });
      setItems(resp.items || []);
      setTotal(resp.total || 0);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, seriesId, kind]);

  return (
    <div style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8, marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            total: {total} {loading ? "(loading...)" : ""}
          </div>
        </div>
        <button onClick={refresh} style={{ padding: "6px 10px" }}>
          Refresh
        </button>
      </div>

      {err ? (
        <div style={{ marginTop: 10, color: "crimson", whiteSpace: "pre-wrap" }}>{err}</div>
      ) : null}

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {items.map((it) => (
          <div key={it.id} style={{ padding: 10, border: "1px solid #eee", borderRadius: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 600 }}>{it.title}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  kind={it.kind} order_index={String(it.order_index ?? "")} archived={it.archived_at ? "true" : "false"}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Link href={`/episodes_or_videos/${it.id}`}>Open</Link>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 ? <div style={{ opacity: 0.7 }}>No items.</div> : null}
      </div>
    </div>
  );
}
