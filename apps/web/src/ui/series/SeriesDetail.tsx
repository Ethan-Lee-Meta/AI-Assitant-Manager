"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSeries, Series, updateSeries } from "../../lib/api/series";

export function SeriesDetail({ series_id }: { series_id: string }) {
  const [item, setItem] = useState<Series | null>(null);
  const [err, setErr] = useState("");

  const [styleText, setStyleText] = useState("");
  const [continuityText, setContinuityText] = useState("");

  const [promptIdInput, setPromptIdInput] = useState("");
  const [roleIdInput, setRoleIdInput] = useState("");

  const refresh = useCallback(async () => {
    setErr("");
    try {
      const x = await getSeries(series_id);
      setItem(x);
      setStyleText(x.style_text || "");
      setContinuityText(x.continuity_text || "");
    } catch (e: any) {
      setErr(e?.message || "Failed to load series");
    }
  }, [series_id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const promptIds = useMemo(() => item?.prompt_ids || [], [item]);
  const roleIds = useMemo(() => item?.role_ids || [], [item]);

  const saveTexts = useCallback(async () => {
    if (!item) return;
    setErr("");
    try {
      const x = await updateSeries(item.id, { style_text: styleText, continuity_text: continuityText });
      setItem(x);
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    }
  }, [item, styleText, continuityText]);

  const addPromptId = useCallback(async () => {
    if (!item) return;
    const v = promptIdInput.trim();
    if (!v) return;
    if (promptIds.includes(v)) return;
    setErr("");
    try {
      const x = await updateSeries(item.id, { prompt_ids: [...promptIds, v] });
      setItem(x);
      setPromptIdInput("");
    } catch (e: any) {
      setErr(e?.message || "Update failed");
    }
  }, [item, promptIdInput, promptIds]);

  const removePromptId = useCallback(
    async (pid: string) => {
      if (!item) return;
      setErr("");
      try {
        const x = await updateSeries(item.id, { prompt_ids: promptIds.filter((x) => x !== pid) });
        setItem(x);
      } catch (e: any) {
        setErr(e?.message || "Update failed");
      }
    },
    [item, promptIds]
  );

  const addRoleId = useCallback(async () => {
    if (!item) return;
    const v = roleIdInput.trim();
    if (!v) return;
    if (roleIds.includes(v)) return;
    setErr("");
    try {
      const x = await updateSeries(item.id, { role_ids: [...roleIds, v] });
      setItem(x);
      setRoleIdInput("");
    } catch (e: any) {
      setErr(e?.message || "Update failed");
    }
  }, [item, roleIdInput, roleIds]);

  const removeRoleId = useCallback(
    async (rid: string) => {
      if (!item) return;
      setErr("");
      try {
        const x = await updateSeries(item.id, { role_ids: roleIds.filter((x) => x !== rid) });
        setItem(x);
      } catch (e: any) {
        setErr(e?.message || "Update failed");
      }
    },
    [item, roleIds]
  );

  if (!item) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700 }}>Series</h1>
        {err ? <div style={{ color: "crimson", marginTop: 10 }}>{err}</div> : <div style={{ marginTop: 10 }}>Loading...</div>}
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700 }}>{item.name}</h1>
          <div style={{ color: "#444", marginTop: 6, fontSize: 12 }}>
            id: {item.id} · project_id: {item.project_id}
          </div>
        </div>
        <a href="/series" style={{ textDecoration: "none", color: "#2563eb" }}>
          Back to list
        </a>
      </div>

      {err ? <div style={{ marginTop: 12, color: "crimson" }}>{err}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Style / Continuity</h2>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, color: "#444" }}>style_text</div>
            <textarea value={styleText} onChange={(e) => setStyleText(e.target.value)} rows={7} style={{ width: "100%", marginTop: 6 }} />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, color: "#444" }}>continuity_text</div>
            <textarea value={continuityText} onChange={(e) => setContinuityText(e.target.value)} rows={7} style={{ width: "100%", marginTop: 6 }} />
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            <button onClick={saveTexts}>Save</button>
            <button onClick={refresh}>Reload</button>
          </div>
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Associations</h2>

          <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 700 }}>Prompts</div>

            <div style={{ marginTop: 8, display: "flex", gap: 10 }}>
              <input value={promptIdInput} onChange={(e) => setPromptIdInput(e.target.value)} placeholder="prompt_id to link" style={{ flex: 1 }} />
              <button onClick={addPromptId}>Add</button>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {promptIds.length === 0 ? (
                <div style={{ color: "#666" }}>No linked prompts.</div>
              ) : (
                promptIds.map((pid) => (
                  <div key={pid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #f0f0f0", borderRadius: 10, padding: "8px 10px" }}>
                    <code>{pid}</code>
                    <button onClick={() => removePromptId(pid)}>Remove</button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 700 }}>Roles</div>

            <div style={{ marginTop: 8, display: "flex", gap: 10 }}>
              <input value={roleIdInput} onChange={(e) => setRoleIdInput(e.target.value)} placeholder="role_id to link" style={{ flex: 1 }} />
              <button onClick={addRoleId}>Add</button>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {roleIds.length === 0 ? (
                <div style={{ color: "#666" }}>No linked roles.</div>
              ) : (
                roleIds.map((rid) => (
                  <div key={rid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #f0f0f0", borderRadius: 10, padding: "8px 10px" }}>
                    <code>{rid}</code>
                    <button onClick={() => removeRoleId(rid)}>Remove</button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 700 }}>Episode / Video Entry</div>
            <div style={{ marginTop: 8, color: "#444", fontSize: 12 }}>
              These are M02 entry points. M03 will implement actual Episode/Video creation.
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
              <a href={`/series/${item.id}/episodes/new`} style={{ textDecoration: "none", border: "1px solid #ddd", borderRadius: 10, padding: "6px 10px" }}>
                Create Episode
              </a>
              <a href={`/series/${item.id}/videos/new`} style={{ textDecoration: "none", border: "1px solid #ddd", borderRadius: 10, padding: "6px 10px" }}>
                Create Video
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
