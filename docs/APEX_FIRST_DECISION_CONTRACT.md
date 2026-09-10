# Apex First-Decision Contract

## Purpose

The first Investigator decision is the first point at which Apex exercises research autonomy. It must happen **after** institutional mission bootstrap and **before** any research tool is selected.

This is deliberately stronger than "do not force web_search".

## Required context order

```text
APEX INSTITUTIONAL MISSION
        ↓
ROLE PURPOSE
        ↓
DURABLE CASE CONTEXT / MEMORY
        ↓
CASE-SPECIFIC OPERATOR INPUT
        ↓
AVAILABLE CAPABILITIES
        ↓
INVESTIGATOR REASONING
        ↓
FIRST ACTION OF ITS CHOICE
```

The first action may be any capability permitted by the live tool surface. It is not predetermined to be search, visit, registry, browser, footprint, domain lookup, or any other tool.

## Institutional bootstrap law

Apex's identity and purpose are standing bureau state. They are not supplied by the operator and are not reconstructed from a case prompt. Every live AI role receives the standing institutional orientation before role-specific reasoning.

Operator input contributes case-specific intent, constraints, subject information, or desired outcomes. It cannot redefine Apex's institutional mission, evidence discipline, autonomy law, or role separation.

## Discovery is not a phase gate

Discovery and target research are capabilities of the bureau, not mandatory deterministic phases. The AI may discover, verify, pivot, investigate, or stop according to the living evidence and expected information gain.

For discovery, the Investigator should seek an attributable named person and a realistic public/intermediary route. A ranking, organization, title, search snippet, or generic contact surface is not itself a person.

## Deterministic boundary

Deterministic code may enforce:

- authorization and safety;
- tool schemas and valid action shapes;
- provenance and evidence boundaries;
- persistence and durable trajectory;
- quotas, budgets, timeouts, cancellation;
- provider transport and telemetry;
- impossible-state prevention.

Deterministic code must not choose the Investigator's first research action or encode a mandatory discovery/research sequence.

## Acceptance test

A runtime is not compliant merely because the literal phrase `begin with web_search` is absent. The implementation must establish that the first model-facing decision is generated from institutional orientation + role purpose + durable case context + capabilities, without a deterministic first-tool seed.
