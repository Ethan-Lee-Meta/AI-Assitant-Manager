#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:7000}"
LOCK_DIR="packages/contracts"
LOCK_JSON="${LOCK_DIR}/openapi.json"
LOCK_SHA="${LOCK_DIR}/openapi.sha256"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

curl -sS "${API_BASE_URL}/openapi.json" -o "${TMP_DIR}/openapi.json"
( cd "${TMP_DIR}" && sha256sum "openapi.json" > "openapi.sha256" )

# 1) ensure lock sha matches its own json
( cd "${LOCK_DIR}" && sha256sum -c "openapi.sha256" )

# 2) ensure backend output equals lock json (by sha compare)
LOCK_SUM="$(cut -d' ' -f1 "${LOCK_SHA}")"
CURR_SUM="$(cut -d' ' -f1 "${TMP_DIR}/openapi.sha256")"

if [ "${LOCK_SUM}" != "${CURR_SUM}" ]; then
  echo "FAIL: backend OpenAPI differs from locked contracts."
  echo "HINT: run ./scripts/export_openapi.sh to update lock artifacts (if change is intended)."
  exit 1
fi

echo "OK: backend OpenAPI matches locked contracts."
