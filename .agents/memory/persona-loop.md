---
name: Persona Improvement Loop
description: Phase 7 — how the 6-persona background analysis engine works, where it lives, and what it produces
---

## Architecture

- **DB table:** `improvement_logs` (`lib/db/src/schema/improvement_logs.ts`) — FK → entities (cascade delete), columns: persona, category, priority, title, description, action_taken, status (pending/applied/dismissed)
- **Persona engine:** `artifacts/api-server/src/lib/persona-engine.ts` — 6 deterministic runners, no external AI; each queries DB directly and returns `ImprovementSuggestion[]`
- **Routes:** `artifacts/api-server/src/routes/improve.ts` — mounted via `routes/index.ts`
- **Frontend page:** `artifacts/apex-finder/src/pages/improvements.tsx` — route `/improvements`, nav label "Persona Loop"

## Personas
| ID | Focus |
|----|-------|
| `data_engineer` | Field completeness, source provenance |
| `data_analyst` | Bayesian score accuracy, asset-value consistency |
| `mcts_expert` | Research session coverage, UCT path quality |
| `business_engineer` | Relationship depth, corporate structure gaps |
| `ux_designer` | Map display completeness, notes quality |
| `architect` | Type classification accuracy, deduplication |

## API surface
- `POST /improve/run` — background job (Redis-tracked, same pattern as /ingest/western-hnwi)
- `POST /improve/run/:entityId` — synchronous single-entity run
- `GET /improve/jobs/:jobId` — poll job
- `GET /improve/logs` — paginated, filterable (persona/status/priority/entityId)
- `GET /improve/logs/:entityId` — entity-scoped list
- `PATCH /improve/logs/:logId` — status update
- `GET /improve/stats` — counts by persona × status and by priority

**Why:** All analysis is deterministic TypeScript — no external AI APIs per the master prompt rule. The job queue reuses the Upstash-backed pattern from the ingestion pipeline (requires permanent Redis / REDIS_URL_1 for job tracking to persist across restarts).
