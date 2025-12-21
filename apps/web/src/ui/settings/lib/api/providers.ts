export type ProviderKind = "text2image" | "image2image" | "text2video" | "image2video";

export type ProviderEndpointConfig = {
  base_url: string;
  api_key_env?: string;
  api_key?: string; // NOT recommended (plaintext)
};

export type Provider = {
  id: string;
  name: string;
  provider_type: string;
  supported_kinds: ProviderKind[];
  endpoint_config?: ProviderEndpointConfig;
  is_enabled: boolean;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type ListResponse<T> = { items: T[]; total: number; limit: number; offset: number };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:7000";

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      cache: "no-store",
    });
  } catch (e: any) {
    throw new Error(`API not reachable: ${e?.message || String(e)}`);
  }

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const msg =
      data?.error?.message ? `${data.error.message}` :
      typeof data === "string" ? data :
      `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export async function listProviders(params?: { q?: string; provider_type?: string; is_enabled?: boolean; archived?: boolean; limit?: number; offset?: number; }) {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.provider_type) sp.set("provider_type", params.provider_type);
  if (typeof params?.is_enabled === "boolean") sp.set("is_enabled", String(params.is_enabled));
  if (typeof params?.archived === "boolean") sp.set("archived", String(params.archived));
  sp.set("limit", String(params?.limit ?? 50));
  sp.set("offset", String(params?.offset ?? 0));
  return apiJson<ListResponse<Provider>>(`/api/providers?${sp.toString()}`);
}

export async function createProvider(body: { name: string; provider_type: string; supported_kinds: ProviderKind[]; endpoint_config?: ProviderEndpointConfig; is_enabled: boolean; }) {
  return apiJson<Provider>(`/api/providers`, { method: "POST", body: JSON.stringify(body) });
}

export async function updateProvider(id: string, patch: { name?: string; supported_kinds?: ProviderKind[]; endpoint_config?: ProviderEndpointConfig; is_enabled?: boolean; archived_at?: string | null; }) {
  return apiJson<Provider>(`/api/providers/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}
