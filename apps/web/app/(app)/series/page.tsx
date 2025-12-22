import { SeriesIndex } from "../../../src/ui/series/SeriesIndex";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Loading...</div>}>
      <SeriesIndex />
    </Suspense>
  );}
