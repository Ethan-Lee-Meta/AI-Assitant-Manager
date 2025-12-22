"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getEpisodeOrVideo,
  patchEpisodeOrVideo,
  EpisodeOrVideo,
  normalizeSort,
  listEpisodesOrVideos,
} from "../../lib/api/episodes_or_videos";

export default function EpisodeOrVideoWorkspace(props: { id: string }) {
  const { id } = props;
  const router = useRouter();

  const [item, setItem] = useState<EpisodeOrVideo | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // editable fields
  const [title, setTitle] = useState<string>("");
  const [synopsis, setSynopsis] = useState<string>("");
  const [script, setScript] = useState<string>("");
  const [orderIndex, setOrderIndex] = useState<string>("");
  const [preset, setPreset] = useState<string>("");

  const archived = !!item?.archived_at;

  const header = useMemo(() => {
    if (!item) return "Episode/Video";
    return `${item.kind.toUpperCase()}: ${item.title}`;
  }, [item]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const it = await getEpisodeOrVideo(id);
      setItem(it);

      setTitle(it.title ?? "");
      setSynopsis((it.synopsis_text ?? "") as string);
      setScript((it.script_text ?? "") as string);
      setOrderIndex(it.order_index == null ? "" : String(it.order_index));
      setPreset((it.assembly_preset_id ?? "") as string);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSave() {
    if (!item) return;
    setSaving(true);
    setErr(null);
    try {
      const patch = {
        title: title.trim() ? title.trim() : null,
        synopsis_text: synopsis.trim() ? synopsis : null,
        script_text: script.trim() ? script : null,
        order_index: orderIndex.trim() === "" ? null : Number(orderIndex),
        assembly_preset_id: preset.trim() ? preset : null,
      };
      const updated = await patchEpisodeOrVideo(id, patch);
      setItem(updated);
      // refresh editable echoes
      setTitle(updated.title ?? "");
      setSynopsis((updated.synopsis_text ?? "") as string);
      setScript((updated.script_text ?? "") as string);
      setOrderIndex(updated.order_index == null ? "" : String(updated.order_index));
      setPreset((updated.assembly_preset_id ?? "") as string);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onArchiveToggle() {
    if (!item) return;
    setSaving(true);
    setErr(null);
    try {
      const patch = { archived_at: item.archived_at ? null : new Date().toISOString() };
      const updated = await patchEpisodeOrVideo(id, patch);
      setItem(updated);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function openNewestSibling() {
    if (!item) return;
    setErr(null);
    try {
      const resp = await listEpisodesOrVideos({
        project_id: item.project_id,
        series_id: item.series_id,
        kind: item.kind,
        limit: 1,
        offset: 0,
        sort: normalizeSort("-created_at"),
        archived: false,
      });
      const first = (resp.items || [])[0];
      if (first?.id) router.push(`/episodes_or_videos/${first.id}`);
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800 }}>{header}</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={load} style={{ padding: "6px 10px" }}>
            Refresh
          </button>
          <button onClick={onSave} disabled={saving || loading || !item} style={{ padding: "6px 10px", fontWeight: 700 }}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={onArchiveToggle} disabled={saving || loading || !item} style={{ padding: "6px 10px" }}>
            {archived ? "Unarchive" : "Archive"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
        id={id} {loading ? "(loading...)" : ""} {item ? `project_id=${item.project_id} series_id=${item.series_id}` : ""}
      </div>

      {err ? <div style={{ marginTop: 10, color: "crimson", whiteSpace: "pre-wrap" }}>{err}</div> : null}

      {item ? (
        <div style={{ marginTop: 12, display: "grid", gap: 10, maxWidth: 1000 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, opacity: 0.9 }}>
            <Link href={`/series/${item.series_id}`}>Back to Series</Link>
            <Link href={`/episodes_or_videos/${item.id}/shots`}>Shots (placeholder)</Link>
            <button onClick={openNewestSibling} style={{ padding: 0, border: "none", background: "transparent", color: "#0366d6", cursor: "pointer" }}>
              Open newest sibling (same kind)
            </button>
          </div>

          <label>
            <div style={{ fontSize: 12, opacity: 0.8 }}>title</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: 8 }} />
          </label>

          <label>
            <div style={{ fontSize: 12, opacity: 0.8 }}>order_index (optional)</div>
            <input
              value={orderIndex}
              onChange={(e) => setOrderIndex(e.target.value)}
              style={{ width: "100%", padding: 8 }}
              inputMode="numeric"
            />
          </label>

          <label>
            <div style={{ fontSize: 12, opacity: 0.8 }}>assembly_preset_id (string for now)</div>
            <input value={preset} onChange={(e) => setPreset(e.target.value)} style={{ width: "100%", padding: 8 }} />
          </label>

          <label>
            <div style={{ fontSize: 12, opacity: 0.8 }}>synopsis_text</div>
            <textarea
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              style={{ width: "100%", padding: 8, minHeight: 90 }}
            />
          </label>

          <label>
            <div style={{ fontSize: 12, opacity: 0.8 }}>script_text</div>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              style={{ width: "100%", padding: 8, minHeight: 240 }}
            />
          </label>

          <div style={{ fontSize: 12, opacity: 0.75 }}>
            archived_at={item.archived_at ?? "null"}
          </div>
        </div>
      ) : null}
    </div>
  );
}
