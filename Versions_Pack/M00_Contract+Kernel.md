# HANDOFF PACK — 平台已冻结 + 下一模块 M01 施工门禁

## 0) 全局冻结（不可改）
- 后端：FastAPI + Uvicorn，端口 7000；API base path=/api；健康检查 GET /health（不带 /api）
- 前端：Next.js，端口 2000；通过 NEXT_PUBLIC_API_BASE_URL 指向后端（默认 http://localhost:7000）
- 错误格式：统一 ErrorEnvelope（error.code/message/details + request_id），且响应头必须带 X-Request-Id；header 与 body.request_id 必须一致
- request_id：前端每请求注入 X-Request-Id；后端若无则生成；日志必须包含 request_id
- List 响应：统一 {items,total,limit,offset}；Query 统一 limit/offset/sort/q/archived（archived 默认 false）
- 软删除：统一 archived_at（null=活跃；非null=归档），删除动作只允许设置 archived_at
- 后端路由挂载：只能在 apps/api/src/app/modules/_registry.py 追加 include（禁止在 main.py 写业务逻辑）
- 前端 API 调用：只能通过 apps/web/src/lib/api/client.ts（禁止页面直接 fetch 后端）
- 契约锁定件：packages/contracts/openapi.json + openapi.sha256 + contract_version.txt
- 门禁脚本：scripts/export_openapi.sh 与 scripts/verify_contracts.sh（文件名与路径固定）
- 一键启动：根目录 docker-compose.yml + .env.example（端口映射固定 7000/2000）

## 1) 平台状态（M00 已完成且冻结）
- M00-A/B/C/D 已通过：/health、404、VALIDATION_ERROR、INTERNAL_ERROR、request_id 一致性；前端 Landing 自测三按钮；契约锁定件导出/校验脚本；docker compose 一键启动
- 禁止改动 M00 内核文件与前端 API client（除非提出“冻结清单补丁/CR”并明确原因与影响）

## 2) 统一回归门禁（任何模块合并前必须全绿）
A) 后端 pytest：
  cd apps/api && PYTHONPATH=./src pytest -q
B) 契约校验：
  VERIFY_LIVE=0 ./scripts/verify_contracts.sh
  （若后端在线则 ./scripts/verify_contracts.sh 必须通过）
C) 前端 build：
  cd apps/web && npm run build
D) docker（如 CI 支持）：
  docker compose up -d --build
  curl http://localhost:7000/health
  curl http://localhost:2000/
  docker compose down -v

## 3) 下一步模块：M01 Projects（需实现）
### 3.1 目标
实现 Projects 的 POST/PATCH/GET/LIST，并满足平台门禁（ErrorEnvelope、request_id、ListResponse、archived_at）。

### 3.2 ALLOW-LIST（仅允许改动/新增这些文件）
后端：
- apps/api/src/app/modules/_registry.py（仅追加注册 Projects router）
- apps/api/src/app/modules/projects/router.py（新增）
- apps/api/src/app/modules/projects/dto.py（新增）
- apps/api/src/app/modules/projects/store_sqlite.py（新增）
- apps/api/src/app/modules/projects/service.py（新增）
- apps/api/tests/test_projects_crud.py（新增）
前端：
- apps/web/app/(app)/projects/page.tsx（新增）
契约锁定件（由集成人员执行）：
- packages/contracts/openapi.json
- packages/contracts/openapi.sha256
- packages/contracts/contract_version.txt

### 3.3 DENY-LIST（M01 不得修改）
- apps/api/src/app/core/*、apps/api/src/app/api/health.py
- apps/web/src/lib/api/*、apps/web/src/lib/request_id.ts、apps/web/src/config/runtime.ts
- docker-compose.yml、.env.example

### 3.4 Projects 契约与行为（冻结）
- 字段：id,name,description?,project_type,encryption_policy,default_face_mode,tags?,created_at,updated_at,archived_at?
- project_type 取值：series_collection | story_project（必填）
- encryption_policy 必填（MVP 默认 bundle_only）
- default_face_mode 必填（默认 assisted）
- Create：name, description?, project_type, default_face_mode?, tags?
- Patch：name?, description?, default_face_mode?, tags?, archived_at?
- List Query：q?, project_type?, archived?, limit, offset, sort
- List 默认 archived=false；archived=true 返回已归档；q 至少匹配 name
- sort 兼容两种写法：-created_at / created_at 以及 created_at:desc / created_at:asc；不在白名单字段则 VALIDATION_ERROR

### 3.5 存储（M01 内部冻结）
- 使用 sqlite3；DB 路径固定：apps/api/.data/app.db
- 表名 projects；tags 以 JSON TEXT 存；*_at 以 ISO 字符串存

### 3.6 测试必须覆盖
- Create 成功且默认值补齐（encryption_policy/default_face_mode）
- List 默认不含 archived；归档后 archived=false 不出现、archived=true 出现
- 404 返回 NOT_FOUND（ErrorEnvelope）
- 抽查 request_id header/body 一致

### 3.7 验收命令（M01）
- 后端单测：cd apps/api && PYTHONPATH=./src pytest -q
- 前端 build：cd apps/web && npm run build
- 契约：./scripts/verify_contracts.sh（如失败则 bump 版本并 ./scripts/export_openapi.sh 后再 verify）

### 3.8 回滚/复位
- git restore . && git clean -fd
- rm -f apps/api/.data/app.db（仅用于重置测试数据）
- docker compose down -v
