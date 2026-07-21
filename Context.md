# ApexFinder Pro — Session Context

> **ABSOLUTE RULE — no exceptions:**
> 1. Read `replit.md` AND `Context.md` at the start of every session (especially after any GitHub import).
> 2. Update `Context.md` after every meaningful iteration — update Current State + append to Iteration Log.
> 3. Update `replit.md` whenever env vars, DB counts, schema, or phases change.
> 4. Both files must be committed to the repo as part of any task that changes project state.

---

## Current State (2026-07-21 — re-import #12) — Fully operational

### Environment
- **Replit PostgreSQL** connected — `DATABASE_URL` set automatically
- **Local Redis** running on `redis://localhost:6379` — workflow `Redis` running ✅
- **Upstash Redis (`REDIS_URL_1`)** — ⚠️ NOT SET this session — dedup won't persist across restarts
- **SESSION_SECRET** — ✅ Set
- **COMPANIES_HOUSE_API_KEY** — ⚠️ NOT SET this session — UK CH enricher skipped

### Workflows running
| Workflow | Status |
|---|---|
| Redis | ✅ Running |
| `API Server` | ✅ Running (port 8080) |
| `Web Frontend` | ✅ Running (port 23695) |
| `artifacts/apex-mobile: expo` | ⏸ Optional — not needed |
| `artifacts/mockup-sandbox` | ⏸ Optional — not needed |

### Database (2026-07-21 — re-import #12, DB data persisted from prior session)
- **Entities**: 32,000 (persisted — FAA + HMLR + EDGAR from prior session)
- **Assets**: 32,000 (persisted)
- **Relationship edges**: 0 (name-cluster detection not yet run)
- **Hot leads**: 7,454
- **Research sessions**: 0
- **Avg Bayesian score**: 0.6697
- **Contactable count**: 0
- **Enrichment coverage**: 0%

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

**Secrets:**
- `COMPANIES_HOUSE_API_KEY` — NOT yet in runtime env (requestSecrets called but form not submitted)
- `REDIS_URL_1` — NOT yet in runtime env

> **Post-import port-conflict pattern**: After killing the old "Start application" manual workflow, the Node/Vite processes linger. Always run `kill -9 $(lsof -ti:8080 -ti:23695)` before restarting artifact-managed workflows.

> DB was populated in a prior session and persisted through the GitHub import. Cold-start auto-recovery detected the populated DB and skipped auto-ingestion. To re-ingest, clear Upstash dedup first (`DELETE /api/ingest/dedup`) then POST to the ingest endpoints.

> To populate contact vectors and relationship edges: go to **Data Sources → Companies House Contact Enricher** and trigger it. The "Sync Hot Flags" button is also on that page alongside the enrichment coverage widget.

### Phase 5 — What was built (2026-07-20) ✅ COMPLETE

**5.1 OCCRP Adverse Media on Profile**
- Backend: `GET /api/entities/:id/occrp` — reads `entity.metadata.aleph`, returns sanctions/watchlist flags and dataset list.
- Frontend: "Adverse Media" card on Profile shows sanctions badge (red/green), dataset tags, Aleph URL, enriched-at timestamp.

**5.2 OpenSky Live Flights on Profile**
- Backend: `GET /api/entities/:id/opensky` — reads aviation assets with `metadata.opensky` flight data.
- Frontend: "Live Flight Intel" card on Profile shows per-aircraft callsign, altitude (ft), speed (knots), origin country, and ground/airborne status.

**5.3 Network Graph — contact encoding**
- `vertexToNode` in graph.ts now includes `contactConfidence` and `contactEmail` in each node.
- `drawContactRing` in graph.tsx draws a colored glow ring around entity nodes: green (≥70), amber (30–69), hidden (0). Wired via `nodeCanvasObjectMode="after"`.

**5.4 Bayesian Score — contact signals**
- Added `contactConfidence?: number` to `EntityScoringInput` in bayesian-scorer.ts.
- `buildSignals` adds `contact_high` (weight 0.7, LR 3.0) for ≥70% confidence and `contact_partial` (weight 0.4, LR 1.6) for ≥30%.
- `research.ts` passes `targetEntity.contactConfidence ?? 0` to `computeBayesianScore`.

**5.5 Smoke tests**
- vitest + supertest installed in api-server. 12/12 tests pass.
- Test file: `artifacts/api-server/src/test/smoke.test.ts` covers: healthz, entity list shape, entity list filters, dashboard KPIs, GET /occrp (valid + 400 + 404), GET /opensky (valid + 400), registry-search reachability.

**5.6 Entity Ledger pagination**
- `useListEntities` now uses `limit: 50, offset: page * 50`.
- Page state resets on filter/search changes.
- Desktop table footer replaced with Prev/Next pagination controls (Next disabled when fewer than 50 results returned).

### Phase 4 — What was built (2026-07-20) ✅ COMPLETE

**4.1–4.4 already implemented from prior sessions.** Phase 4 work this session = 4.5 responsive polish:

1. **Profile header nav** — Graph / MCTS / CRM / Connect buttons now visible on mobile as icon-only (removed `hidden md:flex`, added `hidden sm:inline` to text labels). `title` attrs added for touch accessibility.
2. **Profile contact bar** — Email button gets `max-w-[220px] truncate` + `min-w-0` so long email addresses don't overflow at 375px.
3. **Graph legend** — Hidden on mobile (`hidden md:flex`) when a node detail bottom sheet is open, preventing the legend from being obscured/overlapping.
4. **MCTS Terminal** — Terminal log entries changed from `flex-wrap` to `overflow-x-auto` with `whitespace-nowrap flex-shrink-0` on each token — preserves terminal aesthetic on narrow screens.
5. **Entity Ledger mobile** — `MobileEntityCard` now has a checkbox tap zone (left) + detail tap zone (right). Mobile bulk action bar added above card list when ≥1 row selected (Export CSV · Add to CRM · Run MCTS). Shared `selectedIds` / `toggleSelect` state with desktop table.

### What was done in prior sessions (persona simulation + fixes)
1. Fixed `improve/run` SQL crash: `ANY(${entityIds})` → `inArray(entityIds)` in `improve.ts`
2. Seeded 8 representative test entities covering the full quality spectrum
3. Ran all 6 personas → 67 improvement suggestions generated (0 errors)
4. **Entity Ledger**: Contact Vector column now shows clickable `mailto:` / `tel:` / LinkedIn links; "No contact" shown in muted italic when empty (was: raw 80-char SEC prose)
5. **MCTS Terminal**: Added search bar + raised entity limit 30 → 500; `?entity=ID` URL param now correctly pre-selects target via `window.location.search`
6. **Profile page**: Prominent "Direct Contact Vectors" action bar added below header — email, phone, LinkedIn as separate clickable buttons
7. **CRM**: Lead Gen empty state now shows "→ Run MCTS on a target" prompt (both desktop and mobile)
8. **Persona engine**: Updated Intel Systems Analyst — file header, Layer 2 block comment, and "query expansion stalled" suggestion text to accurately reflect single-pass `expandQuery()` mechanics

### What was done — Phase 1 (Contact Enrichment Pipeline) ✅ COMPLETE
1. **Schema**: `contactConfidence integer default 0` added to entities table; migration pushed via `pnpm --filter @workspace/db run push`
2. **`contact-confidence.ts`**: Pure utility — email+40, phone+30, linkedinUrl+20, knownResidences+10 → 0–100
3. **`companies-house-enricher.ts`**: Full enricher — CH `/search/officers` lookup (with API key) → extracts officer correspondence addresses → updates `knownResidences` + `nationality` + `contactConfidence`; gracefully skips CH if no key, still recomputes confidence
4. **`POST /api/ingest/companies-house-enrich`**: Background job route — `entityIds?`, `batchSize`, `force` params; 409 on duplicate; returns `{ jobId, pollUrl, note }`
5. **`GET /api/dashboard/stats`**: Now returns `contactableCount` (confidence ≥ 50) and `enrichmentCoverage` (% with any contact field)
6. **Profile page** (`profile.tsx`): Contact bar always visible (not conditional); contact confidence badge (0-100%) colour-coded; "Enrich" button → POST enrichment → polls job → refetches entity on done
7. **Data sources page** (`data-sources.tsx`): Enrichment Coverage Stats panel at top (live stats from dashboard); new "Companies House Contact Enricher" source card in Phase 1 section
8. **Mobile approach** (`approach.tsx`): `ContactVectorsStrip` component added — fetches entity contact data, renders email/phone/linkedin as `Linking.openURL()` tappable pills; graceful "No contact data" empty state

### What's pending
- **Ingest data**: Run FAA (`POST /api/ingest/faa`), HMLR (`POST /api/ingest/land-registry`), Western HNWI (`POST /api/ingest/western-hnwi`) to populate entities and assets. Optionally clear Upstash dedup first.
- **COMPANIES_HOUSE_API_KEY**: Set this secret in Replit to enable CH officer address lookups. Without it, the enricher still recomputes `contactConfidence` for all entities.
- **Road to 10/10**: Phase 1 ✅ Phase 2 ✅ Phase 3 ✅ → Phase 4 next (see `improvements.md`).

---

## Phase 3 — MCTS & Outreach Upgrade (2026-07-20)

### What was built

1. **MCTS contact scoring** (`graph-engine.ts`, `mcts-agent.ts`): `contactConfidence`, `contactEmail`, `contactPhone` added to `GraphVertex`, `EntityRow`, `PathStep`; `evaluateWarmth()` gives +0.15 UCT bonus for nodes with confidence ≥ 50 and +0.10 for any known email/phone; winning path now carries all three fields; HNWI reasoning line reports direct contact status.
2. **MCTS Terminal — path step detail** (`research.tsx`): New `PathNodeContact` sub-component renders a confidence bar + clickable `mailto:`/`tel:` links inside every path node card (mobile stack + desktop horizontal). New `CopyBriefButton` component generates a formatted plain-text outreach brief from the full path and copies it to clipboard.
3. **Pitch generator real contacts** (`pitch-generator.ts`, `research.ts`): `PitchContext.targetEntity` gains `contactEmail` + `contactPhone`; `intelBlock()` emits `CONTACT:` and `PHONE:` lines when present; `research.ts` pitch route now passes entity contact fields into the generation context.
4. **CRM notes + follow-up date + Export PDF** (`crm.tsx`): Desktop session detail panel now has a notes textarea and follow-up date picker — saved to `research_sessions.notes` and `research_sessions.followUpDate` via a direct PATCH to the existing status route (route accepts these extra fields regardless of Zod schema). "Export as PDF" opens a `window.open()` formatted print view with all three pitch sections. `selectSession()` pre-fills notes/date on open.
5. **DB schema** (`research_sessions.ts`): Added `notes text` and `followUpDate date` columns; `pnpm --filter @workspace/db run push` applied.
6. **Mobile approach — tabbed pitch modal** (`approach.tsx`): `PitchModal` replaced with a three-tab version (Initial / Follow-Up / Intro Script) that parses the stored JSON sequence; each tab shows its section in a `ScrollView`; header gains a Share icon button and a footer **SHARE THIS PITCH** button both wired to `Share.share()`; `SelectionContext.PathStep` updated with the new contact fields.

### Key file changes
| File | Change |
|---|---|
| `lib/db/src/schema/research_sessions.ts` | `+notes text +followUpDate date` |
| `artifacts/api-server/src/lib/graph-engine.ts` | Contact fields in GraphVertex + EntityRow + buildGraph |
| `artifacts/api-server/src/lib/mcts-agent.ts` | PathStep contact fields + UCT warmth bonus + HNWI reasoning |
| `artifacts/api-server/src/lib/pitch-generator.ts` | contactEmail/contactPhone in PitchContext + intelBlock |
| `artifacts/api-server/src/routes/research.ts` | Contact pass-through to pitch + notes/followUpDate in PATCH |
| `artifacts/apex-finder/src/pages/research.tsx` | PathNodeContact + CopyBriefButton components |
| `artifacts/apex-finder/src/pages/crm.tsx` | Notes textarea + follow-up date + Export PDF + selectSession() |
| `artifacts/apex-mobile/app/(tabs)/approach.tsx` | Tabbed PitchModal + Share.share() |
| `artifacts/apex-mobile/context/SelectionContext.tsx` | PathStep contact fields |

---

## Iteration Log

| Date | What changed |
|---|---|
| 2026-07-21 | **Re-import #12 setup**: pnpm install, DB schema pushed, all 4 artifacts auto-registered by platform. Redis ✅ · artifacts/api-server: API Server ✅ · artifacts/apex-finder: web ✅. SESSION_SECRET ✅. REDIS_URL_1 ⚠️ NOT SET · COMPANIES_HOUSE_API_KEY ⚠️ NOT SET. DB retained 32,000 entities + 32,000 assets from prior session. Old manual workflows killed; managed artifact workflows started. |
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
| 2026-07-19 | Query expansion (single-pass): added `expandQuery(query, plan)` to agent-orchestrator.ts. Appends asset synonyms (ASSET_EXPANSION), canonical location forms, name hints, and intent background terms to the raw query before hybridSearch. `expandedQuery` surfaced in RetrieverMeta + OrchestrationResult + UI Retriever step card. No iterative loop. |
| 2026-07-19 | Intel Systems Analyst persona updated: file header "Iterative Query Expansion" → "Single-pass query expansion"; Layer 2 block comment rewritten to describe expandQuery() mechanics (ASSET_EXPANSION, INTENT_EXPANSION, location forms, name hints); "query expansion stalled" suggestion retitled and description rewritten to explain the three concrete paths (SQL location ILIKE, asset synonym matching, TF-IDF cosine) through which sparse entities remain invisible. |
| 2026-07-19 | Full persona simulation run. Seeded 8 representative entities (Viktor Aldenmoor, Dominic Harcastle, Lars Eriksen, Brant Kellerman, Meridian Apex, Pierre-Henri Lascaux, Kestrel Trust, Chen). Fixed improve/run SQL bug (ANY→inArray). Ran all 6 personas → 67 suggestions (25 high, 27 medium, 15 low). Fixes applied: (1) entity ledger Contact Vector column now shows clickable mailto/tel/LinkedIn instead of raw prose, (2) MCTS terminal now has search bar + 500-entity limit instead of 30, (3) MCTS reads ?entity= URL param via window.location.search, (4) Profile page has prominent Direct Contact Vectors action bar with clickable email/phone/LinkedIn, (5) CRM Lead Gen empty state guides user to MCTS terminal. |
| 2026-07-20 | **GitHub import re-setup (5th)**: pnpm install, DB schema pushed, all 4 artifacts auto-registered. Secrets set: SESSION_SECRET ✅ REDIS_URL_1 ✅ COMPANIES_HOUSE_API_KEY ✅. Fixed build error: missing closing `}` in `runDataEngineer` (persona-engine.ts line ~198 — function body wasn't closed, only the inner if block). Stale Upstash dedup cleared (102,851 entries). FAA + LR + Western HNWI auto-ingestion started. App live at `/` and `/api`. |
| 2026-07-20 | **GitHub import re-setup (3rd)**: pnpm install, DB schema pushed, all 4 artifacts auto-registered by platform, SESSION_SECRET + REDIS_URL_1 + COMPANIES_HOUSE_API_KEY set. Stale dedup cleared (32,871 entries). FAA + LR + Western HNWI ingestion auto-started. App live at `/` and `/api`. Persona score at ~6.0 — Task #2 proposed to reach 9.2. |
| 2026-07-20 | **Phase 3 — MCTS & Outreach Upgrade complete**: contactConfidence/contactEmail/contactPhone flow from GraphVertex → PathStep → MCTS UCT bonus → pitch context → CRM intel block. research.tsx gains PathNodeContact bars + CopyBriefButton. crm.tsx gains notes textarea + follow-up date picker + Export PDF (window.open print). DB schema: notes + followUpDate columns added + pushed. approach.tsx PitchModal upgraded to tabbed view (Initial/Follow-Up/Intro Script) with Share.share() button. |
| 2026-07-19 | **Phase 1 — Contact Enrichment Pipeline complete**: (1) `contactConfidence` column added to entities schema + DB migrated; (2) `contact-confidence.ts` pure utility; (3) `companies-house-enricher.ts` — CH officer lookup + confidence recompute; (4) `POST /api/ingest/companies-house-enrich` background route with 409 conflict guard; (5) dashboard/stats now returns `contactableCount` + `enrichmentCoverage`; (6) profile page — contact bar always visible, confidence badge, Enrich button with job polling + entity refetch; (7) data-sources page — Enrichment Coverage Stats panel + CH enricher source card; (8) mobile approach screen — ContactVectorsStrip with Linking.openURL tappable email/phone/linkedin pills. |

---

## Quick-Start Checklist (after any import)

> **Most of this is now automatic.** After import, the only manual step is confirming secrets are set.

1. Confirm Replit Secrets are set: `SESSION_SECRET`, `REDIS_URL_1`, `COMPANIES_HOUSE_API_KEY`
2. Start workflows: `Redis` → `artifacts/api-server: API Server` → `artifacts/apex-finder: web`
3. API server startup auto-handles the rest:
   - Clears ghost active-job locks from any prior killed process
   - Detects empty DB → auto-starts FAA + Land Registry + Western HNWI ingestion
   - Upstash dedup persists across imports; FAA will insert 0 if prior session deduped it all
   - If FAA inserts 0: call `DELETE /api/ingest/dedup` to reset, then `POST /api/ingest/faa`

## Cold-Start Notes (for repeated GitHub imports)

### What persists across imports (lives in Replit, not the repo)
| What | Where | Notes |
|---|---|---|
| `SESSION_SECRET`, `REDIS_URL_1`, `COMPANIES_HOUSE_API_KEY` | Replit Secrets | Set once, survive every import |
| Upstash dedup set (`apex:dedup:hnwi`) | Upstash Redis | ~153k entries from prior sessions; blocks re-ingestion if not cleared |
| Upstash job state (`apex:job:*`) | Upstash Redis | Ghost jobs auto-cleared by startup.ts on each boot |
| PostgreSQL data | Replit DB | Survives imports but `drizzle-kit push` can wipe tables if schema drifts — push is additive for new columns/tables, destructive for removed ones |

### What does NOT persist (lost on each import)
| What | Notes |
|---|---|
| Artifact workflow registration | Re-registered automatically by Replit on import now |
| In-process ingestion jobs | Killed with old process; startup.ts detects and clears ghost locks |
| Local Redis cache | Ephemeral; rebuilt automatically on next API call |

### If FAA inserts 0 (all deduped)
The Upstash dedup set from prior sessions covers all 50k+ FAA records.
Fix: `curl -X DELETE http://localhost:8080/api/ingest/dedup` then restart API server (auto-ingestion fires again).
