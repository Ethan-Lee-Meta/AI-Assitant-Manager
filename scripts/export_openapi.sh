#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:7000}"
OUT_DIR="packages/contracts"
OUT_JSON="${OUT_DIR}/openapi.json"
OUT_SHA="${OUT_DIR}/openapi.sha256"

mkdir -p "${OUT_DIR}"

curl -sS "${API_BASE_URL}/openapi.json" -o "${OUT_JSON}"
( cd "${OUT_DIR}" && sha256sum "openapi.json" > "openapi.sha256" )

echo "OK: exported ${OUT_JSON} and updated ${OUT_SHA}"
