export function getApiBaseUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:7000").trim();

  // remove trailing slashes
  const normalized = raw.replace(/\/+$/, "");

  if (!/^https?:\/\//i.test(normalized)) {
    throw new Error(
      `Invalid NEXT_PUBLIC_API_BASE_URL: '${raw}'. Must be absolute URL starting with http:// or https://`
    );
  }
  return normalized;
}
