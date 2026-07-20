# ApexFinder Pro — Session Context

> **ABSOLUTE RULE — no exceptions:**
> 1. Read `replit.md` AND `Context.md` at the start of every session (especially after any GitHub import).
> 2. Update `Context.md` after every meaningful iteration — update Current State + append to Iteration Log.
> 3. Update `replit.md` whenever env vars, DB counts, schema, or phases change.
> 4. Both files must be committed to the repo as part of any task that changes project state.

---

## Current State (2026-07-20)

### Environment
- **Replit PostgreSQL** connected — `DATABASE_URL` set automatically
- **Local Redis** running on `redis://localhost:6379` — workflow `Redis` must be running
- **Upstash Redis (`REDIS_URL_1`)** — ✅ Set & connected (`[upstash-1] Redis ready`) — dedup state persists across restarts
- **SESSION_SECRET** — set ✅
- **COMPANIES_HOUSE_API_KEY** — ✅ Set (CH officer address enrichment enabled)

### ⚠️ Workflow Note (post-GitHub-import)
Artifact registrations are NOT preserved through GitHub imports. After re-import, managed artifact workflows (`artifacts/api-server: API Server` etc.) no longer exist. **Manual workflows** are now configured in `.replit` instead:
- `API Server` → `PORT=8080 pnpm --filter @workspace/api-server run dev`
- `Web Frontend` → `PORT=23695 BASE_PATH=/ pnpm --filter @workspace/apex-finder run dev`

If artifact re-registration is needed in future, the artifact.toml files at `artifacts/*/. replit-artifact/artifact.toml` still contain the original config.

### Workflows running
| Workflow | Status |
|---|---|
| Redis | ✅ Running |
| `API Server` | ✅ Running (port 8080) |
| `Web Frontend` | ✅ Running (port 23695) |
| Expo mobile | Not started (optional) |
| Mockup sandbox | Not started (optional) |

### Database
- Schema pushed ✅ (2026-07-20)
- **Entities**: 0 — fresh import, DB is empty. Must re-run ingestion pipelines.
- **Assets**: 0
- **Research sessions**: 0
- **Improvement logs**: 0

> **Action required:** Run ingestion pipelines to populate data:
> 1. (Optional) Clear Upstash dedup: `DELETE /api/ingest/dedup`
> 2. FAA: `POST /api/ingest/faa` — ~73s for 30k records
> 3. HMLR: `POST /api/ingest/land-registry` — ~8min for 50k records  
> 4. Western HNWI: `POST /api/ingest/western-hnwi` — slow, background job
> 5. Companies House enrichment: `POST /api/ingest/companies-house-enrich`

### What was done this session (2026-07-20 import setup)
1. Imported from GitHub — pnpm install, DB schema push
2. Set secrets: `REDIS_URL_1` (Upstash dedup) and `COMPANIES_HOUSE_API_KEY`
3. Configured manual workflows for API Server (port 8080) and Web Frontend (port 23695)
4. All services verified: Redis ✅, Upstash ✅, API healthz ✅, Vite ✅
5. DB schema current — ready for ingestion

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
| 2026-07-20 | **Phase 3 — MCTS & Outreach Upgrade complete**: contactConfidence/contactEmail/contactPhone flow from GraphVertex → PathStep → MCTS UCT bonus → pitch context → CRM intel block. research.tsx gains PathNodeContact bars + CopyBriefButton. crm.tsx gains notes textarea + follow-up date picker + Export PDF (window.open print). DB schema: notes + followUpDate columns added + pushed. approach.tsx PitchModal upgraded to tabbed view (Initial/Follow-Up/Intro Script) with Share.share() button. |
| 2026-07-19 | **Phase 1 — Contact Enrichment Pipeline complete**: (1) `contactConfidence` column added to entities schema + DB migrated; (2) `contact-confidence.ts` pure utility; (3) `companies-house-enricher.ts` — CH officer lookup + confidence recompute; (4) `POST /api/ingest/companies-house-enrich` background route with 409 conflict guard; (5) dashboard/stats now returns `contactableCount` + `enrichmentCoverage`; (6) profile page — contact bar always visible, confidence badge, Enrich button with job polling + entity refetch; (7) data-sources page — Enrichment Coverage Stats panel + CH enricher source card; (8) mobile approach screen — ContactVectorsStrip with Linking.openURL tappable email/phone/linkedin pills. |

---

## Quick-Start Checklist (after any import)

1. `pnpm install`
2. `pnpm --filter @workspace/db run push`
3. Start workflows: Redis → API Server → apex-finder web
4. Verify `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET` are set
5. Set `REDIS_URL_1` (Upstash) before running any large ingestion
6. Run ingestion endpoints (see `replit.md` → Ingestion Endpoints)
