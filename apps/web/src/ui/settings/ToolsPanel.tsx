"use client";

import { useEffect, useState } from "react";
import { Tool, createTool, listTools, updateTool } from "../../lib/api/tools";

function parseJsonOrNull(s: string): Record<string, any> | null {
  const t = (s || "").trim();
  if (!t) return null;
  return JSON.parse(t);
}

export function ToolsPanel() {
  const [items, setItems] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [projectId, setProjectId] = useState("p_demo");
  const [name, setName] = useState("Tool1");
  const [toolType, setToolType] = useState("postprocess");
  const [description, setDescription] = useState("demo");
  const [config, setConfig] = useState('{"strength":0.5}');

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const r = await listTools({ limit: 50, offset: 0, archived: false });
      setItems(r.items || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load tools");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onCreate() {
    setLoading(true);
    setErr(null);
    try {
      const cfg = parseJsonOrNull(config);
      await createTool({
        project_id: projectId,
        name,
        tool_type: toolType,
        description: description || null,
        config: cfg,
      });
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Create failed");
    } finally {
      setLoading(false);
    }
  }

  async function onArchive(t: Tool) {
    setLoading(true);
    setErr(null);
    try {
      await updateTool(t.id, { archived_at: new Date().toISOString() } as any);
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Archive failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded border p-3">
        <div className="font-medium">Create Tool</div>
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
          <label className="text-sm">
            <div className="mb-1 text-xs opacity-70">project_id</div>
            <input className="w-full rounded border px-2 py-1" value={projectId} onChange={(e) => setProjectId(e.target.value)} />
          </label>
          <label className="text-sm">
            <div className="mb-1 text-xs opacity-70">name</div>
            <input className="w-full rounded border px-2 py-1" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="text-sm">
            <div className="mb-1 text-xs opacity-70">tool_type</div>
            <input className="w-full rounded border px-2 py-1" value={toolType} onChange={(e) => setToolType(e.target.value)} />
          </label>
          <label className="text-sm">
            <div className="mb-1 text-xs opacity-70">description</div>
            <input className="w-full rounded border px-2 py-1" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="text-sm md:col-span-2">
            <div className="mb-1 text-xs opacity-70">config (JSON)</div>
            <textarea className="w-full rounded border px-2 py-1 font-mono text-xs" rows={3} value={config} onChange={(e) => setConfig(e.target.value)} />
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          <button className="rounded bg-black px-3 py-1 text-white disabled:opacity-50" onClick={onCreate} disabled={loading}>
            Create
          </button>
          <button className="rounded border px-3 py-1 disabled:opacity-50" onClick={refresh} disabled={loading}>
            Refresh
          </button>
        </div>
        {err ? <div className="mt-2 text-sm text-red-600">{err}</div> : null}
      </div>

      <div className="rounded border p-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">Tools</div>
          <div className="text-sm opacity-70">{loading ? "Loading..." : `${items.length} items`}</div>
        </div>
        <div className="mt-2 space-y-2">
          {items.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded border p-2">
              <div className="min-w-0">
                <div className="truncate font-mono text-xs opacity-70">{t.id}</div>
                <div className="truncate">{t.name}</div>
                <div className="text-xs opacity-70">project={t.project_id} type={t.tool_type}</div>
              </div>
              <div className="ml-2 flex shrink-0 gap-2">
                <button className="rounded border px-2 py-1 text-sm disabled:opacity-50" onClick={() => onArchive(t)} disabled={loading}>
                  Archive
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && !loading ? <div className="text-sm opacity-70">No tools yet.</div> : null}
        </div>
      </div>
    </div>
  );
}
