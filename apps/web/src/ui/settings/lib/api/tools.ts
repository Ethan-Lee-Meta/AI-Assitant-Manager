export type Tool = {
  id: string;
  project_id?: string | null;
  name: string;
  tool_type: string;
  config: any;
  description?: string | null;
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
    const msg = data?.error?.message ? `${data.error.message}` : (typeof data === "string" ? data : `HTTP ${res.status}`);
    throw new Error(msg);
  }
  return data as T;
}

export async function listTools(params?: { q?: string; tool_type?: string; project_id?: string; archived?: boolean; limit?: number; offset?: number; }) {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.tool_type) sp.set("tool_type", params.tool_type);
  if (params?.project_id) sp.set("project_id", params.project_id);
  if (typeof params?.archived === "boolean") sp.set("archived", String(params.archived));
  sp.set("limit", String(params?.limit ?? 50));
  sp.set("offset", String(params?.offset ?? 0));
  return apiJson<ListResponse<Tool>>(`/api/tools?${sp.toString()}`);
}

export async function createTool(body: { project_id?: string; name: string; tool_type: string; config: any; description?: string; }) {
  return apiJson<Tool>(`/api/tools`, { method: "POST", body: JSON.stringify(body) });
}

export async function updateTool(id: string, patch: { name?: string; config?: any; description?: string | null; archived_at?: string | null; }) {
  return apiJson<Tool>(`/api/tools/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}
