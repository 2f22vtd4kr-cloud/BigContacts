# Apex Atlas forensic continuation — 2026-09-10 · control durability

## Work completed in this continuation

### 1. Atlas control decisions are now durable case state

`atlas-control-decision.ts` now persists each Gemini Boss control decision to the durable discovery case:

- `eventType = control_decision`
- action
- selected candidate
- direction/pivot
- rationale
- confidence
- Boss model/error state
- full DeepSeek/NVIDIA Right-hand state
- control-turn number

A bounded `atlasControlDecisions` history is also retained in the discovery case file. Persistence is fail-closed: if the case cannot be read or the durable write fails, the decision call throws rather than silently continuing with process-only state.

### 2. Canonical Atlas binds the decision to its actual case

`canonical-atlas-discovery.ts` now passes:

```text
caseId: discoveryCaseId
controlTurn: controlTurns
```

to every Atlas control decision. This is explicit value propagation, not inferred job state.

### 3. Regression guard

Added `scripts/check-atlas-control-durability.mjs` and wired it into root `check:bureau`. It verifies the persistence event, control fields, Right-hand state, fail-closed behavior, and canonical caller propagation.

### 4. Issue state

- **#134** — closed: AI owns discovery→target/revisit/pivot/stop transition.
- **#135** — closed: control decisions are durable case memory.
- **#120** — still open: canonical ReAct core still forces initial `web_search`.
- **#125/#126** — still open: deterministic secondary-surface playbook and direct outbound fetching.
- **#128** — still open: canonical Groq final-review fallback.
- **#129/#132** — still open: duplicate source-tree / legacy ingest-enrichment reachability work.

## New finding from continued audit

The target Investigator itself is correctly fail-closed without durable `contextDocument`, and the canonical single-target runner supplies it. The remaining major autonomy blockers are therefore concentrated in the actual shared ReAct opening (#120) and the deterministic secondary-surface callers (#125/#126), followed by the canonical reviewer role violation (#128).

The legacy `atlas-orchestrator.ts` still contains the old multi-phase machinery, but the public Atlas launch route is canonical and its architecture guard verifies that it does not import the legacy orchestrator. Do not delete the legacy module until all non-launch reachability and compatibility callers are classified.

## Verification truth

GitHub reports no combined status checks for the current `main` tip `aacb2f82e0ec9683b0cb0fd4e9a7d7081f7ed049`. No runtime/Replit success is claimed.

The next implementation target remains the actual source repair of #120, using an exact safe file update; do not weaken the guard or replace the forced web-search instruction with another forced tool.
