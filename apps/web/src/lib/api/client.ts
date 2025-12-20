import { getApiBaseUrl } from "../../config/runtime";
import { newRequestId } from "../request_id";
import { ApiError, isErrorEnvelope } from "./errors";

function isAbsoluteUrl(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

function joinUrl(baseUrl: string, path: string): string {
  if (isAbsoluteUrl(path)) return path;
  if (!path.startsWith("/")) {
    // For safety and stable behavior, require leading slash for relative paths
    throw new Error(`apiFetch path must start with '/' or be an absolute URL. got: '${path}'`);
  }
  return `${baseUrl}${path}`;
}

function getHeader(headers: Headers, name: string): string | null {
  // headers.get is case-insensitive, but keep explicit
  return headers.get(name);
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & { signal?: AbortSignal | null }
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = joinUrl(baseUrl, path);

  const requestId = newRequestId();

  const headers = new Headers(init?.headers || {});
  headers.set("X-Request-Id", requestId);

  const hasBody = typeof (init as any)?.body !== "undefined";
  if (hasBody && !headers.has("Content-Type")) {
    // Only force JSON when body exists and caller didn't set Content-Type
    headers.set("Content-Type", "application/json");
  }

  let resp: Response;
  try {
    resp = await fetch(url, {
      ...init,
      headers,
      signal: init?.signal ?? undefined,
    });
  } catch (e: any) {
    // Network failure / aborted / DNS, etc.
    throw new ApiError({
      code: "NETWORK_ERROR",
      message: e?.name === "AbortError" ? "Request aborted" : "Network error",
      status: 0,
      requestId,
      details: e?.message ? { message: e.message } : undefined,
    });
  }

  const headerRid = getHeader(resp.headers, "X-Request-Id") || getHeader(resp.headers, "x-request-id");
  const effectiveRid = headerRid || requestId;

  const contentType = resp.headers.get("content-type") || "";
  const isJson = contentType.toLowerCase().includes("application/json");

  if (resp.ok) {
    if (isJson) {
      return (await resp.json()) as T;
    }
    // M00-C: non-JSON not required; return unknown
    return undefined as unknown as T;
  }

  // Error responses
  let parsed: unknown = undefined;
  if (isJson) {
    try {
      parsed = await resp.json();
    } catch {
      parsed = undefined;
    }
  }

  if (isErrorEnvelope(parsed)) {
    const rid = headerRid || parsed.request_id || requestId;
    throw new ApiError({
      code: parsed.error.code,
      message: parsed.error.message,
      status: resp.status,
      requestId: rid,
      details: parsed.error.details,
    });
  }

  throw new ApiError({
    code: "HTTP_ERROR",
    message: `HTTP ${resp.status}`,
    status: resp.status,
    requestId: effectiveRid,
    details: typeof parsed !== "undefined" ? parsed : undefined,
  });
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  return apiFetch<T>(path, { ...init, method: "GET" });
}

export async function apiPost<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers || {});
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  return apiFetch<T>(path, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}
