"use client";

import { useEffect, useMemo, useState } from "react";
import { FeedItem, FeedKind, listFeed } from "../../lib/api/feed";

type KindSel = "all" | FeedKind;

const SORT_OPTS: Array<{ label: string; value: string }> = [
  { label: "-created_at (newest first)", value: "-created_at" },
  { label: "created_at (oldest first)", value: "created_at" },
  { label: "title (A→Z)", value: "title" },
  { label: "-title (Z→A)", value: "-title" },
];

export function FeedList() {
  const [projectId, setProjectId] = useState<string>("");
  const [seriesId, setSeriesId] = useState<string>("");
  const [q, setQ] = useState<string>("");

  const [kind, setKind] = useState<KindSel>("all");
  const [archived, setArchived] = useState<boolean>(false);
  const [sort, setSort] = useState<string>("-created_at");
  const [limit, setLimit] = useState<number>(50);
  const [offset, setOffset] = useState<number>(0);

  const [items, setItems] = useState<FeedItem[]>([]);
  const [total, setTotal] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  const kindForApi = useMemo<FeedKind | undefined>(() => {
    return kind === "all" ? undefined : kind;
  }, [kind]);

  async function refresh(nextOffset?: number) {
    const off = typeof nextOffset === "number" ? nextOffset : offset;
    setLoading(true);
    setErr(null);
    try {
      const resp = await listFeed({
        project_id: projectId,
        series_id: seriesId,
        kind: kindForApi,
        q,
        archived,
        sort,
        limit,
        offset: off,
      });
      setItems(resp.items || []);
      setTotal(resp.total || 0);
      setOffset(resp.offset || off);
    } catch (e: any) {
      setItems([]);
      setTotal(0);
      setErr(e?.message || "failed to load feed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // initial load
    refresh(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
        <h1 style={{ margin: "0 0 6px 0" }}>Feed</h1>
        <div style={{ color: "#666", fontSize: 12 }}>
          Read-only aggregate of Episodes/Videos. Click through to Series or item workspace.
        </div>

        {err ? <div style={{ marginTop: 10, color: "crimson" }}>Error: {err}</div> : null}

        <div style={{ display: "grid", gap: 10, marginTop: 12, gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div>
            <div style={{ fontSize: 12, color: "#333" }}>project_id (optional)</div>
            <input value={projectId} onChange={(e) => setProjectId(e.target.value)} style={{ width: "100%", padding: 8 }} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#333" }}>series_id (optional)</div>
            <input value={seriesId} onChange={(e) => setSeriesId(e.target.value)} style={{ width: "100%", padding: 8 }} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#333" }}>search (q)</div>
            <input value={q} onChange={(e) => setQ(e.target.value)} style={{ width: "100%", padding: 8 }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 12 }}>kind</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as any)} style={{ padding: 6 }}>
              <option value="all">all</option>
              <option value="episode">episode</option>
              <option value="video">video</option>
            </select>
          </div>

          <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}>
            archived <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} />
          </label>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 12 }}>sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ padding: 6 }}>
              {SORT_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 12 }}>limit</span>
            <select value={String(limit)} onChange={(e) => setLimit(Number(e.target.value))} style={{ padding: 6 }}>
              {[20, 50, 100, 200].map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => refresh(0)}
            disabled={loading}
            style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8 }}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Items</h2>
          <div style={{ fontSize: 12, color: "#666" }}>
            total={total} • offset={offset} • limit={limit}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center" }}>
          <button
            disabled={loading || !canPrev}
            onClick={() => refresh(Math.max(0, offset - limit))}
            style={{ padding: "6px 10px" }}
          >
            Prev
          </button>
          <button
            disabled={loading || !canNext}
            onClick={() => refresh(offset + limit)}
            style={{ padding: "6px 10px" }}
          >
            Next
          </button>

          <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
            <a href="/projects">Projects</a>
            <a href="/series">Series</a>
            <a href="/episodes_or_videos">Episodes/Videos</a>
          </div>
        </div>

        {items.length === 0 ? (
          <div style={{ marginTop: 12, color: "#666" }}>No items.</div>
        ) : (
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {items.map((it) => (
              <div key={it.id} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 700 }}>
                    [{it.kind}] {it.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#666" }}>{it.created_at}</div>
                </div>

                <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
                  project_id={it.project_id} • series_id={it.series_id}
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
                  <a
                    href={`/episodes_or_videos/${it.id}`}
                    style={{ border: "1px solid #ddd", borderRadius: 10, padding: "6px 12px", textDecoration: "none" }}
                  >
                    Open Item
                  </a>
                  <a
                    href={`/series/${it.series_id}`}
                    style={{ border: "1px solid #ddd", borderRadius: 10, padding: "6px 12px", textDecoration: "none" }}
                  >
                    Open Series
                  </a>
                  <a
                    href={`/series?project_id=${encodeURIComponent(it.project_id)}`}
                    style={{ border: "1px solid #ddd", borderRadius: 10, padding: "6px 12px", textDecoration: "none" }}
                  >
                    Filter Series by Project
                  </a>
                </div>

                {it.synopsis_text ? (
                  <div style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{it.synopsis_text}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
