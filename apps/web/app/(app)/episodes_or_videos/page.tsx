"use client";

import { useCallback, useMemo, useState } from "react";
import { apiFetch } from "../../../src/lib/api/client";

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

export default function Page() {
  const [projectId, setProjectId] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [kind, setKind] = useState<string>("");
  const [includeArchived, setIncludeArchived] = useState(false);

  const [items, setItems] = useState<EpisodeOrVideo[]>([]);
  const [total, setTotal] = useState(0);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const header = useMemo(() => `total: ${total}`, [total]);

  const refresh = useCallback(async () => {
    setErr("");
    const pid = projectId.trim();
    if (!pid) {
      setItems([]);
      setTotal(0);
      setErr("project_id is required for listing (backend contract).");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("project_id", pid);
      params.set("limit", "50");
      params.set("offset", "0");
      params.set("archived", includeArchived ? "true" : "false");
      params.set("sort", "-created_at");

      const sid = seriesId.trim();
      if (sid) params.set("series_id", sid);
      const kd = kind.trim();
      if (kd) params.set("kind", kd);

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
  }, [projectId, seriesId, kind, includeArchived]);

  return (
    <div style={{ padding: 24, display: "grid", gap: 16 }}>
      <h1 style={{ fontSize: 36, fontWeight: 700, margin: 0 }}>Episodes / Videos</h1>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 10, alignItems: "center" }}>
          <div>project_id (required)</div>
          <input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="project_id" />

          <div>series_id (optional)</div>
          <input value={seriesId} onChange={(e) => setSeriesId(e.target.value)} placeholder="series_id" />

          <div>kind (optional)</div>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">(all)</option>
            <option value="episode">episode</option>
            <option value="video">video</option>
          </select>

          <div>archived</div>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} />
            include archived
          </label>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={refresh} disabled={loading} style={{ padding: "8px 12px" }}>
            {loading ? "Loading..." : "Refresh"}
          </button>
          <div style={{ color: "#666", alignSelf: "center" }}>{header}</div>
        </div>

        {err ? <div style={{ color: "crimson" }}>{err}</div> : null}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {items.length === 0 ? (
          <div style={{ color: "#666" }}>No items.</div>
        ) : (
          items.map((x) => (
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
                <div style={{ fontSize: 12, color: "#444" }}>project_id: {x.project_id} • series_id: {x.series_id} • kind: {x.kind}</div>
                <div style={{ fontSize: 12, color: "#444" }}>archived_at: {String(x.archived_at ?? "null")}</div>
              </div>
              <a
                href={`/episodes_or_videos/${x.id}`}
                style={{ border: "1px solid #ddd", borderRadius: 10, padding: "6px 12px", textDecoration: "none" }}
              >
                Open
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
