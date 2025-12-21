"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "../../lib/api/client";
import { createPromptVersion, listPromptVersions, type PromptVersion, type PromptKind } from "../../lib/api/prompt_versions";

type Prompt = {
  id: string;
  project_id?: string | null;
  name: string;
  prompt_kind: PromptKind;
  content_text: string;
  searchable_text?: string | null;
  archived_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

type PromptListResponse = {
  items: Prompt[];
  total: number;
  offset: number;
  limit: number;
};

async function listPrompts(params: { q?: string; prompt_kind?: PromptKind; offset?: number; limit?: number }): Promise<PromptListResponse> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.prompt_kind) qs.set("prompt_kind", params.prompt_kind);
  qs.set("offset", String(params.offset ?? 0));
  qs.set("limit", String(params.limit ?? 50));
  return apiGet<PromptListResponse>(`/api/prompts?${qs.toString()}`);
}

async function createPrompt(body: { project_id?: string | null; name: string; prompt_kind: PromptKind; content_text: string; searchable_text?: string | null }): Promise<Prompt> {
  return apiPost<Prompt>("/api/prompts", body);
}

export function PromptList() {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<PromptKind | "">("");
  const [items, setItems] = useState<Prompt[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // prompt_version requires project_id by contract; MVP uses a manual input (no global project selector yet)
  const [projectId, setProjectId] = useState("default");

  const [newName, setNewName] = useState("New Prompt");
  const [newKind, setNewKind] = useState<PromptKind>("text2image");
  const [newText, setNewText] = useState("Describe what you want to generate...");

  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const selectedPrompt = useMemo(() => items.find((x) => x.id === selectedPromptId) || null, [items, selectedPromptId]);

  async function refresh() {
    setLoading(true);
    try {
      const resp = await listPrompts({
        q: q || undefined,
        prompt_kind: kind || undefined,
        offset: 0,
        limit: 50,
      });
      setItems(resp.items);
      setTotal(resp.total);
    } finally {
      setLoading(false);
    }
  }

  async function refreshVersions(promptId: string) {
    setVersionsLoading(true);
    try {
      const resp = await listPromptVersions({ project_id: projectId, prompt_id: promptId, limit: 50, offset: 0, sort: "created_at:desc" });
      setVersions(resp.items);
    } finally {
      setVersionsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreatePrompt() {
    await createPrompt({
      project_id: projectId || undefined,
      name: newName,
      prompt_kind: newKind,
      content_text: newText,
      searchable_text: (newName + " " + newText).slice(0, 200),
    });
    await refresh();
  }

  async function onCreateVersionFromSelected() {
    if (!selectedPrompt) return;
    const label = `v${Math.max(1, versions.length + 1)}`;

    await createPromptVersion({
      project_id: projectId,
      prompt_id: selectedPrompt.id,
      version_label: label,
      prompt_kind: selectedPrompt.prompt_kind,
      resolved_prompt_text: selectedPrompt.content_text,
      resolved_params: null,
    });

    await refreshVersions(selectedPrompt.id);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Prompt Library</h2>

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="project_id (required for PromptVersion)"
            style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="search q"
            style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }}
          />
          <select value={kind} onChange={(e) => setKind(e.target.value as any)} style={{ padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }}>
            <option value="">all kinds</option>
            <option value="text2image">text2image</option>
            <option value="image2image">image2image</option>
            <option value="text2video">text2video</option>
            <option value="image2video">image2video</option>
            <option value="general">general</option>
          </select>
          <button onClick={() => void refresh()} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb" }}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 10, marginTop: 10 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Create Prompt</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }} />
            <select value={newKind} onChange={(e) => setNewKind(e.target.value as PromptKind)} style={{ padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }}>
              <option value="text2image">text2image</option>
              <option value="image2image">image2image</option>
              <option value="text2video">text2video</option>
              <option value="image2video">image2video</option>
              <option value="general">general</option>
            </select>
            <textarea value={newText} onChange={(e) => setNewText(e.target.value)} rows={4} style={{ padding: 8, borderRadius: 8, border: "1px solid #e5e7eb" }} />
            <button onClick={() => void onCreatePrompt()} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb" }}>
              Create Prompt
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>Total: {total}</div>
          <div style={{ display: "grid", gap: 6 }}>
            {items.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedPromptId(p.id);
                  void refreshVersions(p.id);
                }}
                style={{
                  textAlign: "left",
                  padding: 10,
                  borderRadius: 10,
                  border: selectedPromptId === p.id ? "2px solid #111827" : "1px solid #e5e7eb",
                  background: "white",
                }}
              >
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{p.prompt_kind}</div>
              </button>
            ))}
            {items.length === 0 ? <div style={{ fontSize: 12, color: "#6b7280" }}>No prompts yet.</div> : null}
          </div>
        </div>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>PromptVersion (Immutable Snapshot)</h2>

        {!selectedPrompt ? (
          <div style={{ fontSize: 12, color: "#6b7280" }}>Select a prompt to view/create versions.</div>
        ) : (
          <div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600 }}>{selectedPrompt.name}</div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                prompt_id={selectedPrompt.id} · kind={selectedPrompt.prompt_kind}
              </div>
            </div>

            <button onClick={() => void onCreateVersionFromSelected()} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #e5e7eb", marginBottom: 10 }}>
              Create PromptVersion from content_text
            </button>

            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
              {versionsLoading ? "Loading versions..." : `Versions: ${versions.length}`}
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {versions.map((v) => (
                <div key={v.id} style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}>
                  <div style={{ fontWeight: 600 }}>{v.version_label}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{new Date(v.created_at).toISOString()}</div>
                  <pre style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 12, background: "#f9fafb", padding: 8, borderRadius: 8 }}>
                    {v.resolved_prompt_text}
                  </pre>
                </div>
              ))}
              {versions.length === 0 ? <div style={{ fontSize: 12, color: "#6b7280" }}>No versions yet.</div> : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
