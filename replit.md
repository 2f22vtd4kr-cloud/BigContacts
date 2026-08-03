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

Phase J3 identity review data is stored in the `identity_bundles` and
`identity_candidates` tables. `POST /api/identity/resolve` builds deterministic
name variants and contextual cross-registry candidates; candidates remain
review-only and are never auto-merged or used to promote contacts.

---

## Workflows (Replit-managed)

| Workflow | Command | Must run? |
|---|---|---|
| Redis | `redis-server --port 6379 --save '' --appendonly no` | Yes — local cache |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | Yes |
| `artifacts/apex-finder: web` | `pnpm --filter @workspace/apex-finder run dev` | Yes |
| `artifacts/apex-mobile: expo` | `pnpm --filter @workspace/apex-mobile run dev` | Optional |
| `artifacts/mockup-sandbox: Component Preview Server` | `pnpm --filter @workspace/mockup-sandbox run dev` | Optional |

The API server `dev` script runs `build` then `start` every time (esbuild, ~1.5s). The build entry is `artifacts/api-server/src/src/index.ts`; the top-level `src/` tree is an import-era health-only scaffold and must not be used as the production entry.

The dashboard uses two deliberately separate scores: **Signal** reflects the strength of wealth/registry evidence, while **Access** reflects how realistically a profile can be reached through public contact evidence and directness. A strong Signal score must not imply a strong Access score.

The previously used Warren Buffett record is not a valid benchmark: celebrity visibility makes it unrealistically reachable. The valid controlled benchmark is a 16-person FAA aircraft-owner cohort selected from real individual turbine/multi-engine registrants, excluding Buffett, trusts, companies, obvious wrappers, and malformed names. The pre-fix run completed 16/16 with 0 errors at 13 social-only / 1 direct-contact candidate / 2 no usable contact outcomes; the stricter post-fix rerun completed 16/16 with 0 errors at 10 social-only / 0 direct-contact candidates / 6 no usable contact outcomes. Broad ingestion remains disabled unless explicitly requested.

### Controlled FAA benchmark (verified 2026-08-02)

- FAA import: 5,000 real registry records, 0 errors; no synthetic entities were seeded.
- Cohort: 16 less-famous, business-linked individual owners; target selection excluded celebrity/public-figure benchmarks and non-person wrappers.
- Funnel: post-fix 16/16 enriched, 10 social-only, 0 direct-contact candidates, 6 no usable contact outcomes; 6 HNWI social fields were promoted only after current-run attribution checks.
- Durable evidence: 431 contact-evidence rows across the cohort, including organization and person-candidate review evidence that was not promoted.
- Evidence rule: organization accounts, same-name/public-figure candidates, AI-only citations, and provider agreement without exact canonical claim URLs remain durable review evidence only.
- Attribution hardening: only current-run social candidates with target-person attribution and an exact fetched claim URL can reach HNWI contact fields or trigger Maigret/Sherlock; legacy entity handles are never used as scan fallbacks.
- Run safety: active-job ownership checks prevent orphaned workers from overlapping replacements or clearing a newer job lock.
- Claim-source hardening: lead-generation/directory publishers are excluded from direct-contact corroboration and bounded exact-claim fetching. A controlled three-target canary completed 3/3 with 0 errors and 0/3 verified direct routes; it improved provenance quality without producing a false contact promotion.
- Honest status: the pipeline is materially safer and provenance-correct, but this cohort does **not** establish a 9/10 research score. Post-fix direct-contact yield is 0/16; 10 social-only and 6 no-usable-contact records require further lawful, evidence-backed access work.

## Contact Enrichment Roadmap

The long-term plan for improving the approximately 2.5% direct-contact yield is maintained as **Phase J** in `improvements.md`. It is designed to be implemented across future re-imports in gated milestones: measure the enrichment funnel, keep social-only records eligible for direct-contact follow-up, expand lawful Western registry coverage, resolve identities and official domains, validate candidate contacts, run budgeted multi-pass discovery, and use the relationship graph for contextual research. Phase J describes lawful public methods and is intentionally not a current production source allowlist or capacity restriction. Sources may be internally marked `productionReviewStatus: review_required` for later public-production review, but that marker must not restrict private research. Production limits and public-facing safeguards are deferred to a separate release-hardening phase. Only lawful public data with provenance may be promoted to verified contact; organization, social, evidence-only, and direct-contact outcomes remain separate.

---

## Environment Variables & Secrets

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | Replit PostgreSQL (auto) | PostgreSQL connection |
| `REDIS_URL` | `.replit` userenv | Local Redis — `redis://localhost:6379` |
| `SESSION_SECRET` | Replit Secret | Express session signing |
| `REDIS_URL_1`–`REDIS_URL_5` | Replit Secrets | **Upstash permanent Redis slots** — dedup/contact-cache capacity is distributed across the numbered slots; slot 1 is currently quota-exhausted and skipped automatically, while slots 2–5 are healthy. |
| `COMPANIES_HOUSE_API_KEY` | Replit Secret (optional) | UK Companies House officer harvester |
| `GROQ_API_KEY`, `_2`–`_5` | Replit Secrets (optional) | Groq-powered structured extraction during web enrichment, with key rotation |
| `PERPLEXITY_API_KEY`, `_2`–`_6` | Replit Secrets (optional) | Perplexity-powered public web discovery and enrichment, with key rotation |
| `WHOXY_API_KEY` | Replit Secret (optional) | Whoxy domain and DNS intelligence lookups |
| `OPENROUTER_API_KEY`, `_2`, `_3`, `_4` | Replit Secrets (optional) | OpenRouter model access, with key rotation |
| `GEMINI_API_KEY`, `_2`–`_4` | Replit Secrets (optional) | Google Gemini model access, with key rotation |
| `TAVILY_API_KEY`, `_2`–`_6` | Replit Secrets (optional) | Tavily AI-native search API; returns clean excerpts fed into Groq for extraction, with key rotation |
| `EXA_API_KEY`, `_2` | Replit Secrets (optional) | Exa neural/semantic search; excels at people + company lookups; fed into Groq for extraction, with key rotation |
| `ENABLE_AUTO_PIPELINE` | Shared environment | Set to `false` for controlled imports and single-target research; set to `true` only when broad cold-start ingestion is explicitly requested. |

### Adding a new Upstash Redis slot

When any slot hits its 500,000-request free quota, add a fresh Upstash database as the next numbered slot:

1. Create a new database at [upstash.com](https://upstash.com) → copy its Redis URL (`rediss://...`)
2. Add it as a Replit Secret: `REDIS_URL_5`, `REDIS_URL_6`, etc. (continue the sequence)
3. Restart the **API Server** workflow — the slot scanner (`REDIS_URL_1` → `REDIS_URL_9`) picks it up automatically, no code changes needed
4. Confirm the new slot appears in the startup logs: `Permanent Redis connected slot: N`

The exhausted slot will keep retrying in the background (non-fatal); healthy slots are preferred automatically by `getPermanentClient()`.

---

## Database Schema

Tables (all in `lib/db/src/schema/`):

| Table | Purpose |
|---|---|
| `entities` | Core HNWI/Corp/Trust/Gatekeeper profiles |
| `assets` | BusinessInterest, Aviation, RealEstate, Marine, PrivateClub and other public asset evidence |
| `relationships` | Entity→Entity and Entity→Asset edges |
| `research_sessions` | Hybrid Research outreach path results + CRM status |
| `improvement_logs` | Persona-loop suggestions per entity |

Schema push: `pnpm --filter @workspace/db run push`

---

## Replit Setup Notes (2026-07-24)

After a fresh GitHub import, run these steps to get the project running:

1. **Install dependencies:** `CI=true pnpm install` (takes ~4 min on first run; subsequent runs are fast)
2. **Push DB schema:** `pnpm --filter @workspace/db run push`
3. **Start workflows:** Redis → `artifacts/api-server: API Server` → `artifacts/apex-finder: web` (in that order)

Latest verification (2026-08-03): all requested provider secrets are present — `REDIS_URL_1` through `_5`, `COMPANIES_HOUSE_API_KEY`, five Groq keys, two Perplexity keys, `WHOXY_API_KEY`, four Gemini keys, two Exa keys, and six Tavily keys. Secret values were not read or displayed. A controlled live ingestion admitted 15 records, followed by 15 strictly sequential single-target Atlas + UCT runs. API/Redis health is green; Atlas is idle. The admitted records are corporations requiring manual follow-up, with no direct-contact or outreach promotion.

Contact-quality hardening completed: human-name admission is fail-closed behind deterministic safety gates; AI and enrichment paths no longer construct email addresses; email/phone/social values are sanitized before every PostgreSQL, evidence, Redis, cache-restore, startup-maintenance, and merge write; confidence and hot status are recomputed from cleaned vectors rather than trusted incoming scores; organization contacts cannot inflate personal Access confidence; `isHot` requires a meaningful person-level direct contact signal; and aircraft/property/shareholder/live-flight evidence no longer creates Access-hot leads. Wealth/registry evidence remains available as Signal.

Intelligence Reactor UI hardening completed: the desktop rod wall now displays all eight registry rods (including BRREG and WHOXY) and highlights live route segments from active endpoints; mobile now uses the same complete tool network in a responsive SVG panel with visible forward and adaptive-feedback routes, phase purpose readouts, and all 26 tool rods. The desktop canvas is contained as one surface rather than repeating inside the application shell. Atlas now provides separate phase and entity-batch telemetry, with truthful 0–10 phase state, current entity names/range, and shared completed/active/queued/skipped/failed rod semantics on desktop and mobile. Idle mode does not simulate waves or light rods from historical sessions. No ingestion or pipeline behavior changed.

HNWI/entity card UX updated: dashboard priority cards, People ledger cards, and profile heroes now show an evidence-led public profile brief plus involvement summary using stored bios, headlines, foundation signals, registry activity, and linked assets. Missing evidence is labeled as unrecorded; no biography or involvement is invented. The hot-lead API contract includes the narrative fields and was regenerated from OpenAPI.

Research evidence hardening completed: provider output is reconciled into reviewable contact candidates keyed by normalized vector, with canonical source URLs/domains, organization-vs-person scope, attribution, conflicts, and explicit promotion states. Candidate funnel metadata is persisted through existing `contact_evidence` rows and shown on the Research desk. The independent scorecard separates identity, ownership, contact, practical access, wealth, freshness, and source quality; provider repetition, asset/graph volume, and wealth cannot promote access or verified contact. `/research` is registered and API route coverage is verified after bundling the full imported source tree. No ingestion or research job runs automatically.

Two fixes were needed after the first import:
- Added `"pg-cloudflare"` to the `external` list in `artifacts/api-server/build.mjs` (pg optional dep that esbuild couldn't resolve)
- Added `sharp`, `onnxruntime-node`, `protobufjs` to `onlyBuiltDependencies` in `pnpm-workspace.yaml` so their native bindings build correctly (sharp is needed by `@huggingface/transformers` at startup)

---

## Current Data State (historical benchmark vs active controlled runtime, verified 2026-08-03)

The benchmark figures below are historical results from the prior populated runtime. The current development database contains only records produced by the explicitly authorized controlled Atlas run; no synthetic records were seeded.

| Source | Entities | Assets | Notes |
|---|---|---|---|
| Western HNWI + FAA controlled import | 5,036 | 5,000 | 35 Western records plus 5,000 FAA aircraft-owner records; no synthetic data. |
| FAA benchmark enrichment | 16 | — | Post-fix run completed 16/16 with 0 errors: 10 social-only, 0 direct-contact candidates, 6 no usable contact outcomes; 431 durable evidence rows. Follow-up three-target claim-source canary: 3/3, 0 errors, 0/3 verified direct routes. |
| **Current verified state at last check** | **102 visible / 1 hidden** | **85** | API and Redis healthy; the controlled Western HNWI import inserted 99 records, skipped 1 duplicate, and had 0 errors. |
| **Current controlled development runtime** | **103 total / 58 HNWI** | **85** | 0 relationships and 0 active research sessions; the final Richard Leeds single-target canary completed with 0 errors and Atlas is idle. |

**Controlled-run state:** `ENABLE_AUTO_PIPELINE=false` remains set, so startup will not create a broad ingestion job. Populated databases still receive safe idempotent maintenance, while empty databases remain idle. The authorized Western HNWI import and final single-target Atlas run completed without interruption. The durable contact-promotion validator, current-run evidence boundary, active-job ownership guard, candidate-attribution gate, and Access/Signal separation remain in place.

**Atlas audit state:** Discovery admission and target processing are strictly sequential: each source may admit one candidate, that candidate is fully cooked before the next source starts, and final target review runs before research publication, contact promotion, and new asset publication. Broad search prompts constrain geography, person-level business evidence, and source quality while retaining selected global wealth hubs. The current API runtime reports Holehe, Maigret, and Sherlock available from `.pythonlibs/bin/python3`.

**Honest rating for this case study:** the API and web dashboard are healthy; targeted web research completed; official organization evidence was captured; collision-prone contact evidence and generated outreach remain manual-review only. The benchmark demonstrates correctness and provenance hardening, not 9/10 access quality. The stricter post-fix result is the authoritative benchmark result.

**Contact provenance state:** `entities.phone_source` is the nullable source-of-truth column for registry-phone classification. Legacy metadata markers were backfilled into this column, and 19 EDGAR/Companies House phone rows are organization-only with confidence 0 and `is_hot=false`. Generic HNWI search/page extraction is review-only `person_candidate` evidence unless an explicit target claim or exact fetched claim page establishes target-person scope.

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
| UI refresh | **HNWI-first responsive research desk** — dashboard prioritizes people cards, separate Signal/Access scoring, public contact-path cues, and real empty/loading/error states; desktop and mobile shell/navigation tuned without changing API routes or data behavior |
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
| J-1 (Phase J) | **J0 Measurement Contract + J1 Non-terminal social state** — `contactOutcome` column on entities (`none`/`evidence_only`/`social_only`/`organization_contact`/`direct_contact_candidate`/`direct_contact_verified`); `enrichment_runs` table for per-run funnel metrics; `computeContactOutcome()` in `contact-confidence.ts`; `GET /api/pipeline/funnel` with breakdown by registry/type; `POST /ingest/backfill-contact-outcomes`; FunnelPanel UI on Data Sources page. J1 fix: `needsEnrichment=false` only on email/phone — LinkedIn/Twitter no longer falsely mark entities as done. No research restrictions; production safeguards deferred to release-hardening. |
| J-2 (Phase J) | **Western registry coverage matrix** — live normalized search adapters for Norway BRREG, Czechia ARES, and France BODACC; provenance and identifier validation; fixture-style normalization tests; Data Sources coverage matrix with jurisdiction, access, freshness, ownership/officer scope, and non-blocking production review status. |
| J-3–J-9 (Phase J) | **Identity, domain, footprint, attribution, retry, graph, and source-quality hardening** — identity bundles/candidates remain review-only; domains and public digital footprints are resolved with cooldowns; contact attribution uses independent evidence dimensions; graph/MCTS paths carry provenance; source-quality/checkpoint APIs expose audit state. |
| Research provenance | **Fail-closed candidate evidence** — exact fetched page URLs and registry records are the provenance unit; flattened search snippets and aggregate AI extraction remain capped review signals; independent publisher domains corroborate, while contradictory values from one publisher remain disputed. |
| Username discovery | **Maigret primary + Sherlock fallback** — Sherlock is availability-checked and review-only, runs only when Maigret is unavailable/sparse, and cannot promote identity/contact fields or trigger automatic re-entry. |
| Atlas publication gate | **Final target-scoped web/LLM sanity review** — exact supplied evidence only; research-only targets cannot promote contacts; organization/person scope is enforced; rejected evidence and reasons remain reviewable. |
| Runtime verification | **Live Atlas run** — API/Redis healthy and Atlas idle; the final Richard Leeds target-scoped pass reported bounded access, 0 approved contacts, 5 reviewable candidates, and explicit `needs_follow_up`/`incomplete` state. Registry phones remain organization-only with zero personal confidence, and API validation passes 239/239 with the production build green. |

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

5. **Python OSINT tools MUST be installed and verified on every session start and after every re-import** (PERMANENT — survives repo re-imports):
   - The project uses the managed Python 3.11 module and `.pythonlibs/bin/python3` when available.
   - Run `bash scripts/install-python-tools.sh` immediately after `pnpm install` and `db push`.
   - Verify output/logs show `holehe: ✓`, `maigret: ✓`, and `sherlock: ✓` before triggering any research.
   - This is now also wired into `scripts/post-merge.sh` (step 4) and `startup.ts` (auto-installs on boot).
   - **The app must not begin research if any tool is not ready.** If tools are missing, run the install script and wait for it to complete before proceeding.

6. **The enrichment pipeline is flexible — not a strict linear sequence** (PERMANENT — survives re-imports):
   - **Web-OSINT runs FIRST** (it is the primary AI layer: Perplexity, Gemini, Tavily, Exa, Groq in parallel).
   - **In-house enrichment runs SECOND** to fill gaps from free sources (Wikidata, EDGAR, CH, DNS, RDAP).
   - **Maigret runs THIRD** (auto-triggered inside web-osint-enrich job) whenever a social handle is discovered.
   - **Web-OSINT re-runs** automatically if Maigret finds 3+ cross-platform profiles — Maigret output becomes extra context for the AI.
   - **Holehe runs in parallel with Maigret** whenever an email is known.
   - Any phase can be re-triggered at any point. Never treat the pipeline as one-way. New signals at any stage should feed back into earlier phases.
