# Apex Atlas Full-Run Investigation — 2026-10-06

## Executive finding

The 2026-10-06 UI-equivalent Replit run did not complete. It reached canonical discovery, executed one Investigator decision successfully enough to dispatch four searches, and then failed closed when the selected Investigator capability hit upstream Groq quota exhaustion. No candidate was admitted, no evidence row was created, no contact card was materialized, and the durable discovery case remained in review.

This investigation separates three different classes of failure:

1. **Confirmed provider-capacity failure:** the selected Groq Investigator received an upstream 429 after a 400→200 request sequence.
2. **Confirmed application prompt-economics defect:** the final outbound Investigator prompt was measured at 12,000 characters even though the working context itself was bounded to 6,500 characters. The excess comes from multiple additional prompt layers, including a duplicated institutional orientation, a full action schema already enforced by `response_format`, capability guidance, and a separate intelligence block.
3. **Confirmed research-quality weakness:** the Investigator's first discovery move ignored the Boss/Right-hand anchor-first direction and issued four broad VC/PE queries. Existing query validation was too permissive because generic sector/role/source vocabulary could satisfy it without a concrete business/entity/geographic anchor.

The run did **not** demonstrate corruption of the evidence/promotion architecture. In fact, the fail-closed behavior, provenance boundary, capability binding, and durable case preservation behaved correctly.

## Evidence from the live run

Starting state:

- main at `3629db1d23c96770ae0dab35cc2a9d153097c360`
- UI-equivalent launch: `targetCount=3`, `researchDepth=standard`, `targetTimeoutMs=420000`
- no active Atlas job
- PostgreSQL/Redis/bureau integrity healthy
- no entities, research cases, evidence, or sessions before launch

The run selected `groq-investigator-1`, model `openai/gpt-oss-20b`.

Provider sequence:

- first Investigator attempt: HTTP 400
- bounded compatibility retry: HTTP 200
- successful request: 2,735 prompt tokens + 638 completion tokens = 3,373 total
- subsequent attempt: HTTP 429, reason `upstream_quota_exhausted`

The application then stopped discovery without substituting a role or silently changing Investigator capability.

Durable post-run state:

- entities: 0
- research cases: 1
- case events: 6
- research evidence: 0
- research sessions: 0
- admitted/materialized/researched/card promotions: 0
- final action: stop
- case status: review

This is a failed run, but a contained failed run.

## Root cause A — final prompt is larger than the intended context budget

The Investigator working context is bounded by `buildInvestigatorContext(... maxChars: 6_500)`.

That does **not** bound the actual provider prompt.

The provider prompt is assembled approximately as:

- system message: `apexOrientationCompact("dig_agent")`
- user message:
  - another copy of `apexOrientationCompact("dig_agent")`
  - institutional/bootstrap prose
  - assignment
  - full `AGENTIC_ACTION_SCHEMA` JSON
  - full capability guidance
  - multiple action-contract notes
  - evidence-law prose
  - intelligence state, bounded to 2,500 characters
  - 6,500-character working context
  - parallel-search instructions
  - terminal JSON instructions

The provider request then applies a last-resort 20,000-character ceiling. Therefore the observed 12,000-character request was not surprising: the 6,500-character context was only one component.

This is a design error because the system optimized the inner context while leaving the outer prompt envelope unbudgeted.

### Why this matters

Groq documents token-based rate limits and exposes remaining-token/reset headers. The current Groq free-plan table lists 8K TPM for GPT-OSS 20B/120B, while Developer limits are materially higher; exact account limits can vary. Cached tokens do not count toward rate limits, but cache hits are not guaranteed.

The live successful request consumed 3,373 total tokens. A second or third similarly sized turn can therefore exhaust a small TPM allowance quickly. The 12,000-character prompt is roughly 2,700 prompt tokens in this run, before completion tokens.

The architecture must therefore optimize the **actual request**, not merely one internal context object.

## Root cause B — duplicated and unnecessary model-facing instructions

Three pieces are unnecessarily repeated or redundant:

### 1. Institutional orientation is sent twice

The provider system message contains `apexOrientationCompact("dig_agent")`.

The user message also begins with the same orientation and additional bootstrap text.

The model does not need both.

### 2. The complete action schema is sent in the prompt

The provider request already supplies `response_format` with the complete structured schema. The model-facing prompt also serializes `AGENTIC_ACTION_SCHEMA`.

This duplicates a large static contract.

The runtime parser remains the authoritative safety boundary. The response schema remains the provider contract. The prompt only needs a compact action vocabulary and a one-line instruction to return one structured action.

### 3. Capability guidance is mixed with large historical state

Capability guidance is useful, but it should be a compact stable prefix rather than competing with the dynamic case state.

Groq's prompt-caching documentation recommends putting static instructions/schemas first and dynamic context last. The architecture already has a stable system message, so the user message should also keep static instructions compact and place durable dynamic state afterward.

## Root cause C — the discovery query rail was too weak

The Investigator issued:

- 2023 venture capital investment biotech company CEO
- 2023 private equity acquisition tech startup executive
- 2023 funding round software company founder interview
- 2026 acquisition of AI startup by large corporation CEO statement

The Boss had explicitly directed the Investigator to first establish a concrete corporate anchor and primary source. Right-hand agreed.

The existing `validateDiscoverySearchQuery` accepted these because generic role/sector/source vocabulary counted as concrete signals.

That is too permissive.

A safety/quality rail does not need to dictate the next search. It only needs to reject a search that is demonstrably context-free. The Investigator must still choose the concrete anchor and the route to it.

The correct invariant is:

> A discovery search may be model-selected, but before spending a search call it must contain either an explicit concrete anchor (named organization/person/domain/registry/filing/source) or enough non-generic contextual material to establish one.

The rail must not prescribe a fixed search sequence.

## Root cause D — 400 compatibility retry is expensive and under-instrumented

The current provider adapter retries a strict structured-output 400 once in JSON-object mode when Groq reports `json_validate_failed`.

That fallback is defensible and remains same-model/same-capability. It should not be removed blindly.

However, the live run demonstrates that this fallback can consume an additional inference request immediately before the actual trajectory continues.

The provider error diagnostic already extracts safe error metadata, but the audit did not preserve enough information to distinguish schema rejection, request-format rejection, model rejection, or another 400 class at a glance.

The fix is:

- preserve a safe structured provider-error classification;
- capture relevant rate-limit headers without credentials or raw bodies;
- keep the same-model JSON-object fallback only for the precise structured-output rejection;
- never retry hard quota exhaustion;
- when rate-limit headers prove that the next request cannot fit in the current token window, wait for the reset when bounded and safe rather than deliberately sending a request that will predictably 429.

## Root cause E — durable observability has a small model discrepancy

The case row recorded `directorModel=pending` while the event payloads already recorded the actual model `openai/gpt-oss-120b`.

This does not cause the run failure, but it makes audit interpretation harder.

The durable case row, event payload, and telemetry should agree on provider/model/capability for the same control episode whenever the information is known.

## What did NOT fail

The following behaved correctly during the failed run:

- no search snippet was promoted as evidence;
- no page was visited, so no unvisited snippet became claim evidence;
- no person/contact was invented;
- no candidate was admitted;
- no evidence row was created;
- no false completion was emitted;
- no role substitution occurred;
- no silent Investigator capability switch occurred;
- the failed case was preserved for review;
- the launch lock remained safe;
- the UI/API remained healthy after failure.

These are retained as invariants and must not be weakened while optimizing prompt size.

## Target architecture after the investigation

The desired model request becomes:

```
SYSTEM — stable institutional contract
  ↓
USER — compact fixed action contract
  ↓
USER — current objective/anchor gate
  ↓
USER — compact durable intelligence
  ↓
USER — compact working state
  ↓
ONE JSON action
```

The actual provider prompt should be kept to a substantially smaller bounded target than the current 12,000 characters. The dynamic context should be the primary variable; fixed instructions should be stable and short.

A reasonable target for the next run is approximately 6,500–8,000 characters for the combined messages, with an application hard ceiling below the previous 20,000-character safety ceiling. The exact token count remains provider-dependent and must be measured in telemetry.

## Success criteria for the next live run

A successful run is not merely “no 429”.

It must demonstrate:

1. Boss opening succeeds.
2. Right-hand opening review succeeds.
3. Selected Investigator capability makes a successful inference.
4. Investigator chooses an evidence-bearing discovery trajectory.
5. At least one source page/registry/browser observation is actually visited.
6. Candidate admission occurs only from observed evidence.
7. Target-scoped research is launched for an admitted candidate.
8. Contact evidence is source-backed and attributed.
9. Independent corroboration or a justified negative finding is preserved.
10. Right-hand/Boss control transitions remain correct.
11. Durable card/evidence state is internally consistent.
12. Final terminal state is evidence-backed.
13. No resource ceiling is hit merely because context grows.
14. Telemetry shows bounded prompt size, physical request count, prompt/completion/total tokens, cache tokens, rate-limit state, and retries.

## External documentation used for diagnosis

Groq documentation confirms:

- GPT-OSS 20B/120B support JSON Schema/strict structured outputs.
- Groq exposes remaining-token and reset headers on rate-limited responses.
- Cached prompt tokens do not count toward rate limits.
- Static prompt prefixes are the preferred shape for prompt caching.
- Groq recommends keeping prompts concise because larger prompts add latency/cost and can reduce accuracy.

These external facts inform the implementation, but they do not override Apex's internal provider/capability architecture.

## Non-goals

Do not:

- introduce a deterministic discovery search recipe;
- add provider ladders;
- make a second Groq key look like a different provider;
- switch Investigator roles;
- delete durable evidence to save prompt space;
- reduce safety ceilings to hide resource consumption;
- silently downgrade provenance;
- rely on search snippets as claim evidence;
- add an HF Investigator adapter merely as a quota escape hatch without a complete explicit capability implementation.
