# Apex Autonomous Mission & Context Bootstrap

## Purpose

Apex Atlas has a standing institutional purpose, operating doctrine, evidence discipline, and role separation. Those facts are part of the runtime AI orientation and are present before case-specific reasoning begins.

## Context hierarchy

The live AI context is assembled in this order:

1. **Institutional constitution** — Apex purpose, operating boundaries, evidence law, autonomy law, and role separation.
2. **Role purpose** — Gemini Boss, Gemini Right-hand, or Groq/Mistral Investigator.
3. **Durable case context** — current case, objective, prior observations, trajectory, accepted evidence, unresolved questions, constraints, and relevant prior work.
4. **Operator input** — case-specific intent or parameters; it cannot redefine Apex's institutional purpose or role law.
5. **Model decision** — the AI interprets the complete context and chooses the next useful action.

## No discovery/research phase machine

Discovery and research are capabilities, not deterministic phases. The harness must not select the Investigator's first tool or impose a fixed discovery → research → enrichment recipe.

After each observation, the Investigator may continue, pivot, revisit a hypothesis, change tools, narrow or broaden the investigation, or stop. The trajectory belongs to the model.

## Role bootstrap contract

### Gemini — Boss

Gemini receives institutional orientation before case reasoning. It provides strategic command and oversight, challenges gaps, directs Investigator work, and adjudicates against the evidence boundary. It does not browse.

### Gemini — Right Hand

Gemini Right-hand receives the same orientation before advisory reasoning. It provides independent operational advice, critique, gap detection, and leverage assessment. It does not browse and never becomes the Investigator.

### Groq/Mistral — Investigator

The Investigator receives institutional orientation, Investigator role purpose, durable case context, and available capabilities before its first ReAct decision. Boss selects exactly one configured Investigator model for the assignment: **Groq or Mistral**. That selected model owns query formulation, tool choice, pivots, evidence gathering, and stopping.

### Capability pool

Non-LLM capabilities are tools, not AI roles. The Investigator may choose among enabled web search providers, browser/fetch capabilities, registries, domain/footprint tools, and other permitted OSINT capabilities when they increase information gain.

## Evidence law

Institutional orientation does not grant evidence status. An observation remains an observation. A model hypothesis is not automatically a finding. Promotion requires explicit Investigator action plus deterministic validation of provenance, identity, scope, and integrity.

## Active provider contract

The active provider/integration contract is exactly 13 names:

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

The separate deployment authentication controls are `APEX_API_AUTH_TOKEN`, `APEX_OPERATOR_PASSWORD`, and `APEX_SESSION_SECRET`.

DeepSeek/NVIDIA and WHOISJSON are retired/legacy. They must not be required by preflight, role selection, or runtime bootstrap.

## Required invariants

- Every live AI role is oriented before role-specific reasoning.
- Investigator launches with durable case context; context-free Investigator execution fails closed.
- No deterministic code chooses the first research action.
- No deterministic code imposes a fixed research playbook.
- Search provider selection is explicit when the Investigator chooses web search.
- Boss/Right Hand never silently become Investigator.
- Durable context is state/memory, not a hidden research recipe.
- The selected Investigator model is propagated from Boss decision to the live ReAct pass.
- Investigator actions remain attributable to the selected model and durable case/job identity.

## Implementation note

`artifacts/api-server/src/src/lib/apex-bureau-orientation.ts` is the canonical runtime orientation surface. The Investigator capability-pool implementation must preserve this role split. Static architecture checks should fail if a new live AI entry point bypasses it.
