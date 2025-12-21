import { apiFetch } from "./client";

export type Series = {
  id: string;
  project_id: string;
  name: string;
  style_text?: string | null;
  continuity_text?: string | null;
  prompt_ids: string[];
  role_ids: string[];
  created_at: string;
  updated_at?: string | null;
  archived_at?: string | null;
};

export type SeriesCreate = {
  project_id: string;
  name: string;
  style_text?: string | null;
  continuity_text?: string | null;
  prompt_ids?: string[];
  role_ids?: string[];
};

export type SeriesPatch = {
  name?: string | null;
  style_text?: string | null;
  continuity_text?: string | null;
  prompt_ids?: string[] | null;
  role_ids?: string[] | null;
  archived_at?: string | null;
};

export type SeriesListResp = {
  total: number;
  items: Series[];
  limit: number;
  offset: number;
};

export async function listSeries(args: {
  project_id?: string;
  q?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<SeriesListResp> {
  const params = new URLSearchParams();
  const pid = (args.project_id ?? "").trim();
  const q = (args.q ?? "").trim();
  params.set("limit", String(args.limit ?? 50));
  params.set("offset", String(args.offset ?? 0));
  if (pid) params.set("project_id", pid);
  if (q) params.set("q", q);
  const qs = params.toString();
  return apiFetch<SeriesListResp>(`/api/series?${qs}`);
}

export async function createSeries(payload: SeriesCreate): Promise<Series> {
  return apiFetch<Series>(`/api/series`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
}

export async function getSeries(series_id: string): Promise<Series> {
  return apiFetch<Series>(`/api/series/${series_id}`);
}

export async function updateSeries(series_id: string, patch: SeriesPatch): Promise<Series> {
  return apiFetch<Series>(`/api/series/${series_id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch ?? {}),
  });
}

export async function deleteSeries(series_id: string): Promise<{ ok: boolean }> {
  await apiFetch<unknown>(`/api/series/${series_id}`, { method: "DELETE" });
  return { ok: true };
}
