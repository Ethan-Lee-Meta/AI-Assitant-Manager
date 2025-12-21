"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "../../../../src/lib/api/client";

type Prompt = {
  id: string;
  project_id?: string | null;
  name: string;
  prompt_kind: string;
  content_text: string;
  searchable_text?: string | null;
  composition_blocks?: any[] | null;
  created_at: string;
  updated_at?: string | null;
  archived_at?: string | null;
};

type ListResp<T> = { items: T[]; total: number; limit: number; offset: number };

type PromptVersion = {
  id: string;
  project_id: string;
  prompt_id?: string | null;
  version_label: string;
  prompt_kind: string;
  resolved_prompt_text: string;
  resolved_params?: any | null;
  role_bindings?: any[] | null;
  workflow_ref?: any | null;
  created_at: string;
  archived_at?: string | null;
};

export default function PromptDetailPage(props: { params: { prompt_id: string } }) {
  const promptId = props.params.prompt_id;

  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const p = await apiGet<Prompt>(`/api/prompts/${encodeURIComponent(promptId)}`);
        // 版本列表：按契约，List query 需要 project_id（后续你可在 UI 中从“当前项目选择器”传入）
        // 这里先做最小展示：若后端允许 prompt_id + project_id 组合，则可用；否则会提示错误但不影响 build。
        const v = await apiGet<ListResp<PromptVersion>>(
          `/api/prompt_versions?prompt_id=${encodeURIComponent(promptId)}&limit=20&offset=0`
        );

        if (!mounted) return;
        setPrompt(p);
        setVersions(v.items || []);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message || "Failed to load prompt");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [promptId]);

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Prompt Detail</h1>
        <Link href="/prompts">Back to Prompts</Link>
      </div>

      {loading ? <div>Loading...</div> : null}
      {err ? <div style={{ color: "crimson" }}>{err}</div> : null}

      {prompt ? (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
          <div><b>ID:</b> {prompt.id}</div>
          <div><b>Name:</b> {prompt.name}</div>
          <div><b>Kind:</b> {prompt.prompt_kind}</div>
          <div style={{ marginTop: 8 }}><b>Content:</b></div>
          <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{prompt.content_text}</pre>
        </div>
      ) : null}

      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>PromptVersions</div>
        {versions.length === 0 ? <div>(empty)</div> : null}
        {versions.map((v) => (
          <div key={v.id} style={{ padding: "8px 0", borderTop: "1px solid #eee" }}>
            <div><b>{v.version_label}</b> ({v.prompt_kind})</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{v.id}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
