# Apex Autonomous Mission & Context Bootstrap

## Purpose

Apex Atlas is not an empty shell waiting for an operator to teach it what it is. The bureau has a standing institutional purpose, operating doctrine, evidence discipline, and role separation. Those facts are part of the runtime's AI orientation and are present before case-specific reasoning begins.

## Context hierarchy

The live AI context is assembled in this order:

1. **Institutional constitution** — what Apex is, why it exists, its operating boundaries, evidence law, autonomy law, and role separation.
2. **Role purpose** — the current model's standing responsibility: Gemini Boss, DeepSeek/NVIDIA Right Hand, or Groq/Mistral Investigator.
3. **Durable case context** — the current case, objective, prior observations, trajectory, accepted evidence, unresolved questions, constraints, and relevant prior work.
4. **Operator input** — case-specific intent or parameters. This can refine the case but cannot redefine Apex's institutional purpose or role law.
5. **Model decision** — the AI interprets the complete context and chooses the next useful action.

Operator input is therefore **not** the source of Apex's identity, purpose, research doctrine, or role boundaries.

## No discovery/research phase machine

Discovery and research are capabilities within the bureau mission, not deterministic phases that the harness must enter in a prescribed order.

A first Investigator decision may be a search, visit, registry lookup, domain lookup, footprint check, browser fetch, another permitted capability, or `done`, depending on the context. The harness must not select a first tool on the model's behalf.

After each observation, the Investigator may continue, pivot, revisit an earlier hypothesis, change tools, narrow or broaden the investigation, or stop. The trajectory belongs to the model.

## Role bootstrap contract

### Gemini — Boss

Gemini receives the Apex institutional orientation before case reasoning. Its purpose is strategic command and oversight: understand the living case, challenge gaps, direct Investigator work, and adjudicate according to the evidence boundary. It does not browse.

### DeepSeek/NVIDIA — Right Hand

The Right Hand receives the same institutional orientation before advisory reasoning. Its purpose is independent operational advice, critique, gap detection, and leverage assessment. It does not browse and does not become an Investigator when an Investigator is unavailable.

### Groq/Mistral — Investigator

The Investigator receives the institutional orientation, its Investigator role purpose, durable case context, and available capabilities before its first ReAct decision. It owns query formulation, tool choice, pivots, evidence-gathering trajectory, and stopping. Groq and Mistral are interchangeable Investigator capacity, not a deterministic research sequence.

## Evidence law remains separate

Institutional orientation does not grant evidence status. An observation is still only an observation. A model hypothesis is not automatically a finding. Promotion requires an explicit Investigator decision plus deterministic validation of provenance, identity, scope, and integrity.

## Required invariants

- Every live AI role is oriented before role-specific reasoning.
- Investigator launches with durable case context; context-free Investigator execution fails closed.
- Operator input supplements case state; it does not define Apex's institutional mission.
- No deterministic code chooses the first research action.
- No deterministic code imposes a fixed discovery → research → enrichment playbook.
- Available tools are capabilities, not a mandatory sequence.
- Search provider selection is explicit when the Investigator chooses web search.
- Role substitution is forbidden: Boss/Right Hand never silently become Investigator.
- Durable context is state/memory, not a hidden research recipe.

## Implementation note

`artifacts/api-server/src/src/lib/apex-bureau-orientation.ts` is the current canonical runtime orientation surface. This document defines the architectural contract that the orientation and all future prompt/bootstrap code must preserve. Static architecture checks should fail if the contract is weakened or a new live AI entry point bypasses it.
