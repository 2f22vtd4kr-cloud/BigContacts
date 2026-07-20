# ApexFinder Pro — Session Context

> **ABSOLUTE RULE — no exceptions:**
> 1. Read `replit.md` AND `Context.md` at the start of every session (especially after any GitHub import).
> 2. Update `Context.md` after every meaningful iteration — update Current State + append to Iteration Log.
> 3. Update `replit.md` whenever env vars, DB counts, schema, or phases change.
> 4. Both files must be committed to the repo as part of any task that changes project state.

---

## Current State (2026-07-20) — Re-imported, Fully Running + Relationship Graph Live

### Environment
- **Replit PostgreSQL** connected — `DATABASE_URL` set automatically
- **Local Redis** running on `redis://localhost:6379` — workflow `Redis` must be running
- **Upstash Redis (`REDIS_URL_1`)** — ✅ Set & connected (`[upstash-1] Redis ready`)
- **SESSION_SECRET** — ✅ Set
- **COMPANIES_HOUSE_API_KEY** — ✅ Set (CH officer address enrichment enabled)

### Post-GitHub-Import Setup (2026-07-20 — this session)
All 4 artifacts re-registered (managed workflows restored automatically after artifact.toml files were detected). Port conflicts from orphaned processes cleared with `kill -9 $(lsof -ti:8080 -ti:23695)`.

### Workflows running
| Workflow | Status |
|---|---|
| Redis | ✅ Running |
| `artifacts/api-server: API Server` | ✅ Running (port 8080) — artifact-managed |
| `artifacts/apex-finder: web` | ✅ Running (port 23695) — artifact-managed |
| `artifacts/apex-mobile: expo` | Optional — not started |
| `artifacts/mockup-sandbox: Component Preview Server` | Optional — not started |

### Database (2026-07-20 — post ingestion)
- Schema pushed ✅
- **Entities**: 32,100 (FAA 30k + Land Registry 2k + Western HNWI 100+, still ingesting)
- **Assets**: 32,000
- **Hot leads**: 14,814 (synced with Bayesian ≥ 0.70)
- **Relationship edges**: 113,946 — **corporate name-series clustering (NEW)**
- **Contact vectors**: CH enricher running (~44% complete as of session end)
- **Research sessions**: 0 (ready for MCTS run)

### What's new this session
1. **Corporate name-series relationship graph** — `POST /api/relationships/auto-detect-clusters` added to `artifacts/api-server/src/routes/relationships.ts`. Strips legal suffixes (LLC, Inc, Holdings, etc.) and series indicators (I, II, III…) iteratively to find same-root clusters. Creates `CORPORATE_SERIES` edges (strength 0.85). Batch-inserts in chunks of 500. Generated 113,946 edges across 32k entities.
2. **Name Clusters button** in `artifacts/apex-finder/src/pages/data-sources.tsx` — `ClusterDetectButton` component in the Enrichment Coverage Stats panel.
3. **CH enrichment running** — COMPANIES_HOUSE_API_KEY set, background job active.
4. **Western HNWI running** — targeting 5,000 records (100 inserted so far, SEC EDGAR rate-limited).

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
| 2026-07-20 | **GitHub import re-setup**: pnpm install, DB schema pushed, all 4 artifacts re-registered (managed workflows active), SESSION_SECRET + REDIS_URL_1 (Upstash, 153k dedup entries) + COMPANIES_HOUSE_API_KEY set. FAA + Land Registry + Western HNWI ingestion jobs started. App live at `/` and `/api`. |
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
