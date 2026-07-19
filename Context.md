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
| `artifacts/api-server: API Server` | ✅ Running |
| `artifacts/apex-finder: web` | ✅ Running |
| `artifacts/apex-mobile: expo` | Not started (optional) |
| `artifacts/mockup-sandbox: Component Preview Server` | Not started (optional) |

### Database
- Schema pushed ✅ (`pnpm --filter @workspace/db run push`)
- **FAA**: ✅ Done — 12,902 inserted, 37,110 skipped (dedup — prior session keys in Upstash)
- **Land Registry**: ✅ Done — 50,000 inserted, 50,000 skipped (dedup)
- **Western HNWI**: 🔄 Running in background — ~600+ inserted so far, target 5,000. SEC EDGAR rate-limited (~1 req/s). Will continue until job completes.
- **Dashboard totals**: ~63,500 entities · ~62,900 assets · 5,151 hot leads · avg score 62.3%

> **Note on FAA count:** Only 12,902 of the prior 30,000 FAA records were re-inserted because 37,110 N-numbers from the previous session are still in the Upstash dedup set. The FAA registry itself is updated daily — the 12,902 are records not seen in the prior run. To get back to ~30,000 FAA records, run `DELETE /api/ingest/dedup` (clears Upstash), truncate the `entities` + `assets` tables, then re-ingest.

### What was done this session
1. `pnpm install` — 1,128 packages installed
2. DB schema pushed via `pnpm --filter @workspace/db run push`
3. All four artifacts registered with Replit platform
4. `postgresql-16` Nix module restored (platform had removed it during import)
5. API server and web frontend verified running — dashboard loads at `/`

### What's pending
- **Re-ingest data** — DB is empty after GitHub import. Run FAA, HMLR, and Western HNWI pipelines to repopulate. See replit.md → Ingestion Endpoints. Clear Upstash dedup first (`DELETE /api/ingest/dedup`) if you want a clean slate.

---

## Iteration Log

| Date | What changed |
|---|---|
| 2026-07-19 | Fresh GitHub import. Environment bootstrapped. DB empty. Upstash not connected. |
| 2026-07-19 | REDIS_URL_1 (Upstash) set and verified connected (`[upstash-1] Redis ready`). Dedup now persists across restarts. Ready for ingestion. |
| 2026-07-19 | Synthetic data purge: removed Math.random() jitter from graph path score (graph.ts), removed hardcoded "James"/"Captain" name fallbacks (pitch-generator.ts), replaced random skeleton widths with fixed value (sidebar.tsx). Added scripts/check-no-synthetic-data.sh — bans faker libs, Math.random() outside MCTS, lorem ipsum, seeding functions. Wired into post-merge.sh so every future merge is checked automatically. |
| 2026-07-19 | Ingestion run: FAA ✅ 12,902 inserted (37,110 deduped from prior Upstash session). LR ✅ 50,000 inserted (50,000 deduped). Western HNWI 🔄 running in background (~600+ so far, SEC EDGAR rate-limited). Dashboard live: ~63,500 entities, ~62,900 assets, 5,151 hot leads. |
| 2026-07-19 | Replaced MCTS Expert persona with Intel Systems Analyst (`intel_systems_analyst`). New persona covers the full hybrid stack: MCTS path coverage (Layer 1), hybrid search signal coverage / BM25+RRF anchors (Layer 2), agent orchestration pipeline completeness / Planner→Retriever→Analyst→Critic (Layer 3), Bayesian-UCB convergence / score-frozen detection (Layer 4). Updated persona-engine.ts, improvements.tsx, improvement_logs.ts schema comment. |
| 2026-07-19 | GitHub import re-setup: pnpm install, DB schema pushed, all 4 artifacts re-registered (verifyAndReplaceArtifactToml), API server + apex-finder web workflows running. Dashboard loads. DB empty — needs re-ingestion. |
| 2026-07-19 | REDIS_URL_1 (Upstash) set and verified connected (`[upstash-1] Redis ready`). Dedup state from prior sessions is live. Ready for ingestion. |
| 2026-07-19 | Query expansion (single-pass): added `expandQuery(query, plan)` to agent-orchestrator.ts. Appends asset synonyms (ASSET_EXPANSION), canonical location forms, name hints, and intent background terms to the raw query before hybridSearch. `expandedQuery` surfaced in RetrieverMeta + OrchestrationResult + UI Retriever step card. No iterative loop. |
| 2026-07-19 | Intel Systems Analyst persona updated: file header "Iterative Query Expansion" → "Single-pass query expansion"; Layer 2 block comment rewritten to describe expandQuery() mechanics (ASSET_EXPANSION, INTENT_EXPANSION, location forms, name hints); "query expansion stalled" suggestion retitled and description rewritten to explain the three concrete paths (SQL location ILIKE, asset synonym matching, TF-IDF cosine) through which sparse entities remain invisible. |

---

## Quick-Start Checklist (after any import)

1. `pnpm install`
2. `pnpm --filter @workspace/db run push`
3. Start workflows: Redis → API Server → apex-finder web
4. Verify `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET` are set
5. Set `REDIS_URL_1` (Upstash) before running any large ingestion
6. Run ingestion endpoints (see `replit.md` → Ingestion Endpoints)
