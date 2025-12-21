"use client";

import { useEffect, useState } from "react";
import { Workflow, createWorkflow, listWorkflows, updateWorkflow } from "../../lib/api/workflows";

function parseJsonOrNull(s: string): Record<string, any> | null {
  const t = (s || "").trim();
  if (!t) return null;
  return JSON.parse(t);
}

export function WorkflowsPanel() {
  const [items, setItems] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [projectId, setProjectId] = useState("p_demo");
  const [name, setName] = useState("WF1");
  const [workflowType, setWorkflowType] = useState("comfyui_workflow");
  const [workflowBlobAssetId, setWorkflowBlobAssetId] = useState("asset_wf_1");
  const [defaultParams, setDefaultParams] = useState('{"steps":20}');

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const r = await listWorkflows({ limit: 50, offset: 0, archived: false });
      setItems(r.items || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load workflows");
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
      const dp = parseJsonOrNull(defaultParams);
      await createWorkflow({
        project_id: projectId,
        name,
        workflow_type: workflowType,
        workflow_blob_asset_id: workflowBlobAssetId || null,
        default_params: dp,
      });
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Create failed");
    } finally {
      setLoading(false);
    }
  }

  async function onArchive(w: Workflow) {
    setLoading(true);
    setErr(null);
    try {
      await updateWorkflow(w.id, { archived_at: new Date().toISOString() } as any);
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
        <div className="font-medium">Create Workflow</div>
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
            <div className="mb-1 text-xs opacity-70">workflow_type</div>
            <input className="w-full rounded border px-2 py-1" value={workflowType} onChange={(e) => setWorkflowType(e.target.value)} />
          </label>
          <label className="text-sm">
            <div className="mb-1 text-xs opacity-70">workflow_blob_asset_id</div>
            <input className="w-full rounded border px-2 py-1" value={workflowBlobAssetId} onChange={(e) => setWorkflowBlobAssetId(e.target.value)} />
          </label>
          <label className="text-sm md:col-span-2">
            <div className="mb-1 text-xs opacity-70">default_params (JSON)</div>
            <textarea className="w-full rounded border px-2 py-1 font-mono text-xs" rows={3} value={defaultParams} onChange={(e) => setDefaultParams(e.target.value)} />
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
          <div className="font-medium">Workflows</div>
          <div className="text-sm opacity-70">{loading ? "Loading..." : `${items.length} items`}</div>
        </div>
        <div className="mt-2 space-y-2">
          {items.map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded border p-2">
              <div className="min-w-0">
                <div className="truncate font-mono text-xs opacity-70">{w.id}</div>
                <div className="truncate">{w.name}</div>
                <div className="text-xs opacity-70">project={w.project_id} type={w.workflow_type}</div>
              </div>
              <div className="ml-2 flex shrink-0 gap-2">
                <button className="rounded border px-2 py-1 text-sm disabled:opacity-50" onClick={() => onArchive(w)} disabled={loading}>
                  Archive
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && !loading ? <div className="text-sm opacity-70">No workflows yet.</div> : null}
        </div>
      </div>
    </div>
  );
}
