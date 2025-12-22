import EpisodeOrVideoWorkspace from "../../../../src/ui/episodes_or_videos/EpisodeOrVideoWorkspace";

export default async function Page(props: { params: any }) {
  const p = await props?.params;
  const id = p?.episode_or_video_id;
  return <EpisodeOrVideoWorkspace id={id} />;
}
