# ApexFinder Pro — Session Context

> **ABSOLUTE RULE — no exceptions:**
> 1. Read `replit.md` AND `Context.md` at the start of every session (especially after any GitHub import).
> 2. Update `Context.md` after every meaningful iteration — update Current State + append to Iteration Log.
> 3. Update `replit.md` whenever env vars, DB counts, schema, or phases change.
> 4. Both files must be committed to the repo as part of any task that changes project state.

---

## Current State (2026-07-19)

### Environment
- **Replit PostgreSQL** connected — `DATABASE_URL` set automatically
- **Local Redis** running on `redis://localhost:6379` — workflow `Redis` must be running
- **Upstash Redis (`REDIS_URL_1`)** — ✅ Set & connected (`[upstash-1] Redis ready`) — dedup state persists across restarts
- **SESSION_SECRET** — set ✅
- **COMPANIES_HOUSE_API_KEY** — not set (optional)

### Workflows running
| Workflow | Status |
|---|---|
| Redis | ✅ Running |
| `artifacts/api-server: API Server` | ✅ Running (port 8080) |
| `artifacts/apex-finder: web` | ✅ Running (port 23695) |
| `artifacts/apex-mobile: expo` | Not started (optional) |
| `artifacts/mockup-sandbox: Component Preview Server` | Not started (optional) |

### Database
- Schema pushed ✅
- **Entities**: ~110 (102 from prior western HNWI partial ingest + 8 manually seeded this session for persona simulation)
- **Assets**: 0 — large ingestors (FAA, HMLR) have NOT been run yet in this environment
- **Research sessions**: 1 (Viktor Aldenmoor, MCTS Path Selected, pathScore 0.427)
- **Improvement logs**: 67 (25 high · 27 medium · 15 low — all pending)
- **Hot leads**: 16 · avg Bayesian score ~92% (old ingested entities all share default 0.9434 score)

> **Note:** The DB figures (63,500 entities, 62,900 assets) in replit.md's "Current Data State" table are from a previous fully-ingested session. The current live environment has ~110 entities and 0 assets. Run the ingestion pipelines (FAA, HMLR, Western HNWI) to repopulate — clear Upstash dedup first if you want a clean slate.

### What was done this session (persona simulation + fixes)
1. Fixed `improve/run` SQL crash: `ANY(${entityIds})` → `inArray(entityIds)` in `improve.ts`
2. Seeded 8 representative test entities covering the full quality spectrum
3. Ran all 6 personas → 67 improvement suggestions generated (0 errors)
4. **Entity Ledger**: Contact Vector column now shows clickable `mailto:` / `tel:` / LinkedIn links; "No contact" shown in muted italic when empty (was: raw 80-char SEC prose)
5. **MCTS Terminal**: Added search bar + raised entity limit 30 → 500; `?entity=ID` URL param now correctly pre-selects target via `window.location.search`
6. **Profile page**: Prominent "Direct Contact Vectors" action bar added below header — email, phone, LinkedIn as separate clickable buttons
7. **CRM**: Lead Gen empty state now shows "→ Run MCTS on a target" prompt (both desktop and mobile)
8. **Persona engine**: Updated Intel Systems Analyst — file header, Layer 2 block comment, and "query expansion stalled" suggestion text to accurately reflect single-pass `expandQuery()` mechanics

### What's pending
- **Ingest data**: Run FAA (`POST /api/ingest/faa`), HMLR (`POST /api/ingest/land-registry`), Western HNWI (`POST /api/ingest/western-hnwi`) to populate entities and assets. Optionally clear Upstash dedup first.
- **Road to 10/10**: See `improvements.md` for the 5-phase improvement plan. Phase 1 (Contact Enrichment) is next.

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

---

## Quick-Start Checklist (after any import)

1. `pnpm install`
2. `pnpm --filter @workspace/db run push`
3. Start workflows: Redis → API Server → apex-finder web
4. Verify `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET` are set
5. Set `REDIS_URL_1` (Upstash) before running any large ingestion
6. Run ingestion endpoints (see `replit.md` → Ingestion Endpoints)
