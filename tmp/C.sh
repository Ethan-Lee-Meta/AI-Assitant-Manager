set -euo pipefail

# 0) 确保目录存在（不新增文件名，只建目录）
mkdir -p apps/web/src/config \
         apps/web/src/lib \
         apps/web/src/lib/api \
         apps/web/src/ui/nav \
         apps/web/src/ui/feedback

########################################
# C2.1 apps/web/src/config/runtime.ts
########################################
cat > apps/web/src/config/runtime.ts <<'EOF'
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
EOF

########################################
# C2.2 apps/web/src/lib/request_id.ts
########################################
cat > apps/web/src/lib/request_id.ts <<'EOF'
function hex(byte: number): string {
  return byte.toString(16).padStart(2, "0");
}

function bytesToUuidV4(bytes: Uint8Array): string {
  // Set version (4) and variant (10xx)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const b = bytes;
  return (
    hex(b[0]) + hex(b[1]) + hex(b[2]) + hex(b[3]) + "-" +
    hex(b[4]) + hex(b[5]) + "-" +
    hex(b[6]) + hex(b[7]) + "-" +
    hex(b[8]) + hex(b[9]) + "-" +
    hex(b[10]) + hex(b[11]) + hex(b[12]) + hex(b[13]) + hex(b[14]) + hex(b[15])
  );
}

function fallbackUuid(): string {
  // Prefer crypto.getRandomValues (browser / modern runtimes)
  const c: Crypto | undefined = (globalThis as any).crypto;
  if (c && typeof c.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    return bytesToUuidV4(bytes);
  }

  // Last resort (still UUID-like; less strong)
  const rnd = () => Math.floor(Math.random() * 256);
  const bytes = new Uint8Array(Array.from({ length: 16 }, rnd));
  return bytesToUuidV4(bytes);
}

export function newRequestId(): string {
  const c: Crypto | undefined = (globalThis as any).crypto;
  // Prefer randomUUID if present
  if (c && typeof (c as any).randomUUID === "function") {
    return (c as any).randomUUID();
  }
  return fallbackUuid();
}
EOF

########################################
# C2.3 apps/web/src/lib/api/errors.ts
########################################
cat > apps/web/src/lib/api/errors.ts <<'EOF'
export type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  request_id: string;
};

export function isErrorEnvelope(x: unknown): x is ErrorEnvelope {
  if (!x || typeof x !== "object") return false;
  const anyX = x as any;
  if (!anyX.error || typeof anyX.error !== "object") return false;
  if (typeof anyX.error.code !== "string") return false;
  if (typeof anyX.error.message !== "string") return false;
  if (typeof anyX.request_id !== "string") return false;
  return true;
}

export class ApiError extends Error {
  code: string;
  status: number;
  requestId: string;
  details?: unknown;

  constructor(args: { code: string; message: string; status: number; requestId: string; details?: unknown }) {
    super(args.message);
    this.name = "ApiError";
    this.code = args.code;
    this.status = args.status;
    this.requestId = args.requestId;
    this.details = args.details;
  }
}
EOF

########################################
# C2.4 apps/web/src/lib/api/client.ts
########################################
cat > apps/web/src/lib/api/client.ts <<'EOF'
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
  init?: RequestInit & { signal?: AbortSignal }
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
      signal: init?.signal,
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
EOF

########################################
# C2.5 apps/web/src/lib/api/list.ts
########################################
cat > apps/web/src/lib/api/list.ts <<'EOF'
import { apiGet } from "./client";

export type ListQuery = {
  limit?: number;
  offset?: number;
  sort?: string;
  q?: string;
  archived?: boolean;
};

const DEFAULTS: Required<Pick<ListQuery, "limit" | "offset" | "archived" | "sort">> = {
  limit: 50,
  offset: 0,
  archived: false,
  sort: "-created_at",
};

export function buildListQuery(q?: ListQuery): string {
  const merged: ListQuery = { ...DEFAULTS, ...(q || {}) };

  // rule: q empty string treated as undefined
  if (typeof merged.q === "string" && merged.q.trim() === "") {
    delete (merged as any).q;
  }

  const params = new URLSearchParams();

  // Only allow these 5 parameters
  if (typeof merged.limit !== "undefined") params.set("limit", String(merged.limit));
  if (typeof merged.offset !== "undefined") params.set("offset", String(merged.offset));
  if (typeof merged.sort !== "undefined") params.set("sort", String(merged.sort));
  if (typeof merged.q !== "undefined") params.set("q", String(merged.q));
  if (typeof merged.archived !== "undefined") params.set("archived", merged.archived ? "true" : "false");

  const s = params.toString();
  return s ? `?${s}` : "";
}

export async function listGet<T>(path: string, q?: ListQuery, init?: RequestInit): Promise<T> {
  const qs = buildListQuery(q);
  return apiGet<T>(`${path}${qs}`, init);
}
EOF

########################################
# C2.6 apps/web/src/ui/feedback/error_toast.tsx
########################################
cat > apps/web/src/ui/feedback/error_toast.tsx <<'EOF'
"use client";

import * as React from "react";
import { ApiError } from "../../lib/api/errors";

export function ErrorToast(props: { error: unknown; title?: string }) {
  const { error, title } = props;

  let message = "Unknown error";
  let requestId: string | undefined = undefined;
  let code: string | undefined = undefined;
  let details: unknown = undefined;

  if (error instanceof ApiError) {
    message = error.message;
    requestId = error.requestId;
    code = error.code;
    details = error.details;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  }

  return (
    <div style={{
      border: "1px solid #f0b4b4",
      background: "#fff5f5",
      padding: 12,
      borderRadius: 8,
      marginTop: 12
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>
        {title || "Request Failed"}
      </div>
      <div style={{ marginBottom: 6 }}>{message}</div>
      <div style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.9 }}>
        {code ? <>code: <b>{code}</b> &nbsp;|&nbsp; </> : null}
        request_id: <b>{requestId || "-"}</b>
      </div>

      {typeof details !== "undefined" ? (
        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: "pointer" }}>details</summary>
          <pre style={{
            marginTop: 8,
            padding: 10,
            borderRadius: 6,
            background: "#fff",
            border: "1px solid #eee",
            overflowX: "auto"
          }}>
            {typeof details === "string" ? details : JSON.stringify(details, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
EOF

########################################
# C2.7 apps/web/src/ui/nav/nav_items.ts
########################################
cat > apps/web/src/ui/nav/nav_items.ts <<'EOF'
export type NavItem = {
  label: string;
  href: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Settings", href: "/settings" },
];
EOF

########################################
# C2.8 apps/web/app/layout.tsx
########################################
cat > apps/web/app/layout.tsx <<'EOF'
import Link from "next/link";
import { NAV_ITEMS } from "../src/ui/nav/nav_items";

export default function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props;

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" }}>
        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 320px", minHeight: "100vh" }}>
          {/* Sidebar */}
          <aside style={{ borderRight: "1px solid #eee", padding: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>AI Assistant Manager</div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {NAV_ITEMS.map((it) => (
                <Link key={it.href} href={it.href} style={{ textDecoration: "none", color: "#111" }}>
                  {it.label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Main column */}
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            {/* Topbar */}
            <header style={{ borderBottom: "1px solid #eee", padding: "12px 16px", fontWeight: 600 }}>
              Platform Kernel
            </header>

            {/* MainContent */}
            <main style={{ padding: 16, minWidth: 0 }}>
              {children}
            </main>
          </div>

          {/* Inspector placeholder */}
          <aside style={{ borderLeft: "1px solid #eee", padding: 16, color: "#555" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Inspector</div>
            <div style={{ fontSize: 13, lineHeight: 1.4 }}>
              Placeholder (M00-C). No business logic here.
            </div>
          </aside>
        </div>
      </body>
    </html>
  );
}
EOF

########################################
# C2.9 apps/web/app/page.tsx
########################################
cat > apps/web/app/page.tsx <<'EOF'
"use client";

import * as React from "react";
import { apiGet } from "../src/lib/api/client";
import { ApiError } from "../src/lib/api/errors";
import { ErrorToast } from "../src/ui/feedback/error_toast";

type HealthResp = { status: string; service: string; time: string };
type EchoResp = any;

export default function HomePage() {
  const [lastOk, setLastOk] = React.useState<unknown>(null);
  const [lastError, setLastError] = React.useState<unknown>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  // Allow page-side abort control (repeat clicks cancel previous)
  const abortRef = React.useRef<AbortController | null>(null);

  function abortInFlight() {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = null;
  }

  async function run(name: string, fn: (signal: AbortSignal) => Promise<unknown>) {
    abortInFlight();
    const ac = new AbortController();
    abortRef.current = ac;

    setBusy(name);
    setLastOk(null);
    setLastError(null);

    try {
      const res = await fn(ac.signal);
      setLastOk(res);
    } catch (e) {
      setLastError(e);
      // Helpful console output during kernel bring-up
      if (e instanceof ApiError) {
        console.warn("[ui] ApiError", { code: e.code, status: e.status, requestId: e.requestId, details: e.details });
      } else {
        console.warn("[ui] Error", e);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ maxWidth: 880 }}>
      <h1 style={{ margin: "0 0 8px 0" }}>Platform Self-Test</h1>
      <div style={{ color: "#555", marginBottom: 16 }}>
        Use the buttons below to validate end-to-end request_id + ErrorEnvelope + pagination validation.
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={() => run("health", (signal) => apiGet<HealthResp>("/health", { signal }))}
          disabled={busy !== null}
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer" }}
        >
          Check Health
        </button>

        <button
          onClick={() => run("validation", (signal) => apiGet<EchoResp>("/api/_meta/echo?limit=-1", { signal }))}
          disabled={busy !== null}
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer" }}
        >
          Trigger Validation Error
        </button>

        <button
          onClick={() => run("crash", (signal) => apiGet("/api/_meta/crash", { signal }))}
          disabled={busy !== null}
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer" }}
        >
          Trigger Crash
        </button>

        <button
          onClick={() => abortInFlight()}
          disabled={busy === null}
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", cursor: busy ? "pointer" : "not-allowed" }}
        >
          Abort In-Flight
        </button>
      </div>

      {busy ? (
        <div style={{ marginTop: 12, color: "#555" }}>
          Running: <b>{busy}</b>
        </div>
      ) : null}

      {lastOk !== null ? (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Success</div>
          <pre style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, overflowX: "auto" }}>
            {JSON.stringify(lastOk, null, 2)}
          </pre>
        </div>
      ) : null}

      {lastError ? (
        <ErrorToast error={lastError} title="API Error" />
      ) : null}

      <div style={{ marginTop: 18, fontSize: 13, color: "#666" }}>
        Acceptance notes:
        <ul>
          <li>Health should show status/service/time JSON.</li>
          <li>Validation should show code=VALIDATION_ERROR and request_id.</li>
          <li>Crash should show code=INTERNAL_ERROR and request_id.</li>
          <li>Check backend logs: request_id should match what UI shows.</li>
        </ul>
      </div>
    </div>
  );
}
EOF

echo "OK: M00-C files written (ALLOW-LIST only)"
