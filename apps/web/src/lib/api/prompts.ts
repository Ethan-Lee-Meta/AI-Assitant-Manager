import { apiGet, apiPost } from "./client";

export type PromptKind = "text2image" | "image2image" | "text2video" | "image2video" | "general";

export interface Prompt {
  id: string;
  project_id?: string | null;
  name: string;
  prompt_kind: PromptKind;
  content_text: string;
  composition_blocks?: any[] | null;
  searchable_text: string;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromptCreate {
  project_id?: string | null;
  name: string;
  prompt_kind: PromptKind;
  content_text: string;
  composition_blocks?: any[] | null;
  searchable_text?: string | null;
}

export interface PromptListResponse {
  items: Prompt[];
  total: number;
  limit: number;
  offset: number;
}

export async function listPrompts(params?: {
  q?: string;
  prompt_kind?: PromptKind;
  archived?: boolean;
  limit?: number;
  offset?: number;
  sort?: string;
}): Promise<PromptListResponse> {
  const q = new URLSearchParams();
  if (params?.q) q.set("q", params.q);
  if (params?.prompt_kind) q.set("prompt_kind", params.prompt_kind);
  if (typeof params?.archived === "boolean") q.set("archived", String(params.archived));
  q.set("limit", String(params?.limit ?? 50));
  q.set("offset", String(params?.offset ?? 0));
  if (params?.sort) q.set("sort", params.sort);

  const qs = q.toString();
  return apiGet<PromptListResponse>(`/api/prompts${qs ? `?${qs}` : ""}`);
}

export async function createPrompt(body: PromptCreate): Promise<Prompt> {
  return apiPost<Prompt>("/api/prompts", body);
}
