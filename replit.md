# ApexFinder Pro

A private OSINT intelligence platform for researching high-net-worth individuals (HNWIs) via real public registries. Zero synthetic data — every record derives from a validated public source.

## Architecture

pnpm monorepo with four artifacts:

| Artifact | Path | Port | URL |
|---|---|---|---|
| API Server (Express 5) | `artifacts/api-server` | 8080 | `/api` |
| Web Frontend (React 19 + Vite) | `artifacts/apex-finder` | 23695 | `/` |
| Mobile (Expo) | `artifacts/apex-mobile` | 22796 | `/apex-mobile/` |
| Mockup Sandbox | `artifacts/mockup-sandbox` | 8081 | `/__mockup` |

Shared libraries:
- `lib/db` — Drizzle ORM + PostgreSQL schema (`drizzle-kit push` to migrate)
- `lib/api-zod` — shared Zod schemas

## Running the Project

Workflows (managed by Replit):
- **Redis** — `redis-server --port 6379` (always running; local cache)
- **artifacts/api-server: API Server** — builds + starts the Express API
- **artifacts/apex-finder: web** — Vite dev server for the frontend

To start after import: Redis, API Server, and apex-finder web workflows must all be running.

## Environment Variables

| Variable | Where set | Purpose |
|---|---|---|
| `DATABASE_URL` | Replit DB (auto) | PostgreSQL connection string |
| `REDIS_URL` | `.replit` userenv | Local Redis (`redis://localhost:6379`) |
| `SESSION_SECRET` | Replit Secret | Express session signing |
| `COMPANIES_HOUSE_API_KEY` | Replit Secret (optional) | UK Companies House harvester |
| `REDIS_URL_1`, `REDIS_URL_2` | Replit Secrets (optional) | Upstash permanent Redis for dedup |

## Database

Schema managed by Drizzle ORM in `lib/db/src/schema/`. To push schema changes:

```bash
pnpm --filter @workspace/db run push
```

Database starts empty — use the ingestion endpoints to load real data:
- `POST /api/ingest/western-hnwi` — SEC EDGAR + Companies House + BRREG
- `POST /api/ingest/faa` — FAA Releasable Aircraft Database

## Key API Endpoints

- `POST /api/registry-search` — live OSINT search (OpenCorporates, EDGAR, GLEIF, Companies House)
- `POST /api/search/intelligent` — hybrid BM25 + TF-IDF + Bayesian search
- `POST /api/improve/run` — trigger persona improvement loop
- `GET /api/improve/stats` — improvement log summary
- `GET /api/healthz` — health check

## Phases Implemented

8 phases complete — see `IMPLEMENTATION.md` for full details. No mocked or synthetic data anywhere.

## User Preferences

- Zero synthetic/fake/hallucinated data at all times. Missing data = "Unverified" or blank.
- Use deterministic TypeScript logic for AI-like features (no external AI APIs).
- Maintain existing pnpm monorepo structure.
