# Apex Atlas forensic continuation — architecture hardening 8

## Scope

This pass remains pre-Replit. No Replit runtime claim is made. The work below is repository-source work only.

## Completed in this pass

### 1. Target event ledger — source-native
- `target-contact-agent.ts` now accepts `onInvestigationAct` and serializes event callbacks through an `investigationEventChain` before completion.
- `canonical-single-target-runner.ts` persists each Investigator action into `research_case_events` directly from source.
- Multi-source evidence graphs produced by target investigation are persisted as case events.
- `apply-target-investigation-event-ledger.mjs` was deleted and removed from the API build/test pipeline.

### 2. Multi-source attribution — operational target path
The target Investigator no longer requires a contact value and candidate identity to co-occur on one page. A model-authored finding may attribute the exact value and identity across separate successful observations, provided:

- every cited source URL was actually observed during the run;
- the contact value is present in at least one bounded observation;
- explicit candidate identity tokens are present in at least one bounded observation;
- the finding remains model-authored with explicit scope/person identity/promotion;
- deterministic strict persistence remains the final boundary.

`source-corroboration.ts` now provides unique observation IDs, typed claims/edges, graph validation and independent-source checks. Target runs build claim-support graphs from the model's exact attributed source URLs and persist multi-source graphs to the case ledger.

This is provenance-aware corroboration, not automatic promotion.

### 3. Context / trajectory compaction — source-native
`investigation-context-compaction.ts` now provides deterministic high-signal compaction. The canonical target runner uses it before mounting durable context back into Gemini/DeepSeek/Investigator prompts.

The compactor preserves:
- institutional operating law;
- prior durable state;
- latest Right Hand state;
- latest Gemini state;
- Investigator result;
- recent finding summaries;
- a bounded trajectory tail;
- bounded structured trajectory records;
- evidence-attribution summaries.

It does not attempt to summarize public-source text into new facts and it does not alter model ownership of research trajectory.

### 4. Python sandbox / egress architecture — explicit contract
`python-sandbox-contract.ts` defines the required trusted runtime attestation before network-capable Python can execute:

```text
Investigator action
  -> Apex Python executor
  -> trusted sandbox attestation
  -> isolated network namespace
  -> governed egress broker / approved public-web destination policy
  -> short-lived child process/group
  -> bounded runtime/output/filesystem
  -> structured observation
  -> strict evidence boundary
```

No environment variable is accepted as proof of isolation. The current state remains fail-closed/unavailable. `python-tools.ts` now consults this contract rather than treating package availability as authorization.

## Still deliberately open

### Registry cancellation
`registry-client.ts` still requires direct source migration so `searchRegistry(..., signal)` reaches every actual registry fetch. The canonical ReAct registry action must pass `runController.signal` directly. The existing source-mutating hardeners remain until this is done.

Important design point: each registry request should combine the run signal with a per-request timeout rather than replacing one with the other. Node supports `AbortSignal.any()` for this composition (https://nodejs.org/api/globals.html).

### Secondary-surface retirement
`expandSecondaryPublicSurface()` remains legacy deterministic research machinery. Its automatic callers in `entities.ts` and legacy Atlas orchestration still require direct source retirement/replacement before the build-time retirement mutator can be deleted.

### Duplicate/legacy tree reachability
The canonical `src/src` tree is protected from importing the top-level compatibility `src/lib` tree. The remaining top-level routes and enrichment writers require route-by-route reachability tracing. No blind legacy-tree deletion is safe.

### Remaining identity/entity writers
The canonical discovery path now treats discovery admission as review-only entity state rather than synthetic contact evidence. Remaining writers include manual application entity APIs, compatibility ingestion/enrichment and legacy research surfaces. Each must be classified as:

1. human/manual CRUD;
2. source-backed enrichment;
3. model-authored evidence projection;
4. legacy/unreachable mutation.

Only category 3 may cross the canonical evidence/card promotion boundary automatically, and only with explicit model attribution/promotion.

## Professional architecture basis consulted

- OWASP Agent Control Standard, 1 Sep 2026: inspectable, traceable, instrumentable agents with runtime policy hooks — https://genai.owasp.org/resource/agent-control-standard-acs/
- NIST NCCoE software/AI agent identity and authorization work: explicit identity, authorization, auditability and non-repudiation — https://csrc.nist.gov/pubs/other/2026/02/05/accelerating-the-adoption-of-software-and-ai-agent/ipd
- Anthropic managed agents: durable session state separated from harness and sandbox — https://www.anthropic.com/engineering/managed-agents
- Anthropic context engineering: context is finite; structured state and selective compaction are required for long-running agents — https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
- EviGraph (Aug 2026): typed evidence graphs as operational research state — https://arxiv.org/abs/2608.04738
- Responsible Agentic AI Requires Explicit Provenance (May 2026): explicit causal provenance across the agent lifecycle — https://arxiv.org/abs/2605.17169
- MDN AbortSignal guidance: abort signals must be propagated to the actual asynchronous operation; `AbortSignal.any()` combines cancellation sources — https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal

## Acceptance principle

Do not call this architecture complete because a guard passes. The final pre-Replit state must have the invariants in checked-in source, no source-mutating build-time migration required for those invariants, explicit provenance from model claim to immutable observations, bounded durable context, genuine cancellation to underlying I/O, and no deterministic research trajectory hidden behind compatibility endpoints.
