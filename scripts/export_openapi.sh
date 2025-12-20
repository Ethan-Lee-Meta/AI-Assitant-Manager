#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:7000/openapi.json}"

CV_FILE="packages/contracts/contract_version.txt"
OUT_JSON="packages/contracts/openapi.json"
OUT_SHA="packages/contracts/openapi.sha256"

if [[ ! -f "$CV_FILE" ]]; then
  echo "[export] ERROR: missing $CV_FILE" >&2
  exit 1
fi

CONTRACT_VERSION="$(head -n 1 "$CV_FILE" | tr -d '\r' | xargs)"
if [[ ! "$CONTRACT_VERSION" =~ ^[0-9]{8}-[0-9]{2}$ ]]; then
  echo "[export] ERROR: invalid contract_version '$CONTRACT_VERSION' (expected YYYYMMDD-NN)" >&2
  exit 1
fi

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

echo "[export] fetching OpenAPI from: $API_URL"
# -f: HTTP 非 2xx 直接失败；-sS: 静默但保留错误信息
curl -fsS "$API_URL" -o "$tmp"

# 最小合法性校验：JSON 可解析，且包含 openapi/paths 键
pycmd() { if command -v python >/dev/null 2>&1; then python "$@"; else py -3 "$@"; fi; }

pycmd - <<'PY' "$tmp"
import json, sys
p = sys.argv[1]
with open(p, "rb") as f:
    raw = f.read()
try:
    data = json.loads(raw.decode("utf-8"))
except Exception as e:
    raise SystemExit(f"[export] ERROR: invalid JSON from server: {e}")
if "openapi" not in data or "paths" not in data:
    raise SystemExit("[export] ERROR: invalid openapi.json: missing 'openapi' or 'paths'")
print("[export] OK: openapi.json looks valid")
PY

mkdir -p "$(dirname "$OUT_JSON")"

# 关键：不做 pretty/format，保持服务器响应原样
mv -f "$tmp" "$OUT_JSON"
trap - EXIT

# 写 sha：仅 64 hex + 换行
sha256sum "$OUT_JSON" | awk '{print $1}' > "$OUT_SHA"

echo "[export] done"
echo "[export] contract_version: $CONTRACT_VERSION"
echo "[export] wrote: $OUT_JSON"
echo "[export] wrote: $OUT_SHA ($(cat "$OUT_SHA" | tr -d '\r'))"
