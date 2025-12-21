'use client';

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSeries, patchSeries, Series } from "../../../../src/lib/api/series";

export default function SeriesDetailPage({ params }: { params: { series_id: string } }) {
  const sid = params.series_id;

  const [item, setItem] = useState<Series | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState<string>("");
  const [styleText, setStyleText] = useState<string>("");
  const [continuityText, setContinuityText] = useState<string>("");

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const s = await getSeries(sid);
      setItem(s);
      setName(s.name || "");
      setStyleText((s.style_text as any) || "");
      setContinuityText((s.continuity_text as any) || "");
    } catch (e: any) {
      setErr(e?.message || "failed to load");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setErr(null);
    setLoading(true);
    try {
      const s = await patchSeries(sid, {
        name: name.trim() || undefined,
        style_text: styleText || null,
        continuity_text: continuityText || null,
      } as any);
      setItem(s);
    } catch (e: any) {
      setErr(e?.message || "save failed");
    } finally {
      setLoading(false);
    }
  }

  async function archive() {
    setErr(null);
    setLoading(true);
    try {
      const s = await patchSeries(sid, { archived_at: new Date().toISOString() } as any);
      setItem(s);
    } catch (e: any) {
      setErr(e?.message || "archive failed");
    } finally {
      setLoading(false);
    }
  }

  async function restore() {
    setErr(null);
    setLoading(true);
    try {
      const s = await patchSeries(sid, { archived_at: null } as any);
      setItem(s);
    } catch (e: any) {
      setErr(e?.message || "restore failed");
    } finally {
      setLoading(false);
    }
  }



  useEffect(() => { load(); }, [sid]);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <Link href="/series" style={{ textDecoration: "none", border: "1px solid #ddd", padding: "8px 12px", borderRadius: 10 }}>Back</Link>
        <div style={{ fontSize: 28, fontWeight: 800 }}>Series Detail</div>
      </div>

      {err ? (
        <div style={{ padding: 10, border: "1px solid #f3c", borderRadius: 10, background: "#fff5fb", color: "#a1005a", whiteSpace: "pre-wrap", marginBottom: 12 }}>
          {err}
        </div>
      ) : null}

      {!item ? (
        <div style={{ color: "#666" }}>{loading ? "loading..." : "not found"}</div>
      ) : (
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
          <div style={{ color: "#666", fontSize: 12 }}>id: {item.id}</div>
          <div style={{ color: "#666", fontSize: 12 }}>project_id: {item.project_id}</div>
          <div style={{ color: "#666", fontSize: 12, marginBottom: 12 }}>archived_at: {String(item.archived_at ?? "null")}</div>

          <label style={{ display: "grid", gap: 6, marginBottom: 10 }}>
            <div>name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 8 }} />
          </label>

          <label style={{ display: "grid", gap: 6, marginBottom: 10 }}>
            <div>style_text</div>
            <textarea value={styleText} onChange={(e) => setStyleText(e.target.value)} rows={8} style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 8 }} />
          </label>

          <label style={{ display: "grid", gap: 6, marginBottom: 12 }}>
            <div>continuity_text</div>
            <textarea value={continuityText} onChange={(e) => setContinuityText(e.target.value)} rows={8} style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 8 }} />
          </label>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={save} disabled={loading} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #ddd", background: "#fff" }}>Save</button>
            {item.archived_at ? (
              <button onClick={restore} disabled={loading} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #ddd", background: "#fff" }}>Restore</button>
            ) : (
              <button onClick={archive} disabled={loading} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #ddd", background: "#fff" }}>Archive</button>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}
