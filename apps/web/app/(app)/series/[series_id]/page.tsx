import { SeriesDetail } from "../../../../src/ui/series/SeriesDetail";

export default async function Page({ params }: { params: Promise<{ series_id: string }> }) {
  const { series_id } = await params;
  return <SeriesDetail series_id={series_id} />;
}
