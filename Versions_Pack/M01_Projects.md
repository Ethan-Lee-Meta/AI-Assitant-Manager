0) 全局冻结约束（不可改）
0.1 端口与运行形态（冻结）

后端：FastAPI + Uvicorn

端口固定：7000

API base path：/api

健康检查：GET /health（不带 /api）

前端：Next.js

端口固定：2000

通过 NEXT_PUBLIC_API_BASE_URL 指向后端（默认 http://localhost:7000）

0.2 错误响应与 request_id（冻结）

错误格式统一：ErrorEnvelope

{"error":{"code","message","details"}, "request_id": "..."}

响应头必须带 X-Request-Id

header 的 request_id 与 body.request_id 必须一致

request_id 规则：

前端每次请求注入 X-Request-Id

后端若无则生成

日志必须包含 request_id

0.3 ListResponse 与查询参数（冻结）

List 响应统一为：

{ items, total, limit, offset }

Query 统一参数：

limit / offset / sort / q / archived

archived 默认 false

软删除（归档）统一语义：

archived_at = null → active

archived_at != null → archived

删除动作只允许设置 archived_at

0.4 路由挂载与前端 API 调用（冻结）

后端业务模块挂载唯一入口：

apps/api/src/app/modules/_registry.py

只能“追加注册”，禁止在 main.py 写业务逻辑

前端 API 调用唯一入口：

apps/web/src/lib/api/client.ts

禁止页面直接 fetch 后端

0.5 契约锁定件与门禁脚本（冻结）

锁定件（必须保持同步）：

packages/contracts/openapi.json

packages/contracts/openapi.sha256

packages/contracts/contract_version.txt

门禁脚本（文件名/路径固定，不可改）：

scripts/export_openapi.sh

scripts/verify_contracts.sh

一键启动（冻结）：

根目录 docker-compose.yml + .env.example

端口映射固定 7000/2000

1) 当前代码状态（截至你最新本地验证）
1.1 M00 平台基线（已完成且冻结）

/health、404、VALIDATION_ERROR、INTERNAL_ERROR 的 ErrorEnvelope 格式与 request_id 一致性：已回归通过

前端 Landing 自测三按钮：已通过

锁定件导出/校验脚本：已通过

docker compose 一键启动：在环境具备 Docker 的前提下可作为回归项（但你本机当前 Docker Desktop 引擎不可用，见环境）

1.2 M01 Projects（已实现并通过核心门禁）

后端 Projects：Create/Patch/Get/List 已实现并测试通过

前端 /projects 页面：npm run build 已通过

契约锁定件：已从 live OpenAPI 导出并校验一致

你本地验证证据：

后端：PYTHONPATH=./src pytest -q → 9 passed

前端：npm run build → rc=0

契约：

VERIFY_LIVE=0 ./scripts/verify_contracts.sh → rc=0

后端在线后 ./scripts/export_openapi.sh + ./scripts/verify_contracts.sh → rc=0

Docker：

docker compose up 失败原因是 Docker Desktop Linux engine pipe 不存在（环境问题，不是代码问题）

2) 当前运行环境与操作约定（用于下一模块复现）
2.1 OS / Shell

Windows

Git Bash（MINGW64）

2.2 Python / venv

.venv 位于 repo root

激活命令：

source .venv/Scripts/activate

2.3 后端启动（两种方式，均可）

开发前台（另一个窗口执行，带 reload）：

set -euo pipefail
source .venv/Scripts/activate
export CORS_ALLOW_ORIGINS="http://localhost:2000,http://127.0.0.1:2000,http://10.10.10.6:2000"
cd apps/api
PYTHONPATH=./src python -m uvicorn app.main:app --host 0.0.0.0 --port 7000 --reload


后台启动（用于脚本 export/verify）：

PYTHONPATH=./src uvicorn app.main:app --host 0.0.0.0 --port 7000 > /tmp/api_7000.log 2>&1 &

2.4 前端构建门禁

cd apps/web && npm run build

2.5 契约门禁执行要点

离线校验（CI 友好）：

VERIFY_LIVE=0 ./scripts/verify_contracts.sh

在线校验（需要 7000 已启动）：

./scripts/verify_contracts.sh

当 live 与 locked 不一致时的标准流程：

bump packages/contracts/contract_version.txt（YYYYMMDD-NN 规则）

./scripts/export_openapi.sh

./scripts/verify_contracts.sh

2.6 Docker 回归现状

你本机当前 Docker Desktop 引擎不可用（Windows pipe not found），导致：

docker compose up -d --build 无法拉取镜像/启动容器

结论：

Docker 回归在你当前环境下不可作为阻塞门禁

但脚本和 compose 文件仍冻结，未来在 CI 或恢复 Docker 环境后可再跑

3) 下一模块开发的“硬性执行纪律”（避免再踩坑）
3.1 变更边界（必须遵守）

任何新模块都只能：

在 apps/api/src/app/modules/_registry.py 追加注册

在模块目录下新增自己的 dto/router/service/store_sqlite/tests

前端新增页面必须走 apps/web/src/lib/api/client.ts（apiGet/apiPost/apiFetch）

3.2 API 路径的关键现实约束（非常重要）

由于当前 main.py 对 module routers 是 直接 include_router(r)，没有额外 /api 包裹，因此：

每个业务模块 router 的 prefix 必须包含 /api/...

例如 Projects 最终采用：APIRouter(prefix="/api/projects")

下一模块照此执行，否则会出现 测试访问 /api/... 但实际挂在 /<resource> 导致 404 的问题。

3.3 Pydantic v2 约束

DTO 基类若要 strict（extra forbid）：

不要同时写 Config 和 model_config

建议使用你当前 Projects 的 StrictModel 写法（v2 优先，v1 fallback）

3.4 “终端不退出”的命令习惯

日常门禁命令请避免 set -e（或在外层捕获 rc 并打印）

统一用：

rc=$?; echo "[info] ... rc=$rc"
保证失败时仍能继续打印与排障。

4) 当前仓库关键信息（用于交接）

GitHub：https://github.com/Ethan-Lee-Meta/AI-Assitant-Manager

你提供的 commit（当时）：aaa1e7cacbf839d79e0f6c29bd6d0eac0560223b

M01 已完成的产物范围（下一模块不要回改）：

apps/api/src/app/modules/projects/*

apps/api/tests/test_projects_crud.py

apps/web/app/(app)/projects/page.tsx

packages/contracts/*（openapi + sha + version）

5) 下一模块启动前的标准自检清单（建议执行）

在开始写下一个模块之前，先确保工作区干净、门禁基线可跑：

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
git status --porcelain

# backend
source .venv/Scripts/activate 2>/dev/null || true
cd apps/api
PYTHONPATH=./src pytest -q
echo "[info] pytest rc=$?"

# web
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd apps/web
npm run build
echo "[info] next build rc=$?"

# contracts (offline)
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
VERIFY_LIVE=0 ./scripts/verify_contracts.sh
echo "[info] verify_contracts offline rc=$?"