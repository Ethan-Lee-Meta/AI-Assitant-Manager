'use client';

import { useCallback, useEffect, useState } from "react";
import { Series, getSeries, updateSeries } from "../../lib/api/series";

export function SeriesDetail({ series_id }: { series_id: string }) {
  const [item, setItem] = useState<Series | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState<string>("");
  const [styleText, setStyleText] = useState<string>("");
  const [continuityText, setContinuityText] = useState<string>("");

  const refresh = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const s = await getSeries(series_id);
      setItem(s);
      setName(s.name || "");
      setStyleText((s.style_text ?? "") as string);
      setContinuityText((s.continuity_text ?? "") as string);
    } catch (e: any) {
      setErr(e?.message || "failed to load series");
    } finally {
      setLoading(false);
    }
  }, [series_id]);

  useEffect(() => { void refresh(); }, [refresh]);

  const save = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const s = await updateSeries(series_id, {
        name: name.trim() || (item?.name ?? ""),
        style_text: styleText,
        continuity_text: continuityText,
      });
      setItem(s);
    } catch (e: any) {
      setErr(e?.message || "failed to update");
    } finally {
      setLoading(false);
    }
  }, [series_id, name, styleText, continuityText, item]);

  const archive = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const s = await updateSeries(series_id, { archived_at: new Date().toISOString() });
      setItem(s);
    } catch (e: any) {
      setErr(e?.message || "failed to archive");
    } finally {
      setLoading(false);
    }
  }, [series_id]);

  const restore = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const s = await updateSeries(series_id, { archived_at: null });
      setItem(s);
    } catch (e: any) {
      setErr(e?.message || "failed to restore");
    } finally {
      setLoading(false);
    }
  }, [series_id]);

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 16, background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 20 }}>Series Detail</div>
        <button onClick={() => void refresh()} disabled={loading} style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #ddd" }}>Refresh</button>
      </div>

      {err && (
        <div style={{ marginBottom: 12, padding: 10, borderRadius: 10, border: "1px solid #f2c9c9", background: "#fff5f5", color: "#8a1f1f" }}>
          {err}
        </div>
      )}

      {!item && !loading && <div style={{ color: "#666" }}>Not found.</div>}
      {loading && <div style={{ color: "#666" }}>Loading...</div>}

      {item && (
        <>
          <div style={{ color: "#666", fontSize: 13, marginBottom: 12 }}>
            id: {item.id} | project_id: {item.project_id} | archived_at: {item.archived_at ?? "null"}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 10, alignItems: "center", marginBottom: 10 }}>
            <div style={{ color: "#333", fontSize: 14 }}>name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ padding: 8, border: "1px solid #ddd", borderRadius: 8 }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 10, marginBottom: 10 }}>
            <div style={{ color: "#333", fontSize: 14 }}>style_text</div>
            <textarea value={styleText} onChange={(e) => setStyleText(e.target.value)} style={{ padding: 8, border: "1px solid #ddd", borderRadius: 8, minHeight: 120 }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 10, marginBottom: 10 }}>
            <div style={{ color: "#333", fontSize: 14 }}>continuity_text</div>
            <textarea value={continuityText} onChange={(e) => setContinuityText(e.target.value)} style={{ padding: 8, border: "1px solid #ddd", borderRadius: 8, minHeight: 120 }} />
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button onClick={() => void save()} disabled={loading} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd" }}>Save</button>
            <button onClick={() => void archive()} disabled={loading} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd" }}>Archive</button>
            <button onClick={() => void restore()} disabled={loading} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd" }}>Restore (archived_at=null)</button>
          </div>
        </>
      )}
    </div>
  );
}
