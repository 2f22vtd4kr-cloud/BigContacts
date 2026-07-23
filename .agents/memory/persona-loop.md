---
name: Persona Improvement Loop
description: Persona improvement engine, its routes/UI, current eight-persona scope, and runtime caveats
---

## Architecture

- **DB table:** `improvement_logs` (`lib/db/src/schema/improvement_logs.ts`) — FK → entities (cascade delete), columns: persona, category, priority, title, description, action_taken, status (pending/applied/dismissed)
- **Persona engine:** `artifacts/api-server/src/lib/persona-engine.ts` — 8 deterministic runners, no external AI; each queries DB directly and returns `ImprovementSuggestion[]`
- **Routes:** `artifacts/api-server/src/routes/improve.ts` — mounted via `routes/index.ts`
- **Frontend page:** `artifacts/apex-finder/src/pages/improvements.tsx` — route `/improvements`, nav label "Persona Loop"

## Personas
| ID | Focus |
|----|-------|
| `data_engineer` | Field completeness, source provenance |
| `data_analyst` | Bayesian score accuracy, asset-value consistency |
| `intel_systems_analyst` | Hybrid search, agent pipeline, MCTS path quality, Bayesian-UCB coverage |
| `business_engineer` | Relationship depth, corporate structure gaps |
| `ux_designer` | Map display completeness, notes quality |
| `architect` | Type classification accuracy, deduplication |
| `data_integrity_auditor` | Zero-synthetic-data and provenance compliance |
| `hybrid_architecture_auditor` | End-to-end coverage across the five hybrid architecture layers |

## API surface
- `POST /improve/run` — background job (Redis-tracked, same pattern as /ingest/western-hnwi)
- `POST /improve/run/:entityId` — synchronous single-entity run
- `GET /improve/jobs/:jobId` — poll job
- `GET /improve/logs` — paginated, filterable (persona/status/priority/entityId)
- `GET /improve/logs/:entityId` — entity-scoped list
- `PATCH /improve/logs/:logId` — status update
- `GET /improve/stats` — counts by persona × status and by priority

**Why:** All analysis is deterministic TypeScript — no external AI APIs per the master prompt rule. The job queue reuses the Upstash-backed pattern from the ingestion pipeline (requires permanent Redis / REDIS_URL_1 for job tracking to persist across restarts).

## Runtime review caveat

The loop is not self-contained: it first reads HNWI/Gatekeeper entities from PostgreSQL, and each persona performs additional PostgreSQL reads. When PostgreSQL is unavailable, `POST /improve/run`, `/improve/stats`, and `/improve/logs` return 500. The `/improvements` page currently attempts `response.json()` on those HTML Express error pages, displaying an `Unexpected token '<'` parse error rather than a database-unavailable explanation.

**Why:** A live review on 2026-07-23 showed Redis and API health succeeding while the entity query failed; reporting a score in that state would be fabricated.

**How to apply:** Treat a loop run as valid only when the POST returns a job and polling reaches `done`; otherwise report the infrastructure blocker and inspect the UI error state separately.
