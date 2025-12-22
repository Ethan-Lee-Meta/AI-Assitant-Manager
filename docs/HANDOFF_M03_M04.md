'MD'
# HANDOFF — M03 (Episodes/Videos) + M04 (Feed)

## 0) Meta

- Repo: `Ethan-Lee-Meta/AI-Assitant-Manager`
- Baseline commit (provided earlier): `7d17fc768f62efb88f301fa6eb85e402682543ec`
- Environment: Windows + Git Bash, Python venv: `.venv`
- Fixed conventions / guardrails (must continue to hold):
  - API: FastAPI/Uvicorn on port `7000`
  - Web: Next.js on port `2000`
  - API base path: `/api`
  - Health endpoint: `/health` (no `/api` prefix)
  - ErrorEnvelope + `X-Request-Id` consistency
  - List response shape: `{items,total,limit,offset}`
  - Unified list query: `limit/offset/sort/q/archived`
  - Locked contracts:
    - `packages/contracts/openapi.json`
    - `packages/contracts/openapi.sha256`
    - `packages/contracts/contract_version.txt`
  - Contract scripts:
    - `scripts/export_openapi.sh`
    - `scripts/verify_contracts.sh`
  - Backend router mounting via: `apps/api/src/app/modules/_registry.py`

---

## 1) Work delivered in this window

### M03 — Episodes/Videos (EpisodeOrVideo)

#### Backend (delivered)
- Module added: `apps/api/src/app/modules/episodes_or_videos/`
- Route fixed: `/api/episodes_or_videos`
- CRUD + List endpoints:
  - `POST /api/episodes_or_videos`
  - `GET /api/episodes_or_videos/{episode_or_video_id}`
  - `PATCH /api/episodes_or_videos/{episode_or_video_id}`
  - `GET /api/episodes_or_videos`
- List supports:
  - Unified query: `limit`, `offset`, `sort`, `q`, `archived`
  - Resource filters: `project_id` (required), `series_id` (optional), `kind` (optional, `episode|video`)
- Default list semantics aligned to platform standard:
  - `limit.default = 50`
  - `sort.default = -created_at`
- `archived` semantics aligned to `archived_at`:
  - `archived=false` => only active (`archived_at IS NULL`)
  - `archived=true`  => only archived (`archived_at IS NOT NULL`)
- Sort whitelist / validation enforced (prevents arbitrary SQL sorts)
- Tests:
  - CRUD test passing
  - List semantics hardened tests passing (default asserts, filters, sort + archived semantics)
- Contracts:
  - OpenAPI exported and locked artifact verified via `verify_contracts.sh` (including live match when server running)

#### Web (delivered)
- Episode/Video workspace:
  - `/episodes_or_videos/[episode_or_video_id]`
  - `/episodes_or_videos/[episode_or_video_id]/shots` (placeholder)
- Series workspace:
  - Shows episode/video lists filtered by series (when `series.project_id` available)
  - Entry points:
    - `/series/[series_id]/episodes/new`
    - `/series/[series_id]/videos/new`
- Next.js 16 compatibility fixes:
  - Addressed dynamic params access issues in route pages
  - Resolved `/series` page build failure related to `useSearchParams()` by wrapping with `Suspense`

---

### M04 — Feed (read-only aggregate)

> Added on request: a global, read-only aggregate view that lists episodes/videos across projects and series.

#### Backend (delivered)
- Module added: `apps/api/src/app/modules/feed/`
- Endpoint:
  - `GET /api/feed`
- Query:
  - Unified: `limit`, `offset`, `sort`, `q`, `archived`
  - Filters: `project_id?`, `series_id?`, `kind?`
- Behavior:
  - Aggregates items from Episodes/Videos (extensible later to assets)
- Tests:
  - Read-only + list semantics + filters hardened tests passing
- OpenAPI:
  - Live OpenAPI confirmed contains `/api/feed` when server running

#### Web (delivered)
- Page:
  - `/feed`
- UI:
  - Filters: project_id / series_id / q / kind / archived / sort / limit
  - Actions per item:
    - Open Item => `/episodes_or_videos/[id]`
    - Open Series => `/series/[series_id]`
    - Filter Series by Project => `/series?project_id=...`

---

## 2) Important incident history (do not regress)

### `_registry.py` corruption risk
- A prior patch attempt resulted in `_registry.py` being empty or having indentation errors, causing `uvicorn` import failure.
- Rule going forward:
  - Never blindly overwrite `apps/api/src/app/modules/_registry.py`.
  - Always patch by locating insertion point, then:
    - `python -m py_compile ...`
    - `python -m pytest -q`
  - Keep backups for every write.

### Windows Git Bash `curl | python` JSONDecodeError pitfall
- When `curl` fails or returns empty content, piping into python yields `JSONDecodeError`.
- Best practice:
  - Save response to a file + check size/http_code before parsing.

---

## 3) Current status summary (one-liner)

- **M03 is complete**: backend + contracts + tests + web pages for create/list-by-series + item workspace are stable.
- **M04 is complete**: `/api/feed` + `/feed` page stable; live OpenAPI confirmed includes `/api/feed`.

---

## 4) Required gates (must be green before merge/handoff)

Run from repo root:

```bash
set +e
cd "$(git rev-parse --show-toplevel)" || exit 0

echo "== backend tests =="
cd apps/api || exit 0
PYTHONPATH=./src python -m pytest -q
echo "[rc] pytest=$?"
cd - >/dev/null

echo "== contracts export+verify (API running recommended) =="
./scripts/export_openapi.sh
./scripts/verify_contracts.sh
echo "[rc] contracts=$?"

echo "== web build =="
cd apps/web || exit 0
npm run build
echo "[rc] next_build=$?"
cd - >/dev/null