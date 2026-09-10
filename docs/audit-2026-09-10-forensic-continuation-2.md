# Apex Atlas forensic continuation — 2026-09-10

## Status

**PRE-DEPLOYMENT / STATIC AUDIT CONTINUING / LIVE RESEARCH PROOF STILL REQUIRED**

Current `main` tip at this checkpoint:

`3fa406b252e5bea90f98f815e5f1d7de0e95538a`

No Replit runtime verification has been performed. No production provider/Redis/Postgres/browser-session proof is claimed.

## Work performed in this continuation

### 1. Atlas discovery is now explicitly durable

Canonical Atlas discovery now creates a `research_cases` discovery case before the Investigator starts and passes the resulting `caseId` into `runBureauAgenticWebPass`.

The discovery case records:

- Atlas job relation
- selected Groq/Mistral Investigator
- objective
- initial architecture/state
- assignment event
- actual bounded Investigator trajectory after completion
- search/visit/iteration/stop metadata

The trajectory is durable memory/state, not a deterministic research instruction set.

### 2. Bureau discovery wrapper has a containment bootstrap

`bureau-agentic-pass.ts` now has a narrow infrastructure fallback for the explicit `Discovery slot`: if a legacy discovery caller supplies a job ID but no case ID, the wrapper creates a durable discovery case rather than silently running context-free. Ordinary context-free target work remains fail-closed.

Canonical Atlas no longer relies on this fallback; it supplies the case ID explicitly.

### 3. Legacy deterministic MCTS/bulk research was actually unmounted from the live top-level research router

`artifacts/api-server/src/routes/research.ts` previously mounted:

- `mctsRouter`
- `bulkRouter`

Those routers exposed deterministic research control planes such as `/research/run` and `/research/bulk-run`.

They are now no longer mounted. Durable research-session views and outreach helpers remain mounted.

The legacy implementation files remain quarantined until reachability/deletion work is complete.

### 4. Static guards were strengthened

`check-unified-investigator-architecture.mjs` now requires:

- canonical Atlas discovery to pass a durable `caseId`
- the live legacy research router to stop mounting MCTS/bulk research

`check-retired-research-routes.mjs` now also detects:

- retired research task IDs in the operator UI
- live callers of `expandSecondaryPublicSurface()`
- direct `fetch()` inside the deterministic secondary-surface implementation

The guards intentionally remain strict. They must not be weakened to obtain green CI.

## CI observation

The latest observed GitHub Actions run for commit `3fa406b252e5bea90f98f815e5f1d7de0e95538a` completed **failure**. The architecture/source-parity and Atlas launch checks completed successfully; the API build step failed before workspace typecheck/provenance tests ran.

A prior run on `d558dbd181eeaf1630bad2b42a85ec5a8d5c5150` also failed at the API build step, before typecheck/provenance. Therefore the build failure predates the final guard-only commit and is not evidence that the latest architecture guard itself failed. Exact build-log text was not available through the connected GitHub read surface at this checkpoint.

Do not call CI green.

## Still-open architecture blockers

1. **#120 — forced initial ReAct observation** remains in `agentic-web-research-core.ts`. The first Investigator observation still mentions choosing `web_search`; this must be removed from the runtime itself, not merely hidden from a guard.
2. **#125 — deterministic secondary surface** remains reachable from canonical/legacy application callers. It must be retired as a research control plane; useful operations should survive only as explicit Investigator capabilities.
3. **#126 — secondary-surface transport** remains a parallel outbound web lane until #125 is retired or all surviving I/O is routed through canonical pinned-IP SSRF transport.
4. **#128 — canonical Groq final-review fallback** remains in `src/src/lib/ai-extractor.ts`. Do not reconstruct the large file from truncated connector output; use a safe small refactor/patch mechanism.
5. **#131 — browser/operator authentication** remains unresolved. Never expose `APEX_API_AUTH_TOKEN` to Vite/browser code. A real browser-safe operator session/auth contract is required.
6. **Duplicate `src/lib` vs `src/src/lib` tree** still requires reachability classification before deletion/quarantine.
7. **Operator UI** still contains retired research jobs and must be cleaned once its legitimate maintenance/research boundaries are confirmed.
8. **Startup scheduler** still needs a leaf-by-leaf reachability audit for stale legacy research calls.

## Architectural judgment

Apex remains correct only if deterministic infrastructure constrains the Investigator without deciding its research trajectory.

The desired invariant remains:

`Boss assignment → Investigator reason → model-selected capability → observation → model pivot → repeat/stop → explicit promotion → deterministic validation`

Not:

`application chooses search → application chooses source → application chooses pivot → LLM extracts result`.

The next work should continue from the current GitHub tip, not from historical commit hashes in older audit documents.
