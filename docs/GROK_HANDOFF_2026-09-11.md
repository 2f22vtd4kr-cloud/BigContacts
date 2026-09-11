# Apex / BigContacts — Grok continuation handoff

**Date:** 2026-09-11  
**Repository:** `2f22vtd4kr-cloud/BigContacts`  
**Branch:** `main`  
**Verified main tip at handoff:** `039ccd6b822e905cff7defaf0e7e28837a57e27c`

## Mission

Continue the Apex Atlas work as a long-running, code-first engineering/research session. Do not stop at an architectural review, documentation refresh, or a green static check. Inspect the current source, trace real runtime paths, implement the next source-native migrations, test them, and then continue auditing for the next bottleneck.

The goal is an **AI-driven, non-scripted OSINT bureau** that extracts as much useful intelligence as possible from the available research surface while keeping deterministic code as a safety/integrity harness rather than a hidden research planner.

Work in long sessions. Do not prematurely declare completion because one check passes or because a migration is documented. If a task is large, decompose it into coherent source-native increments, validate each increment, and keep going.

## Non-negotiable Apex architecture

There are only **two AI layers**:

1. **BOSS + RIGHT-HAND**
   - **Gemini = Boss.** Owns case direction, research objective, Investigator assignment, continuation/stop and high-level review.
   - **DeepSeek V4 Flash via NVIDIA NIM/Integrate = Right Hand.** Advises and challenges Gemini. It is oversight/advisory only and must not browse or investigate.
   - Boss and Right Hand should see the evolving investigation state, evidence, contradictions and uncertainty and prevent unsupported or contaminated material from becoming accepted intelligence.

2. **INVESTIGATOR LLM POOL + NON-LLM TOOLS**
   - **Groq / Mistral = Investigator capacity.** They are investigators, not another decision layer.
   - The selected Investigator owns the research trajectory and decides what to investigate next.
   - It may choose among available non-LLM capabilities such as **Serper, Tavily, Exa, Scrapfly, ZenRows/browser fetch, registries/RDAP/WHOIS, and other permitted OSINT tools**.
   - Do not implement a fixed tool rotation, `Groq -> Mistral` research recipe, deterministic enrichment playbook, or hidden provider-selection stage.
   - The Investigator may ignore suggested tools, revisit hypotheses, pivot, verify, broaden/narrow, abandon dead ends and stop when marginal information value is low.

DeepSeek must never be made an Investigator adapter/fallback. Gemini must never be made an Investigator. Search/fetch/registry/OSINT providers are tools, not LLM roles.

## What is actually present on current main

### Canonical ReAct Investigator

`artifacts/api-server/src/src/lib/agentic-web-research-core.ts` is the canonical research engine. Current source exposes an Investigator capability pool of Groq/Mistral and an action schema containing:

- `web_search` with `serper | tavily | exa`
- `visit`
- `browser_fetch`
- `footprint_email`
- `footprint_username_maigret`
- `footprint_username_sherlock`
- `domain_lookup`
- `registry_search`
- `harvest_domain`
- `done`

The engine has bounded iterations, cancellation, SSRF-safe outbound fetch, capped responses, structured trajectory records, provider telemetry and source-backed finding validation. This is good harness work.

The current source also contains Groq and Mistral provider adapters and accepts `investigatorLlm`. The launch-gate/static checks verify that the selected Investigator is ordered first. **However, inspect whether the selected model/provider and any provider retry/fallback semantics still amount to an operational hidden decision layer.** A selected Investigator should be first-class; if another Investigator is used only because the selected provider failed, make that failure explicit and observable rather than silently turning retry order into research strategy.

### Current role/control plane

`artifacts/api-server/src/src/lib/case-bureau.ts` and related prompts establish Gemini as Boss and select the Investigator.

`artifacts/api-server/src/src/lib/deepseek-case-reasoning.ts` is the DeepSeek/NVIDIA Right-hand path.

`artifacts/api-server/src/src/lib/target-control-decision.ts` currently uses DeepSeek to review a completed target investigation and Gemini to decide `research | stop`, with `direction` expressed as a research objective rather than a tool/query/provider command. This is the correct direction.

`artifacts/api-server/src/src/lib/canonical-single-target-runner.ts` has a Right-hand review function and target-control flow. **Important gap:** the current implementation should be checked carefully for the distinction between “review after a whole Investigator pass” and the required architecture of continuous oversight after **every investigation act**. The presence of `onInvestigationAct` persistence is not by itself evidence that Gemini and DeepSeek actually receive and assess every act.

### Per-act durable event ledger

`research_case_events` is already used for immutable trajectory/claim/control events. `bureau-agentic-pass.ts` and the canonical target/discovery paths now expose/serialize Investigator action callbacks in source.

The desired state is stronger than a transcript:

```text
specific target + specific run
  -> act
  -> observation
  -> immutable provenance
  -> model interpretation/claim
  -> evidence relationships
  -> promotion proposal
  -> deterministic integrity gate
  -> Boss/Right-hand oversight
  -> next research objective/state
```

Do not let fire-and-forget callbacks, duplicated case documents, or lossy projections become the source of truth.

## Highest-priority unfinished engineering work

### 1. Continuous Boss + Right-hand oversight after every investigation act

This is the most important architecture check still needing implementation/verification.

For each Investigator act, the system should:

1. execute exactly one model-selected action under the deterministic safety envelope;
2. record the actual tool/provider, arguments, observation, observed URLs, execution status and provenance in the target/run ledger;
3. update the high-signal living investigation state;
4. expose the accumulated state plus the new act to **DeepSeek Right Hand and Gemini Boss**;
5. let Right Hand challenge unsupported conclusions, contamination, identity mistakes, redundant work, contradictions and missed high-value avenues;
6. let Gemini decide the next research objective/continuation disposition where appropriate;
7. feed the resulting oversight/objective back into the Investigator context without creating a third AI decision layer;
8. persist the oversight decisions and rationale in the same target/run investigation record.

Do not turn this into a deterministic per-tool controller. Boss should decide **what question matters next**; Investigator should decide **how to investigate it**.

A good structured oversight object should be small and operational (for example: status, action `continue|redirect|challenge|stop`, rationale, evidence concerns, unresolved questions, confidence, next research objective), but the exact schema should be chosen to fit existing source and persistence conventions rather than bolted on blindly.

### 2. Integrate multi-source evidence graph into real admission/promotion

`source-corroboration.ts` already contains typed foundations such as `EvidenceObservation`, `EvidenceClaim`, `EvidenceEdge`, `EvidenceGraph`, `observationsFromSourceUrls()`, `buildClaimSupportGraph()` and `graphHasIndependentCorroboration()`.

The remaining problem is that upstream `claimAppearsInObservedMaterial()` logic can still require the identity and value to co-occur in one successful observation. That is deliberately conservative and **must not simply be weakened**.

Instead, make the evidence graph carry the causal chain:

```text
Observation A: John Smith is CFO of Company X
Observation B: john.smith@company-x.com is published by Company X
       |
       +--> model-authored claim: email belongs to John Smith
               |
               +--> explicit promotion proposal
                       |
                       +--> deterministic identity/scope/provenance validation
```

The graph must reference immutable observation event IDs. Multi-source corroboration should improve recall without allowing unsupported model-generated contacts into cards.

### 3. Finish registry cancellation source migration

`registry-client.ts` still contains the actual registry-specific network operations. The current architecture requires the real run-scoped `AbortSignal` to reach every actual registry fetch:

```text
runController.signal
  -> registry action
  -> searchRegistry(..., signal)
  -> registry-specific fetch(..., signal)
```

Do this directly in source. Do **not** replace it with `Promise.race()`, global fetch monkey-patching, AsyncLocalStorage tricks, duplicate registry implementations, or another build-time source mutator.

Only after direct source migration is proven should the registry hardeners (`apply-registry-cancellation-boundary.mjs` and `apply-agentic-registry-signal-wiring.mjs`, if still active) be deleted.

### 4. Finish discovery context engineering

The current target path uses `compactInvestigationContext` for high-signal model-facing state while retaining raw event history separately. Discovery durable state still has a bounded trajectory/context projection rather than the same semantic compaction policy.

Migrate discovery to the same high-signal context strategy while preserving the complete append-only event ledger. Do not confuse `slice(0, N)` with context engineering.

The model should receive:
- current objective;
- high-value confirmed/candidate facts;
- unresolved hypotheses/questions;
- contradictions and rejected hypotheses;
- evidence/provenance references;
- recent relevant trajectory;
- Boss/Right-hand oversight;
- pointers to detailed immutable events when deeper inspection is required.

Do not dump the entire raw trace into every prompt.

### 5. Keep Python OSINT fail-closed until real isolation exists

`python-tools.ts` has the explicit Python OSINT quarantine. Holehe, Maigret, Sherlock and theHarvester network capabilities are intentionally unavailable because an environment variable is not a real sandbox/egress boundary.

Do not re-enable them merely to improve smoke-test recall. Build a real sandbox/container/VM or equivalent enforceable egress boundary first, then restore capabilities through least-privilege interfaces and verify cancellation/output isolation.

### 6. Reconcile documentation and hardener drift

`docs/context.md` contains useful architectural state but is already partly stale relative to the current main tip. For example, it records an older reviewed source tip and still describes the secondary-surface mutator as active, while the later hardening audit indicates that mutator was removed.

Do not blindly trust docs over source. Reconcile the docs after source inspection.

Likewise, inspect `scripts/check-apex-launch-gate.mjs` and other build/test hooks for stale hardener names or assertions. A guard that still references a retired mutator is documentation/tooling drift, not proof that the mutator remains necessary.

Current main's latest audit document is `docs/audit-2026-09-11-architecture-hardening-10.md`. It explicitly records:
- canonical entity writers are limited to deliberate manual CRUD and review-only discovery admission;
- legacy `broad-discovery.ts` is fenced from canonical imports;
- `/entities/rehydrate-contacts` is already retired by the mutation guard;
- discovery semantic compaction remains unfinished;
- registry cancellation remains unfinished;
- no runtime/provider/deployment success claim is made.

## Research-quality philosophy

Apex should optimize for **information gain**, not tool count.

The Investigator should continuously ask:

> What do we need to know next, why does it matter, what uncertainty would it resolve, and what is the most intelligent way to find out?

Tools are sensors with different strengths. The model should select them based on the unresolved question, not a hard-coded rotation. Examples:

- Serper: broad exact web search
- Tavily: research-oriented search/synthesis
- Exa: semantic discovery
- Scrapfly / ZenRows / browser fetch: difficult or dynamic public retrieval
- registries/RDAP/WHOIS: authoritative corporate/infrastructure facts
- account/username footprint tools: targeted corroboration when identity evidence warrants it

Do not write rules like “email -> Holehe” or “company -> registry X”. Give the Investigator the capabilities and let its reasoning determine the action. Deterministic code validates authorization, safety, provenance, scope, schema and lifecycle; it should not invent the research.

Treat tools as imperfect sensors. Record failures, unavailable sources, contradictions and dead ends. A failed provider is not evidence. A search result is not automatically a claim. A lead may guide the next action but must not silently become a fact.

## Evidence quality model

Maintain a distinction between:

- raw observation;
- model interpretation;
- candidate claim;
- corroborated claim;
- promoted result.

The Investigator may propose a finding and promotion decision. The deterministic layer should verify:

- target/run binding;
- actual observed source URLs;
- provenance;
- identity/scope constraints;
- schema and normalization;
- explicit model authorship/promotion;
- destination/card eligibility.

Do not make deterministic code “smarter” by inventing facts or by accepting plausible model output without evidence.

## What not to do

- Do not add DeepSeek to the Investigator pool.
- Do not add Gemini to the Investigator pool.
- Do not create a third “Investigator decision model”.
- Do not create `Groq -> Mistral` as the research architecture.
- Do not make Boss choose the tool/query/provider when an objective is sufficient.
- Do not create deterministic research playbooks to compensate for model weakness.
- Do not weaken identity/provenance checks because they reduce recall.
- Do not use build-time source mutation as the permanent implementation of a behavior that can be expressed directly in canonical source.
- Do not delete compatibility trees blindly; trace transitive reachability first.
- Do not call a static check, build, or documentation update an end-to-end runtime proof.
- Do not claim a Replit/provider smoke test passed unless it actually ran and the evidence is available.

## Long-session operating procedure for Grok

Do not quit after the first successful change.

For each work cycle:

1. Establish the exact current `main` tip.
2. Read the current architecture/context/audit docs, but treat source as authoritative.
3. Trace the relevant runtime call graph from route/job entry to model call, tool call, persistence and error/cancellation paths.
4. Identify the smallest set of source files that actually owns the invariant.
5. Implement directly in canonical source.
6. Add focused tests for both success and failure/cancellation/provenance paths.
7. Remove a build-time hardener only when the source-native invariant is proven and the permanent guard remains useful.
8. Run the strongest available checks/build/typecheck. Distinguish static proof from runtime proof.
9. Inspect the resulting diff for accidental architecture drift, hidden deterministic strategy, role confusion or data contamination.
10. Update the living context/audit with what is genuinely complete and what remains open.
11. Immediately select the next highest-value unresolved architectural/research-quality bottleneck and continue.

If a provider is unavailable, keep working on source architecture rather than redesigning the architecture around the outage. Record provider unavailability honestly.

## Acceptance target before calling Apex mature

A real acceptance investigation should eventually demonstrate, without seeded URLs or scripted tool order:

```text
Gemini Boss
  -> DeepSeek/NVIDIA Right Hand
  -> Gemini-selected Investigator
  -> Investigator chooses first action
  -> Investigator chooses subsequent tools/pivots based on information gain
  -> real observations with immutable provenance
  -> multi-source evidence reasoning where needed
  -> explicit model-authored finding/promotion proposal
  -> deterministic identity/scope/provenance validation
  -> per-act durable event ledger
  -> per-act Boss/Right-hand oversight
  -> compact high-signal shared context
  -> clean cancellation
  -> replayable case state/trajectory
```

The purpose is not to maximize the number of actions. It is to maximize **useful, defensible intelligence per unit of research effort** while preventing identity contamination and unsupported claims.

## Immediate next move

Start by tracing `canonical-single-target-runner.ts` + `target-contact-agent.ts` + `bureau-agentic-pass.ts` + `agentic-web-research-core.ts` and prove exactly where an Investigator act ends. Then determine whether Gemini and DeepSeek actually see that act before the next Investigator action. If they do not, implement that source-natively first.

After that, integrate the existing evidence-graph primitives into the strict claim/promotion path, then finish registry cancellation and discovery context compaction. Keep going through the remaining reachability/hardener drift rather than stopping after one migration.

**This handoff is intentionally an engineering instruction, not a claim that the current runtime is finished.**
