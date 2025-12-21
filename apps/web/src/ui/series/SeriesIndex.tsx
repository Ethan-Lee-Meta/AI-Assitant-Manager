"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSeries, listSeries, Series } from "../../lib/api/series";

const LS_KEY = "aam.series.query.project_id";

export function SeriesIndex() {
  const [queryProjectId, setQueryProjectId] = useState("");
  const [q, setQ] = useState("");

  const [createProjectId, setCreateProjectId] = useState("");
  const [name, setName] = useState("");
  const [styleText, setStyleText] = useState("");
  const [continuityText, setContinuityText] = useState("");

  const [items, setItems] = useState<Series[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    const v = localStorage.getItem(LS_KEY);
    if (v) setQueryProjectId(v);
  }, []);

  useEffect(() => {
    if (queryProjectId) localStorage.setItem(LS_KEY, queryProjectId);
  }, [queryProjectId]);

  const refresh = useCallback(async () => {
    setErr("");
    try {
      const res = await listSeries({
        project_id: queryProjectId.trim() || undefined,
        q: q.trim() || undefined,
        limit: 50,
        offset: 0,
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (e: any) {
      setItems([]);
      setTotal(0);
      setErr(e?.message || "Request failed");
    }
  }, [queryProjectId, q]);

  const clearQOnly = useCallback(() => {
    setQ("");
  }, []);

  const onCreate = useCallback(async () => {
    setErr("");
    const pid = createProjectId.trim();
    const nm = name.trim();
    if (!pid) {
      setErr("Create: project_id is required.");
      return;
    }
    if (!nm) {
      setErr("Create: name is required.");
      return;
    }
    try {
      await createSeries({
        project_id: pid,
        name: nm,
        style_text: styleText || null,
        continuity_text: continuityText || null,
      });
      // after create, switch listing to that project_id (helps avoid “created but not visible” confusion)
      setQueryProjectId(pid);
      await refresh();
      setName("");
      setStyleText("");
      setContinuityText("");
    } catch (e: any) {
      setErr(e?.message || "Create failed");
    }
  }, [createProjectId, name, styleText, continuityText, refresh]);

  const header = useMemo(() => {
    return `total: ${total}`;
  }, [total]);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 36, fontWeight: 700 }}>Series</h1>
      <p style={{ marginTop: 8, color: "#444" }}>
        Series list supports optional <code>project_id</code> filtering (M02).
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 18, marginTop: 18 }}>
        {/* Create */}
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Create</h2>

          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
            <div>project_id (required)</div>
            <input value={createProjectId} onChange={(e) => setCreateProjectId(e.target.value)} placeholder="project_id" />

            <div>name (required)</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Series name" />

            <div>style_text</div>
            <textarea value={styleText} onChange={(e) => setStyleText(e.target.value)} rows={5} />

            <div>continuity_text</div>
            <textarea value={continuityText} onChange={(e) => setContinuityText(e.target.value)} rows={5} />
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button onClick={onCreate}>Create</button>
          </div>

          {err ? <div style={{ marginTop: 10, color: "crimson" }}>{err}</div> : null}
        </div>

        {/* List + Query */}
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Series</h2>
            <div style={{ color: "#444" }}>{header}</div>
          </div>

          {/* Query (moved above list) */}
          <div style={{ marginTop: 10, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 10 }}>Query</div>
            <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 10, alignItems: "center" }}>
              <div>project_id (optional)</div>
              <input value={queryProjectId} onChange={(e) => setQueryProjectId(e.target.value)} placeholder="project_id (blank = all)" />

              <div>q (optional)</div>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="name contains..." />
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
              <button onClick={refresh}>Refresh</button>
              <button onClick={clearQOnly}>Clear</button>
            </div>
          </div>

          {/* List */}
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {items.length === 0 ? (
              <div style={{ color: "#666" }}>
                No items.
                {err ? <div style={{ color: "crimson", marginTop: 6 }}>{err}</div> : null}
              </div>
            ) : (
              items.map((x) => (
                <div key={x.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{x.name}</div>
                    <div style={{ fontSize: 12, color: "#444" }}>project_id: {x.project_id}</div>
                    <div style={{ fontSize: 12, color: "#444" }}>archived_at: {String(x.archived_at ?? "null")}</div>
                  </div>
                  <a href={`/series/${x.id}`} style={{ border: "1px solid #ddd", borderRadius: 10, padding: "6px 12px", textDecoration: "none" }}>
                    Open
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
