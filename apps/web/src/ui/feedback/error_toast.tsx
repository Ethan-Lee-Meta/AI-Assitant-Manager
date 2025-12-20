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
