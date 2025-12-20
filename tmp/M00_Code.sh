#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Repo skeleton bootstrap (Git Bash)
# - Create frozen directories
# - Create frozen files ONLY IF missing (never overwrite existing)
# ==============================================================================

# --- must run at repo root ---
echo "PWD=$(pwd)"

# ------------------------------------------------------------------------------
# 0) Root directories
# ------------------------------------------------------------------------------
mkdir -p \
  apps/api/src/app/core \
  apps/api/src/app/api \
  apps/api/src/app/modules \
  apps/api/tests \
  apps/web/app \
  "apps/web/app/(app)/projects" \
  "apps/web/app/(app)/settings" \
  apps/web/src/lib/api \
  apps/web/src/config \
  apps/web/src/ui/nav \
  apps/web/src/ui/feedback \
  packages/contracts \
  scripts \
  docs

# ------------------------------------------------------------------------------
# 0) Root frozen files (create if missing)
# ------------------------------------------------------------------------------
if [ ! -f .gitignore ]; then
  cat > .gitignore <<'EOF'
# Python
.venv/
__pycache__/
*.pyc
.pytest_cache/
.mypy_cache/
.ruff_cache/

# Node / Next
node_modules/
.next/
out/
dist/
coverage/

# Env
.env
.env.local

# OS / Editor
.DS_Store
Thumbs.db
.vscode/
.idea/
EOF
else
  echo "SKIP .gitignore (exists)"
fi

if [ ! -f .env.example ]; then
  cat > .env.example <<'EOF'
# ==============================================================================
# Backend (FastAPI)
# ==============================================================================
API_HOST=0.0.0.0
API_PORT=7000
API_CORS_ORIGINS=http://localhost:2000

# ==============================================================================
# Frontend (Next.js)
# ==============================================================================
WEB_PORT=2000
NEXT_PUBLIC_API_BASE_URL=http://localhost:7000
EOF
else
  echo "SKIP .env.example (exists)"
fi

if [ ! -f docker-compose.yml ]; then
  cat > docker-compose.yml <<'EOF'
services:
  api:
    build:
      context: ./apps/api
    env_file:
      - ./.env
    ports:
      - "7000:7000"

  web:
    build:
      context: ./apps/web
    env_file:
      - ./.env
    ports:
      - "2000:2000"
    depends_on:
      - api
EOF
else
  echo "SKIP docker-compose.yml (exists)"
fi

# ------------------------------------------------------------------------------
# 1) Backend frozen files (create if missing; minimal placeholders)
# ------------------------------------------------------------------------------
if [ ! -f apps/api/pyproject.toml ]; then
  cat > apps/api/pyproject.toml <<'EOF'
[project]
name = "apps-api"
version = "0.0.0"
requires-python = ">=3.11"
dependencies = []

[tool.pytest.ini_options]
testpaths = ["tests"]
EOF
else
  echo "SKIP apps/api/pyproject.toml (exists)"
fi

if [ ! -f apps/api/src/app/main.py ]; then
  cat > apps/api/src/app/main.py <<'EOF'
"""
唯一应用入口（冻结路径）：
- 只允许：加载配置、装配中间件、装配异常处理、include_router（从 registry 拉取）
- 禁止：业务逻辑 / CRUD
"""
EOF
else
  echo "SKIP apps/api/src/app/main.py (exists)"
fi

for f in \
  apps/api/src/app/core/config.py \
  apps/api/src/app/core/request_id.py \
  apps/api/src/app/core/errors.py \
  apps/api/src/app/core/logging.py \
  apps/api/src/app/core/pagination.py \
  apps/api/src/app/core/cors.py \
  apps/api/src/app/api/health.py \
  apps/api/src/app/modules/_registry.py \
  apps/api/tests/test_health.py \
  apps/api/tests/test_error_envelope.py \
  apps/api/tests/test_request_id.py \
  apps/api/tests/test_pagination_contract.py
do
  if [ ! -f "$f" ]; then
    mkdir -p "$(dirname "$f")"
    cat > "$f" <<'EOF'
# placeholder (M00 will implement)
EOF
  else
    echo "SKIP $f (exists)"
  fi
done

# ------------------------------------------------------------------------------
# 2) Frontend frozen files (create if missing; minimal placeholders)
# ------------------------------------------------------------------------------
if [ ! -f apps/web/package.json ]; then
  cat > apps/web/package.json <<'EOF'
{
  "name": "apps-web",
  "private": true,
  "version": "0.0.0"
}
EOF
else
  echo "SKIP apps/web/package.json (exists)"
fi

if [ ! -f apps/web/next.config.js ]; then
  cat > apps/web/next.config.js <<'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {};
module.exports = nextConfig;
EOF
else
  echo "SKIP apps/web/next.config.js (exists)"
fi

if [ ! -f apps/web/tsconfig.json ]; then
  cat > apps/web/tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "strict": true
  }
}
EOF
else
  echo "SKIP apps/web/tsconfig.json (exists)"
fi

for f in \
  apps/web/app/layout.tsx \
  apps/web/app/page.tsx \
  apps/web/src/config/runtime.ts \
  apps/web/src/lib/request_id.ts \
  apps/web/src/lib/api/client.ts \
  apps/web/src/lib/api/errors.ts \
  apps/web/src/lib/api/list.ts \
  apps/web/src/ui/nav/nav_items.ts \
  apps/web/src/ui/feedback/error_toast.tsx \
  "apps/web/app/(app)/projects/page.tsx" \
  "apps/web/app/(app)/settings/page.tsx"
do
  if [ ! -f "$f" ]; then
    mkdir -p "$(dirname "$f")"
    cat > "$f" <<'EOF'
/* placeholder (M00 will implement) */
EOF
  else
    echo "SKIP $f (exists)"
  fi
done

# ------------------------------------------------------------------------------
# 3) Contracts frozen outputs (create if missing)
# ------------------------------------------------------------------------------
if [ ! -f packages/contracts/openapi.json ]; then
  cat > packages/contracts/openapi.json <<'EOF'
{}
EOF
else
  echo "SKIP packages/contracts/openapi.json (exists)"
fi

if [ ! -f packages/contracts/openapi.sha256 ]; then
  # Initialize checksum based on current openapi.json
  (cd packages/contracts && sha256sum openapi.json > openapi.sha256)
else
  echo "SKIP packages/contracts/openapi.sha256 (exists)"
fi

if [ ! -f packages/contracts/contract_version.txt ]; then
  cat > packages/contracts/contract_version.txt <<'EOF'
# 契约版本号（人工递增）
# 规则建议：
# - 仅当 OpenAPI（端点/字段/类型）发生变化时递增
# - 与 git tag/发布版本可解耦，但必须单调递增
0.0.0
EOF
else
  echo "SKIP packages/contracts/contract_version.txt (exists)"
fi

# ------------------------------------------------------------------------------
# 4) Scripts frozen files (create if missing)
# ------------------------------------------------------------------------------
if [ ! -f scripts/export_openapi.sh ]; then
  cat > scripts/export_openapi.sh <<'EOF'
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
EOF
else
  echo "SKIP scripts/export_openapi.sh (exists)"
fi

if [ ! -f scripts/verify_contracts.sh ]; then
  cat > scripts/verify_contracts.sh <<'EOF'
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
EOF
else
  echo "SKIP scripts/verify_contracts.sh (exists)"
fi

chmod +x scripts/export_openapi.sh scripts/verify_contracts.sh 2>/dev/null || true

# ------------------------------------------------------------------------------
# 5) Show resulting tree (short)
# ------------------------------------------------------------------------------
echo
echo "==== TREE (frozen scaffold) ===="
find apps packages scripts docs -maxdepth 5 -type d -print | sed 's|^\./||' | sort
echo
find apps packages scripts -type f -print | sed 's|^\./||' | sort
echo "DONE"
