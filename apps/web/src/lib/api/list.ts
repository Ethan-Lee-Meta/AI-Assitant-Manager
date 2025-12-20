import { apiGet } from "./client";

export type ListQuery = {
  limit?: number;
  offset?: number;
  sort?: string;
  q?: string;
  archived?: boolean;
};

const DEFAULTS: Required<Pick<ListQuery, "limit" | "offset" | "archived" | "sort">> = {
  limit: 50,
  offset: 0,
  archived: false,
  sort: "-created_at",
};

export function buildListQuery(q?: ListQuery): string {
  const merged: ListQuery = { ...DEFAULTS, ...(q || {}) };

  // rule: q empty string treated as undefined
  if (typeof merged.q === "string" && merged.q.trim() === "") {
    delete (merged as any).q;
  }

  const params = new URLSearchParams();

  // Only allow these 5 parameters
  if (typeof merged.limit !== "undefined") params.set("limit", String(merged.limit));
  if (typeof merged.offset !== "undefined") params.set("offset", String(merged.offset));
  if (typeof merged.sort !== "undefined") params.set("sort", String(merged.sort));
  if (typeof merged.q !== "undefined") params.set("q", String(merged.q));
  if (typeof merged.archived !== "undefined") params.set("archived", merged.archived ? "true" : "false");

  const s = params.toString();
  return s ? `?${s}` : "";
}

export async function listGet<T>(path: string, q?: ListQuery, init?: RequestInit): Promise<T> {
  const qs = buildListQuery(q);
  return apiGet<T>(`${path}${qs}`, init);
}
