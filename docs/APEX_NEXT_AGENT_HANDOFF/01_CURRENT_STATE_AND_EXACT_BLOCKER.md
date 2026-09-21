# Apex Atlas — Current State and Exact Blocker

## Authoritative checkpoint

Repository: 2f22vtd4kr-cloud/BigContacts
Branch: audit/genuine-five-green-final
Checkpoint supplied by the previous deployment cycle: 96362ce4f30a114cb293c0ab2cc277de002f1c45

Always inspect the actual branch HEAD before working.

## What the latest Replit validation proved

Passing:
- pnpm install --frozen-lockfile
- full workspace typecheck
- check:mission-bootstrap
- check:deterministic-research-strategy
- check:apex-roadmap-implementation
- check:agentic-efficiency / equivalent agentic LLM efficiency check
- frontend production build
- frontend source-boundary checks
- all 13 active provider/integration secret names were configured
- all 3 deployment-security controls were configured

Not reached because the API build stopped:
- database verification
- Redis connectivity
- canonical API startup
- health
- authenticated API
- authentication rejection
- real investigation
- live 413 recovery

## Blocker A: context-compaction guard

scripts/check-investigation-context-compaction.mjs reported:

FAIL durable trajectory is explicitly retained outside the prompt

The production source already contains the intended bounded-memory design in artifacts/api-server/src/src/lib/investigation-context-compaction.ts.

That source explicitly describes durable trajectory/evidence remaining outside the prompt, bounded working context, archived trajectory indexes, source URLs, an omission-is-not-negative-evidence law, and a bounded emergency reducer.

Therefore the first job is to reconcile the guard with the source. Do not weaken the architecture or remove the assertion.

## Blocker B: discovery-context-control guard

scripts/check-discovery-context-control.mjs still asserts the retired lossless/unbounded model.

Its stale expectations include concepts equivalent to:
- discovery control uses lossless semantic compaction;
- the compactor is unbounded;
- only recursive duplicate snapshots are removed;
- complete structured Investigator observations remain in active context;
- complete evidence attribution remains in the active prompt.

Those assertions contradict the current Phase 1 architecture.

The correct invariant is:

complete durable trajectory -> bounded working context selector -> Investigator model.

The durable case/event/evidence system remains complete. The active prompt is selective and bounded.

Update the guard and any stale source assumptions coherently. Do not delete or bypass the guard.

## Existing bounded-memory implementation

investigation-context-compaction.ts already contains:
- DEFAULT_MAX_CHARS=18,000
- configurable bounded min/max
- recent full records
- bounded observations
- bounded findings
- archived trajectory index
- source URLs
- explicit context-management law
- tightenInvestigatorPrompt()
- emergency request-size marker
- final max-length enforcement

Do not rewrite this blindly. First determine why discovery-control code and guards still reference the old contract.

## Existing 413 behavior

The Investigator core now uses bounded working context.

If a provider rejects the request for request-size reasons, the code records request-size telemetry, applies the emergency bounded reducer once, and retries the same provider/model path.

Never “fix” 413 by switching the Investigator to Gemini, deleting durable evidence, or making the prompt unlimited.

## Existing terminal-state hardening

canonical-single-target-runner.ts now rereads the durable case and derives the job terminal state through canonical-terminal-state.ts.

Intended behavior:
- durable complete -> job done / outcome complete;
- durable review -> incomplete/failed unless locally cancelled;
- local cancellation -> cancelled;
- late local cancellation cannot overwrite durable completion.

Preserve this.

## Existing credential hardening

Gemini Right-hand uses GEMINI_RIGHT_HAND_API_KEY and has no Boss-key fallback. Preserve the dedicated credential contract.

## Why this is not “step zero”

The repository already has substantial architecture:
- two-layer model role separation;
- Groq/Mistral Investigator pool;
- durable cases/events;
- evidence promotion;
- identity state;
- provider telemetry;
- bounded-context implementation;
- terminal-state hardening;
- frontend;
- benchmark infrastructure.

The current failure is a contract mismatch between the newer bounded-memory implementation and older architecture guards, followed by the fact that runtime research has not yet been revalidated after the fix.

The next agent must bridge architecture to a real research run.
