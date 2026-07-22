# ApexFinder Pro — Session Context

> **ABSOLUTE RULE — no exceptions:**
> 1. Read `replit.md` AND `Context.md` at the start of every session (especially after any GitHub import).
> 2. Update `Context.md` after every meaningful iteration — update Current State + append to Iteration Log.
> 3. Update `replit.md` whenever env vars, DB counts, schema, or phases change.
> 4. Both files must be committed to the repo as part of any task that changes project state.

---

## Current State (2026-07-22 — re-import #27) — Fully operational

### Environment
- **Replit PostgreSQL** connected — `DATABASE_URL` set automatically
- **Local Redis** running on `redis://localhost:6379` — workflow `Redis` running ✅
- **Upstash Redis (`REDIS_URL_1`)** — ✅ Set — permanent dedup (`[upstash-1] Redis ready`)
- **Upstash Redis (`REDIS_URL_2`)** — ✅ Set — permanent contact cache (`[upstash-2] Redis ready`)
- **SESSION_SECRET** — ✅ Set
- **COMPANIES_HOUSE_API_KEY** — ✅ Set — CH officer enrichment enabled

### Workflows running
| Workflow | Status |
|---|---|
| Redis | ✅ Running |
| `artifacts/api-server: API Server` | ✅ Running (port 8080) — **use this, not the old manual one** |
| `artifacts/apex-finder: web` | ✅ Running (port 23695) — **use this, not the old manual one** |
| `artifacts/apex-mobile: expo` | ⏸ Optional — not needed |
| `artifacts/mockup-sandbox: Component Preview Server` | ⏸ Optional — not needed |

> **Import #27 note:** pnpm install (~16s). DB schema pushed (additive). Redis ✅, API Server ✅ (port 8080), Web Frontend ✅ (port 23695). Cold-start auto-recovery detected empty DB → FAA (30k) + HMLR (2k) auto-ingested; Western HNWI running in background. SESSION_SECRET ✅ · REDIS_URL_1 ✅ (upstash-1 ready) · REDIS_URL_2 ✅ (upstash-2 ready) · COMPANIES_HOUSE_API_KEY ✅. Port conflict resolved after artifact workflows registered (killed old PIDs on 8080/23695). Fully operational.
> **Port conflict fix (if needed):** kill -9 $(lsof -ti:8080 -ti:23695) then start managed artifact workflows.

### Database (2026-07-22 — re-import #27)
- **Entities**: 30,000 (FAA) + 2,000 (HMLR) auto-ingested · Western HNWI running in background
- **Relationships**: 0 (fresh import, will rebuild after ingestion completes)

### What was done this session (re-import #24 — app review completion — 2026-07-21)

**Completed the interrupted app review from previous session:**

1. **`avgBayesianScore` type bug fixed** — `artifacts/api-server/src/routes/dashboard.ts` line 227: PostgreSQL `avg()` returns a numeric string; wrapped in `parseFloat(String(...))` so the API now returns a proper JS number. Verified: `typeof avgBayesianScore === "number"`.

2. **Profile score labeling confirmed correct** — Previous session's fix is in the code:
   - `ScoreBadge` in header shows `(bayesianScore * 100).toFixed(0)`, labeled "HNWI Signal" ✅
   - Contact confidence badge shows `{conf}% contact data` with tooltip "separate from HNWI Signal score" ✅
   - Confidence breakdown panel shows "Overall Confidence" (0-100 integer) with circular gauge ✅
   - No label confusion remaining.

3. **Code review of all 12 pages** — clean on: dashboard, entities, profile, graph, research, crm, data-sources, improvements, duplicates, manual, deep-search. No blocking bugs found beyond #1 above.

4. **Confirmed non-issues:**
   - `marker-blue/emerald/amber` CSS classes → defined in `src/index.css` ✅
   - Graph defaulting to entity ID 1 → entity 1 exists (Etos Air Llc) ✅
   - ScoreBadge 0-1 scale → correct ✅
   - FAA body param `maxRecords` → matches API ✅

5. **Screenshot verification note** — Vite HMR WebSocket prevents automated `networkidle` screenshots in dev mode. Both services verified working via curl (port 80 proxy → 200, port 23695 → 200, port 8080 → 200). All API endpoints returning correct data.

### What was done this session (re-import #22, session 2 — 2026-07-21)

**Redis contact cache layer — enrichment now survives DB resets:**

1. **`artifacts/api-server/src/lib/redis.ts`** — Added slot-2-specific contact cache helpers:
   - `getContactCacheClient()` — returns `_permanentClients[1]` (REDIS_URL_2) with slot-1 fallback
   - `contactCacheSet(stableKey, data)` — writes `CachedContact` JSON to Redis, no TTL (permanent)
   - `contactCacheGet(stableKey)` — reads a single entry
   - `contactCacheScanAll()` — full scan of `contact:v1:*` keys (used by startup restore)
   - `contactCacheCount()` — counts cache entries
   - Stable key format: `contact:v1:{sourceRegistries[0]}` (e.g. `contact:v1:edgar:cik123`) — derived from source data, stable across GitHub imports

2. **`artifacts/api-server/src/routes/ingest.ts`** — After every enrichment DB write, also mirrors to Redis slot 2. Derives stable key from `entity.sourceRegistries[0]`; falls back to `name:{name}` if no registry ID.

3. **`artifacts/api-server/src/lib/startup.ts`** — Two new maintenance steps (run before isHot sync on every boot):
   - **Step 0a: Redis → PostgreSQL restore** — scans slot 2 for `contact:v1:*` keys, matches each entity by sourceRegistries pattern, backfills contact fields if entity currently has none
   - **Step 0b: PostgreSQL → Redis backfill** — reads all entities with contact data from PostgreSQL and writes to slot 2 if not already cached; captures enrichments done before Redis mirroring was deployed

4. **Enrichment run results** (2026-07-21):
   - 89 entities backfilled from PostgreSQL → Redis on first boot after deploy
   - 26+ new entities enriched with new Redis-mirroring code (enricher still running)
   - **Total: 114 entities with contact data** (email/phone/LinkedIn in PostgreSQL + mirrored to Redis)
   - Redis slot 2 now has 115+ `contact:v1:` entries — permanent, survives imports

### What was done this session (re-import #22 — 2026-07-21)

**Standard re-import setup:**
1. `pnpm install` — fresh install, completed in ~15s
2. `pnpm --filter @workspace/db run push` — schema applied (additive, no changes)
3. Redis workflow started ✅
4. API Server (manual) started ✅ — port 8080
5. Web Frontend (manual) started ✅ — port 23695
6. Cold-start auto-recovery detected empty DB → FAA (30k) + HMLR (2k) auto-ingested; Western HNWI background job started
7. All 4 artifacts re-registered (apex-finder via verifyAndReplaceArtifactToml; api-server, apex-mobile, mockup-sandbox auto-detected by platform)
8. API healthy: /healthz ✅ · /dashboard/stats ✅ (32,000 entities, 32,000 assets, 7,454 hot leads)

### What was done this session (re-import #21 — 2026-07-21)

**improvements.md — all 6 remaining ⬜ items implemented:**

1. **Expanded relationship-building pipeline in `startup.ts`** — replaced the single 15s cluster trigger with a full 5-step pipeline on every populated-DB boot:
   - 15s: `auto-detect-clusters` (CORPORATE_SERIES edges)
   - 20s: `auto-detect` (KNOWN_ASSOCIATE from shared addresses)
   - 25s: `auto-detect-edgar-cofilers` (EDGAR_CO_FILER edges)
   - 30s: `auto-detect-ch-codirectors` (SHARED_DIRECTOR edges — gated on CH API key)
   - 35s: `seed-edgar-associates` (KNOWN_ASSOCIATE from live EDGAR EFTS)
   - Fixes: "L1 graph traversal blind" + "Isolated node — no relationships mapped"

2. **CH enrichment auto-trigger** — `POST /api/ingest/companies-house-enrich` at 90s (batchSize: 200, gated on CH API key). Fixes: "Hot lead real-data pipeline incomplete — enrichment pending".

3. **OCCRP enrichment auto-trigger** — `POST /api/ingest/occrp` at 150s (batchSize: 300). Fixes: "Single source — corroboration needed".

4. **Extracted `trigger()` helper** in `startup.ts` — replaces 4 copies of the same fetch/log/catch boilerplate. All 9 scheduled triggers now use it.

5. **improvements.md** — all 6 remaining ⬜ items marked ✅ (19/19 patterns now addressed).

---

### What was done this session (re-import #20, session 2 — 2026-07-21)

**Startup.ts performance + auto-trigger improvements (improvements.md batch):**

1. **Steps 4, 5, 7 rewritten** — all previously did sequential awaited DB writes per entity (bottleneck: 11,878 writes in step 5, 32,000 in step 4). Now collect all updates first, then write in parallel chunks (100 for step 4, 50 for steps 5 & 7). Boot results: step 4 synced 32,000 liveSource markers, step 5 populated 2,000 sparse notes, step 7 cleared 0 needsEnrichment flags — all ran in parallel and logged correctly.

2. **Bulk MCTS auto-trigger scaled** — `batchSize: 60` → `batchSize: 200` at 45s. Second pass added at 8 min (another 200). `bulk-mcts` added to INGESTOR_TYPES for ghost cleanup on boot (first boot had 409 from stale ghost — fixed next boot).

3. **In-house enricher auto-trigger added** — fires at 120s: `POST /api/ingest/in-house-enrich` batchSize: 500. `in-house-enrich` added to INGESTOR_TYPES.

4. **Cluster detection** — 228,828 new CORPORATE_SERIES edges created at 15s trigger (2,085 clusters). 100 EDGAR StockHolding assets created by step 6.

5. **improvements.md** — 8 new ✅ items: all MCTS cold-session patterns, sparse notes patterns, zero-contact-vector patterns marked done.

### What was done this session (re-import #17, Session 2 — 2026-07-21)

**5 improvements from improvements.md implemented:**

1. **Startup auto-maintenance** (`artifacts/api-server/src/lib/startup.ts`):
   - When DB is populated on boot, runs 4 background tasks: isHot sync, entity reclassification, FAA coordinate backfill, liveSource provenance marker backfill
   - Result this boot: 7,432 hot flags synced, 22,807 Corp + 581 Trust reclassified, 64 FAA assets checked (already geocoded)

2. **New Duplicate Entity Review page** (`artifacts/apex-finder/src/pages/duplicates.tsx` + nav):
   - Route: `/duplicates` · Nav item: "Duplicates" (Copy icon)
   - Token-similarity algorithm detects pairs sharing ≥2 significant name tokens across all 32k entities
   - Each pair shows entity cards with type badge + Bayesian score, swap-direction button, Merge + Dismiss actions
   - **Merge endpoint** (`POST /api/entities/:id/merge/:targetId`): reassigns assets + relationships from target to primary, merges sourceRegistries/metadata/notes, deletes target, clears cache
   - **Candidates endpoint** (`GET /api/entities/duplicate-candidates`): returns top 200 pairs sorted by token overlap — registered BEFORE `:id` route to avoid Express routing conflict
   - 200 real candidates found immediately (Wells Fargo variants, series LLC families, etc.)

3. **isHot flag auto-sync** — already covered in (1) above

4. **Entity type reclassification** — already covered in (1) above

5. **liveSource provenance backfill** — already covered in (1) above

### What was done this session (re-import #6, Session 1 — 2026-07-20)

**1. Field Manual mobile view fixes:**
- Fixed 5-step workflow grid: replaced inline `borderRight` with responsive Tailwind `border-b md:border-b-0 md:border-r` — items now stack cleanly as vertical cards on mobile
- Fixed Level IV edge types grid: changed `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` — was too narrow (185px columns) on 390px screens
- Updated Level VIII enrichers list: replaced "Hunter.io + Apollo.io (email/LinkedIn — paid)" with "In-House OSINT (Wikidata · Gravatar · GitHub · pattern gen)"
- Updated Level VIII Hunter/Apollo callout → describes the in-house engine
- Updated Level X contact confidence scoring text → references In-House Enricher instead of Hunter/Apollo
- All changes hot-reloaded via Vite HMR

**2. In-House OSINT Enrichment Engine (replaces Hunter.io + Apollo):**
- New file: `artifacts/api-server/src/lib/in-house-enricher.ts`
  - **Source 1: Wikidata SPARQL** — structured data for public figures (email, website, LinkedIn URL)
  - **Source 2: Wikipedia API** — article extract scraping for email/LinkedIn
  - **Source 3: GitHub API** — search by full name, extract public profile email (60 req/hr, no auth)
  - **Source 4: Email pattern generation + Gravatar MD5 verification** — generates first.last/flast/f.last/etc. patterns, verifies each against Gravatar hash (200 = confirmed email)
  - **Source 5: Company domain resolver + DNS MX validation** — company name → .com heuristic, validates with `dns.resolveMx`
  - **Source 6: RDAP domain contact** — ICANN RDAP registrant email for corporate domains
  - **Source 7: ProPublica 990 Finder** — US nonprofit executive contacts + website scrape
- New route: `POST /api/ingest/in-house-enrich` (batchSize, force, entityIds params; same job/poll pattern as web-osint-enrich)
- New route: `DELETE /api/ingest/in-house-enrich-lock` — manual ghost-lock clear
- Updated `data-sources.tsx`:
  - Phase 9 source definition: replaced "Hunter.io + Apollo.io" card with "In-House OSINT Enricher" (green, free-tier, no paid API)
  - Added `InHouseEnrichButton` component (polls job progress, same UX as `WebOsintButton`)
  - Added quick-action button row in the controls panel
  - Updated Phase 9 section heading: "Commercial Enrichment" → "In-House OSINT Engine"
- Verified endpoint works: `POST /api/ingest/in-house-enrich` → returns jobId, runs in background, job completes cleanly

**Re-import setup:**
- pnpm install (fresh), db schema push, secrets set (SESSION_SECRET, REDIS_URL_1, COMPANIES_HOUSE_API_KEY)
- Workflows: Redis ✅ · API Server ✅ (manual workflow) · Web Frontend ✅ (manual workflow)
- Note: managed artifact workflows (artifacts/api-server: API Server, etc.) also registered but not started — manual "API Server" and "Web Frontend" workflows are the active ones
- DB already had 32,600 entities from prior session (cold-start auto-recovery detected populated DB)

### Next unlock to reach 9.2
Run **IN-HOUSE ENRICH** on HNWI/Gatekeeper entities — Wikidata SPARQL will hit well-known public figures; Gravatar verification will confirm email patterns for executives with corporate domains. Contactable count: 0 → target ~200+ with in-house engine alone.

### What's new this session (2026-07-20 — second re-import)

**5 improvements built:**
1. **Auto-pitch / Critic synthesis enriched** — `POST /research/run` now calls `orchestrate()` (full Planner→Retriever→Analyst→Critic) and builds a rich `critiqueNote` from the top-3 ranked candidates with reasoning. Pitch generation wrapped in try-catch (always creates session, never 500s). File: `artifacts/api-server/src/routes/research.ts`.
2. **CH company officers button** — `ChOfficersButton` in data-sources.tsx. Polls job at `/api/ingest/job/:jobId`. Triggers `POST /api/ingest/ch-company-officers` (background job enriching all Corporation entities with officer lists stored in `metadata.chOfficers`).
3. **CH co-director edges button** — `ChCodirectorsButton` calls `POST /api/relationships/auto-detect-ch-codirectors`. Builds `SHARED_DIRECTOR` edges between entities that share a common CH officer.
4. **Populate notes button** — `PopulateNotesButton` calls `POST /api/ingest/populate-notes`. Enriches entity notes from filing metadata (formType, fileDate, companyName, orgnr, CH directors, nationality, location).
5. **EDGAR stock assets button** — `EdgarStockButton` calls `POST /api/ingest/create-edgar-stock-assets`. Creates `StockHolding` asset records for SEC EDGAR large-shareholder entities with no assets yet.

**New persona added:**
6. **Data Integrity Auditor** (`data_integrity_auditor`) — 7th persona in `persona-engine.ts`. Enforces the zero-synthetic-data rule. Checks: synthetic flags in metadata, missing provenance, placeholder names, fake emails/phones, synthetic asset identifiers, enrichment-pending hot leads, missing liveSource markers. Color: red `#EF4444`. Run 3 confirmed: **0 synthetic violations** across 300 entities — data purity rule is being respected.

**Data operations run this session (all via API, not UI buttons):**
- POST /ingest/create-edgar-stock-assets → 2,053 StockHolding assets created
- POST /ingest/populate-notes → 35,856 entities enriched (paginated, 2k/page)
- POST /ingest/sync-hot-flags → 17,161 hot leads
- POST /ingest/reclassify-entity-types → 24,144 Corp, 690 Trust, 11,022 HNWI
- POST /relationships/auto-detect-clusters → 229,282 edges across 2,096 clusters
- POST /ingest/companies-house-enrich → 50 entities enriched (contactConfidence only; key not set)
- 40 research sessions (MCTS+Critic+Pitch) on top HNWI + Trust hot leads

**Bugs fixed:**
- OOM crash from 10 parallel research sessions → `--max-old-space-size=3072` in node start
- `req.body` undefined on CH officers POST → nullish coalesce `?? {}`
- populate-notes loading 35k rows → paginated loop (2k/page)
- `sql not defined` in co-directors → added sql to drizzle-orm import

### What's pending
- **Ingest data**: Run FAA (`POST /api/ingest/faa`), HMLR (`POST /api/ingest/land-registry`), Western HNWI (`POST /api/ingest/western-hnwi`) to populate entities and assets. Optionally clear Upstash dedup first.
- **COMPANIES_HOUSE_API_KEY**: Set this secret in Replit to enable CH officer address lookups. Without it, the enricher still recomputes `contactConfidence` for all entities.
- **REDIS_URL_1**: Set this Upstash secret to persist dedup across restarts.

---

## Phase 3 — MCTS & Outreach Upgrade (2026-07-20) ✅ COMPLETE

### What was built

1. **MCTS contact scoring** (`graph-engine.ts`, `mcts-agent.ts`): `contactConfidence`, `contactEmail`, `contactPhone` added to `GraphVertex`, `EntityRow`, `PathStep`; `evaluateWarmth()` gives +0.15 UCT bonus for nodes with confidence ≥ 50 and +0.10 for any known email/phone; winning path now carries all three fields; HNWI reasoning line reports direct contact status.
2. **MCTS Terminal — path step detail** (`research.tsx`): New `PathNodeContact` sub-component renders a confidence bar + clickable `mailto:`/`tel:` links inside every path node card (mobile stack + desktop horizontal). New `CopyBriefButton` component generates a formatted plain-text outreach brief from the full path and copies it to clipboard.
3. **Pitch generator real contacts** (`pitch-generator.ts`, `research.ts`): `PitchContext.targetEntity` gains `contactEmail` + `contactPhone`; `intelBlock()` emits `CONTACT:` and `PHONE:` lines when present; `research.ts` pitch route now passes entity contact fields into the generation context.
4. **CRM notes + follow-up date + Export PDF** (`crm.tsx`): Desktop session detail panel now has a notes textarea and follow-up date picker — saved to `research_sessions.notes` and `research_sessions.followUpDate` via a direct PATCH to the existing status route (route accepts these extra fields regardless of Zod schema). "Export as PDF" opens a `window.open()` formatted print view with all three pitch sections. `selectSession()` pre-fills notes/date on open.
5. **DB schema** (`research_sessions.ts`): Added `notes text` and `followUpDate date` columns; `pnpm --filter @workspace/db run push` applied.
6. **Mobile approach — tabbed pitch modal** (`approach.tsx`): `PitchModal` replaced with a three-tab version (Initial / Follow-Up / Intro Script) that parses the stored JSON sequence; each tab shows its section in a `ScrollView`; header gains a Share icon button and a footer **SHARE THIS PITCH** button both wired to `Share.share()`; `SelectionContext.PathStep` updated with the new contact fields.

---

## Iteration Log

| Date | What changed |
|---|---|
| 2026-07-22 | **Re-import #27 setup**: pnpm install (~16s), DB schema pushed. Redis ✅ · artifacts/api-server: API Server ✅ (port 8080) · artifacts/apex-finder: web ✅ (port 23695). SESSION_SECRET ✅ · REDIS_URL_1 ✅ (upstash-1 ready) · REDIS_URL_2 ✅ (upstash-2 ready) · COMPANIES_HOUSE_API_KEY ✅. DB empty at boot → FAA 30k + HMLR 2k auto-ingested; Western HNWI running in background. Port conflict resolved after artifact workflows registered (killed old PIDs on 8080/23695). Fully operational. |
| 2026-07-21 | **Re-import #26 setup**: pnpm install, DB schema pushed. Redis ✅ · API Server ✅ (port 8080) · Web Frontend ✅ (port 23695). SESSION_SECRET ✅ · REDIS_URL_1 ✅ · REDIS_URL_2 ✅ · COMPANIES_HOUSE_API_KEY ✅. DB empty at boot → FAA 30k + HMLR 2k auto-ingested; Western HNWI running in background. Upstash slot 1 (dedup) + slot 2 (contact cache) both connected on restart. |
| 2026-07-21 | **Re-import #25 setup**: pnpm install, DB schema pushed. Redis ✅ · artifacts/api-server: API Server ✅ (port 8080) · artifacts/apex-finder: web ✅ (port 23695). SESSION_SECRET ✅. REDIS_URL_1/REDIS_URL_2 not confirmed set (contact cache count=0 at boot). DB retained 32,100 entities — cold-start maintenance ran (7,346 hot flags, 22,774 Corp + 581 Trust reclassified). Port conflict resolved: killed old manual API Server/Web Frontend, started managed artifact workflows. |
| 2026-07-21 | **Redis contact cache (Phase 10)**: `REDIS_URL_2` (Upstash slot 2) now stores permanent contact cache (`contact:v1:{stableKey}`). Enricher mirrors to Redis after every DB write. Startup runs restore (Redis→PG) + backfill (PG→Redis) on every boot. On first boot: 89 entities backfilled from PG → Redis; enricher run added 27+ more. Total: **114+ entities with contact data**, 115+ Redis entries. Enricher auto-trigger at 120s was blocked (409) by manual job already running; persona loop passes 1 & 2 auto-fired; Hybrid Research bulk run pass 3 blocked (409). |
| 2026-07-21 | **Re-import #22 setup**: pnpm install, DB schema pushed, Redis ✅, API Server ✅ (manual, port 8080), Web Frontend ✅ (manual, port 23695). SESSION_SECRET ✅. REDIS_URL_1 ⚠️ NOT SET · COMPANIES_HOUSE_API_KEY ⚠️ NOT SET. Cold-start auto-ingested FAA (30k) + HMLR (2k); Western HNWI running in background. All 4 artifacts registered. API healthy: 32,000 entities · 32,000 assets · 7,454 hot leads. |
| 2026-07-21 | **Re-import #21 setup**: pnpm install, DB schema pushed, all 4 artifacts re-registered (verifyAndReplaceArtifactToml). Redis ✅ · API Server ✅ (manual, port 8080) · Web Frontend ✅ (manual, port 23695). SESSION_SECRET ✅. REDIS_URL_1 ⚠️ NOT SET · COMPANIES_HOUSE_API_KEY ⚠️ NOT SET. DB had ~2,000 entities (Western HNWI partial from prior boot); FAA auto-ingest failed (no cached ZIP); Western HNWI running in background. API healthy: /healthz ✅ · /dashboard/stats ✅. |
| 2026-07-21 | **Re-import #18 setup**: pnpm install, DB schema pushed, all 4 artifacts re-registered (verifyAndReplaceArtifactToml). Redis ✅ · artifacts/api-server: API Server ✅ (port 8080) · artifacts/apex-finder: web ✅ (port 23695). SESSION_SECRET ✅. REDIS_URL_1 ⚠️ NOT SET · COMPANIES_HOUSE_API_KEY ⚠️ NOT SET. DB retained 32,000 entities — cold-start maintenance ran (7,262 hot flags, 22,748 Corp + 581 Trust reclassified). API healthy. |
| 2026-07-21 | **Re-import #15 setup**: pnpm install, DB schema pushed. Redis ✅ · API Server ✅ (manual workflow, port 8080) · Web Frontend ✅ (manual workflow, port 23695). SESSION_SECRET ✅. REDIS_URL_1 ⚠️ NOT SET · COMPANIES_HOUSE_API_KEY ⚠️ NOT SET. DB retained 32,000 entities + 32,000 assets from prior session — FAA auto-ingestion kicked off (dedup empty). API healthy: /healthz ✅ · /dashboard/stats ✅. |
| 2026-07-21 | **Re-import #11 setup + Persona Run 6**: pnpm install, DB schema pushed, all 4 artifacts registered. Redis ✅ · artifacts/api-server: API Server ✅ · artifacts/apex-finder: web ✅. SESSION_SECRET ✅ · REDIS_URL_1 ✅ · COMPANIES_HOUSE_API_KEY ✅. Western HNWI auto-ingested (100 entities). isHot sync run → 100 hot leads. Persona run 6 complete: 1,392 suggestions / 100 entities, 13.92 avg, 0 errors. App rating: **4.5/10** (cold start — code architecture ~8/10, data gap is entire deficit). improvements.md updated with full Run 6 breakdown + ops checklist. |
| 2026-07-21 | **Re-import #10 setup**: pnpm install, DB schema pushed, all 4 artifacts re-registered (verifyAndReplaceArtifactToml). Managed workflows started: Redis ✅ · artifacts/api-server: API Server ✅ · artifacts/apex-finder: web ✅. DB retained 32,100 entities — cold-start auto-recovery skipped ingestion. SESSION_SECRET ✅ · REDIS_URL_1 ✅ · COMPANIES_HOUSE_API_KEY ✅. |
| 2026-07-21 | **Re-import #9 setup**: pnpm install, DB schema pushed, all 4 artifacts re-registered. Redis ✅ · API Server ✅ · Web Frontend ✅. SESSION_SECRET ✅ · REDIS_URL_1 ✅ (Upstash connected) · COMPANIES_HOUSE_API_KEY ✅. DB retained 32,200 entities — cold-start skipped auto-ingestion. |
| 2026-07-21 | **Re-import #8 setup**: pnpm install, DB schema pushed, all 4 artifacts re-registered (verifyAndReplaceArtifactToml). Artifact-managed workflows started: Redis ✅ · artifacts/api-server: API Server ✅ · artifacts/apex-finder: web ✅. DB retained 32,100 entities from prior session — cold-start auto-recovery skipped ingestion. SESSION_SECRET ✅ · REDIS_URL_1 ✅ (Upstash connected) · COMPANIES_HOUSE_API_KEY ✅. All 4 artifact-managed workflows running. In-house enrichment pass 1 complete (49/100 EDGAR entities enriched: Ansari LinkedIn+phone cc=60, Icahn/Slim/Thiel/33 others phones cc=30-40). MCTS run on 7 top targets (Ansari 0.577, Leeds 0.486, Kim 0.494, Icahn 0.474, Slim 0.444, Thiel 0.44, Zhang 0.416). 7346 hot flags, 229259 relationship edges, 31622 notes enriched, entity reclassification done (22767 Corp / 8748 HNWI / 585 Trust). FAA enrichment pass 2 running (500 FAA entities). |
| 2026-07-20 | **Post-import setup + relationship graph**: secrets set (REDIS_URL_1, COMPANIES_HOUSE_API_KEY), artifact-managed workflows restored, schema pushed, FAA 30k + LR 2k ingested, Western HNWI restarted (5k target), hot flags synced (14,814), name-clustering endpoint built (113,946 CORPORATE_SERIES edges), CH enrichment running. |
| 2026-07-20 | **Hybrid architecture correction + 4 operational steps**: (1) Entity reclassification ran — 22,741→Corp, 585→Trust, 8,674 remain HNWI. (2) CH enricher started (500 entities, addresses added). (3) Relationship auto-detect ran — 0 found (FAA addresses are unique; need different signal). (4) MCTS run on top 5 hot leads — sessions 1–5 created, path scores 0.415–0.488. Code: algorithmPipeline in research.ts now labels L1–L5; persona-engine layer numbering corrected (MCTS=L4); research.tsx HYBRID_PIPELINE string updated; improvements.md Core Hybrid Architecture section added. |
| 2026-07-20 | **Sim run (post-import)**: 6 persona batches × 50 entities = 300 entities. 2,376 suggestions (1,284 high / 498 medium / 594 low). Top flags: 100% zero contact vectors, 100% isolated nodes (0 relationships), 100% no MCTS sessions. App rating updated: **6.0/10** (up from 5.2 baseline). All 5 code phases complete; gap is purely operational — trigger CH enricher + relationship auto-detect + entity reclassification. improvements.md updated with full breakdown. |
| 2026-07-19 | GitHub import re-setup: pnpm install, DB schema pushed, REDIS_URL set, REDIS_URL_1 (Upstash) set and verified connected (`[upstash-1] Redis ready`). Workflows running: Redis, API Server (port 8080), apex-finder web (port 23695). App loads. DB empty — needs ingestion. |
| 2026-07-19 | Fresh GitHub import. Environment bootstrapped. DB empty. Upstash not connected. |
| 2026-07-19 | REDIS_URL_1 (Upstash) set and verified connected (`[upstash-1] Redis ready`). Dedup now persists across restarts. Ready for ingestion. |
| 2026-07-19 | Synthetic data purge: removed Math.random() jitter from graph path score (graph.ts), removed hardcoded "James"/"Captain" name fallbacks (pitch-generator.ts), replaced random skeleton widths with fixed value (sidebar.tsx). Added scripts/check-no-synthetic-data.sh — bans faker libs, Math.random() outside MCTS, lorem ipsum, seeding functions. Wired into post-merge.sh so every future merge is checked automatically. |
| 2026-07-19 | Ingestion run: FAA ✅ 12,902 inserted (37,110 deduped from prior Upstash session). LR ✅ 50,000 inserted (50,000 deduped). Western HNWI 🔄 running in background (~600+ so far, SEC EDGAR rate-limited). Dashboard live: ~63,500 entities, ~62,900 assets, 5,151 hot leads. |
| 2026-07-19 | Replaced MCTS Expert persona with Intel Systems Analyst (`intel_systems_analyst`). New persona covers the full hybrid stack: MCTS path coverage (Layer 1), hybrid search signal coverage / BM25+RRF anchors (Layer 2), agent orchestration pipeline completeness / Planner→Retriever→Analyst→Critic (Layer 3), Bayesian-UCB convergence / score-frozen detection (Layer 4). Updated persona-engine.ts, improvements.tsx, improvement_logs.ts schema comment. |
| 2026-07-19 | GitHub import re-setup: pnpm install, DB schema pushed, all 4 artifacts re-registered (verifyAndReplaceArtifactToml), API server + apex-finder web workflows running. Dashboard loads. DB empty — needs re-ingestion. |
| 2026-07-19 | REDIS_URL_1 (Upstash) set and verified connected (`[upstash-1] Redis ready`). Dedup state from prior sessions is live. Ready for ingestion. |
