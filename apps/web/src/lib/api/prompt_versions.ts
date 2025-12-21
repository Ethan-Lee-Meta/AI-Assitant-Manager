import { apiGet, apiPost } from "./client";

export type PromptKind = "text2image" | "image2image" | "text2video" | "image2video" | "general";

export type PromptVersion = {
  id: string;
  project_id: string;
  prompt_id?: string | null;
  version_label: string;
  prompt_kind: PromptKind;
  resolved_prompt_text: string;
  resolved_params?: Record<string, unknown> | null;
  role_bindings?: Array<{ role_id: string; weight?: number | null; notes?: string | null }> | null;
  workflow_ref?: { workflow_id?: string | null; workflow_version?: string | null; workflow_blob_ref?: string | null } | null;
  created_at: string;
};

export type PromptVersionListResponse = {
  items: PromptVersion[];
  total: number;
  offset: number;
  limit: number;
};

export async function listPromptVersions(params: {
  project_id: string;
  prompt_id?: string;
  prompt_kind?: PromptKind;
  q?: string;
  offset?: number;
  limit?: number;
  sort?: string;
}): Promise<PromptVersionListResponse> {
  const q = new URLSearchParams();
  q.set("project_id", params.project_id);
  if (params.prompt_id) q.set("prompt_id", params.prompt_id);
  if (params.prompt_kind) q.set("prompt_kind", params.prompt_kind);
  if (params.q) q.set("q", params.q);
  q.set("offset", String(params.offset ?? 0));
  q.set("limit", String(params.limit ?? 50));
  if (params.sort) q.set("sort", params.sort);

  return apiGet<PromptVersionListResponse>(`/api/prompt_versions?${q.toString()}`);
}

export async function createPromptVersion(body: {
  project_id: string;
  prompt_id?: string | null;
  version_label: string;
  prompt_kind: PromptKind;
  resolved_prompt_text: string;
  resolved_params?: Record<string, unknown> | null;
}): Promise<PromptVersion> {
  return apiPost<PromptVersion>("/api/prompt_versions", body);
}
