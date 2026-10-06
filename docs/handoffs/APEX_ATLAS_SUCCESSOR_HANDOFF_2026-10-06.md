# Apex Atlas Successor Handoff — 2026-10-06

## Purpose

This handoff is for the next ChatGPT engineering agent continuing the Apex Atlas / BigContacts investigation after a long sequence of architecture reviews, repairs, optimization passes, and live-run audits.

The user explicitly requires an **honest, execution-backed readiness decision**. Do not manufacture green status, do not equate static guards with runtime correctness, and do not stop merely because the architecture looks coherent.

The immediate objective is:

> Establish whether Apex Atlas is genuinely ready for another canonical UI-equivalent live run and the sequential live audit. If not, continue the bug hunt and repairs until that condition is actually demonstrated.

## Non-negotiable working rules

1. Work ONLY on `main`. Do not create/use/advance optimization or feature branches.
2. Do not use Replit during the engineering phase. The user runs Apex on Replit separately.
3. Do not claim CI green without actual CI evidence.
4. Do not claim a test/build is green unless it was actually executed and its result is available.
5. Do not say you are "working" without tool-backed activity.
6. Preserve the architecture. Do not simplify it into a deterministic search workflow.
7. Never weaken a safety/evidence/provenance gate just to make a test pass.
8. Preserve positive evidence, negative evidence, contradictions, unresolved identity, rejected candidates, inaccessible resources, resource-limited state, provenance, and independent corroboration.
9. Never turn safety ceilings into model strategy. Relevant ceilings include:
   - MAX_RESEARCH_ACTIONS = 64
   - MAX_NO_PROGRESS = 64
   - MAX_FOLLOW_UPS = 64
   - MAX_AGENTIC_ITERATIONS = 64
10. Selected Investigator capability is fixed within an Investigator episode. Same-role fallback only. No Right-hand -> Investigator fallback and no Mistral -> Groq capability substitution.
11. Search results are leads, not claim evidence. Observed source material/registry/browser observations are required for promotion.
12. Never inherit a target name as proof of identity.
13. Do not bypass cancellation, provider, network, evidence, admission, or durable-state gates.

## Canonical architecture invariant

The intended architecture is:

USER OBJECTIVE
  -> Gemini/Groq Boss
  -> runtime Investigator capability selection
  -> Investigator-owned multi-step research trajectory
  -> validated capability execution
  -> real observations + source URLs
  -> evidence / identity / attribution
  -> promotion boundary
  -> complete episode
  -> Right-hand review
  -> Boss continuation / redirect / stop
  -> durable terminal state
  -> UI projection

Desired information architecture:

DURABLE EVIDENCE LEDGER
  -> STRUCTURED DECISION STATE
  -> COMPACT MODEL CONTEXT
  -> LOCAL RECENT WINDOW
  -> CURRENT ACTION / OBSERVATION

Do not replace this with a giant rolling prompt or a fixed search recipe.

## What to study first

Before changing code, read and understand:

1. `docs/handoffs/APEX_ATLAS_SUCCESSOR_HANDOFF_2026-10-06.md` — this file.
2. `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-06.md` if present on main. This is the starred sequential live-run audit and is the primary chronological record of the current attempt.
3. The earlier sequential/control audits under `audits/`, especially the 2026-10-03 sequential audit and 2026-10-04 control-hardening audit.
4. `docs/audits/APEX_ATLAS_FULL_RUN_INVESTIGATION_2026-10-06.md`.
5. `docs/plans/APEX_ATLAS_FULL_RUN_FIX_PLAN_2026-10-06.md`.
6. `docs/audits/APEX_ATLAS_REPLIT_IMPORT_BUILD_PERFORMANCE_2026-10-06.md`.
7. Core runtime:
   - `artifacts/api-server/src/src/lib/agentic-web-research-core.ts`
   - `artifacts/api-server/src/src/lib/agentic-web-research.ts`
   - `artifacts/api-server/src/src/lib/investigation-context-compaction.ts`
   - `artifacts/api-server/src/src/lib/research-intelligence-engine.ts`
   - `artifacts/api-server/src/src/lib/target-act-oversight.ts`
   - `artifacts/api-server/src/src/lib/case-bureau.ts`
   - `artifacts/api-server/src/src/lib/case-bureau-prompt.ts`
   - `artifacts/api-server/src/src/lib/atlas-control-decision.ts`
   - `artifacts/api-server/src/src/lib/bureau-agentic-pass.ts`
   - `artifacts/api-server/src/src/lib/target-contact-agent.ts`
   - `artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts`
   - `artifacts/api-server/src/src/lib/agentic-execution-context.ts`
   - `artifacts/api-server/src/src/lib/agentic-llm-telemetry.ts`
8. Static contract guards, especially:
   - `scripts/check-agentic-runtime.mjs`
   - `scripts/check-investigation-context-compaction.mjs`
   - `scripts/check-bureau-coordination-efficiency.mjs`
   - `scripts/check-investigator-prompt-budget.mjs`
   - `scripts/check-apex-roadmap-implementation.mjs`
9. Relevant tests:
   - `agentic-web-research-core.test.ts`
   - `research-intelligence-engine.test.ts`
   - provider-gate/error/control regression tests
   - context-compaction tests
   - target-act/data-flow tests

Do not infer behavior from filenames alone. Read the actual current main-branch source and tests.

## Important historical repairs already made

The system has already had numerous real defects repaired. Do not regress them.

Examples:

- Boss prompt no longer hardcodes Groq Investigator selection.
- Investigator capability discovery is dynamic and selected capability remains fixed within an episode.
- Stale target/Bureau state paths were corrected toward canonical durable latest state.
- Atlas terminal status now requires evidence-backed terminal state.
- Discovery evidence replay validates replay identity.
- Durable discovery exceptions and target exceptions persist state.
- Target child lifecycle no longer incorrectly terminalizes the Atlas parent.
- Final Boss stop ordering was corrected.
- Import-time Investigator capability snapshots were removed.
- Durable claim admission binds exact source spans.
- Global Investigator iteration ceiling propagation was corrected.
- Timeout-abort zero-safe handling was corrected.
- Provider/network guards were updated for dynamic capability identifiers.
- Groq retry tests verify selected capability/key remains fixed.
- Act evidence truncation was repaired so actual `ActRecord.sourceRecords` survive for evidence graphs.
- Discovery provenance was strengthened: search snippets are leads; claim-grade provenance requires successful source observation.
- Discovery fanout was reduced and duplicate detection added.
- Dynamic discovery global cap and network boundary guards were added.
- Canonical discovery route was globally locked.
- Multi-source intelligence evidence was repaired so every supporting source URL can be represented rather than collapsing to `findingUrls[0]`.
- Intelligence projections were changed toward head+tail preservation so early negative/contradictory evidence is not silently lost.
- Execution network-scope parsing was repaired for identifiers such as `groq-investigator-1`.
- Durable mounted case context was separated from the objective.
- Investigator prompt/context was substantially compacted.
- Right-hand emergency/discovery context was made structurally bounded.
- Discovery query-quality gate was added.
- Safe Groq rate-limit telemetry was added without credentials/raw provider error bodies.
- Known token-window exhaustion can be handled before knowingly issuing an impossible request.
- API build stamp/reuse was added to avoid an unnecessary second API build during Replit boot.

## Current prompt-budget finding

A real boundary mismatch was discovered.

The Investigator prompt previously had approximately:

- working context: 4,200 chars
- intelligence state: 1,500 chars
- capability guidance: 1,600 chars
- fixed instructions on top

The composed dynamic prompt was observed around 9.4k characters while the provider-level ceiling was 9k.

That is not an acceptable architecture: constructing an oversized prompt and truncating it later is weaker than bounding the composition itself.

A repair was committed on main to tighten the composition layer:

- working context: 3,900
- intelligence state: 1,200
- capability guidance: 1,200
- provider ceiling remains 9,000

The prompt-budget guard was aligned with the tighter limits.

**However, this handoff does NOT declare the resulting numerical prompt test green. The successor must execute the relevant tests and, ideally, inspect/measure the actual composed prompt and provider payload.**

The important invariant is:

> The model-facing Investigator prompt should be bounded at composition, not merely truncated at the provider boundary.

## Discovery-quality finding

The current discovery quality gate is intended to prevent broad person-finding searches before a concrete anchor exists.

A genuine bug was identified in source-anchor classification: generic source descriptors such as "official", "interview", "profile", etc. could be confused with concrete source anchors.

That was repaired by distinguishing source descriptors from actual anchors such as explicit domains/site anchors or named registries.

Do NOT add a fixed first-search sequence. The Investigator must retain autonomous trajectory selection.

The intended rule is:

> In discovery mode, establish a concrete organization/person/domain/registry/filing/source anchor before spending generic person-finding searches.

The gate is a quality rail, not a deterministic recipe.

## Important false-positive diagnoses to avoid

### Plural "owners" is not currently sufficient evidence of a defect

The audit agent proposed that plural role words such as "owners" were bypassing the generic-query gate.

Current source already normalizes a token ending in "s" to a singular form before role-vocabulary checks. Do not blindly patch plural handling just because a speculative analysis says it is missing.

Reproduce the exact failing test and inspect the actual validator before changing it.

### recentActs slice(-3) is not automatically durable-ledger truncation

The target oversight path intentionally constructs a bounded advisory recent-act projection while durable act/evidence records remain persisted separately.

The current act is explicitly excluded from the prior-act projection.

Do not remove this bounded projection unless execution/source inspection proves the durable ledger itself is being truncated.

### Boss control prompt around 13k is not automatically a bug

The Boss control plane has a larger formal budget than the Investigator. A ~12,976-char control prompt is not by itself evidence of corruption.

Nevertheless, cost efficiency matters. If reducing it, preserve all control-critical durable state and distinguish:
- provider safety maximum
- economically desirable working budget

Do not make it smaller merely to satisfy an old test.

## Current full-suite status at the point this handoff was written

The latest audit reported:

- 128 API test files
- 118 passed
- 10 failed
- 722 tests
- 708 passed
- 14 failed

The audit explicitly said no provider calls, Atlas jobs, or DB mutations occurred during that local test run.

The failure set contained a mixture of:
- likely stale assertions
- current-contract mismatches
- prompt-budget expectations
- latency-bound expectations
- routing-order expectations
- intelligence-engine fixture problems
- context-compaction/latest-turn behavior
- data-flow/static projection expectations
- runtime prompt wording expectations

Some failures were already repaired/classified during the audit, but the **complete API suite must be rerun after the latest main changes**.

Do not say "all tests pass" until the full command actually passes.

## Replit/import-build work

A previous Replit run took about 24 minutes before Apex was usable.

Two concrete TypeScript defects were found and repaired:

1. A prompt-budget test fixture omitted required `AgenticTrajectoryRecord.model`.
2. `bureau-agentic-pass.ts` passed nullable durable context where an optional string was expected; it was normalized with `mountedContext ?? undefined`.

A second concrete issue was unnecessary duplicate API building in `scripts/replit-boot.sh`.

The API build now writes a stamp containing revision/dirty state, and Replit boot can safely reuse a matching clean build. Dirty/mismatched revisions rebuild.

Do not claim the 24-minute import itself was caused by repository code without phase timing evidence. The audit explicitly noted that dependency installation/import, validation/typecheck, bundle, and boot need to be distinguished.

## Live-run gate

The next live run must use exactly the canonical UI-equivalent request:

POST `/api/ingest/atlas-run`

with:

```json
{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}
```

Before launch:

1. Verify current main commit.
2. Verify working tree/repository state as available.
3. Run the full API suite.
4. Run the full Bureau/architecture contract.
5. Run typecheck/build.
6. Verify API health.
7. Verify no active Atlas job.
8. Snapshot the development database ledger read-only.
9. Record entity IDs and research/evidence counts.
10. Ensure no provider call was made during preflight.
11. Only then issue ONE canonical launch request.

During the run:

- record material setup/request/state/failure/repair/verification events chronologically;
- capture raw search text and observed public URLs where available;
- distinguish model claims from observed source material;
- never record API keys, authorization headers, session tokens, or private chain-of-thought;
- do not probe providers separately;
- do not retry a provider in a loop;
- respect role/provider/cancellation/evidence gates;
- follow the durable control path;
- do not infer card admission from a job completion, research summary, or contact mention.

Card admission must be proven through the durable entity/evidence ledger.

After the run:

- reconcile entity IDs and ledger counts;
- verify evidence rows/source provenance;
- verify newly admitted cards independently;
- preserve rejected/unresolved/negative findings;
- record terminal state and control decisions;
- append the complete outcome to the sequential audit.

## Required successor sequence

Do this in order:

### Phase A — Repository study
Read this handoff plus the starred audit and the architecture files listed above. Map the actual data/control flow before editing.

### Phase B — Failure reproduction
Run the current full API suite. Capture the exact complete failure list. Do not edit tests before understanding each failure.

### Phase C — Classification
For every failure classify:

1. genuine runtime/product defect;
2. stale test expectation;
3. broken test fixture;
4. static guard drift;
5. environment-only issue.

For genuine defects, repair the smallest architecture-preserving implementation.

For stale tests, update them only when the current contract is demonstrably correct.

For fixture defects, fix the fixture, not runtime behavior.

### Phase D — Critical invariants
Explicitly verify:

- Investigator prompt composition is bounded before provider submission.
- Latest action/observation remains visible after context compaction.
- Durable ledger is not truncated by advisory projections.
- Discovery quality gate blocks generic person-finding without concrete anchor.
- Search snippets cannot become claim evidence.
- Every promoted claim has exact observed source provenance.
- Multi-source findings preserve independent source support.
- Selected Investigator capability/key does not silently switch.
- No cross-role/provider fallback.
- Terminal state is evidence-backed.
- cancellation fences remain effective.
- durable state remains authoritative over transient projections.

### Phase E — Full verification
Rerun:
- full API suite;
- Bureau checks;
- typecheck;
- complete build;
- relevant targeted tests after every repair.

Do not proceed on "the focused tests pass" if the full suite is still red.

### Phase F — Readiness decision
Only if all launch-critical verification is actually green and no unresolved architecture defect remains, state:

**READY FOR LIVE RUN**

Otherwise continue.

### Phase G — Canonical live audit
Only after the readiness gate, perform the exact canonical launch and continue the sequential audit from its current numbered entry.

## Trust requirement

The user has repeatedly experienced assistants declaring green too early. This handoff exists specifically to prevent another repetition.

The correct behavior is:

- work when asked to work;
- show actual tool-backed progress;
- report blockers immediately;
- never fabricate execution;
- never confuse architectural plausibility with verification;
- never call a partially tested system "ready";
- never stop thinking without explaining what is actually blocking progress.

The user wants the truth, even if the truth is "not ready."

## Current intended outcome

The successor's job is not to preserve this handoff's conclusions blindly.

The successor must **verify them against current main**, find anything this agent missed, repair what is genuinely wrong, and only then authorize the live run.

If the live run fails, append the evidence to the sequential audit and continue architecture-preserving recovery rather than masking the failure.



## Successor verification addendum — 2026-10-06

A subsequent source-level review found one additional prompt-budget defect that the earlier implementation/guard did not catch:

- MAX_PROVIDER_PROMPT_CHARS = 9,000 had been applied to the dynamic/user prompt without reserving the stable Investigator system message.
- buildGroqInvestigatorRequestBody() was also an exported boundary that could construct an oversized message envelope if called directly.
- Telemetry exposed prompt economics but did not separately identify system, user, and total prompt characters.

These are now repaired on main:

- the final user-message budget reserves the actual stable Investigator system prompt;
- buildStepPrompt() bounds the composed dynamic prompt against the complete message envelope;
- buildGroqInvestigatorRequestBody() independently enforces the same envelope;
- telemetry records systemPromptChars, userPromptChars, and totalPromptChars;
- prompt-budget regression coverage now exercises the provider request-body boundary;
- discovery-query regression coverage explicitly rejects the previously observed generic VC/PE/biotech/software queries.

This was a genuine cross-layer budget defect, not merely a stale assertion.

The full API suite, typecheck, complete build, and canonical live run remain execution gates. This environment has not executed those commands and has no observable CI run for the current main commits; therefore no green/readiness claim is authorized from static inspection alone.

## Pre-live review addendum — 2026-10-06 (latest pass)

A second source-level review found and repaired two additional defects before the next Replit run:

1. **Latest Investigator trajectory was not actually reserved during compaction.** The context builder said the latest record "must remain visible", but earlier sections could consume the entire 3,900-character working-context budget first. `investigation-context-compaction.ts` now explicitly reserves the rendered latest trajectory section before fitting earlier sections, and `investigation-context-compaction.test.ts` contains an oversized-state regression proving that the latest observed URL and observation survive.
2. **Prompt-envelope regression test was under-asserting the real system message.** The test previously measured only a short placeholder system instruction. It now uses the actual `apexOrientationCompact("dig_agent") + "Return one JSON action object only."` system content and requires system+user <= 9,000 characters.

During this pass, five accidental literal \\n fragments in Investigator telemetry argument lists were also found in `agentic-web-research-core.ts` and removed. The current source was re-read after the correction; those malformed telemetry fragments are no longer present.

Current `main` head after these repairs is `f631db8bbce9ed9d02cc0b91049bbc3745f2411f`.

This remains a source-level verification result only. Full API Vitest, typecheck, complete build, and the canonical live run are still execution gates and have not been run in this environment. No `READY FOR LIVE RUN` claim is authorized solely from this review.


## Successor pass — 2026-10-06 (additional source defects found)

A source-level successor review found and repaired two additional issues on `main`:

1. **Latest trajectory duplication during compaction.** `buildInvestigatorContext` rendered the latest trajectory inside the normal section list, then separately reserved and appended the latest section again. This duplicated critical recent state and consumed prompt budget. The duplicate section insertion was removed so the latest record is reserved and emitted exactly once.
2. **Discovery anchor false-positive.** `validateDiscoverySearchQuery` treated arbitrary non-vocabulary tokens as concrete anchors. This allowed a query such as `2026 acquisition of AI startup by large corporation CEO statement` to pass despite having no named organization/person/domain/registry/source anchor. AI was classified as generic sector vocabulary and common connector words were added to the generic-context set; a regression assertion now requires that query to be rejected.

A regression test was added to verify the latest trajectory survives compaction and appears exactly once, alongside the discovery-gate regression.

Current `main` after these repairs: `9e42a94dc319d4035e6ceabc4e211332e4eb50af`.

This is **source-level evidence only**. No typecheck, full API suite, build, or GitHub Actions run exists for this new HEAD in the available environment. Therefore live readiness remains blocked.
