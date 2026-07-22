# ApexFinder Pro — Road to 9/10

> **Baseline:** 3.5/10 — Persona Run #1, 2026-07-22, 300 entities, 48,281 suggestions, 161 avg/entity
> **Target:** 9.0/10 across all personas
> **Auth:** excluded — personal use only, skip forever
> **Rule:** After EVERY repo import, run the Per-Import Checklist BEFORE starting new work.

---

## Per-Import Startup Checklist

*(Complete within 5 min of every import. Update Context.md after.)*

| # | Action | Command / How | Pass condition |
|---|---|---|---|
| 1 | pnpm install | `pnpm install` | Completes <30s |
| 2 | DB schema push | `pnpm --filter @workspace/db run push` | "Changes applied" or "No changes" |
| 3 | Redis workflow | Start "Redis" workflow | Workflow running |
| 4 | API Server | Start "API Server" workflow | Logs show `[upstash-1] Redis ready` + `[upstash-2] Redis ready` |
| 5 | Web Frontend | Start "Web Frontend" workflow | Port 23695 serving |
| 6 | Secrets check | Read API Server logs | REDIS_URL_1 ✅ · REDIS_URL_2 ✅ · COMPANIES_HOUSE_API_KEY ✅ |
| 7 | DB populated | `GET /api/dashboard/stats` | `totalEntities > 0` (FAA auto-ingest running if 0) |
| 8 | Relationships | Same stats call, wait 3 min | `totalRelationships > 200000` |
| 9 | Context.md | Append row to Iteration Log | Done before new work |

**If relationships = 0 after 3 min:** restart API Server — startup graph triggers refire on every boot.
**If entities = 0 after 15 min:** FAA stalled — trigger manually: `POST /api/ingest/faa`
**Port conflict:** `kill -9 $(lsof -ti:8080 -ti:23695)` then restart managed workflows.

---

## Score Tracker

| Phase | What it fixes | Target | Status | Date |
|---|---|---|---|---|
| Baseline | — | 3.5/10 | ✅ Measured | 2026-07-22 |
| A | Display & Classification | 5.0/10 | 🔄 In progress | 2026-07-22 |
| B | Contact Enrichment | 6.5/10 | ⬜ | — |
| C | Relationship Depth | 7.5/10 | ⬜ | — |
| D | Intelligence Activation | 8.5/10 | ⬜ | — |
| E | Net Worth & Final Polish | 9.0/10 | ⬜ | — |

**After each phase:** run `POST /api/improve/run-all` (`{"chunkSize":500}`) and wait. Check suggestion counts and overall rating in the response. Update Score Tracker when rating crosses target.

**Persona weight breakdown (what drives the score):**

| Persona | Weight | Primary flags |
|---|---|---|
| hybrid_architecture_auditor | 41% | MCTS cold, graph blind, L2/L4 never run |
| business_engineer | 24% | no relationships, no corporate linkage |
| data_engineer | 11% | no contact vectors, no corroboration |
| ux_designer | 9% | name display (ALL CAPS LAST FIRST), no geolocated assets |
| intel_systems_analyst | 7% | pipeline cold, UCT never exploited |
| architect | 7% | type contamination (banks as HNWIs), duplicates |
| data_integrity_auditor | <1% | clean — no action needed |

---

## Phase A — Display & Classification (3.5 → 5.0/10)

**Problem:** 30,000 FAA entities display as "SCHEUER WALTER" (title-cased LAST FIRST order). ~500+ banks, committees, and ETFs are classified as HNWI hot leads, polluting the dashboard with noise. Every profile page and every list looks broken at a glance.

**Personas addressed:** `ux_designer` (name display), `architect` (type contamination), `business_engineer` (hot leads noise)

---

### A1 — FAA Name Order: LAST FIRST → First Last
**Status:** ✅ 2026-07-22

**Files:**
- `artifacts/api-server/src/lib/faa-ingestor.ts` — `normalizeFaaName()` replaces `titleCase()` in parse loop
- `artifacts/api-server/src/routes/ingest.ts` — `POST /api/ingest/fix-faa-names` migration

**What:** FAA MASTER.txt stores all person names as "LASTNAME FIRSTNAME [MIDDLE]" in ALL-CAPS. At ingest time, `titleCase()` was applied: "SCHEUER WALTER" → "Scheuer Walter" — title-cased but order still wrong. Individual registrants (typeReg=1) need "Last First" → "First Last" reversal. Corporate registrants (LLCs, etc.) are title-cased only.

**How:**
1. Added `normalizeFaaName(rawName, typeReg)` in `faa-ingestor.ts`:
   - For typeReg="1" (individual): `titleCase()` then swap first-word (last name) to end
   - "SCHEUER WALTER" → "Scheuer Walter" → "Walter Scheuer" ✅
   - "LEEDS RICHARD BRIAN" → "Leeds Richard Brian" → "Richard Brian Leeds" ✅
   - "WELLS FARGO BANK NA" (typeReg="7") → "Wells Fargo Bank Na" (untouched) ✅
2. Replaced `titleCase(rawName)` → `normalizeFaaName(rawName, typeReg)` at parse loop
3. Added `POST /api/ingest/fix-faa-names`: reads all FAA entities, reapplies transformation to existing 30k records

**Run migration once:** `curl -X POST http://localhost:8080/api/ingest/fix-faa-names`

**Metric:** Profile pages show "Walter Scheuer", "Richard Leeds", "Craig Stapleton" — not "Scheuer Walter", "Leeds Richard Brian Et Al", "Stapleton Craig R"

---

### A2 — Extended Entity Type Classifier
**Status:** ✅ 2026-07-22

**Files:** `artifacts/api-server/src/lib/western-hnwi-ingestion.ts` — `classifyEntityType()`

**What:** Current classifier misses: BANCORP/BANCSHARES (banks), COMMITTEE/SHAREHOLDERS (political/governance), SEC state-of-incorporation suffixes (`/DE/`, `/NV/`), ticker symbols in parens `(HBB)`, `(KODK)`, and government/regulatory bodies.

**Patterns added:**
- `/\b(Banc(?:orp|shares?|o)?|Bancshares|Bank(?:ers?|corp)?)\b/i` → Corporation
- `/\b(Committee|Commission|Shareholders?|Congressional)\b/i` → Corporation
- `/\/[A-Z]{2}\/$/` → Corporation (SEC state suffix)
- `/\s+\([A-Z]{1,5}(?:-[A-Z]{1,3})?\)\s*$/` → Corporation (ticker symbol)
- `/\b(Federal|Municipal|County\s+of|City\s+of|State\s+of|Department\s+of|Dept\.?\s+of)\b/i` → Corporation

**Run reclassify after deploy:** `curl -X POST http://localhost:8080/api/ingest/reclassify-entity-types`
**Then re-sync hot flags:** `curl -X POST http://localhost:8080/api/ingest/sync-hot-flags`

**Metric:** reclassify shows HNWI count drops by 400–600 (banks + committees removed from hot leads)

---

### A3 — Run DB Migrations After A1+A2
**Status:** ✅ 2026-07-22

**Sequence (run in order after every import where names look wrong):**
```bash
# 1. Fix FAA individual name order (LAST FIRST → First Last)
curl -X POST http://localhost:8080/api/ingest/fix-faa-names

# 2. Re-run entity type classifier (catches BANCORP/COMMITTEE/ticker patterns)
curl -X POST http://localhost:8080/api/ingest/reclassify-entity-types

# 3. Re-sync isHot flags (banks/committees no longer qualify as hot leads)
curl -X POST http://localhost:8080/api/ingest/sync-hot-flags
```

**Skip if:** Names already show "First Last" order for FAA individuals (spot-check 5 entities on /entities page). Do not re-run fix-faa-names more than once per import — it would double-reverse already-fixed names.

**Guard:** `POST /api/ingest/fix-faa-names` checks `metadata.nameMigrated === true` before updating — safe to call idempotently.

---

## Phase B — Contact Enrichment at Scale (5.0 → 6.5/10)

**Problem:** Only 3–10 contactable entities out of 32,000. The in-house enricher is built and auto-runs, but coverage is low. FAA private individuals rarely have Wikidata/GitHub presence. EDGAR public figures have much higher hit rates.

**Personas addressed:** `data_engineer` (contact vectors), `business_engineer` (outreach paths), `intel_systems_analyst` (UCT warmth scoring)

---

### B1 — In-House Enricher Full Coverage
**Status:** 🔄 Auto-running (startup triggers: 120s EDGAR pass, 300s FAA pass, 600s EDGAR force, 1500s FAA force)

**Files:** `artifacts/api-server/src/lib/in-house-enricher.ts`, `artifacts/api-server/src/lib/startup.ts`

**What:** 7 free sources (Wikidata, Wikipedia, GitHub, Gravatar, domain DNS, RDAP, ProPublica 990). Auto-triggers cover all entity types over ~25 min. Contact cache (Upstash slot 2) mirrors every hit and restores on next import boot.

**Track progress:**
- `GET /api/dashboard/stats` → watch `contactableCount`
- API logs: "in-house enricher pass N" job IDs
- Target: **contactableCount > 200** after all 4 auto-passes complete (~25 min after boot)

**If stalled:** Check for ghost lock: `GET /api/ingest/job/list` — if stuck, `DELETE /api/ingest/in-house-enrich-lock`

**Post-import restore check:** After boot with REDIS_URL_2 set, API logs must show:
`"Maintenance: contact cache restore complete"` with `count > 0`
If `count = 0` after boot despite prior enrichment: investigate `contactCacheScanAll()` in `redis.ts`

---

### B2 — Net Worth Estimation from Asset Data
**Status:** ⬜

**Files:**
- `artifacts/api-server/src/lib/faa-ingestor.ts` — set `estimatedNetWorth` at ingest time
- `artifacts/api-server/src/routes/ingest.ts` — `POST /api/ingest/backfill-net-worth` (exists)

**What:** `estimatedNetWorth` is null for 99%+ of entities. FAA data includes aircraft class (Jet/Turbofan/Turboprop) and year. HMLR data has exact property prices.

**Aircraft valuation heuristics (net worth = 10× aircraft market value):**
| Class | Median market value | Net worth estimate |
|---|---|---|
| Turbofan (typeEngine=5) | $18M | $180M |
| Jet (typeEngine=4) | $12M | $120M |
| Turboprop (typeEngine=2) | $3M | $30M |
| Turboshaft/Helicopter (typeEngine=3) | $1.5M | $15M |
| Multi-engine (typeAircraft=5) | $400k | $4M |
| Rotorcraft (typeAircraft=6) | $800k | $8M |

**HMLR heuristic:** `estimatedNetWorth = propertyPrice × 5`

**Implementation:**
1. In `faa-ingestor.ts`, set `estimatedNetWorth` on each entity at parse time using aircraft class
2. In `land-registry-ingestor.ts`, set `estimatedNetWorth = price × 5` on each entity
3. Run `POST /api/ingest/backfill-net-worth` to apply to existing DB records

**Metric:** Profile "Estimated Net Worth" shows $XM for 90%+ of entities; dashboard sort by net worth is meaningful

---

### B3 — EDGAR Net Worth from SEC Filings
**Status:** ⬜

**Files:** `artifacts/api-server/src/lib/western-hnwi-ingestion.ts`

**What:** EDGAR SC 13D/13G filings report exact share counts. Shares × last-known price = minimum equity stake.

**Implementation:**
1. At EDGAR ingest time, store `metadata.sharesOwned` (already partially done for some filers)
2. After ingest: `POST /api/ingest/backfill-edgar-net-worth` — for entities with `metadata.sharesOwned` and `metadata.ticker`, fetch price from Yahoo Finance API (`https://query1.finance.yahoo.com/v8/finance/chart/{TICKER}?range=1d&interval=1d`, no key needed)
3. Set `estimatedNetWorth = sharesOwned × currentPrice`

**Metric:** EDGAR entities with estimatedNetWorth > 0 rises from ~0% to ~40%

---

## Phase C — Relationship Graph Depth (6.5 → 7.5/10)

**Problem:** 228,828 CORPORATE_SERIES edges exist but 97% of entities are still isolated because CORPORATE_SERIES only connects name-family clusters. FAA private individuals (30k) have no edges at all. HMLR property buyers (2k) have no edges. EDGAR entities have some edges via co-filer detection.

**Personas addressed:** `hybrid_architecture_auditor` (L1 graph blind — 97% isolated), `business_engineer` (no corporate linkage), `intel_systems_analyst` (UCT tree has no edges to traverse)

---

### C1 — FAA Geographic Proximity Edges
**Status:** ⬜

**Files:** `artifacts/api-server/src/routes/relationships.ts` — new endpoint `POST /api/relationships/auto-detect-faa-geo`

**What:** FAA individual aircraft owners in the same city+state share an airport, FBO, and likely social circles. Build GEOGRAPHIC_PEER edges between them.

**Algorithm:**
1. Query all FAA HNWI entities, extract city+state from `knownResidences`
2. Group by `"city,state"` key
3. For groups of 2–15 members: create `GEOGRAPHIC_PEER` edges between all pairs (skip >15 = too generic)
4. Skip Corporation/Trust entities
5. Store edge metadata: `{ type: "GEOGRAPHIC_PEER", source: "faa-geo-clustering", city, state }`
6. Cap at 500k new edges

**Add to startup.ts triggers:** Fire at 40s (before MCTS at 45s so graph is populated for UCT)

**Metric:** Isolated FAA individual count drops from ~97% to <50%

---

### C2 — HMLR Postcode District Proximity
**Status:** ⬜

**Files:** `artifacts/api-server/src/routes/relationships.ts` — extend auto-detect endpoint or add `POST /api/relationships/auto-detect-hmlr-postcode`

**What:** UK HMLR entities share a postcode district (first 3-4 chars, e.g. "SW1W", "W1K"). These are ultra-prime London/UK property buyers in the same postcode — meaningful peer signal.

**Algorithm:**
1. Query all HMLR entities, extract postcode from `knownResidences`
2. Group by postcode district (3-4 char prefix)
3. For groups of 2–10: create PROPERTY_AREA_PEER edges between all pairs
4. Store edge metadata: `{ type: "PROPERTY_AREA_PEER", source: "hmlr-postcode-clustering", postcode }`

**Metric:** HMLR entities with zero edges drops from ~100% to <40%

---

### C3 — EDGAR Co-Shareholder Depth
**Status:** ⬜

**Files:** `artifacts/api-server/src/routes/relationships.ts`

**What:** Expand existing EDGAR co-filer detection. Currently only detects entities that appear in the same filing document. Extend to also create edges when two entities hold shares in the same company (via `metadata.companyName` matching).

**Algorithm:**
1. Group all EDGAR entities by `metadata.companyName`
2. For each company with 2–20 entities: create EDGAR_CO_SHAREHOLDER edge between all pairs
3. Different from EDGAR_CO_FILER (same filing) — this is looser co-ownership signal

**Metric:** EDGAR entities with zero edges drops to <20%

---

## Phase D — Intelligence Activation (7.5 → 8.5/10)

**Problem:** MCTS bulk-run is triggered at 45s but 0 sessions consistently exist after import. The job fires but may conflict with other running jobs, or fire while FAA ingest is still in progress (FAA takes ~73s). This is the single biggest persona flag (100% of targets, 41% of all suggestions).

**Personas addressed:** `hybrid_architecture_auditor` (all 4 subflags), `intel_systems_analyst` (pipeline cold)

---

### D1 — Stabilise Bulk MCTS Auto-Trigger
**Status:** ⬜

**Files:** `artifacts/api-server/src/lib/startup.ts`

**Problem:** The 45s MCTS trigger fires before FAA ingest completes (~73s). So either: (a) it fires on a partial DB (good enough), or (b) it gets blocked by the running FAA job lock. Need to verify.

**Fix:**
1. Move MCTS auto-trigger from 45s → 90s (after FAA typically completes)
2. Add a check in `bulk-run` handler: if entity count < 1000, log warning and retry in 30s
3. Also fire a 2nd bulk-run pass at 5 min and 10 min (currently 8 min and 15 min — keep as is)

**Verify working:**
```bash
# Manual trigger (5 entities only — test)
curl -X POST http://localhost:8080/api/research/bulk-run \
  -H "Content-Type: application/json" \
  -d '{"batchSize":5,"skipExisting":true}'
# Poll result
curl http://localhost:8080/api/research/sessions
```

**Metric:** `GET /api/research/sessions` returns >0 sessions within 5 min of trigger

---

### D2 — Scale MCTS Coverage to 1000+ Sessions
**Status:** ⬜

**Files:** `artifacts/api-server/src/lib/startup.ts`

**What:** Once D1 is stable, ensure 5 auto-passes cover 1000+ hot leads. Current schedule: 45s(300), 8min(300), 15min(300). Add: 20min(300), 30min(300) = 1500 total potential sessions.

**Constraint:** Max 5 parallel MCTS sessions (see memory note on MCTS parallel limit). `bulk-run` runs them sequentially — this is correct.

**Metric:** `activeResearchSessions > 500` after 30 min of uptime

---

### D3 — Verify Pitch Generation End-to-End
**Status:** ⬜

**Files:** `artifacts/api-server/src/routes/research.ts`, `artifacts/api-server/src/lib/pitch-generator.ts`

**What:** Research sessions must produce non-null `pitchSequence` and `critiqueNote`. These are the product's core output — a session without a pitch is incomplete.

**Check:** Query DB directly or via `GET /api/research/sessions` — what % of sessions have pitchSequence populated?

**If pitches are missing:** Check `research.ts` — the `orchestrate()` call wraps Planner→Retriever→Analyst→Critic→Pitch. If it throws on entities with minimal data (no notes, no assets), add fallback pitch generation.

**Metric:** 80%+ of research sessions have non-null `pitchSequence`

---

## Phase E — Net Worth, Profile Depth & Final Polish (8.5 → 9.0/10)

**Problem:** Profile pages show null net worth, sparse notes, no meaningful outreach metrics. The remaining 1.5 rating points come from filling data depth and polishing the output quality.

**Personas addressed:** `ux_designer` (profile completeness), `business_engineer` (outreach metrics), `data_engineer` (data depth)

---

### E1 — Profile Completeness Score
**Status:** ⬜

**Files:** `artifacts/apex-finder/src/pages/profile.tsx`

**What:** Show a profile completeness indicator (0–100%) on each entity profile. Fields: name ✅, type ✅, nationality, estimatedNetWorth, contactEmail, contactPhone, linkedinUrl, assets (≥1), relationships (≥1), researchSession (≥1).

**Why:** Operators immediately know what gaps remain and where to focus enrichment effort.

**Implementation:** Small component — `ProfileCompleteness({ entity, hasAssets, hasRelationships, hasSession })` returning a progress bar + checklist popover.

---

### E2 — Deduplication Pass on Top 200 Pairs
**Status:** ⬜

**Files:** `artifacts/apex-finder/src/pages/duplicates.tsx` (UI exists), `POST /api/entities/:id/merge/:targetId` (endpoint exists)

**What:** The Duplicates page (`/duplicates`) is built. Run a manual review pass on the top 200 candidate pairs and merge confirmed duplicates. Wells Fargo variants, EDGAR series LLCs, and HMLR/EDGAR name overlaps are the main sources.

**How:** Open `/duplicates` in the app and work through the list — merge obvious matches, dismiss false positives.

**Metric:** Duplicate candidate count drops by 50%+; entity count drops by ~100–300 (merged pairs)

---

### E3 — Search Result Quality: HNWI-First Default
**Status:** ⬜

**Files:** `artifacts/api-server/src/routes/search.ts`, `artifacts/apex-finder/src/pages/deep-search.tsx`

**What:** Intelligent search (`POST /api/search/intelligent`) returns Corporation entities mixed with HNWIs. Default search in the UI should surface individuals first.

**Implementation:** Add `preferredType: "HNWI"` bias in the RRF score weighting — boost HNWI/Gatekeeper entities by 0.1 in the final ranking unless user explicitly searches for a company name.

---

### E4 — App Store / Data Sources UX: Progress Visibility
**Status:** ⬜

**Files:** `artifacts/apex-finder/src/pages/data-sources.tsx`

**What:** Data Sources page should show live progress numbers: "Contactable: 10 → 200 target", "Sessions: 0 → 500 target", "Edges: 228k → 500k target". Makes the enrichment pipeline feel alive rather than invisible.

**Implementation:** Pull numbers from `GET /api/dashboard/stats` and display as progress bars with targets.

---

## Completed (Phase 0 — Prior Sessions)

All 19 patterns from Persona Run #1 (covers 200 entities, 2026-07-21) are ✅. See legacy section below for details.

These addressed: auto-maintenance pipeline (startup.ts), duplicate detection, EDGAR stock assets, populate-notes, isHot sync, entity reclassification, liveSource provenance, MCTS/bulk-run auto-trigger, L1 graph traversal fix, in-house enricher, Redis contact cache.

---

## Legacy Patterns (all ✅ — do not re-implement)

> See git history for full details. All 19 patterns implemented 2026-07-19 to 2026-07-21.

| Pattern | Status | Fixed by |
|---|---|---|
| Hybrid stack not activated | ✅ | startup.ts bulk-run at 45s |
| L4 UCT never run | ✅ | startup.ts bulk-run at 45s |
| L2 pipeline cold | ✅ | startup.ts bulk-run at 45s |
| L1 graph blind | ✅ | startup.ts 5-step relationship pipeline (15–35s) |
| L1 BM25 near-zero | ✅ | startup.ts step 5 (sparse notes fill) |
| isHot flag out of sync | ✅ | startup.ts step 1 (hot flag sync) |
| No contact vectors | ✅ | startup.ts in-house enricher at 120s |
| Digital vectors missing | ✅ | startup.ts in-house enricher at 120s |
| Isolated node | ✅ | startup.ts relationship pipeline |
| No corporate linkage | ✅ | startup.ts EDGAR co-filer + cluster detection |
| No geolocated assets | ✅ | startup.ts FAA coord backfill |
| Hot lead enrichment pending | ✅ | startup.ts CH enricher at 90s |
| Profile notes sparse | ✅ | startup.ts step 5 (populate notes) |
| Potential duplicate | ✅ | /duplicates page + merge endpoint |
| HNWI zero assets | ✅ | startup.ts step 6 (EDGAR stock assets) |
| Single source | ✅ | startup.ts OCCRP (disabled — 401) |
| liveSource missing | ✅ | startup.ts step 4 (provenance backfill) |
| Corporate no edges | ✅ | startup.ts cluster detection at 15s |
| High score not hot | ✅ | startup.ts step 1 |
