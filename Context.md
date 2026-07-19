# ApexFinder Pro — Session Context

> **Rule for agents:** Read `replit.md` AND this file at the start of every session (especially after a GitHub import). Update this file after every meaningful iteration before finishing your turn.

---

## Current State (2026-07-19)

### Environment
- **Replit PostgreSQL** connected — `DATABASE_URL` set automatically
- **Local Redis** running on `redis://localhost:6379` — workflow `Redis` must be running
- **Upstash Redis (`REDIS_URL_1`)** — ✅ Set — dedup state will persist across restarts
- **SESSION_SECRET** — set ✅
- **COMPANIES_HOUSE_API_KEY** — not set (optional)

### Workflows running
| Workflow | Status |
|---|---|
| Redis | ✅ Running |
| `artifacts/api-server: API Server` | ✅ Running |
| `artifacts/apex-finder: web` | ✅ Running |
| `artifacts/apex-mobile: expo` | Not started (optional) |
| `artifacts/mockup-sandbox: Component Preview Server` | Not started (optional) |

### Database
- Schema pushed ✅ (`pnpm --filter @workspace/db run push`)
- **FAA**: ✅ Done — 12,902 inserted, 37,110 skipped (dedup — prior session keys in Upstash)
- **Land Registry**: ✅ Done — 50,000 inserted, 50,000 skipped (dedup)
- **Western HNWI**: 🔄 Running in background — ~600+ inserted so far, target 5,000. SEC EDGAR rate-limited (~1 req/s). Will continue until job completes.
- **Dashboard totals**: ~63,500 entities · ~62,900 assets · 5,151 hot leads · avg score 62.3%

> **Note on FAA count:** Only 12,902 of the prior 30,000 FAA records were re-inserted because 37,110 N-numbers from the previous session are still in the Upstash dedup set. The FAA registry itself is updated daily — the 12,902 are records not seen in the prior run. To get back to ~30,000 FAA records, run `DELETE /api/ingest/dedup` (clears Upstash), truncate the `entities` + `assets` tables, then re-ingest.

### What was done this session
1. `pnpm install` — 1,128 packages installed
2. DB schema pushed via `pnpm --filter @workspace/db run push`
3. All four artifacts registered with Replit platform
4. `postgresql-16` Nix module restored (platform had removed it during import)
5. API server and web frontend verified running — dashboard loads at `/`

### What's pending
- **Set `REDIS_URL_1`** — Upstash Redis URL for persistent dedup (user providing)
- **Re-ingest data** — FAA, HMLR, and Western HNWI pipelines need to run to repopulate DB

---

## Iteration Log

| Date | What changed |
|---|---|
| 2026-07-19 | Fresh GitHub import. Environment bootstrapped. DB empty. Upstash not connected. |
| 2026-07-19 | REDIS_URL_1 (Upstash) set and verified connected (`[upstash-1] Redis ready`). Dedup now persists across restarts. Ready for ingestion. |
| 2026-07-19 | Synthetic data purge: removed Math.random() jitter from graph path score (graph.ts), removed hardcoded "James"/"Captain" name fallbacks (pitch-generator.ts), replaced random skeleton widths with fixed value (sidebar.tsx). Added scripts/check-no-synthetic-data.sh — bans faker libs, Math.random() outside MCTS, lorem ipsum, seeding functions. Wired into post-merge.sh so every future merge is checked automatically. |
| 2026-07-19 | Ingestion run: FAA ✅ 12,902 inserted (37,110 deduped from prior Upstash session). LR ✅ 50,000 inserted (50,000 deduped). Western HNWI 🔄 running in background (~600+ so far, SEC EDGAR rate-limited). Dashboard live: ~63,500 entities, ~62,900 assets, 5,151 hot leads. |

---

## Quick-Start Checklist (after any import)

1. `pnpm install`
2. `pnpm --filter @workspace/db run push`
3. Start workflows: Redis → API Server → apex-finder web
4. Verify `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET` are set
5. Set `REDIS_URL_1` (Upstash) before running any large ingestion
6. Run ingestion endpoints (see `replit.md` → Ingestion Endpoints)
