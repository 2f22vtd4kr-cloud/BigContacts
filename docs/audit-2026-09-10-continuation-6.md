# Forensic continuation 6 — 2026-09-10

## Current tip

Latest verified main tip in this continuation: `7eb2bb3977c4eda017732908c4449bd2db4fcbd6`.

No CI/runtime success is claimed: the latest commit has no combined status entries and no PR-triggered workflow runs reported by the GitHub connector.

## Work completed in this continuation

### 1. Investigator identity-boundary regression guard

Added `scripts/check-investigator-identity-boundary.mjs`.

The guard checks the canonical `agentic-web-research-core.ts` for the known autonomy violation:

- deterministic proxy extraction inheriting `personName: targetName`;
- deterministic contact-facts extraction inheriting `personName: targetName`;
- ReAct footprint branches inheriting `personName: name`;
- target-inherited candidate scope paired with those identity assignments.

It also verifies that the existing `modelFindings` / explicit `action=done` boundary remains present.

The guard is wired into `check:bureau` via `package.json`.

**Important:** the guard is expected to fail until the canonical ReAct source is actually repaired. It is a regression barrier, not a source fix.

### 2. Surgical repair packet

Added `docs/INVESTIGATOR_IDENTITY_AND_FIRST_DECISION_REPAIR.md` with the exact intended source-level invariants for #120 and #136. It explicitly prohibits replacing the forced `web_search` with another deterministic first action and prohibits solving identity attribution by renaming deterministic findings.

### 3. Reconfirmed canonical control architecture

The canonical Atlas path currently creates a durable discovery case, persists assignment/trajectory, binds the Gemini-selected Investigator, and delegates transition choice to the AI control layer. `atlas-control-decision.ts` requires durable `caseId` and positive `controlTurn` and persists each control decision fail-closed.

The canonical single-target runner also mounts durable context before Investigator execution and preserves prior context on continuation.

### 4. Canonical case executor quarantine

A deeper audit found that `artifacts/api-server/src/src/routes/research/cases.ts` was not just a duplicate `runBroadDiscovery()` endpoint. It also contained direct Mistral web-search execution, deterministic target/company parsing, fixed registry selection/query construction, deterministic secondary-surface expansion, registry-officer expansion, and related mixed discovery orchestration.

The live canonical research router has now been structurally separated:

- `canonical-case-discovery.ts` owns model-directed discovery execution;
- `canonical-case-continuation.ts` owns model-directed continuation;
- `case-data.ts` owns only case creation/read/latest/events persistence surfaces;
- `legacy-case-execution-retirement.ts` returns HTTP 410 for the retired `initial-research`, `admit-candidate`, `promote-target`, and `run-boss-review` endpoints;
- the old `cases.ts` executor is no longer imported or mounted.

The old `cases.ts` file remains on disk temporarily as quarantine material for #129/#138 reachability cleanup. It is not part of the live canonical research graph.

The unified architecture guard now requires the data/retirement split and fails if the live research router imports or mounts `cases.ts`. It also rejects research execution logic inside the case-data router.

`check-retired-research-routes.mjs` was adjusted to distinguish an unmounted quarantine source file from a live caller. Remaining secondary-surface callers elsewhere remain separately tracked under #125/#126.

### 5. Reconfirmed remaining blockers

The active audit queue remains:

- **#120:** forced `web_search` opening seed in canonical ReAct core;
- **#128:** canonical Groq final-review fallback in `src/src/lib/ai-extractor.ts`;
- **#125/#126:** deterministic secondary-surface playbook and its SSRF boundary;
- **#129/#132:** duplicate/legacy source reachability and legacy ingest/enrichment quarantine;
- **#133:** institutional mission/bootstrap issue remains open pending formal reconciliation;
- **#136:** deterministic target-name identity attribution remains open;
- **#137/#138:** the old `cases.ts` executor is no longer live, but remains on disk for final quarantine/deletion/reachability cleanup;
- **#51:** performance/LLM quota optimization remains open and needs live telemetry validation.

## Connector limitation affecting implementation order

The canonical ReAct core is a large source file. The available GitHub file-update operation requires complete replacement content, while connector responses for this large blob are truncated. A previous placeholder replacement caused an unsafe commit and was immediately force-reverted in the earlier continuation. Therefore this continuation deliberately does **not** attempt another blind large-file rewrite.

The correct next source edit remains the surgical #120/#136 repair against the exact current blob, followed by the existing static guards and real runtime smoke. Do not mark either issue fixed from documentation or guard additions alone.
