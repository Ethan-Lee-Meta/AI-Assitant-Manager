"use client";

import { useEffect, useMemo, useState } from "react";
import { Provider, createProvider, listProviders, updateProvider } from "../../lib/api/providers";

function parseJsonOrNull(s: string): Record<string, any> | null {
  const t = (s || "").trim();
  if (!t) return null;
  return JSON.parse(t);
}

export function ProvidersPanel() {
  const [items, setItems] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("DemoProvider");
  const [providerType, setProviderType] = useState("http_api");
  const [supportedKinds, setSupportedKinds] = useState("text2image,text2video");
  const [endpointConfig, setEndpointConfig] = useState('{"base_url":"http://example"}');
  const [isEnabled, setIsEnabled] = useState(true);

  const kinds = useMemo(() => {
    return supportedKinds
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }, [supportedKinds]);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const r = await listProviders({ limit: 50, offset: 0, archived: false });
      setItems(r.items || []);
    } catch (e: any) {
      setErr(e?.message || "Failed to load providers");
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
      const cfg = parseJsonOrNull(endpointConfig);
      await createProvider({
        name,
        provider_type: providerType,
        supported_kinds: kinds,
        endpoint_config: cfg,
        is_enabled: isEnabled,
      });
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Create failed");
    } finally {
      setLoading(false);
    }
  }

  async function onToggle(p: Provider) {
    setLoading(true);
    setErr(null);
    try {
      await updateProvider(p.id, { is_enabled: !p.is_enabled });
      await refresh();
    } catch (e: any) {
      setErr(e?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  }

  async function onArchive(p: Provider) {
    setLoading(true);
    setErr(null);
    try {
      await updateProvider(p.id, { archived_at: new Date().toISOString() } as any);
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
        <div className="font-medium">Create Provider</div>
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
          <label className="text-sm">
            <div className="mb-1 text-xs opacity-70">name</div>
            <input className="w-full rounded border px-2 py-1" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="text-sm">
            <div className="mb-1 text-xs opacity-70">provider_type</div>
            <input className="w-full rounded border px-2 py-1" value={providerType} onChange={(e) => setProviderType(e.target.value)} />
          </label>
          <label className="text-sm md:col-span-2">
            <div className="mb-1 text-xs opacity-70">supported_kinds (comma-separated)</div>
            <input className="w-full rounded border px-2 py-1" value={supportedKinds} onChange={(e) => setSupportedKinds(e.target.value)} />
          </label>
          <label className="text-sm md:col-span-2">
            <div className="mb-1 text-xs opacity-70">endpoint_config (JSON)</div>
            <textarea className="w-full rounded border px-2 py-1 font-mono text-xs" rows={3} value={endpointConfig} onChange={(e) => setEndpointConfig(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />
            is_enabled
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
          <div className="font-medium">Providers</div>
          <div className="text-sm opacity-70">{loading ? "Loading..." : `${items.length} items`}</div>
        </div>
        <div className="mt-2 space-y-2">
          {items.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded border p-2">
              <div className="min-w-0">
                <div className="truncate font-mono text-xs opacity-70">{p.id}</div>
                <div className="truncate">{p.name}</div>
                <div className="text-xs opacity-70">
                  type={p.provider_type} enabled={String(p.is_enabled)} kinds={Array.isArray(p.supported_kinds) ? p.supported_kinds.join(",") : ""}
                </div>
              </div>
              <div className="ml-2 flex shrink-0 gap-2">
                <button className="rounded border px-2 py-1 text-sm disabled:opacity-50" onClick={() => onToggle(p)} disabled={loading}>
                  Toggle
                </button>
                <button className="rounded border px-2 py-1 text-sm disabled:opacity-50" onClick={() => onArchive(p)} disabled={loading}>
                  Archive
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && !loading ? <div className="text-sm opacity-70">No providers yet.</div> : null}
        </div>
      </div>
    </div>
  );
}
