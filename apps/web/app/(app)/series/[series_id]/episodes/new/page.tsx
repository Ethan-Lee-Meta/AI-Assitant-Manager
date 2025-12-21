export default async function Page({ params }: { params: Promise<{ series_id: string }> }) {
  const { series_id } = await params;
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Create Episode (placeholder)</h1>
      <p style={{ marginTop: 10, color: "#444" }}>
        series_id: <code>{series_id}</code>
      </p>
      <p style={{ marginTop: 10, color: "#444" }}>
        M02 provides the entry point; M03 will implement the actual Episode entity and create flow.
      </p>
      <p style={{ marginTop: 12 }}>
        <a href={`/series/${series_id}`} style={{ color: "#2563eb", textDecoration: "none" }}>Back to Series</a>
      </p>
    </div>
  );
}
