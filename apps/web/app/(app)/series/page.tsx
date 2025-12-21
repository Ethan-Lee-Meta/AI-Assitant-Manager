'use client';

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createSeries, listSeries, patchSeries, Series } from "../../../src/lib/api/series";

function readQS(): { project_id: string; q: string } {
  if (typeof window === "undefined") return { project_id: "", q: "" };
  const usp = new URLSearchParams(window.location.search);
  const project_id = (usp.get("project_id") || localStorage.getItem("m02_series_project_id") || "").trim();
  const q = (usp.get("q") || localStorage.getItem("m02_series_q") || "").trim();
  return { project_id, q };
}

function writeQS(project_id: string, q: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("m02_series_project_id", project_id || "");
  localStorage.setItem("m02_series_q", q || "");
  const usp = new URLSearchParams(window.location.search);
  if (project_id) usp.set("project_id", project_id); else usp.delete("project_id");
  if (q) usp.set("q", q); else usp.delete("q");
  const next = `${window.location.pathname}?${usp.toString()}`;
  window.history.replaceState(null, "", next);
}

export default function SeriesPage() {
  const init = useMemo(() => readQS(), []);
  const [projectId, setProjectId] = useState<string>(init.project_id);
  const [q, setQ] = useState<string>(init.q);

  const [name, setName] = useState<string>("");
  const [styleText, setStyleText] = useState<string>("");
  const [continuityText, setContinuityText] = useState<string>("");

  const [items, setItems] = useState<Series[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  const canQuery = (projectId || "").trim().length > 0;
  const canCreate = canQuery && (name || "").trim().length > 0;

  useEffect(() => {
    writeQS(projectId.trim(), q.trim());
  }, [projectId, q]);

  async function refresh() {
    setErr(null);
    if (!canQuery) {
      setItems([]);
      setTotal(0);
      setErr("project_id is required (M02: list must be filtered by project_id).");
      return;
    }
    setLoading(true);
    try {
      const r = await listSeries({ project_id: projectId.trim(), q: q.trim() || undefined, limit: 50, offset: 0 });
      setItems(r.items || []);
      setTotal(typeof r.total === "number" ? r.total : (r.items || []).length);
    } catch (e: any) {
      setErr(e?.message || "failed to load series");
    } finally {
      setLoading(false);
    }
  }

  async function onCreate() {
    setErr(null);
    if (!canCreate) {
      setErr("project_id + name are required.");
      return;
    }
    setLoading(true);
    try {
      await createSeries({
        project_id: projectId.trim(),
        name: name.trim(),
        style_text: styleText || null,
        continuity_text: continuityText || null,
      });
      setName("");
      setStyleText("");
      setContinuityText("");
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "create failed");
    } finally {
      setLoading(false);
    }
  }

  function onClearQ() {
    setQ("");
  }

  async function archive(id: string) {
    setErr(null);
    setLoading(true);
    try {
      await patchSeries(id, { archived_at: new Date().toISOString() });
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "archive failed");
    } finally {
      setLoading(false);
    }
  }

  async function restore(id: string) {
    setErr(null);
    setLoading(true);
    try {
      await patchSeries(id, { archived_at: null });
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "restore failed");
    } finally {
      setLoading(false);
    }
  }



  useEffect(() => {
    if ((projectId || '').trim()) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 40, fontWeight: 800, marginBottom: 8 }}>Series</h1>
      <div style={{ color: "#555", marginBottom: 16 }}>
        Series must be listed with a required <code>project_id</code> filter (M02).
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 16, alignItems: "start" }}>
        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>Create</div>

          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <div>project_id (required)</div>
              <input value={projectId} onChange={(e) => setProjectId(e.target.value)} style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 8 }} />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div>name (required)</div>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Series name" style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 8 }} />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div>style_text</div>
              <textarea value={styleText} onChange={(e) => setStyleText(e.target.value)} rows={4} style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 8 }} />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div>continuity_text</div>
              <textarea value={continuityText} onChange={(e) => setContinuityText(e.target.value)} rows={4} style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 8 }} />
            </label>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={onCreate} disabled={!canCreate || loading} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #ddd", background: canCreate && !loading ? "#fff" : "#f7f7f7" }}>
                Create
              </button>
              <button onClick={refresh} disabled={!canQuery || loading} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #ddd", background: canQuery && !loading ? "#fff" : "#f7f7f7" }}>
                Refresh
              </button>
            </div>

            {err ? (
              <div style={{ padding: 10, border: "1px solid #f3c", borderRadius: 10, background: "#fff5fb", color: "#a1005a", whiteSpace: "pre-wrap" }}>
                {err}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Series</div>
            <div style={{ color: "#666" }}>total: {total}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "240px 1fr auto auto", gap: 10, alignItems: "end", marginBottom: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <div>project_id (required)</div>
              <input value={projectId} onChange={(e) => setProjectId(e.target.value)} style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 8 }} />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div>q (optional)</div>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="name contains..." style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 8 }} />
            </label>

            <button onClick={refresh} disabled={!canQuery || loading} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #ddd", background: canQuery && !loading ? "#fff" : "#f7f7f7" }}>
              Refresh
            </button>

            <button onClick={onClearQ} disabled={loading} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #ddd", background: !loading ? "#fff" : "#f7f7f7" }}>
              Clear
            </button>
          </div>

          {loading ? <div style={{ color: "#666", marginBottom: 10 }}>loading...</div> : null}

          <div style={{ display: "grid", gap: 10 }}>
            {items.map((s) => (
              <div key={s.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{s.name}</div>
                  <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>project_id: {s.project_id}</div>
                  <div style={{ color: "#666", fontSize: 12 }}>archived_at: {String(s.archived_at ?? "null")}</div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Link href={`/series/${s.id}`} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #ddd", textDecoration: "none" }}>
                    Open
                  </Link>

                  {s.archived_at ? (
                    <button onClick={() => restore(s.id)} disabled={loading} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #ddd", background: "#fff" }}>
                      Restore
                    </button>
                  ) : (
                    <button onClick={() => archive(s.id)} disabled={loading} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #ddd", background: "#fff" }}>
                      Archive
                    </button>
                  )}

                  
                </div>
              </div>
            ))}
            {items.length === 0 ? (
              <div style={{ color: "#777" }}>
                No items. Ensure <code>project_id</code> is set, then Refresh.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
