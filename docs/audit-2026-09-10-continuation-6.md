# Forensic continuation 6 — 2026-09-10

## Current tip

Latest verified main tip in this continuation: `db5b06bc399f2fcd19fecb69433f6f07a5ea6f8e`.

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

### 4. Reconfirmed remaining blockers

The active audit queue remains:

- **#120:** forced `web_search` opening seed in canonical ReAct core;
- **#128:** canonical Groq final-review fallback in `src/src/lib/ai-extractor.ts`;
- **#125/#126:** deterministic secondary-surface playbook and its SSRF bypass;
- **#129/#132:** duplicate/legacy source reachability and legacy ingest/enrichment quarantine;
- **#133:** institutional mission/bootstrap issue remains open pending formal reconciliation;
- **#136:** deterministic target-name identity attribution remains open;
- **#51:** performance/LLM quota optimization remains open and needs live telemetry validation.

## Connector limitation affecting implementation order

The canonical ReAct core is a large source file. The available GitHub file-update operation requires complete replacement content, while connector responses for this large blob are truncated. A previous placeholder replacement caused an unsafe commit and was immediately force-reverted in the earlier continuation. Therefore this continuation deliberately does **not** attempt another blind large-file rewrite.

The correct next source edit remains the surgical #120/#136 repair against the exact current blob, followed by the existing static guards and real runtime smoke. Do not mark either issue fixed from documentation or guard additions alone.
