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
