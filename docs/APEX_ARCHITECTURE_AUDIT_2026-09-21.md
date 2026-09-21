# Apex Atlas — Architecture Audit & Hardening Plan
**Date:** 2026-09-21
**Canonical branch:** main
**Basis:** repository inspection plus the first genuine Replit discovery-first runtime audit.

## Purpose

This is the engineering architecture review performed after the first real Replit initialization and discovery run. The goal is not to make the run look green. The goal is to preserve Apex Atlas as an autonomous OSINT bureau: model-owned research strategy, multiple coordinated model roles, deterministic integrity around that autonomy, durable provenance, honest failure, and a UI that reflects actual backend state.

## Product architecture assessment

The current architecture has the right major separation:

1. Gemini Right Hand — advisory reasoning over case state; no browsing.
2. Gemini Boss — control-plane assignment/oversight; chooses the Investigator and may redirect research objectives, but must not prescribe tools or search sequences.
3. Groq or Mistral Investigator — owns the free-ReAct research trajectory.
4. Capability layer — search, retrieval, registries, domain/OSINT tools, browser escalation and other approved capabilities.
5. Evidence/provenance layer — immutable case events and source-backed claim validation.
6. Promotion layer — deterministic admission/promotion integrity.
7. Reactor/UI projection — should reflect durable backend activity rather than simulate it.

That separation is materially stronger than a single-model search wrapper. The key architectural requirement is to keep the model-owned research loop creative while making the integrity boundaries deterministic.

## Findings from the runtime audit

### A. Startup/runtime

The first Replit run proved dependency installation, schema initialization, authentication, Redis, provider readiness, health, build and architecture guards.

A PostgreSQL transaction-scoped advisory-lock race was discovered. It was corrected by making the entire startup hardening sequence one explicit transaction.

### B. Discovery autonomy

The real run proved that Apex can enter discovery without a user-supplied person and that the Investigator can select its own web action.

However, the first Investigator act was a Serper search returning no usable URLs, and the run was allowed to terminate without establishing a meaningful external observation.

This is an autonomy-integrity problem, not a reason to add a fixed provider waterfall. The correct deterministic rule is a premature-stop guard: a cold discovery run cannot terminate immediately after unusable/failed external work. The Investigator must choose another action itself.

### C. Admission evidence

The prior admission boundary could treat a successful search-result observation as sufficient source support for a named discovery candidate. Search output is a lead, not admission-grade identity evidence.

The promotion boundary is therefore hardened so a discovered person must be grounded in an actually retrieved source page (visit or browser_fetch) before admission.

### D. Terminal-state truth

The audit exposed contradictory state:

- Redis job: done/complete
- discovery result: error
- control decision: fail-closed stop
- PostgreSQL case: active

Apex's truthfulness law requires durable state to agree. Discovery-only terminal handling now derives job outcome from durable case state and records incomplete/review outcomes rather than reporting success.

### E. Legacy test debt

The audit found older tests that conflict with the current authentication/security contract and other stale model expectations.

Authentication must not be weakened to satisfy those tests. Canonical initialization gates remain the current build/type/integrity/phone-priority gates. Legacy test debt is recorded separately rather than allowed to consume the live research budget.

## Hardening rules

### Preserve model autonomy

Do not add deterministic search ladders, forced provider sequences, fixed identity hops, or scripted research playbooks.

### Deterministic integrity is allowed

The runtime may enforce:

- authorization;
- SSRF protection;
- concurrency;
- timeouts/cancellation;
- immutable event ordering;
- evidence grounding;
- admission/promotion rules;
- durable terminal state;
- resource ceilings.

These are integrity constraints, not research strategy.

### Evidence hierarchy

Search results are leads.

Retrieved source pages are stronger observations.

A person admission requires an observed source supporting the identity.

A contact claim requires source-backed attribution.

Unknown and no-admission remain valid outcomes.

### Failure semantics

Provider failure, no-result search, transport failure, model unavailability, cancellation and genuine research exhaustion must remain distinguishable in durable state.

## Changes applied on main

- Transactional PostgreSQL startup hardening.
- Discovery terminal-stop integrity gate.
- Direct-source requirement for discovery candidate admission.
- Truthful discovery-only terminal-state persistence.
- Regression coverage for the discovery terminal gate.
- Regression coverage preventing search-snippet-only admission.
- Canonical Replit startup blueprint hardened around the complete credential contract, discovery-first operation and current runtime gates.

## Next empirical gate

Do not launch the 150-run campaign yet.

The next live run should demonstrate:

1. cold discovery;
2. at least one failed/empty research move handled by Investigator autonomy rather than forced code;
3. a subsequent useful research move;
4. an actually retrieved source;
5. candidate identity supported by that source;
6. durable provenance;
7. truthful case/job/Reactor state;
8. fail-closed behavior if oversight becomes unavailable.

Only after that should Apex move toward the larger empirical campaign.

## Definition of architecture success

Apex is not successful because the UI shows activity or because a model returns a plausible name.

A successful architecture run is one where:

objective → coordinated bureau → autonomous Investigator trajectory → real capability execution → durable observations → evidence graph → oversight → honest terminal state

all remain faithful to what actually happened.
