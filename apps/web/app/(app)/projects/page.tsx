"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { apiFetch, apiGet, apiPost } from "../../../src/lib/api/client";
import { ApiError } from "../../../src/lib/api/errors";

type ProjectType = "series_collection" | "story_project";
type FaceMode = "strict" | "assisted" | "off";

type Project = {
  id: string;
  name: string;
  description?: string | null;
  project_type: ProjectType;
  encryption_policy: string;
  default_face_mode: FaceMode;
  tags?: string[] | null;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
};

type ListResponse<T> = {
  items: T[];
  total: number;
  limit: number;
  offset: number;
};

function asApiError(e: unknown): ApiError | null {
  return e instanceof ApiError ? e : null;
}

function ErrorBlock({ err }: { err: ApiError | null }) {
  if (!err) return null;
  return (
    <div style={{ border: "1px solid #ef4444", padding: 12, borderRadius: 8, marginTop: 12 }}>
      <div style={{ fontWeight: 700 }}>Request failed</div>
      <div style={{ marginTop: 6 }}>
        <div>
          <b>code</b>: {err.code}
        </div>
        <div>
          <b>status</b>: {err.status}
        </div>
        <div>
          <b>message</b>: {err.message}
        </div>
        <div>
          <b>request_id</b>: {err.requestId}
        </div>
      </div>
    </div>
  );
}

function buildQuery(params: Record<string, string | number | boolean | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || typeof v === "undefined") continue;
    q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export default function ProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<ApiError | null>(null);

  // list filters
  const [q, setQ] = useState<string>("");
  const [projectType, setProjectType] = useState<ProjectType | "">( "");
  const [archived, setArchived] = useState<boolean>(false);

  // create form
  const [name, setName] = useState<string>("");
  const [desc, setDesc] = useState<string>("");
  const [faceMode, setFaceMode] = useState<FaceMode>("assisted");
  const [tags, setTags] = useState<string>(""); // comma-separated

  const listParams = useMemo(() => {
    return {
      q: q.trim() ? q.trim() : undefined,
      project_type: projectType || undefined,
      archived,
      limit: 50,
      offset: 0,
      sort: "-created_at", // platform style; backend also accepts created_at:desc
    };
  }, [q, projectType, archived]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const qs = buildQuery(listParams as any);
      const data = await apiGet<ListResponse<Project>>(`/api/projects${qs}`);
      setItems(data.items || []);
      setTotal(Number(data.total || 0));
    } catch (e) {
      setErr(asApiError(e));
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [listParams]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setErr(
        new ApiError({
          code: "VALIDATION_ERROR",
          message: "name is required",
          status: 0,
          requestId: "client",
        })
      );
      return;
    }

    const tagList = tags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const body: any = {
      name: trimmed,
      project_type: (projectType || "series_collection") as ProjectType,
      default_face_mode: faceMode,
    };
    if (desc.trim()) body.description = desc.trim();
    if (tagList.length) body.tags = tagList;

    setLoading(true);
    try {
      await apiPost<Project>("/api/projects", body);
      setName("");
      setDesc("");
      setTags("");
      await load();
    } catch (e2) {
      setErr(asApiError(e2));
    } finally {
      setLoading(false);
    }
  }

  async function onArchive(p: Project) {
    setErr(null);
    setLoading(true);
    try {
      const nowIso = new Date().toISOString();
      await apiFetch<Project>(`/api/projects/${encodeURIComponent(p.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived_at: nowIso }),
      });
      await load();
    } catch (e) {
      setErr(asApiError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Projects</h1>

      <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Search (q)</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="name contains..." />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>project_type</span>
          <select value={projectType} onChange={(e) => setProjectType(e.target.value as any)}>
            <option value="">(all)</option>
            <option value="series_collection">series_collection</option>
            <option value="story_project">story_project</option>
          </select>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 22 }}>
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />
          archived
        </label>

        <button onClick={() => void load()} disabled={loading} style={{ height: 32, marginTop: 20 }}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <ErrorBlock err={err} />

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #e5e7eb", borderRadius: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Create Project</div>
        <form onSubmit={onCreate} style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>name *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>project_type</span>
            <select value={projectType || "series_collection"} onChange={(e) => setProjectType(e.target.value as any)}>
              <option value="series_collection">series_collection</option>
              <option value="story_project">story_project</option>
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span>default_face_mode</span>
            <select value={faceMode} onChange={(e) => setFaceMode(e.target.value as FaceMode)}>
              <option value="assisted">assisted</option>
              <option value="strict">strict</option>
              <option value="off">off</option>
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 260 }}>
            <span>description</span>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 260 }}>
            <span>tags (comma separated)</span>
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="a,b,c" />
          </label>

          <button type="submit" disabled={loading} style={{ height: 32, marginTop: 20 }}>
            Create
          </button>
        </form>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 700 }}>
          List ({items.length}/{total})
        </div>

        <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
          {items.map((p) => (
            <div
              key={p.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {p.project_type} · face={p.default_face_mode} · enc={p.encryption_policy}
                </div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  id={p.id}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <a
                  href={`/series?project_id=${encodeURIComponent(p.id)}`}
                  style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "6px 10px", textDecoration: "none" }}
                >
                  View Series
                </a>
                {p.archived_at ? (
                  <span style={{ fontSize: 12, opacity: 0.8 }}>archived</span>
                ) : (
                  <button onClick={() => void onArchive(p)} disabled={loading}>
                    Archive
                  </button>
                )}
              </div>
            </div>
          ))}
          {!loading && items.length === 0 ? <div style={{ opacity: 0.7 }}>No items</div> : null}
        </div>
      </div>
    </div>
  );
}
