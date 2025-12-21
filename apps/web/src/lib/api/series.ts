// M02 Series API wrapper (client-side)
// NOTE: uses explicit API base to avoid accidentally hitting Next.js /api/* routes on :2000

export type Series = {
  id: string;
  project_id: string;
  name: string;
  style_text?: string | null;
  continuity_text?: string | null;
  archived_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Paged<T> = {
  items: T[];
  total: number;
  limit?: number;
  offset?: number;
};

export type SeriesCreate = {
  project_id: string;
  name: string;
  style_text?: string | null;
  continuity_text?: string | null;
};

export type SeriesPatch = {
  name?: string;
  style_text?: string | null;
  continuity_text?: string | null;
  archived_at?: string | null;
};

function getApiBaseUrl(): string {
  const v = (process.env.NEXT_PUBLIC_API_BASE_URL || "").trim();
  return v || "http://127.0.0.1:7000";
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBaseUrl().replace(/\/$/, "");
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      "Accept": "application/json",
    },
    cache: "no-store",
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // keep raw
  }

  if (!res.ok) {
    const msg = (data && (data.error?.message || data.message)) || `HTTP ${res.status}`;
    const err: any = new Error(msg);
    err.status = res.status;
    err.body = data || text;
    throw err;
  }

  return data as T;
}

export async function listSeries(params: {
  project_id: string;
  q?: string;
  limit?: number;
  offset?: number;
  archived?: boolean;
}): Promise<Paged<Series>> {
  const usp = new URLSearchParams();
  usp.set("project_id", params.project_id);
  if (params.q) usp.set("q", params.q);
  if (typeof params.limit === "number") usp.set("limit", String(params.limit));
  if (typeof params.offset === "number") usp.set("offset", String(params.offset));
  if (typeof params.archived === "boolean") usp.set("archived", params.archived ? "true" : "false");
  return apiFetch<Paged<Series>>(`/api/series?${usp.toString()}`);
}

export async function createSeries(body: SeriesCreate): Promise<Series> {
  return apiFetch<Series>(`/api/series`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function getSeries(series_id: string): Promise<Series> {
  return apiFetch<Series>(`/api/series/${encodeURIComponent(series_id)}`);
}

export async function patchSeries(series_id: string, patch: SeriesPatch): Promise<Series> {
  // IMPORTANT: do not drop null; archived_at: null is used to restore.
  return apiFetch<Series>(`/api/series/${encodeURIComponent(series_id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

// deleteSeries: not exposed by current OpenAPI; use archived_at soft-delete instead.

export async function updateSeries(series_id: string, patch: SeriesPatch): Promise<Series> {
  return patchSeries(series_id, patch);
}

