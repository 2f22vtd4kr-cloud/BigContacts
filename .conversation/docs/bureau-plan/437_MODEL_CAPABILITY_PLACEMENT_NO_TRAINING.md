# Volume 437 — Model Capability Placement: No Training, No Artificial Capability Ceiling

**Date:** 2026-08-30  
**Status:** binding living-plan correction  
**Scope:** Apex Atlas model placement and research autonomy

## Decision

Apex Atlas is an orchestration system, not a model-training project.

The current implementation must **not** start fine-tuning, reinforcement training, continued pre-training, adapter training, or any other model-training workflow as a prerequisite for making Apex capable.

The models already available to Apex are treated as capable general-purpose reasoning models. The engineering job is to place them into the Bureau architecture correctly, expose the tools and state they need, and avoid artificially constraining their research judgment.

## Canonical role placement

```text
                    ┌─────────────────────┐
                    │   BOSS — GEMINI     │
                    │ mission / strategy  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ RIGHT HAND — NVIDIA │
                    │ critique / planning │
                    └──────────┬──────────┘
                               │
                               ▼
              ┌─────────────────────────────────┐
              │ ACTUAL DIG / WEB INVESTIGATOR  │
              │ Groq → Mistral capability lane │
              └───────────────┬─────────────────┘
                              │
                              ▼
                    web + OSINT tools
                              │
                              ▼
                 observations / evidence
                              │
                              ▼
             identity + provenance boundaries
                              │
                              ▼
                         Apex card
```

Gemini and NVIDIA are **not web-research providers** in this architecture. They do not become investigators merely because an investigator provider is unavailable. The Dig lane uses its own provider chain and fails closed if that lane is unavailable rather than silently changing the Bureau hierarchy.

## Capability principle

“Not training the models” does **not** mean “making the models weak.”

The objective is the opposite: expose the strongest available model configuration to Apex while preserving model-owned judgment.

The investigator must be able to decide, based on the current case state:

- whether to search;
- what query to issue;
- which result to inspect;
- whether to open a page;
- whether to use a browser fetch;
- whether to invoke a registry or OSINT tool;
- what hypothesis to pursue;
- whether evidence contradicts the current hypothesis;
- whether to pivot;
- whether to corroborate;
- whether to investigate an organization or intermediary route;
- whether to research another hop;
- whether evidence is sufficient;
- when to stop.

Deterministic orchestration may constrain **resources and integrity**, but must not convert these decisions into a fixed research checklist.

## What “no artificial restriction” means

Apex should not impose capability ceilings such as:

- mandatory search templates;
- mandatory source order;
- fixed “search A → search B → search C” sequences;
- forced hop counts;
- forced contact-field checklists;
- deterministic wealth/fame ranking;
- blanket exclusion of a source merely because it is popular;
- tiny fallback models when a materially stronger supported model is available;
- truncation of useful case state solely to simplify orchestration;
- hiding available tools from the investigator when they are relevant and safe;
- suppressing model uncertainty or alternative hypotheses.

The model may still receive concise structured state because context is a capability enabler, not a research script.

## What remains mandatory

Hard boundaries remain in force:

- budget and timeout enforcement;
- provider rate limits;
- permission and security controls;
- valid tool arguments;
- source URL integrity;
- observation/evidence provenance;
- identity/person-versus-organization boundaries;
- contact attribution boundaries;
- namesake protection;
- target isolation;
- durable persistence integrity.

These controls protect truth and infrastructure. They are not substitutes for model judgment.

## Provider configuration rule

Provider selection must be observable and role-specific.

Every model invocation should be attributable to a role such as:

```text
role=boss        provider=gemini
role=right_hand  provider=nvidia
role=dig         provider=groq
role=dig         provider=mistral   # only after legitimate Dig failover
```

A provider's availability does not authorize it to impersonate another role. In particular, Gemini/NVIDIA readiness must never be treated as proof that the Dig lane is ready.

## Fallback quality rule

Fallback exists to preserve availability **within the same capability role**, not to make the architecture appear healthy.

For the Dig lane, Groq → Mistral is the canonical provider failover. If both are unavailable, the correct state is `unavailable`/failed research with explicit telemetry. It is not a successful research run produced by substituting Boss or right-hand.

Likewise, the presence of a strong model does not require using it for every decision. The orchestrator may use a faster supported model where the architecture explicitly permits it, but that choice must be visible and must not silently reduce the investigator's effective research capabilities below the evaluated contract.

## Evaluation rule

Capability placement is not itself evidence of research superiority.

The only meaningful question remains whether the resulting Apex system produces more truthful, useful, source-backed research than a fair strong single-agent baseline.

Therefore this volume adds no victory claim. It adds an architectural constraint: **do not train the models; place capable existing models correctly and give them the information and tools required to exercise their capabilities.**

## Acceptance tests

Before treating model placement as complete:

1. static checks prove role/provider separation;
2. the live audit can distinguish Boss, right-hand, and Dig telemetry;
3. a provider-backed Dig run shows the investigator itself selecting searches/tools/pivots;
4. no forced search sequence is present in the canonical path;
5. unavailable Dig providers do not silently become Gemini/NVIDIA Dig runs;
6. the trajectory preserves enough state for the investigator to reason from observations;
7. the final card remains subject to provenance and identity integrity gates;
8. repeated ten-target batches determine whether this architecture actually improves research quality.

A green provider-health check alone is insufficient.
