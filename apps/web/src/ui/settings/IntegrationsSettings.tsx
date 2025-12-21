"use client";

import { useEffect, useState } from "react";
import { createProvider, listProviders, updateProvider, Provider, ProviderKind } from "./lib/api/providers";
import { createWorkflow, listWorkflows, updateWorkflow, Workflow } from "./lib/api/workflows";
import { createTool, listTools, updateTool, Tool } from "./lib/api/tools";

function FieldRow(props: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>{props.label}</div>
      {props.children}
    </div>
  );
}

function nowIso() {
  return new Date().toISOString();
}

function parseKinds(s: string): ProviderKind[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean) as ProviderKind[];
}

export function IntegrationsSettings() {
  // Providers
  const [pItems, setPItems] = useState<Provider[]>([]);
  const [pTotal, setPTotal] = useState<number>(0);
  const [pLoading, setPLoading] = useState<boolean>(false);
  const [pErr, setPErr] = useState<string | null>(null);
  const [pShowArchived, setPShowArchived] = useState<boolean>(false);

  const [pName, setPName] = useState<string>("");
  const [pType, setPType] = useState<string>("http_api");
  const [pKinds, setPKinds] = useState<string>("text2image");
  const [pBaseUrl, setPBaseUrl] = useState<string>("");
  const [pApiKeyEnv, setPApiKeyEnv] = useState<string>("");
  const [pApiKey, setPApiKey] = useState<string>("");
  const [pEnabled, setPEnabled] = useState<boolean>(true);

  // Workflows
  const [wItems, setWItems] = useState<Workflow[]>([]);
  const [wTotal, setWTotal] = useState<number>(0);
  const [wLoading, setWLoading] = useState<boolean>(false);
  const [wErr, setWErr] = useState<string | null>(null);
  const [wShowArchived, setWShowArchived] = useState<boolean>(false);

  const [wProjectId, setWProjectId] = useState<string>("p_demo");
  const [wName, setWName] = useState<string>("");
  const [wType, setWType] = useState<string>("comfyui_workflow");
  const [wBlobAssetId, setWBlobAssetId] = useState<string>("");

  // Tools
  const [tItems, setTItems] = useState<Tool[]>([]);
  const [tTotal, setTTotal] = useState<number>(0);
  const [tLoading, setTLoading] = useState<boolean>(false);
  const [tErr, setTErr] = useState<string | null>(null);
  const [tShowArchived, setTShowArchived] = useState<boolean>(false);

  const [tProjectId, setTProjectId] = useState<string>("p_demo");
  const [tName, setTName] = useState<string>("");
  const [tType, setTType] = useState<string>("postprocess");
  const [tConfig, setTConfig] = useState<string>('{"strength":0.5}');
  const [tDesc, setTDesc] = useState<string>("");

  async function refreshProviders() {
    setPLoading(true);
    setPErr(null);
    try {
      const r = await listProviders({ limit: 50, offset: 0, archived: pShowArchived });
      setPItems(r.items);
      setPTotal(r.total);
    } catch (e: any) {
      setPErr(e?.message || "list providers failed");
    } finally {
      setPLoading(false);
    }
  }

  async function refreshWorkflows() {
    setWLoading(true);
    setWErr(null);
    try {
      const r = await listWorkflows({ limit: 50, offset: 0, archived: wShowArchived, project_id: wProjectId || undefined });
      setWItems(r.items);
      setWTotal(r.total);
    } catch (e: any) {
      setWErr(e?.message || "list workflows failed");
    } finally {
      setWLoading(false);
    }
  }

  async function refreshTools() {
    setTLoading(true);
    setTErr(null);
    try {
      const r = await listTools({ limit: 50, offset: 0, archived: tShowArchived, project_id: tProjectId || undefined });
      setTItems(r.items);
      setTTotal(r.total);
    } catch (e: any) {
      setTErr(e?.message || "list tools failed");
    } finally {
      setTLoading(false);
    }
  }

  useEffect(() => {
    refreshProviders();
    refreshWorkflows();
    refreshTools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreateProvider() {
    setPErr(null);
    const kinds = parseKinds(pKinds);
    if (!pName.trim()) return setPErr("Provider name is required");
    if (!pType.trim()) return setPErr("provider_type is required");
    if (!kinds.length) return setPErr("supported_kinds is required");
    if (!pBaseUrl.trim()) return setPErr("endpoint_config.base_url is required");

    try {
      await createProvider({
        name: pName.trim(),
        provider_type: pType.trim(),
        supported_kinds: kinds,
        endpoint_config: {
          base_url: pBaseUrl.trim(),
          api_key_env: pApiKeyEnv.trim() || undefined,
          api_key: pApiKey.trim() || undefined,
        },
        is_enabled: pEnabled,
      });
      setPName("");
      await refreshProviders();
    } catch (e: any) {
      setPErr(e?.message || "create provider failed");
    }
  }

  async function onArchiveProvider(id: string) {
    setPErr(null);
    try {
      await updateProvider(id, { archived_at: nowIso() });
      await refreshProviders();
    } catch (e: any) {
      setPErr(e?.message || "archive provider failed");
    }
  }

  async function onRestoreProvider(id: string) {
    setPErr(null);
    try {
      await updateProvider(id, { archived_at: null });
      await refreshProviders();
    } catch (e: any) {
      setPErr(e?.message || "restore provider failed");
    }
  }

  async function onCreateWorkflow() {
    setWErr(null);
    if (!wName.trim()) return setWErr("Workflow name is required");
    if (!wType.trim()) return setWErr("workflow_type is required");

    try {
      await createWorkflow({
        project_id: wProjectId.trim() || undefined,
        name: wName.trim(),
        workflow_type: wType.trim(),
        workflow_blob_asset_id: wBlobAssetId.trim() || null,
        default_params: { steps: 20 },
      });
      setWName("");
      await refreshWorkflows();
    } catch (e: any) {
      setWErr(e?.message || "create workflow failed");
    }
  }

  async function onArchiveWorkflow(id: string) {
    setWErr(null);
    try {
      await updateWorkflow(id, { archived_at: nowIso() });
      await refreshWorkflows();
    } catch (e: any) {
      setWErr(e?.message || "archive workflow failed");
    }
  }

  async function onRestoreWorkflow(id: string) {
    setWErr(null);
    try {
      await updateWorkflow(id, { archived_at: null });
      await refreshWorkflows();
    } catch (e: any) {
      setWErr(e?.message || "restore workflow failed");
    }
  }

  async function onCreateTool() {
    setTErr(null);
    if (!tName.trim()) return setTErr("Tool name is required");
    if (!tType.trim()) return setTErr("tool_type is required");

    let cfg: any = {};
    try {
      cfg = tConfig.trim() ? JSON.parse(tConfig) : {};
    } catch {
      return setTErr("config must be valid JSON");
    }

    try {
      await createTool({
        project_id: tProjectId.trim() || undefined,
        name: tName.trim(),
        tool_type: tType.trim(),
        config: cfg,
        description: tDesc.trim() || undefined,
      });
      setTName("");
      await refreshTools();
    } catch (e: any) {
      setTErr(e?.message || "create tool failed");
    }
  }

  async function onArchiveTool(id: string) {
    setTErr(null);
    try {
      await updateTool(id, { archived_at: nowIso() });
      await refreshTools();
    } catch (e: any) {
      setTErr(e?.message || "archive tool failed");
    }
  }

  async function onRestoreTool(id: string) {
    setTErr(null);
    try {
      await updateTool(id, { archived_at: null });
      await refreshTools();
    } catch (e: any) {
      setTErr(e?.message || "restore tool failed");
    }
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: 0, marginBottom: 8 }}>Providers</h2>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ color: "#666", fontSize: 12 }}>total={pTotal} (limit=50)</div>
          <label style={{ fontSize: 12, color: "#333" }}>
            <input type="checkbox" checked={pShowArchived} onChange={(e) => setPShowArchived(e.target.checked)} /> show archived
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
          <FieldRow label="Name (required)">
            <input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="e.g. MyProvider" style={{ width: "100%" }} />
          </FieldRow>
          <FieldRow label="Type (required)">
            <select value={pType} onChange={(e) => setPType(e.target.value)} style={{ width: "100%" }}>
              <option value="http_api">http_api</option>
              <option value="local">local</option>
            </select>
          </FieldRow>
          <FieldRow label="Supported kinds (comma-separated, required)">
            <input value={pKinds} onChange={(e) => setPKinds(e.target.value)} placeholder="text2image,text2video" style={{ width: "100%" }} />
          </FieldRow>
          <FieldRow label="Base URL (required)">
            <input value={pBaseUrl} onChange={(e) => setPBaseUrl(e.target.value)} placeholder="http://127.0.0.1:8188" style={{ width: "100%" }} />
          </FieldRow>
          <FieldRow label="api_key_env (recommended)">
            <input value={pApiKeyEnv} onChange={(e) => setPApiKeyEnv(e.target.value)} placeholder="e.g. OPENAI_API_KEY" style={{ width: "100%" }} />
          </FieldRow>
          <FieldRow label="api_key (NOT recommended; plaintext)">
            <input value={pApiKey} onChange={(e) => setPApiKey(e.target.value)} placeholder="" style={{ width: "100%" }} />
          </FieldRow>
        </div>

        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <input type="checkbox" checked={pEnabled} onChange={(e) => setPEnabled(e.target.checked)} />
          enabled
        </label>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={onCreateProvider} disabled={pLoading}>Create</button>
          <button onClick={() => { refreshProviders(); }} disabled={pLoading}>Refresh</button>
        </div>
        {pErr ? <div style={{ color: "crimson", marginBottom: 8 }}>{pErr}</div> : null}

        <div style={{ display: "grid", gap: 12 }}>
          {pItems.map((p) => (
            <div key={p.id} style={{ border: "1px solid #f0f0f0", borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{p.provider_type}</div>
              </div>
              <div style={{ fontSize: 12, color: "#666" }}>{p.id}</div>
              <div style={{ marginTop: 8, fontSize: 12 }}>kinds: {Array.isArray(p.supported_kinds) ? p.supported_kinds.join(", ") : ""}</div>
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                {p.archived_at ? (
                  <button onClick={() => onRestoreProvider(p.id)}>Restore</button>
                ) : (
                  <button onClick={() => onArchiveProvider(p.id)}>Archive</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: 0, marginBottom: 8 }}>Workflows</h2>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ color: "#666", fontSize: 12 }}>total={wTotal} (limit=50)</div>
          <label style={{ fontSize: 12, color: "#333" }}>
            <input type="checkbox" checked={wShowArchived} onChange={(e) => setWShowArchived(e.target.checked)} /> show archived
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
          <FieldRow label="project_id (optional)">
            <input value={wProjectId} onChange={(e) => setWProjectId(e.target.value)} style={{ width: "100%" }} />
          </FieldRow>
          <FieldRow label="Name (required)">
            <input value={wName} onChange={(e) => setWName(e.target.value)} placeholder="e.g. MyWorkflow" style={{ width: "100%" }} />
          </FieldRow>
          <FieldRow label="workflow_type (required)">
            <input value={wType} onChange={(e) => setWType(e.target.value)} style={{ width: "100%" }} />
          </FieldRow>
          <FieldRow label="workflow_blob_asset_id (optional)">
            <input value={wBlobAssetId} onChange={(e) => setWBlobAssetId(e.target.value)} placeholder="asset_xxx" style={{ width: "100%" }} />
          </FieldRow>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={onCreateWorkflow} disabled={wLoading}>Create</button>
          <button onClick={() => { refreshWorkflows(); }} disabled={wLoading}>Refresh</button>
        </div>
        {wErr ? <div style={{ color: "crimson", marginBottom: 8 }}>{wErr}</div> : null}

        <div style={{ display: "grid", gap: 12 }}>
          {wItems.map((w) => (
            <div key={w.id} style={{ border: "1px solid #f0f0f0", borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 700 }}>{w.name}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{w.workflow_type}</div>
              </div>
              <div style={{ fontSize: 12, color: "#666" }}>{w.id}</div>
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                {w.archived_at ? (
                  <button onClick={() => onRestoreWorkflow(w.id)}>Restore</button>
                ) : (
                  <button onClick={() => onArchiveWorkflow(w.id)}>Archive</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
        <h2 style={{ margin: 0, marginBottom: 8 }}>Tools</h2>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ color: "#666", fontSize: 12 }}>total={tTotal} (limit=50)</div>
          <label style={{ fontSize: 12, color: "#333" }}>
            <input type="checkbox" checked={tShowArchived} onChange={(e) => setTShowArchived(e.target.checked)} /> show archived
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
          <FieldRow label="project_id (optional)">
            <input value={tProjectId} onChange={(e) => setTProjectId(e.target.value)} style={{ width: "100%" }} />
          </FieldRow>
          <FieldRow label="Name (required)">
            <input value={tName} onChange={(e) => setTName(e.target.value)} placeholder="e.g. MyTool" style={{ width: "100%" }} />
          </FieldRow>
          <FieldRow label="tool_type (required)">
            <input value={tType} onChange={(e) => setTType(e.target.value)} style={{ width: "100%" }} />
          </FieldRow>
          <FieldRow label="config (JSON)">
            <input value={tConfig} onChange={(e) => setTConfig(e.target.value)} style={{ width: "100%" }} />
          </FieldRow>
          <FieldRow label="description (optional)">
            <input value={tDesc} onChange={(e) => setTDesc(e.target.value)} style={{ width: "100%" }} />
          </FieldRow>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={onCreateTool} disabled={tLoading}>Create</button>
          <button onClick={() => { refreshTools(); }} disabled={tLoading}>Refresh</button>
        </div>
        {tErr ? <div style={{ color: "crimson", marginBottom: 8 }}>{tErr}</div> : null}

        <div style={{ display: "grid", gap: 12 }}>
          {tItems.map((t) => (
            <div key={t.id} style={{ border: "1px solid #f0f0f0", borderRadius: 10, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 700 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{t.tool_type}</div>
              </div>
              <div style={{ fontSize: 12, color: "#666" }}>{t.id}</div>
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                {t.archived_at ? (
                  <button onClick={() => onRestoreTool(t.id)}>Restore</button>
                ) : (
                  <button onClick={() => onArchiveTool(t.id)}>Archive</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
