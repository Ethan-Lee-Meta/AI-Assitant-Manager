import { apiFetch } from "./client";

export type EpisodeOrVideoKind = "episode" | "video";

export type EpisodeOrVideo = {
  id: string;
  project_id: string;
  series_id: string;
  title: string;
  kind: EpisodeOrVideoKind;

  synopsis_text?: string | null;
  script_text?: string | null;
  order_index?: number | null;
  assembly_preset_id?: string | null;

  created_at: string;
  updated_at?: string | null;
  archived_at?: string | null;
};

export type EpisodeOrVideoCreate = {
  project_id: string;
  series_id: string;
  title: string;
  kind: EpisodeOrVideoKind;

  synopsis_text?: string | null;
  script_text?: string | null;
  order_index?: number | null;
  assembly_preset_id?: string | null;
};

export type EpisodeOrVideoPatch = {
  title?: string | null;
  synopsis_text?: string | null;
  script_text?: string | null;
  order_index?: number | null;
  assembly_preset_id?: string | null;
  archived_at?: string | null;
};

export type EpisodeOrVideoListResp = {
  total: number;
  items: EpisodeOrVideo[];
  limit: number;
  offset: number;
};

const ALLOWED_SORT_FIELDS = new Set(["created_at", "updated_at", "order_index", "title"]);

/**
 * Canonical sort format for this frontend:
 *  - "-field" => desc
 *  - "field"  => asc
 * Also accepts "field:desc|asc" and normalizes.
 */
export function normalizeSort(input?: string): string {
  const raw = (input ?? "").trim();
  if (!raw) return "-created_at";

  // accept "field:desc"
  if (raw.includes(":")) {
    const [f, d] = raw.split(":", 2).map((s) => (s ?? "").trim());
    const field = f.replace(/^\+|^-/, "");
    if (!ALLOWED_SORT_FIELDS.has(field)) return "-created_at";
    const dir = (d || "").toLowerCase();
    if (dir === "desc") return `-${field}`;
    return field;
  }

  const isDesc = raw.startsWith("-");
  const field = raw.replace(/^\+|^-/, "");
  if (!ALLOWED_SORT_FIELDS.has(field)) return "-created_at";
  return isDesc ? `-${field}` : field;
}

function buildQuery(args: {
  project_id: string;
  series_id?: string;
  kind?: EpisodeOrVideoKind;
  q?: string;
  archived?: boolean;
  limit?: number;
  offset?: number;
  sort?: string;
}): string {
  const params = new URLSearchParams();

  // unified list defaults (match backend ListQuery defaults)
  params.set("limit", String(args.limit ?? 50));
  params.set("offset", String(args.offset ?? 0));
  params.set("archived", (args.archived ?? false) ? "true" : "false");
  params.set("sort", normalizeSort(args.sort));

  // resource-specific filters
  const pid = (args.project_id ?? "").trim();
  if (!pid) throw new Error("project_id is required");
  params.set("project_id", pid);

  const sid = (args.series_id ?? "").trim();
  if (sid) params.set("series_id", sid);

  if (args.kind) params.set("kind", args.kind);

  const qq = (args.q ?? "").trim();
  if (qq) params.set("q", qq);

  const s = params.toString();
  return s ? `?${s}` : "";
}

export async function createEpisodeOrVideo(payload: EpisodeOrVideoCreate): Promise<EpisodeOrVideo> {
  return apiFetch<EpisodeOrVideo>(`/api/episodes_or_videos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  });
}

export async function getEpisodeOrVideo(id: string): Promise<EpisodeOrVideo> {
  return apiFetch<EpisodeOrVideo>(`/api/episodes_or_videos/${id}`);
}

export async function patchEpisodeOrVideo(id: string, patch: EpisodeOrVideoPatch): Promise<EpisodeOrVideo> {
  return apiFetch<EpisodeOrVideo>(`/api/episodes_or_videos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch ?? {}),
  });
}

export async function listEpisodesOrVideos(args: {
  project_id: string;
  series_id?: string;
  kind?: EpisodeOrVideoKind;
  q?: string;
  archived?: boolean;
  limit?: number;
  offset?: number;
  sort?: string;
}): Promise<EpisodeOrVideoListResp> {
  const qs = buildQuery(args);
  return apiFetch<EpisodeOrVideoListResp>(`/api/episodes_or_videos${qs}`);
}
