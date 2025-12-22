"use client";

import { useEffect, useMemo, useState } from "react";
import { EpisodeOrVideoListBySeries } from "../episodes_or_videos/EpisodeOrVideoListBySeries";
import { Series, getSeries, updateSeries } from "../../lib/api/series";

export function SeriesWorkspace(props: { seriesId: string }) {
  const { seriesId } = props;

  const [item, setItem] = useState<Series | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  const backHref = useMemo(() => {
    const pid = (item as any)?.project_id ? String((item as any).project_id) : "";
    return pid ? `/series?project_id=${encodeURIComponent(pid)}` : "/series";
  }, [(item as any)?.project_id]);

  const [styleText, setStyleText] = useState<string>("");
  const [continuityText, setContinuityText] = useState<string>("");


  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const s = await getSeries(seriesId);
      setItem(s);
      setStyleText((s.style_text ?? "") as any);
      setContinuityText((s.continuity_text ?? "") as any);
    } catch (e: any) {
      setErr(e?.message || "failed to load series");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesId]);

  async function saveTexts() {
    setLoading(true);
    setErr(null);
    try {
      const s = await updateSeries(seriesId, {
        style_text: styleText,
        continuity_text: continuityText,
      });
      setItem(s);
    } catch (e: any) {
      setErr(e?.message || "save failed");
    } finally {
      setLoading(false);
    }
  }

  async function archiveNow() {
    setLoading(true);
    setErr(null);
    try {
      const s = await updateSeries(seriesId, { archived_at: new Date().toISOString() });
      setItem(s);
    } catch (e: any) {
      setErr(e?.message || "archive failed");
    } finally {
      setLoading(false);
    }
  }

  async function restore() {
    setLoading(true);
    setErr(null);
    try {
      const s = await updateSeries(seriesId, { archived_at: null });
      setItem(s);
    } catch (e: any) {
      setErr(e?.message || "restore failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        {/* preserve project_id filter if available */}
        <a href={backHref} style={{ color: "#555", textDecoration: "none" }}>← Back to Series</a>
      </div>

      <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
        <h1 style={{ margin: "0 0 6px 0" }}>Series Workspace</h1>
        <div style={{ color: "#666", fontSize: 12 }}>
          series_id={seriesId} • {loading ? "Loading..." : "Ready"} • archived_at={item?.archived_at ?? "null"}
        </div>

        {err ? <div style={{ marginTop: 10, color: "crimson" }}>Error: {err}</div> : null}

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button onClick={refresh} disabled={loading} style={{ padding: "8px 12px" }}>Refresh</button>
          <button onClick={saveTexts} disabled={loading} style={{ padding: "8px 12px" }}>Save style/continuity</button>
          <button onClick={archiveNow} disabled={loading} style={{ padding: "8px 12px" }}>Archive</button>
          <button onClick={restore} disabled={loading} style={{ padding: "8px 12px" }}>Restore</button>
        </div>
      </div>

      <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 12, display: "grid", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>style_text</div>
          <textarea value={styleText} onChange={(e) => setStyleText(e.target.value)} rows={6} style={{ width: "100%", padding: 10 }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>continuity_text</div>
          <textarea value={continuityText} onChange={(e) => setContinuityText(e.target.value)} rows={6} style={{ width: "100%", padding: 10 }} />
        </div>
      </div>

      <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
        <h2 style={{ margin: 0 }}>Episodes / Videos</h2>

        <div style={{ color: "#666", marginTop: 8, fontSize: 12 }}>
          series_id={seriesId} • project_id={String((item as any)?.project_id ?? "null")}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <a
            href={`/series/${seriesId}/episodes/new`}
            style={{ border: "1px solid #ddd", borderRadius: 10, padding: "6px 12px", textDecoration: "none" }}
          >
            + New Episode
          </a>
          <a
            href={`/series/${seriesId}/videos/new`}
            style={{ border: "1px solid #ddd", borderRadius: 10, padding: "6px 12px", textDecoration: "none" }}
          >
            + New Video
          </a>
        </div>

        {(item as any)?.project_id ? (
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            <EpisodeOrVideoListBySeries projectId={String((item as any).project_id)} seriesId={seriesId} kind="episode" title="Episodes" />
            <EpisodeOrVideoListBySeries projectId={String((item as any).project_id)} seriesId={seriesId} kind="video" title="Videos" />
          </div>
        ) : (
          <div style={{ color: "crimson", marginTop: 12 }}>series.project_id missing</div>
        )}
      </div>
    </div>
  );
}
