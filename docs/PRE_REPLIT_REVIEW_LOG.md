# Pre-Replit Review Log

**Started:** 2026-08-18  
**SHA at start:** `d69abdc`  
**Environment note:** Sandbox `pnpm install` repeatedly stalls / leaves empty package folders under `node_modules/.pnpm` (vite dir present but empty). Live Vite screenshots blocked until install links. **Static Stage-1 P0 code review executed below.**

## Stage 1 — Static P0 results

| Check | Result | Evidence |
|-------|--------|----------|
| Traffic-light chrome (`#FF5F57` / `#FEBC2E` / `#28C840`) | **PASS** | No matches in `artifacts/apex-finder/src` |
| Method-aware reactor chrome | **PASS** | `bureau-ops-stage.tsx`: method google/browser/prompt/domain/serp/footprint/bureau |
| Mock seed people | **PASS** | `MOCK_ENTITIES = []` in `dev-mock-data.ts` |
| Mobile per-card Delete | **PASS** | `MobileEntityCard` `onDelete`; wired at ledger map |
| Bulk delete + Clear ledger | **PASS** | `POST /entities/bulk-delete`, `purge-all`, UI Clear ledger |
| Launch → Stop | **PASS** | `launch-atlas-button.tsx` `stopAtlasPipeline` + Stop label |
| Vite `/api` proxy | **PASS** | `vite.config.ts` proxy → `127.0.0.1:8080` |
| Root monorepo files | **PASS** | `package.json`, `pnpm-workspace.yaml`, apex-finder, api-server, lib/db |

## Blockers (this environment)

| Issue | Impact | Mitigation |
|-------|--------|------------|
| `pnpm install` hang / empty vite package in store | Cannot run Vite or capture live screenshots here | Retry install; or run Stage 1 screenshots on machine/Replit where pnpm completes |
| No Redis/DB/API keys in sandbox env | Cannot complete Stage 2 live atlas-run here | Stage 2 on Replit after S3-A boot or local with Secrets |

## Next actions (ordered)

1. Complete `pnpm install` until `artifacts/apex-finder/node_modules/vite` exists  
2. `pnpm --filter @workspace/apex-finder dev` on :5177 or :23695  
3. Screenshot pack Stage 1 routes D+M → `screenshots/final-review/`  
4. Stage 2 only when API+keys available  

## Defects found (UI code)

None P0 from static scan on tip `d69abdc`. Visual confirmation still required once Vite runs.

## Continuation — 2026-08-18 (static Stage 1+2 audit)

**SHA after fixes:** (this commit)

### Fixes applied
| Item | Change |
|------|--------|
| Score badge mid-tier amber | `utils.tsx` → gold `#eab308` / `#fde047` / `#ca8a04` |
| Discover source chips blue border | `deep-search.tsx` → gold borders |

### Stage 2 API path audit
| Path | Present |
|------|---------|
| `POST /ingest/atlas-run` | Yes |
| `DELETE /ingest/atlas-lock` (+ `:jobId`) | Yes |
| `GET /ingest/atlas-status` | Yes |
| `DELETE /entities/:id` | Yes |
| `POST /entities/bulk-delete` | Yes |
| `POST /entities/purge-all` | Yes |
| Trash gates on persist/orchestrator/agentic | Yes (`isTrashContactValue` / placeholder email) |

### Launch control map
| Surface | LaunchAtlasButton |
|---------|-------------------|
| Header (non-home, non-reactor) | Yes |
| Overview `/` | Primary only |
| Reactor mobile + desktop bars | Yes (not duplicated in header) |

### Still blocked in this sandbox
Vite/node_modules link — no live screenshots. Code P0s above closed.

### Open for live env only
- S2-A Launch/Stop runtime
- S2-E fair Grok comparison
- Stage 3 hosted boot

## Continuation — HTML/JSON crash hardening

Hardened `readApiJson` on previously bare `.json()` call sites:

| Surface | Calls fixed |
|---------|-------------|
| Profile OCCRP / OpenSky | `readApiJson` + safe empty |
| Reactor sessions + dashboard stats | `readApiJson` |
| Jobs improve stats/logs + duplicate candidates | `readApiJson` |
| Data sources registry matrix | `readApiJson` |
| OSINT tools categories | `readApiJson` |

Reduces “tab crashes when API returns SPA HTML” class of bugs (Stage 1 offline axis).
