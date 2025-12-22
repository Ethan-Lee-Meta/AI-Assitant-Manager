"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api/client";

type EpisodeOrVideoKind = "episode" | "video";

type EpisodeOrVideo = {
  id: string;
  project_id: string;
  series_id: string;
  title: string;
  kind: EpisodeOrVideoKind;
  created_at: string;
  updated_at?: string | null;
  archived_at?: string | null;
};

type EpisodeOrVideoListResponse = {
  items: EpisodeOrVideo[];
  total: number;
  limit: number;
  offset: number;
};

export function EpisodeOrVideoListBySeries(props: {
  projectId: string;
  seriesId: string;
  kind: EpisodeOrVideoKind;
  title?: string;
}) {
  const { projectId, seriesId, kind } = props;
  const title = props.title ?? (kind === "episode" ? "Episodes" : "Videos");

  const [items, setItems] = useState<EpisodeOrVideo[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string>("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      params.set("project_id", projectId);
      params.set("series_id", seriesId);
      params.set("kind", kind);
      params.set("limit", "50");
      params.set("offset", "0");
      params.set("archived", "false");
      params.set("sort", "-created_at");

      const res = await apiFetch<EpisodeOrVideoListResponse>(`/api/episodes_or_videos?${params.toString()}`);
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (e: any) {
      setItems([]);
      setTotal(0);
      setErr(e?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }, [projectId, seriesId, kind]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const header = useMemo(() => `${title} • total: ${total}`, [title, total]);

  return (
    <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 12, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700 }}>{header}</div>
        <button onClick={refresh} disabled={loading} style={{ padding: "6px 10px" }}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {err ? <div style={{ color: "crimson" }}>{err}</div> : null}

      {items.length === 0 ? (
        <div style={{ color: "#666" }}>No items.</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {items.map((x) => (
            <div
              key={x.id}
              style={{
                border: "1px solid #eee",
                borderRadius: 12,
                padding: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{x.title}</div>
                <div style={{ fontSize: 12, color: "#444" }}>id: {x.id}</div>
                <div style={{ fontSize: 12, color: "#444" }}>archived_at: {String(x.archived_at ?? "null")}</div>
              </div>
              <a
                href={`/episodes_or_videos/${x.id}`}
                style={{ border: "1px solid #ddd", borderRadius: 10, padding: "6px 12px", textDecoration: "none" }}
              >
                Open
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
