import { apiFetch } from "./client";

export type FeedKind = "episode" | "video";

export type FeedItem = {
  id: string;
  kind: FeedKind;
  project_id: string;
  series_id: string;
  title: string;
  synopsis_text?: string | null;
  order_index?: number | null;
  assembly_preset_id?: string | null;
  created_at: string;
  updated_at?: string | null;
  archived_at?: string | null;
};

export type FeedListResp = {
  total: number;
  items: FeedItem[];
  limit: number;
  offset: number;
};

export async function listFeed(args: {
  project_id?: string;
  series_id?: string;
  kind?: FeedKind;
  q?: string;
  archived?: boolean;
  sort?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<FeedListResp> {
  const params = new URLSearchParams();

  const pid = (args.project_id ?? "").trim();
  const sid = (args.series_id ?? "").trim();
  const q = (args.q ?? "").trim();

  params.set("limit", String(args.limit ?? 50));
  params.set("offset", String(args.offset ?? 0));
  params.set("archived", (args.archived ?? false) ? "true" : "false");
  params.set("sort", String(args.sort ?? "-created_at"));

  if (pid) params.set("project_id", pid);
  if (sid) params.set("series_id", sid);
  if (typeof args.kind !== "undefined") params.set("kind", String(args.kind));
  if (q) params.set("q", q);

  const qs = params.toString();
  return apiFetch<FeedListResp>(`/api/feed?${qs}`);
}
