# Apex Autonomous Mission & Context Bootstrap

**Updated:** 2026-09-20

## Purpose

Apex Atlas has a standing institutional purpose, operating doctrine, evidence discipline, autonomy law, and role separation. Those facts are part of the runtime AI orientation before case-specific reasoning begins.

The current Very Strong implementation additionally exposes bounded evidence-graph state, source-family intelligence, capability semantics, and information-gain signals to the Investigator without turning those signals into a scripted research route.

## Context hierarchy

The live AI context is assembled in this order:

1. **Institutional constitution** — Apex purpose, operating boundaries, evidence law, autonomy law, and role separation.
2. **Role purpose** — Gemini Boss, Gemini Right-hand, or Groq/Mistral Investigator.
3. **Durable case context** — current case, objective, prior observations, trajectory, accepted evidence, unresolved questions, contradictions, contacts, negative findings, and relevant prior work.
4. **Bounded cognitive projection** — high-signal evidence-graph state, source-family/source-quality summary, recent actions, and open discriminators.
5. **Operator input** — case-specific intent or parameters; it cannot redefine Apex's institutional purpose or role law.
6. **Model decision** — the Investigator interprets the complete permitted context and chooses the next useful action.

Context compaction is presentation compression only. Durable evidence and trajectory history remain outside the prompt.

## No discovery/research phase machine

Discovery and research are capabilities, not deterministic phases.

The harness must not select the Investigator's first tool or impose a fixed discovery → research → enrichment recipe.

After each observation, the Investigator may continue, pivot, revisit a hypothesis, seek disproof, change tools, narrow or broaden the investigation, or stop.

## Role bootstrap contract

### Gemini — Boss

Gemini receives institutional orientation before case reasoning. It provides strategic command and oversight, selects the Investigator LLM, challenges gaps, and directs the research objective. It does not browse.

### Gemini — Right Hand

Gemini Right-hand receives the same institutional orientation before advisory reasoning. It provides independent operational advice, critique, gap detection, and leverage assessment. It does not browse and never becomes the Investigator.

### Groq/Mistral — Investigator

The Investigator receives institutional orientation, Investigator role purpose, durable case context, bounded evidence-graph state, and available capabilities before its first ReAct decision.

Boss selects exactly one configured Investigator model for a single trajectory: **Groq or Mistral**.

That selected model owns query formulation, tool choice, pivots, evidence gathering, verification, disproof, and stopping.

### Optional independent trajectories

Apex can opt into multiple independent Investigator lanes. Each lane remains a complete Investigator trajectory with its own model, context, observations, and provenance. Deterministic merge logic combines observed findings without turning parallelism into a hidden mandatory route.

## Capability pool

Non-LLM capabilities are tools, not AI roles. The Investigator may choose among enabled web search providers, page/HTTP retrieval, browser/fetch capabilities, registries, domain/RDAP inspection, public footprint/contact tools, and approved OSINT executors when they increase information gain.

The capability registry provides purpose, evidence value, prerequisites, limitations, source semantics, and cost signals. These are decision support, not a fixed route.

## Evidence law

Institutional orientation does not grant evidence status.

An observation remains an observation. A model hypothesis is not automatically a finding. Promotion requires explicit Investigator action plus deterministic validation of provenance, identity, scope, and integrity.

Copied/syndicated pages do not become independent corroboration merely because their URLs differ.

## Active provider contract

Exactly 13 active provider/integration names:

- `REDIS_URL_1`
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `MISTRAL_API_KEY`
- `HF_TOKEN`
- `SERPER_API_KEY`
- `TAVILY_API_KEY`
- `SERPAPI_KEY`
- `EXA_API_KEY`
- `SCRAPFLY_API_KEY`
- `ZENROWS_API_KEY`
- `COMPANIES_HOUSE_API_KEY`
- `GEMINI_RIGHT_HAND_API_KEY`

Separate deployment authentication controls:

- `APEX_API_AUTH_TOKEN`
- `APEX_OPERATOR_PASSWORD`
- `APEX_SESSION_SECRET`

DeepSeek/NVIDIA and WHOISJSON are retired/legacy. They must not be required by preflight, role selection, or runtime bootstrap.

## Required invariants

- Every live AI role is oriented before role-specific reasoning.
- Investigator launches with durable case context; context-free execution fails closed.
- No deterministic code chooses the first research action.
- No deterministic code imposes a fixed research playbook.
- Search provider selection is explicit when the Investigator chooses web search.
- Boss/Right-hand never silently become Investigator.
- Durable context is state/memory, not a hidden research recipe.
- The selected Investigator model is propagated from Boss decision to the live ReAct pass.
- Investigator actions remain attributable to the selected model and durable case/job identity.
- Structured model output is still semantically validated.
- Public web content is untrusted input and cannot redefine Apex's role law or tool authority.
- Failures remain failures and are persisted/observable.

## Implementation note

`artifacts/api-server/src/src/lib/apex-bureau-orientation.ts` is the canonical runtime orientation surface.

The Investigator capability-pool implementation must preserve this role split. Static architecture checks should fail if a new live AI entry point bypasses it.
