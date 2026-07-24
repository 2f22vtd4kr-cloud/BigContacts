# ApexFinder Pro

A private OSINT intelligence platform for researching high-net-worth individuals (HNWIs) via real public registries. **Zero synthetic data — every record is sourced from a validated public registry.**

---

## Architecture

pnpm monorepo (`pnpm-workspace.yaml` at root). Four registered artifacts:

| Artifact | Path | Port env | Preview path |
|---|---|---|---|
| API Server (Express 5) | `artifacts/api-server` | `PORT` (8080) | `/api` |
| Web Frontend (React 19 + Vite) | `artifacts/apex-finder` | `PORT` (23695) | `/` |
| Mobile (Expo) | `artifacts/apex-mobile` | `PORT` (22796) | `/apex-mobile/` |
| Mockup Sandbox | `artifacts/mockup-sandbox` | `PORT` (8081) | `/__mockup` |

Shared libraries (under `lib/`):
- `lib/db` — Drizzle ORM + PostgreSQL schema. Run `pnpm --filter @workspace/db run push` to apply migrations.
- `lib/api-zod` — shared Zod request/response schemas

---

## Workflows (Replit-managed)

| Workflow | Command | Must run? |
|---|---|---|
| Redis | `redis-server --port 6379 --save '' --appendonly no` | Yes — local cache |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | Yes |
| `artifacts/apex-finder: web` | `pnpm --filter @workspace/apex-finder run dev` | Yes |
| `artifacts/apex-mobile: expo` | `pnpm --filter @workspace/apex-mobile run dev` | Optional |
| `artifacts/mockup-sandbox: Component Preview Server` | `pnpm --filter @workspace/mockup-sandbox run dev` | Optional |

The API server `dev` script runs `build` then `start` every time (esbuild, ~1.5s).

The dashboard uses two deliberately separate scores: **Signal** reflects the strength of wealth/registry evidence, while **Access** reflects how realistically a profile can be reached through public contact evidence and directness. A strong Signal score must not imply a strong Access score.

---

## Environment Variables & Secrets

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | Replit PostgreSQL (auto) | PostgreSQL connection |
| `REDIS_URL` | `.replit` userenv | Local Redis — `redis://localhost:6379` |
| `SESSION_SECRET` | Replit Secret | Express session signing |
| `REDIS_URL_1` | Replit Secret | **Upstash permanent Redis** — dedup set lives here. Required for dedup to persist across restarts. |
| `REDIS_URL_2` | Replit Secret | **Upstash permanent contact cache** — enriched contact data (email/phone/LinkedIn) lives here. Survives DB resets. Required for contact persistence across GitHub imports. |
| `COMPANIES_HOUSE_API_KEY` | Replit Secret (optional) | UK Companies House officer harvester |

---

## Database Schema

Tables (all in `lib/db/src/schema/`):

| Table | Purpose |
|---|---|
| `entities` | Core HNWI/Corp/Trust/Gatekeeper profiles |
| `assets` | Aviation, RealEstate, Marine, PrivateClub assets |
| `relationships` | Entity→Entity and Entity→Asset edges |
| `research_sessions` | Hybrid Research outreach path results + CRM status |
| `improvement_logs` | Persona-loop suggestions per entity |

Schema push: `pnpm --filter @workspace/db run push`

---

## Replit Setup Notes (2026-07-24)

After a fresh GitHub import, run these steps to get the project running:

1. **Install dependencies:** `CI=true pnpm install` (takes ~4 min on first run; subsequent runs are fast)
2. **Push DB schema:** `pnpm --filter @workspace/db run push`
3. **Start workflows:** Redis → API Server → apex-finder web (in that order)

Two fixes were needed after the first import:
- Added `"pg-cloudflare"` to the `external` list in `artifacts/api-server/build.mjs` (pg optional dep that esbuild couldn't resolve)
- Added `sharp`, `onnxruntime-node`, `protobufjs` to `onlyBuiltDependencies` in `pnpm-workspace.yaml` so their native bindings build correctly (sharp is needed by `@huggingface/transformers` at startup)

---

## Current Data State (verified 2026-07-24 — latest import setup)

| Source | Entities | Assets | Notes |
|---|---|---|---|
| FAA / HMLR / other live sources | In progress | In progress | The latest import starts from a fresh PostgreSQL schema; the API automatically begins public-source ingestion on cold start. |
| **Current verified state** | **0 visible at initial check** | **0 visible at initial check** | API auto-ingestion is active; counts will grow as background jobs complete. |

**Post-import cold-start state:** This latest import has an empty database after schema setup. API startup detected that state, connected to both persistent Upstash Redis slots, cleared stale job locks/dedup state, and started broad discovery plus Western HNWI ingestion. Contact cache restoration is enabled through Upstash slot 2.

**Honest rating for this fresh import: not yet assessed.** Relationship and research passes depend on the active ingestion jobs completing.

---

## Ingestion Endpoints

All jobs are background — POST returns `{jobId}`, poll with `GET /api/ingest/job/:jobId`.

| Endpoint | Source | Notes |
|---|---|---|
| `POST /api/ingest/faa` | FAA ReleasableAircraft.zip | Downloads ~70MB ZIP, extracts MASTER.txt (314,848 lines). Uses in-memory dedup + batch Upstash writes. ~73s for 30,000 records. |
| `POST /api/ingest/land-registry` | HMLR PPD bulk CSV (S3) | Downloads `pp-YYYY.csv` (~160MB/year) via `curl -L`. Streams, filters £1M+. Uses in-memory dedup. ~8min for 50,000 records. |
| `POST /api/ingest/western-hnwi` | SEC EDGAR + BRREG Norway + Companies House | Live API calls. Slow (~1 req/s rate limit). |
| `POST /api/ingest/occrp` | OCCRP Aleph API | Enrichment only — cross-references existing entities against aleph.occrp.org. |
| `POST /api/ingest/opensky` | OpenSky Network API | Live flight enrichment. |
| `DELETE /api/ingest/dedup` | — | Clears the Upstash dedup set. Use before full re-ingest. |

Body params (all optional): `{ "force": true }` — bypasses cache and re-downloads source files.

---

## Contact Cache Architecture

**Purpose:** persist enriched contact data (email / phone / LinkedIn) across GitHub imports and DB resets.

- Contact cache lives in **Upstash slot 2** (`REDIS_URL_2`). Key format: `contact:v1:{stableKey}` where `stableKey = sourceRegistries[0]` (e.g. `contact:v1:edgar:cik12345`, `contact:v1:faa:N12345`). Keys are derived from source registry IDs — stable and collision-free across any import.
- **Write path (ingest.ts):** after every successful in-house enrichment DB write, `contactCacheSet(stableKey, data)` mirrors the same `CachedContact` payload to Redis. Fire-and-forget — no latency impact.
- **Restore path (startup.ts, step 0a):** on every boot, `contactCacheScanAll()` fetches all `contact:v1:*` keys, matches each to an entity via `sourceRegistries LIKE %stableKey%`, and backfills contact fields for any entity that currently has none. This restores prior enrichment into a freshly reset DB.
- **Backfill path (startup.ts, step 0b):** on every boot, reads all PostgreSQL entities with existing contact data and writes them to Redis if not already cached. Captures enrichments done before the Redis-mirror code was deployed.
- Helpers live in `artifacts/api-server/src/lib/redis.ts`: `contactCacheSet`, `contactCacheGet`, `contactCacheScanAll`, `contactCacheCount`, `getContactCacheClient`.

---

## Dedup Architecture

**Critical:** dedup is what prevents duplicate rows across runs.

- Dedup set lives in **Upstash** (permanent Redis, `REDIS_URL_1`). Key: `apex:apex:dedup:hnwi` (double-prefix is a historical artifact — do not change).
- During ingestion, `preloadDedupPrefix(prefix)` in `lib/job-queue.ts` scans existing keys for a given prefix (e.g. `"faa:"`) into a local `Set<string>` — **one Upstash round-trip at start, not one per record**.
- After each batch flush, `batchMarkSeen(keys[])` writes new keys to Upstash in one `SADD` call.
- **Never use the old `isDuplicate()` / `markSeen()` pattern inside a parse loop** — at 75ms/call × 865 matches per 5k lines it stalls indefinitely.
- The Western HNWI ingestor still uses the old per-record pattern (acceptable at 200 records; fix if volume scales).

FAA dedup key format: `faa:NNUMBER` (e.g. `faa:N12345`)
Land Registry dedup key format: `lr:{transaction-uuid}`
Western HNWI dedup key format: `{normalizedname}:{jurisdiction}` (e.g. `johnsmith:us`)

---

## Key API Endpoints

```
GET  /api/healthz                      health check
GET  /api/dashboard/stats              aggregate counts, top scorers, asset breakdown
GET  /api/dashboard/hot-leads          top entities by Bayesian score + real asset signals
GET  /api/dashboard/map-data           assets with lat/lng for map
POST /api/search/intelligent           hybrid BM25 + TF-IDF + Bayesian search
POST /api/registry-search              live OSINT search (GLEIF, EDGAR, OpenCorporates, Companies House)
POST /api/research/run                 Hybrid Research path-finding for an entity
GET  /api/research/sessions            CRM research session list
POST /api/improve/run                  run persona improvement loop (50 entities at a time)
GET  /api/improve/stats                persona loop summary stats
GET  /api/improve/logs                 improvement suggestions (filterable by persona/priority/status)
```

---

## Data Integrity Rules

1. **No synthetic data anywhere.** If a field is unknown, it is `null` or omitted — never filled with plausible-sounding invented values.
2. `mock-data.ts` has been deleted. It contained 27 fictional profiles and was dead code, but posed a risk.
3. The Live Signals panel on the dashboard uses **real asset data** from the database — the most recent asset description + source registry for each entity. No random strings.
4. The MCTS agent (`lib/mcts-agent.ts`) does pure graph traversal on real DB relationships — it invents no data.
5. The persona engine (`lib/persona-engine.ts`) runs deterministic TypeScript rules against real entity fields — no AI APIs.

---

## Land Registry Notes

- **SPARQL is dead for bulk queries.** The HMLR PPD SPARQL endpoint at `https://landregistry.data.gov.uk/landregistry/query` returns empty results or HTTP 000 timeouts for any `pricePaid >= 1000000` filter. Use the bulk CSV instead.
- CSV URL: `http://prod.publicdata.landregistry.gov.uk.s3-website-eu-west-1.amazonaws.com/pp-YYYY.csv` (redirects to `prod2`). Use `curl -L`.
- PPD CSV has no header row. Fields: `[0]` tx UUID, `[1]` price, `[2]` date (`YYYY-MM-DD 00:00`), `[3]` postcode, `[4]` property type, `[6]` tenure, `[7-13]` address components, `[14]` PPD category (skip `B`), `[15]` record status (skip `D`).
- **Buyer identity is not in the PPD CSV.** Entities are named by property address, not buyer name.

---

## FAA Registry Notes

- ZIP downloaded from `https://registry.faa.gov/database/ReleasableAircraft.zip` (~70MB). Cached at `/tmp/apexfinder-faa/`.
- MASTER.txt: comma-delimited, 35 fields, latin1 encoding, Windows line endings (`\r\n`). Header row on line 1 — skip it.
- Field indices (0-based): `[0]` N-number, `[5]` typeReg, `[6]` name, `[9]` city, `[10]` state, `[14]` country, `[18]` typeAircraft, `[19]` typeEngine, `[20]` status.
- Status `V` = valid/registered. Filter: status ∈ {V,A}, typeReg ∈ {1,2,4,7,9} (non-government/non-airline), typeEngine ∈ {2,3,4,5} (turbine) OR typeAircraft ∈ {5=multi,6=rotorcraft}.
- ~865 qualifying records per 5,000 lines = ~51,000 total qualifying records in the full file.

---

## Phases Implemented

| Phase | Feature |
|---|---|
| 1–3 | Core DB schema, Bayesian scorer, Express API, React frontend |
| 4 | Hybrid Research agent (L4 UCT graph traversal), research sessions, CRM pipeline |
| 5 | Hybrid BM25 + TF-IDF + Bayesian search, network graph |
| 6 | FAA aircraft registry ingestor, Western HNWI engine (SEC EDGAR + BRREG + Companies House) |
| 7 | Persona improvement loop (8 deterministic personas), `improvement_logs` table, `/improvements` UI page |
| 8 | OCCRP Aleph enricher, HMLR OCOD ingestor (replaced by PPD CSV), OpenSky live-flight enricher, Data Sources dashboard |
| 9 (UX) | Single-pass query expansion (`expandQuery` in agent-orchestrator.ts); Entity Ledger clickable contact vectors (mailto/tel/LinkedIn); Profile page Direct Contact Vectors action bar; Intel Terminal search bar + 500-entity limit + `?entity=` URL pre-selection; CRM empty-state guidance; `improve/run` inArray SQL fix; Intel Systems Analyst persona text updated to reflect expansion mechanics |
| 10 | **Redis contact cache** — enriched contacts now persist across GitHub imports and DB resets. `REDIS_URL_2` (Upstash slot 2) stores `contact:v1:{stableKey}` entries permanently. Startup restore (Redis → PG) and backfill (PG → Redis) steps run on every boot. Enricher mirrors to Redis after every DB write. |
| 11 | **Pipeline recovery hardening** — stale queued Hybrid Research locks are invalidated safely; shared public-email validation rejects search-engine diagnostics/placeholders; boot sanitation repairs PostgreSQL and Redis contact records; verified two 300-session research passes plus a fresh 100-entity Persona Loop pass with 0 errors. |
| 12 | **Phase H complete + full audit** — pipeline inverted (web-first), recurring scheduler (7 jobs forever), 3 enrichment modules (social-discovery, messenger-discovery, foundation-filings), 9 new schema columns, 8-vector contact panel UI. Full audit pass: confirmed all Phase H modules exist and route correctly; fixed 2 bugs: (1) `research.tsx` terminal placeholder "MCTS" → "UCT" (user-facing string); (2) `ingest-enrichment.ts` foundation-filings `db.select()` was missing all 5 social columns, causing `computeContactConfidence` to systematically undercount social signals. No other user-facing MCTS strings exist. All 300/300 Hybrid Research sessions and 100-entity Persona Loop pass with 0 errors verified. |
| 13 | **Same-source duplicate review** — `/duplicates` separates cross-registry candidates from exact-name clusters within normalized registries; new read-only cluster API and regression coverage prevent self-pairs and automatic merges. |
| 14 | **Measured warm-path recovery + enrichment correctness** — EDGAR issuer backfill, co-investor/co-shareholder detection, corporate-series/name-cluster edges, FAA/HMLR peer edges, and the website/address-only enrichment state fix. |

---

## User Preferences

- Zero synthetic/fake/hallucinated data at all times. Missing data = `null` or blank field.
- Deterministic TypeScript for AI-like features — no external AI APIs.
- Maintain existing pnpm monorepo structure.
- Use Fable 5 High Effort (built-in agent model) for any AI feature implementation — not external OpenAI/Anthropic calls.

---

## Agent Rules (Absolute — apply every session)

1. **Read `replit.md` AND `Context.md` at the start of every session**, especially after any GitHub import. These two files together define current environment state and project intent. Never skip this step.

2. **Update `Context.md` after every meaningful iteration** before finishing a turn:
   - Update the "Current State" section (env vars, workflow status, DB counts)
   - Append a row to the Iteration Log with today's date and a one-line summary of what changed

3. **Update `replit.md` whenever** project-level facts change:
   - New environment variables or secrets added → update the table
   - DB record counts change after ingestion → update "Current Data State"
   - New phases/features implemented → append to "Phases Implemented"
   - Schema changes → update "Database Schema"

4. **Both files must be committed to the repo** as part of any task that changes project state. They are the permanent record of how this project runs.
