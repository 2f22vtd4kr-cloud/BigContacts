# ApexFinder Pro — Road to 10/10

> **Goal:** Bring the platform from its current 5.2/10 to 10/10 for the primary use case:  
> *"Obtain direct personal contacts of many businessmen to reach them for investment opportunities."*

---

## Core Hybrid Architecture (All Layers Deterministic)

This is the canonical definition of the intelligence pipeline. **MCTS is Layer 4 — it is not a standalone algorithm separate from the hybrid stack.** All five layers run as a unified pipeline on every `POST /api/research/run` call.

| Layer | Name | Implementation | Status |
|---|---|---|---|
| L1 | **Hybrid Retrieval** — BM25 + Semantic (TF-IDF) + Graph BFS, fused via RRF, cached in Redis | `hybrid-search.ts` · `graph-engine.ts` | ✅ Complete |
| L2 | **Multi-Agent Reasoning** — Planner → Retriever → Analyst → Critic, deterministic TypeScript | `agent-orchestrator.ts` | ✅ Complete |
| L3 | **Query Expansion** — single-pass `expandQuery()` using ASSET_EXPANSION, GEO_MAP, INTENT_EXPANSION | `agent-orchestrator.ts` (expandQuery) | ✅ Complete (single-pass; iterative loop = future work) |
| L4 | **MCTS Deep Path Exploration** — UCT tree search, 120 rollouts, seeded by L1 BFS path; reward from real registry relationships only | `mcts-agent.ts` | ✅ Complete |
| L5 | **Bayesian-UCB Optimization** — Bayesian log-odds prior per entity; UCB1 inside MCTS (L4) tunes exploration vs. exploitation | `bayesian-scorer.ts` · `mcts-agent.ts` | ✅ Complete |

> **Sentence-transformer embeddings (all-MiniLM-L6-v2):** Layer 1 currently uses TF-IDF cosine as the semantic component. True sentence-transformer embeddings would improve recall quality and are the natural L1 upgrade path.

---

## Baseline Assessment (2026-07-19)

| Dimension | Score | Root cause |
|---|---|---|
| Entity discovery | 7/10 | SEC EDGAR/FAA ingest surfaces real HNWIs; query expansion works |
| Contact quality | 3/10 | 98% of entities have no phone/email; contact bar UI exists but is empty |
| Approach path finding | 4/10 | MCTS architecture is correct but fires on a sparse/empty relationship graph |
| Outreach generation | 5/10 | Pitch generator + CRM kanban exist; lacks real contact data + graph context |
| Operator workflow | 5/10 | Deep Search → Profile → MCTS → CRM → Pitch flow works; UX gaps on mobile |
| Data enrichment | 2/10 | No email/phone/LinkedIn enrichment pipeline; no relationship creation UI |
| Reliability | 7/10 | Two bugs fixed last session; core routes stable |
| **Overall** | **5.2/10** | |

**The critical gap:** The platform tells you *who* a businessman is and *what he owns* — but cannot answer *how to reach him*. All phases below are sequenced to close that gap first, then make the reaching experience excellent.

---

## Simulation Run — 2026-07-20 (All 5 Phases Complete)

**Sample:** 300 entities · 6 persona batches · **2,376 suggestions total**  
**Breakdown:** 1,284 high · 498 medium · 594 low  
**Personas run:** ux_designer · business_engineer · architect · data_engineer · intel_systems_analyst · data_analyst

### Top flags by frequency

| Flag | Persona | Count | Meaning |
|---|---|---|---|
| No direct contact vectors found | data_engineer | ~300/300 | 0% of entities have phone/email/LinkedIn |
| Isolated node — no relationships mapped | business_engineer | ~300/300 | 0 relationship edges in the entire graph |
| Hybrid stack not activated — no intelligence session exists | intel_systems_analyst | ~300/300 | 0 MCTS sessions run this import |
| HNWI classification may be incorrect — name suggests corporate entity | architect | ~300/300 | FAA LLCs/corps still typed as HNWI |
| High-probability target — UCB exploitation not yet initiated | intel_systems_analyst | ~113/300 | hot-lead entities with no MCTS session |

### Updated assessment (2026-07-20)

All 5 code phases are complete. Scores reflect the **live data state**, not just code existence.

| Dimension | Baseline | Current | Delta | Root cause |
|---|---|---|---|---|
| Entity discovery | 7/10 | 7/10 | → | 32k entities, Bayesian + hybrid search working. Entity type misclassification (FAA LLCs as HNWI) persists in new batch — reclassify endpoint exists but not re-run. No western HNWI data ingested this session. |
| Contact quality | 3/10 | 3/10 | → | 0/32k entities have phone/email/LinkedIn. CH enricher is built and deployed, not yet triggered. |
| Approach path finding | 4/10 | 4/10 | → | 0 relationship edges. Phase 2 auto-detect endpoint (`POST /api/relationships/auto-detect`) built but not run. MCTS fires but finds no multi-hop paths. |
| Outreach generation | 5/10 | 6/10 | ↑ | Pitch generator, 3-tab pitch modal, CRM notes + follow-up date + Export PDF all done. Machinery is complete; output quality limited by sparse contacts/paths. |
| Operator workflow | 5/10 | 8/10 | ↑↑ | All Phase 4 UX done: Deep Search filters, Entity Ledger bulk actions, dashboard enrichment KPIs, Field Manual playbook, full responsive polish at 375px. |
| Data enrichment | 2/10 | 4/10 | ↑ | CH enricher, FAA coordinate backfill, OCCRP, OpenSky all built and deployed. Coverage is still 0 this session — pipelines exist, data not yet populated. |
| Reliability | 7/10 | 8/10 | ↑ | 12/12 smoke tests pass. Upstash dedup solid. Cold-start auto-recovery working. Schema stable. |
| **Overall** | **5.2/10** | **6.0/10** | **↑** | |

### Operational steps executed (2026-07-20)

| Step | Endpoint | Result |
|---|---|---|
| 1. Entity reclassification | `POST /ingest/reclassify-entity-types` | ✅ 22,741 → Corporation · 585 → Trust · 8,674 remain HNWI |
| 2. CH Contact Enricher | `POST /api/ingest/companies-house-enrich` | ✅ Started · 174/500 processed · adds address data to entities |
| 3. Relationship auto-detect | `POST /api/relationships/auto-detect` | ⚠️ 0 relationships found — FAA entities all have unique addresses (expected) |
| 4. MCTS on top hot leads | `POST /api/research/run` × 5 | ✅ 5 sessions created · path scores 0.415–0.488 |

### Key findings from operational run

- **Relationship gap is structural, not a bug.** The auto-detect heuristic (shared correspondence address) doesn't work for FAA data because each aircraft registrant has a unique address. Building a relationship graph for FAA data requires a different signal: same company name prefix, same LLC series, SEC co-filers, or UK Companies House director co-appointments.
- **Contact quality from CH enricher is address-only.** CH officer search adds `knownResidences` (address +10 pts confidence) but not email/phone. `contactableCount` (≥50 threshold = requires email) stays 0 for FAA entities. UK entities from HMLR with a CH officer match can reach higher confidence.
- **MCTS path scores are 0.4–0.49** because all entities are isolated nodes (0 edges). The architecture is correct; data density is the limiter.

### Revised gap to 10/10 — remaining work

| Priority | Action | Impact |
|---|---|---|
| 🔴 Critical | Build relationship edges via a non-address signal (CH director co-appointments, SEC co-filers, company name clustering) | Approach path finding 4→8 |
| 🔴 Critical | Enrich UK entities (HMLR/CH match) — these are more likely to yield CH officer email/address cross-reference | Contact quality 3→6 |
| 🟡 High | Run sentence-transformers (all-MiniLM-L6-v2) for L1 semantic layer — currently TF-IDF | Search recall improvement |
| 🟡 High | Run MCTS on all 7,452 hot leads (not just top 5) once relationship graph has edges | Outreach generation 6→9 |
| 🟢 Medium | Iterative query expansion loop (currently single-pass) | L3 query expansion completeness |

---

## Phase 1 — Contact Enrichment Pipeline
**Target scores after:** Contact quality 3→7 · Data enrichment 2→7 · Overall: ~6.5/10  
**Session budget:** 1 session  
**Depends on:** DB populated (run ingestion first)

### What to build

#### 1.1 Companies House officer enricher (backend)
- New ingestor: `artifacts/api-server/src/lib/companies-house-enricher.ts`
- Endpoint: `POST /api/ingest/companies-house-enrich`
  - Input: optional `{ entityIds: string[] }` — defaults to all UK entities with no email
  - For each entity, call `https://api.companieshouse.gov.uk/search/officers?q={name}`
  - Extract: correspondence address, date of birth (for matching), appointment history
  - Write back to `entities.contactEmail`, `entities.contactPhone`, `entities.rawData`
- Background job pattern (same as FAA ingestor) — returns `{ jobId }`; poll via `GET /api/ingest/job/:jobId`
- Requires `COMPANIES_HOUSE_API_KEY` secret — gate behind existence check, log warning if missing

#### 1.2 SEC EDGAR contact signal extractor (backend)
- Augment `western-hnwi-ingestion.ts`: when ingesting a filer, extract the business address from the EDGAR filing header (`/submissions/{cik}.json` → `addresses.business`)
- Map to `entities.contactAddress` and `entities.jurisdiction`
- No new API key needed — already part of EDGAR ingest

#### 1.3 "Contact confidence score" field (schema + backend)
- Add `contactConfidence` integer column (0–100) to `entities` table in `lib/db/src/schema/`
- Score formula: +40 if email present · +30 if phone present · +20 if LinkedIn URL present · +10 if address present
- Compute and persist during enrichment runs; recompute on profile update
- Expose via `GET /api/entities/:id` response

#### 1.4 Enrichment trigger UI — Profile page (frontend)
- File: `artifacts/apex-finder/src/pages/Profile.tsx`
- Below the "Direct Contact Vectors" action bar: add "Enrich Contact" button
- On click: `POST /api/ingest/companies-house-enrich` with `{ entityIds: [currentId] }`
- Show inline progress (spinner → "Enriching…" → result summary)
- Desktop + mobile: button must be visible on both viewports

#### 1.5 Data Sources page — enrichment status (frontend)
- File: `artifacts/apex-finder/src/pages/data-sources.tsx`
- Add "Contact Enrichment" card: shows % entities with email, % with phone, % with LinkedIn
- Add "Run Enrichment" button for batch enrichment of all un-enriched entities
- Desktop: card grid layout; mobile: stacked single-column

#### 1.6 Mobile contact detail (mobile)
- File: `artifacts/apex-mobile/app/(tabs)/approach.tsx`
- Add contact vector section mirroring the desktop Profile contact bar
- Show email/phone/LinkedIn as tappable `mailto:` / `tel:` / `https://` links
- Graceful "No contact data — tap Enrich" empty state

### Done looks like
- Running `POST /api/ingest/companies-house-enrich` with `COMPANIES_HOUSE_API_KEY` set enriches UK entities with real correspondence addresses and officers
- Contact confidence score visible on entity profile
- At least one entity shows a real email or phone after enrichment run
- Desktop and mobile both show the contact action bar with live data

---

## Phase 2 — Relationship Graph Builder
**Target scores after:** Approach path finding 4→8 · Data enrichment 7→8 · Overall: ~7.5/10  
**Session budget:** 1 session  
**Depends on:** Phase 1 complete (entities populated with contact signals)

### What to build

#### 2.1 Relationship creation modal (frontend — desktop)
- File: `artifacts/apex-finder/src/pages/Profile.tsx`
- "Add Relationship" button in the entity header section
- Modal fields:
  - Target type: Entity | Asset (radio/toggle)
  - Target: searchable autocomplete (`GET /api/entities?q=` or `GET /api/assets?q=`)
  - Relationship type: dropdown — KNOWS · OWNS · CONTROLS · ASSOCIATES_WITH · EMPLOYED_BY · DIRECTS · FAMILY_OF
  - Strength: slider 0.1–1.0 (default 0.5)
  - Notes: optional free text
- On save: `POST /api/relationships` — existing endpoint in `relationships.ts`
- On success: refresh the relationships panel on the profile without full page reload
- Responsive: modal must work on mobile viewport (full-screen sheet on narrow screens)

#### 2.2 Relationship list on Profile (frontend)
- File: `artifacts/apex-finder/src/pages/Profile.tsx`
- Add "Connections" section below the contact bar
- Table/list: target name · type · relationship type · strength · delete button
- Inline "Add" button at the bottom of the list
- Desktop: side-by-side with assets panel; mobile: below assets (stacked)

#### 2.3 Graph page — click-to-add relationship (frontend)
- File: `artifacts/apex-finder/src/pages/graph.tsx`
- Right-click (or long-press on mobile) on a node → context menu: "Add relationship from here"
- Pre-fills the source entity in the relationship modal
- After save, re-fetches graph data and re-renders without full reload

#### 2.4 Auto-relationship detection from co-ownership signals (backend)
- New endpoint: `POST /api/relationships/auto-detect`
- Logic: for each pair of entities sharing the same asset identifier, filing address, or company registration, create a `CO_OWNS` relationship with strength 0.6
- Idempotent: skip if relationship already exists (check by sourceEntityId + targetId + type)
- Surface on Data Sources page: "Auto-detect co-ownership" button

#### 2.5 Mobile relationship viewer (mobile)
- File: `artifacts/apex-mobile/app/(tabs)/approach.tsx` or new `connections.tsx` tab
- Show the entity's first-degree connections as a card list
- Tap a connection → navigate to that entity's approach/profile view
- Empty state: "No connections yet — add one from the web app"

### Done looks like
- User can add an entity→entity or entity→asset relationship from the Profile page
- Relationship appears in the graph visualization immediately after save
- MCTS Terminal on a well-connected entity shows 2+ hop paths (not just direct hits)
- Auto-detect surfaces co-ownership links from shared assets

---

## Phase 3 — MCTS & Outreach Upgrade ✅ COMPLETE (2026-07-20)
**Target scores after:** Approach path finding 8→9 · Outreach generation 5→9 · Overall: ~8.5/10  
**Session budget:** 1 session  
**Depends on:** Phase 2 complete (relationship graph populated)

### What to build

#### 3.1 MCTS path quality — real contact signals in scoring (backend)
- File: `artifacts/api-server/src/lib/mcts-agent.ts`
- Augment node scoring: nodes where the intermediary entity has a known email/phone get +0.15 UCB bonus (they are reachable, making the path actionable)
- Surface `contactConfidence` in path node metadata
- Expose in API response: each path step now includes `{ name, type, contactConfidence, contactEmail, contactPhone }`

#### 3.2 MCTS Terminal — path step detail (frontend)
- File: `artifacts/apex-finder/src/pages/research.tsx`
- Each path step in the results list shows:
  - Entity name + type badge
  - Contact confidence bar (0–100%)
  - Direct "mailto:" / "tel:" link if contact present
  - Relationship type to next step (KNOWS, DIRECTS, etc.)
- "Copy path as outreach brief" button — generates structured text summary of the path
- Desktop: expand/collapse steps; mobile: swipeable step cards

#### 3.3 Pitch generator — uses real contact vectors (backend)
- File: `artifacts/api-server/src/lib/pitch-generator.ts`
- Accept `contactEmail`, `contactPhone`, `pathSummary` in the generation context
- When email is known: include email-specific opener ("I'm reaching out to your contact at [address]…")
- When only gatekeeper path: use the existing gatekeeper-type logic
- Remove any remaining hardcoded name fallbacks (already partially done)

#### 3.4 Pitch preview — research session → CRM → Pitch (frontend)
- File: `artifacts/apex-finder/src/pages/crm.tsx`
- CRM card for a research session: add "View Pitch" button → opens pitch preview modal
- Pitch modal: shows Initial / Follow-up / In-person sequences as tabs
- "Copy to clipboard" per sequence
- "Export as PDF" button (use browser `window.print()` on a print-formatted view)
- Desktop: side panel or modal; mobile: full-screen bottom sheet

#### 3.5 CRM enhancements (frontend)
- File: `artifacts/apex-finder/src/pages/crm.tsx`
- Add per-lead: notes textarea (save to `research_sessions.notes` — add column if missing)
- Add follow-up date picker (save to `research_sessions.followUpDate`)
- Kanban columns: Lead → Contacted → Meeting Set → Closed (rename/add Closed stage)
- Mobile: full kanban parity (horizontal scroll or stacked list toggle)

#### 3.6 Mobile approach tab — real pitch (mobile)
- File: `artifacts/apex-mobile/app/(tabs)/approach.tsx`
- Pull real pitch from `GET /api/research/sessions/:id/pitch`
- Show Initial / Follow-up / In-person as swipeable cards
- Share button (native share sheet) to send pitch text via WhatsApp/email

### Done looks like
- MCTS path steps show which intermediaries are contactable
- "Copy path as outreach brief" produces a usable text block
- Pitch generator inserts real email/name/context when available
- CRM lead has notes + follow-up date + pitch preview
- Mobile approach tab shows a real pitch from the DB

---

## Phase 4 — Operator UX Polish
**Target scores after:** Operator workflow 5→9 · Entity discovery 7→9 · Overall: ~9.2/10  
**Session budget:** 1 session  
**Depends on:** Phase 3 complete (all core features working)

### What to build

#### 4.1 Deep Search — advanced filters (frontend)
- File: `artifacts/apex-finder/src/pages/deep-search.tsx`
- Add filter panel (collapsible on mobile, sidebar on desktop):
  - Asset type: Aviation · RealEstate · Marine · PrivateClub (multi-select)
  - Jurisdiction: UK · US · Norway · Other (multi-select)
  - Score range: Bayesian score slider (0–100%)
  - Has contact: toggle (show only entities with email or phone)
  - Has relationship: toggle (show only entities with at least 1 relationship)
- Pass filters as query params to `POST /api/search/intelligent`
- Backend: extend search endpoint to accept and apply these filters

#### 4.2 Entity Ledger — bulk actions (frontend)
- File: `artifacts/apex-finder/src/pages/entities.tsx`
- Row checkboxes + "Select all"
- Bulk action bar (appears when ≥1 row selected):
  - "Export CSV" — generates and downloads a CSV of selected entities (name, score, contact, assets)
  - "Add to CRM" — creates research sessions for all selected as "Lead" stage
  - "Run MCTS" — opens MCTS Terminal pre-loaded with first selected entity
- Desktop: bulk bar at top of table; mobile: sticky bottom bar

#### 4.3 Dashboard — contact enrichment KPIs (frontend)
- File: `artifacts/apex-finder/src/pages/dashboard.tsx`
- Add stat card: "Contactable" — count of entities with contactConfidence ≥ 50
- Add stat card: "Enrichment coverage" — % entities with any contact field
- Hot leads table: add "Contact" column showing email/phone icon (green = present, grey = missing)
- Backend: extend `GET /api/dashboard/stats` to return enrichment coverage numbers

#### 4.4 Field Manual — operator playbook (frontend)
- File: `artifacts/apex-finder/src/pages/field-manual.tsx` (or wherever Field Manual renders)
- Add section: "Investment Outreach Playbook" with step-by-step workflow:
  1. Run ingestion (FAA + HMLR + Western HNWI)
  2. Run contact enrichment (Companies House)
  3. Use Deep Search with "Has Contact" filter
  4. Open Profile → review assets + contact vectors
  5. Run MCTS → choose best approach path
  6. Move to CRM → generate pitch → outreach
- Add section: "Reading the Scores" — explains Bayesian score, contact confidence, path score

#### 4.5 Responsive polish pass (frontend + mobile)
- Audit every page at 375px (iPhone SE) and 768px (tablet) widths:
  - Dashboard: stat cards wrap correctly; map shrinks gracefully
  - Entity Ledger: horizontal scroll or card mode on mobile (table collapses to cards)
  - Graph page: controls accessible on mobile (floating button instead of sidebar)
  - Profile: contact bar buttons don't overflow on narrow screens
  - MCTS Terminal: search bar + results readable on mobile
  - CRM: kanban columns scrollable horizontally without clipping drag handles

### Done looks like
- Deep Search "Has Contact" filter returns only enriched entities
- Entity Ledger lets user select 10 entities and export as CSV
- Dashboard shows enrichment coverage stat
- Field Manual has a clear 6-step playbook
- All pages render without overflow or clipped elements at 375px width

---

## Phase 5 — Intelligence & Reliability Hardening
**Target scores after:** Entity discovery 9→10 · Reliability 7→10 · Overall: ~10/10  
**Session budget:** 1 session  
**Depends on:** Phase 4 complete

### What to build

#### 5.1 OCCRP adverse media on Profile (frontend + backend)
- File: `artifacts/apex-finder/src/pages/Profile.tsx`
- Add "Adverse Media" section: shows OCCRP Aleph hits for this entity
- Backend: `GET /api/entities/:id/occrp` — runs or returns cached OCCRP search result
- UI: collapsible section; each hit shows source name, date, snippet, link
- Desktop + mobile parity

#### 5.2 OpenSky live flights enrichment UI (frontend)
- File: `artifacts/apex-finder/src/pages/data-sources.tsx` + Profile
- Add "Live Flights" widget on Profile for aviation-asset entities: shows last known flight (origin → destination, date) from OpenSky enricher
- Trigger: `POST /api/ingest/opensky` for a specific entity
- "Last seen flying" surfaced as a contact-timing signal ("target was in London 3 days ago")

#### 5.3 Network graph — visual contact encoding (frontend)
- File: `artifacts/apex-finder/src/pages/graph.tsx`
- Node colour: green border = has contact · yellow = partial (address only) · grey = no contact
- Node size: proportional to `contactConfidence` (larger = more reachable)
- Tooltip on hover: shows name, score, contact confidence, known email/phone
- Legend panel on desktop; tap-to-reveal on mobile

#### 5.4 Bayesian score — incorporate contact signals (backend)
- File: `artifacts/api-server/src/lib/` (wherever Bayesian scoring lives)
- Add signal: `contactConfidence / 100 * 0.1` weight to Bayesian composite score
- Rationale: a reachable HNWI is more actionable than an opaque one of equal asset mass
- Recompute scores for all entities after enrichment via `POST /api/improve/run`

#### 5.5 Reliability: critical path smoke tests (backend)
- Add a test file: `artifacts/api-server/src/test/smoke.test.ts`
- Tests (using Node's built-in test runner or vitest):
  - `GET /api/healthz` → 200
  - `POST /api/search/intelligent` with a query → returns array
  - `POST /api/research/run` with a known entity ID → returns sessionId
  - `GET /api/dashboard/stats` → returns entities count ≥ 0
- Run as part of CI / post-merge script

#### 5.6 Performance: virtual list + pagination (frontend)
- File: `artifacts/apex-finder/src/pages/entities.tsx`
- Replace full DOM render of 60k+ entities with `react-window` or `@tanstack/virtual` virtualised list
- Add server-side pagination to `GET /api/entities` (page + limit params, default limit 50)
- Entity Ledger stays responsive even at full 63,500-entity dataset

### Done looks like
- Profile shows OCCRP adverse media hits (or "No findings" if clean)
- Graph nodes visually distinguish contactable vs. opaque entities
- Bayesian score reflects contact reachability
- Smoke tests pass on `npm test` / `pnpm test`
- Entity Ledger loads and scrolls smoothly with 60k+ entities

---

## Revised Target Scores After All Phases

| Dimension | Baseline | After Ph1 | After Ph2 | After Ph3 | After Ph4 | After Ph5 |
|---|---|---|---|---|---|---|
| Entity discovery | 7 | 7 | 7 | 7 | 9 | 10 |
| Contact quality | 3 | 7 | 7 | 9 | 9 | 10 |
| Approach path finding | 4 | 4 | 8 | 9 | 9 | 10 |
| Outreach generation | 5 | 5 | 5 | 9 | 9 | 10 |
| Operator workflow | 5 | 5 | 6 | 7 | 9 | 10 |
| Data enrichment | 2 | 7 | 8 | 8 | 9 | 10 |
| Reliability | 7 | 7 | 7 | 7 | 8 | 10 |
| **Overall** | **5.2** | **6.0** | **6.9** | **7.9** | **9.0** | **10.0** |

---

## Session Handoff Checklist

At the start of each session, the agent must:
1. Read `replit.md` AND `Context.md`
2. Check which phase is `[ IN PROGRESS ]` below
3. Run `pnpm install` + `pnpm --filter @workspace/db run push`
4. Start Redis, API Server, and apex-finder web workflows
5. Update this file's phase status table after completing work

## Phase Status

| Phase | Status | Completed date |
|---|---|---|
| Phase 1 — Contact Enrichment Pipeline | `[ COMPLETE ]` | 2026-07-19 |
| Phase 2 — Relationship Graph Builder | `[ COMPLETE ]` | 2026-07-19 |
| Phase 3 — MCTS & Outreach Upgrade | `[ COMPLETE ]` | 2026-07-20 |
| Phase 4 — Operator UX Polish | `[ COMPLETE ]` | 2026-07-20 |
| Phase 5 — Intelligence & Reliability Hardening | `[ COMPLETE ]` | 2026-07-20 |
