#!/usr/bin/env sh
set -euo pipefail

# 1) 停掉当前（如果还在跑你就 Ctrl+C）
docker compose down -v || true

# 2) 先 pull，强制 plain 输出
docker compose pull --progress=plain
