#!/usr/bin/env bash
set -euo pipefail

VERIFY_LIVE="${VERIFY_LIVE:-1}"
API_URL="${API_URL:-http://localhost:7000/openapi.json}"

LOCK_JSON="packages/contracts/openapi.json"
LOCK_SHA="packages/contracts/openapi.sha256"

if [[ ! -f "$LOCK_JSON" ]]; then
  echo "[verify] ERROR: missing $LOCK_JSON" >&2
  exit 1
fi
if [[ ! -f "$LOCK_SHA" ]]; then
  echo "[verify] ERROR: missing $LOCK_SHA" >&2
  exit 1
fi

locked_sha="$(cat "$LOCK_SHA" | tr -d '\r' | xargs)"
calc_sha="$(sha256sum "$LOCK_JSON" | awk '{print $1}')"

if [[ "$locked_sha" != "$calc_sha" ]]; then
  echo "[verify] ERROR: sha mismatch for locked openapi.json" >&2
  echo "[verify] locked: $locked_sha" >&2
  echo "[verify] calc  : $calc_sha" >&2
  exit 1
fi
echo "[verify] OK: locked sha matches file"

# 额外最低回归检查：锁定件必须包含平台验收路径
pycmd() { if command -v python >/dev/null 2>&1; then python "$@"; else py -3 "$@"; fi; }

pycmd - <<'PY' "$LOCK_JSON"
import json, sys
p = sys.argv[1]
with open(p, "r", encoding="utf-8") as f:
    data = json.load(f)
paths = data.get("paths") or {}
required = ["/health", "/api/_meta/echo", "/api/_meta/crash"]
missing = [x for x in required if x not in paths]
if missing:
    raise SystemExit(f"[verify] ERROR: openapi missing required paths: {missing}")
print("[verify] OK: required paths present")
PY

if [[ "$VERIFY_LIVE" == "0" ]]; then
  echo "[verify] SKIP: live verification disabled (VERIFY_LIVE=0)"
  exit 0
fi

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

echo "[verify] fetching live OpenAPI from: $API_URL"
curl -fsS "$API_URL" -o "$tmp"
live_sha="$(sha256sum "$tmp" | awk '{print $1}')"

if [[ "$live_sha" != "$locked_sha" ]]; then
  echo "[verify] ERROR: live OpenAPI differs from locked artifact" >&2
  echo "[verify] locked: $locked_sha" >&2
  echo "[verify] live  : $live_sha" >&2
  echo "[verify] hint  : run scripts/export_openapi.sh to update lockfiles (after confirming changes)" >&2
  exit 1
fi

echo "[verify] OK: live OpenAPI matches locked artifact"
