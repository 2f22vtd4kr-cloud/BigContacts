# Issue 135 — Persist Atlas Boss/Right-hand control decisions into durable case memory

## Finding

The 2026-09-10 Atlas transition repair moved discovery→target control to Gemini Boss + DeepSeek Right-hand in `atlas-control-decision.ts` and removed the unconditional admitted-candidate loop.

The control decision is currently recorded in the job `phaseSummary` and process-local variables, while the durable discovery case already stores Investigator trajectory/events. A crash/resume boundary therefore does not yet have the same durable control-decision history available to the next oversight pass.

## Required invariant

Atlas control decisions are case state, not transient process state.

For every control turn, persist at minimum:

- Gemini Boss action (`continue_discovery`, `research_candidate`, `revisit_candidate`, `pivot_discovery`, `stop`)
- selected candidate, if any
- direction/pivot, if any
- Boss rationale/confidence
- DeepSeek Right-hand advice/status/model
- control-turn number
- durable discovery case ID
- resulting execution disposition

The event must be visible through the same durable case context/timeline that Gemini, DeepSeek, and the Investigator use; it must not become a deterministic instruction script.

## Safety

- Do not infer or reconstruct a decision from candidate count or job fields.
- Do not let persistence choose the next action.
- Preserve fail-closed validation of candidate selection.
- Preserve actual Investigator trajectory separately from control decisions.
- Preserve resume semantics: prior control history is memory/state, not a mandatory workflow.

## Status

OPEN — follow-up to #134. Static/runtime verification still required after implementation.
