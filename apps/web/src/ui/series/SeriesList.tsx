'use client';

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Series, createSeries, listSeries } from "../../lib/api/series";

const LS_PROJECT_ID = "m02.series.project_id";
const LS_Q = "m02.series.q";

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 10, alignItems: "center", marginBottom: 10 }}>
      <div style={{ color: "#333", fontSize: 14 }}>{label}</div>
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={{ padding: 8, border: "1px solid #ddd", borderRadius: 8 }} />
    </div>
  );
}

export function SeriesList() {
  const [projectId, setProjectId] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [items, setItems] = useState<Series[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState<string>("");
  const [styleText, setStyleText] = useState<string>("");
  const [continuityText, setContinuityText] = useState<string>("");

  // restore last filters on mount
  useEffect(() => {
    try {
      const pid = (localStorage.getItem(LS_PROJECT_ID) || "").trim();
      const qq = (localStorage.getItem(LS_Q) || "").trim();
      if (pid) setProjectId(pid);
      if (qq) setQ(qq);
    } catch {
      // ignore
    }
  }, []);

  // persist filters
  useEffect(() => {
    try {
      localStorage.setItem(LS_PROJECT_ID, projectId);
      localStorage.setItem(LS_Q, q);
    } catch {
      // ignore
    }
  }, [projectId, q]);

  const refresh = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const r = await listSeries({
        project_id: projectId.trim() || undefined,
        q: (q || "").trim() || undefined,
        limit: 50,
        offset: 0,
      });
      setItems(r.items || []);
      setTotal(Number(r.total || 0));
    } catch (e: any) {
      setErr(e?.message || "failed to load series");
    } finally {
      setLoading(false);
    }
  }, [projectId, q]);

  useEffect(() => { void refresh(); }, [refresh]);

  const onCreate = useCallback(async () => {
    setErr(null);
    const pid = projectId.trim();
    const nm = name.trim();
    if (!pid) { setErr("project_id is required"); return; }
    if (!nm) { setErr("name is required"); return; }

    setLoading(true);
    try {
      await createSeries({
        project_id: pid,
        name: nm,
        style_text: styleText.trim() || undefined,
        continuity_text: continuityText.trim() || undefined,
      });
      setName(""); setStyleText(""); setContinuityText("");
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "failed to create series");
    } finally {
      setLoading(false);
    }
  }, [projectId, name, styleText, continuityText, refresh]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 18 }}>
      <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 16, background: "#fff" }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>Query</div>
        <Field label="project_id (optional)" value={projectId} onChange={setProjectId} placeholder="e.g. p_demo (blank = all)" />
        <Field label="q (optional)" value={q} onChange={setQ} placeholder="name contains..." />

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button onClick={() => void refresh()} disabled={loading} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd" }}>
            Refresh
          </button>
          <button onClick={() => { setQ(""); }} disabled={loading} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd" }}>
            Clear
          </button>
        </div>

        <div style={{ height: 14 }} />

        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>Create</div>
        <Field label="name (required)" value={name} onChange={setName} placeholder="Series name" />
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 10, marginBottom: 10 }}>
          <div style={{ color: "#333", fontSize: 14 }}>style_text</div>
          <textarea value={styleText} onChange={(e) => setStyleText(e.target.value)} style={{ padding: 8, border: "1px solid #ddd", borderRadius: 8, minHeight: 72 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 10, marginBottom: 10 }}>
          <div style={{ color: "#333", fontSize: 14 }}>continuity_text</div>
          <textarea value={continuityText} onChange={(e) => setContinuityText(e.target.value)} style={{ padding: 8, border: "1px solid #ddd", borderRadius: 8, minHeight: 72 }} />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button onClick={() => void onCreate()} disabled={loading} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd" }}>
            Create
          </button>
        </div>

        {err && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 10, border: "1px solid #f2c9c9", background: "#fff5f5", color: "#8a1f1f" }}>
            {err}
          </div>
        )}
      </div>

      <div style={{ border: "1px solid #eee", borderRadius: 14, padding: 16, background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Series</div>
          <div style={{ color: "#666", fontSize: 13 }}>total: {total}</div>
        </div>

        {items.length === 0 && !loading && (
          <div style={{ color: "#666" }}>No series found.</div>
        )}

        <div style={{ display: "grid", gap: 10 }}>
          {items.map((s) => (
            <div key={s.id} style={{ border: "1px solid #f0f0f0", borderRadius: 12, padding: 12, display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                <div style={{ color: "#666", fontSize: 13 }}>project_id: {s.project_id}</div>
                <div style={{ color: "#666", fontSize: 13 }}>archived_at: {s.archived_at ?? "null"}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Link href={`/series/${s.id}`} style={{ padding: "6px 10px", borderRadius: 10, border: "1px solid #ddd", textDecoration: "none" }}>
                  Open
                </Link>
              </div>
            </div>
          ))}
        </div>

        {loading && <div style={{ marginTop: 12, color: "#666" }}>Loading...</div>}
      </div>
    </div>
  );
}
