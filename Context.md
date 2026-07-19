# ApexFinder Pro — Session Context

> **Rule for agents:** Read `replit.md` AND this file at the start of every session (especially after a GitHub import). Update this file after every meaningful iteration before finishing your turn.

---

## Current State (2026-07-19)

### Environment
- **Replit PostgreSQL** connected — `DATABASE_URL` set automatically
- **Local Redis** running on `redis://localhost:6379` — workflow `Redis` must be running
- **Upstash Redis (`REDIS_URL_1`)** — **NOT YET SET** — dedup state will not persist across restarts until this is configured
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
- **Data: EMPTY** — all ingestion pipelines ready but no records loaded yet
- Previous data state (before this import): 80,900 entities, 80,700 assets (see `replit.md` for breakdown)

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

---

## Quick-Start Checklist (after any import)

1. `pnpm install`
2. `pnpm --filter @workspace/db run push`
3. Start workflows: Redis → API Server → apex-finder web
4. Verify `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET` are set
5. Set `REDIS_URL_1` (Upstash) before running any large ingestion
6. Run ingestion endpoints (see `replit.md` → Ingestion Endpoints)
