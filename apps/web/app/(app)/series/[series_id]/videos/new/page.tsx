import EpisodeOrVideoNew from "../../../../../../src/ui/episodes_or_videos/EpisodeOrVideoNew";

export default async function Page(props: { params: Promise<{ series_id: string }> }) {
  const { series_id } = await props.params;
  return <EpisodeOrVideoNew seriesId={series_id} kind="video" />;
}
