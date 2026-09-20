# Apex Atlas Research & Reliability Roadmap v3

**Updated:** 2026-09-20  
**Status:** Phases 0–6 have substantial implemented foundations on the current reviewed branch; empirical release gates remain open.

## Purpose

This roadmap turns Apex from a structurally certified agentic bureau into a research system that can sustain long investigations without losing evidence, repeating dead ends, exceeding provider request budgets, or stopping before the evidence warrants a conclusion.

The governing principle:

> The model owns research strategy; the runtime owns memory discipline, evidence integrity, safety, and resource budgets.

The phases describe engineering capabilities and evaluation gates, not mandatory investigation hops.

## Phase status

| Phase | Current state |
|---|---|
| 0 — Canonicalize research surface | Implemented baseline |
| 1 — Context engineering / working memory | Implemented baseline |
| 2 — Observation shaping / evidence-first retrieval | Implemented baseline through bounded cognitive projections and source metadata |
| 3 — Long-horizon investigation memory | Implemented baseline through durable evidence state, hypotheses, contradictions, negatives, and compacted context |
| 4 — Research decision quality | Implemented baseline through capability semantics and information-gain assessment |
| 5 — Identity, attribution, contact resolution | Implemented baseline; empirical false-positive gate remains open |
| 6 — Tool resilience / provider-aware execution | Implemented baseline including structured outputs and bounded request-size recovery |
| 7 — Empirical research gauntlet | Registry implemented; live repeated campaign not yet completed |
| 8 — Release and operational hardening | Not complete; runtime/schema/UI/recovery gates remain |

## Phase 0 — Canonicalize the research surface

Active provider/role contracts are explicit. Retired DeepSeek/NVIDIA and WHOISJSON paths are not active requirements.

Exit condition: active prompt/tool surfaces and deployment docs agree with the current 13-secret contract and Groq/Mistral Investigator pool.

## Phase 1 — Context engineering / working memory

Investigator working context is bounded and selective. Durable trajectory/evidence remains outside the prompt. A tighter emergency reducer handles an unexpected provider request-size rejection without changing role/provider.

Exit condition: long synthetic trajectories remain below the configured working-context ceiling while source URLs and findings remain represented.

## Phase 2 — Observation shaping

Model-facing context prioritizes evidence-bearing content and bounds raw observation size. Source class and extraction method are retained as intelligence metadata.

Exit condition: large observations do not dominate the Investigator request.

## Phase 3 — Long-horizon memory

The evidence graph preserves hypotheses, discriminators, contradictions, contacts, negative findings, open questions, recent actions, source families, and durable observation references.

Exit condition: compacted/restarted investigations preserve the active objective and evidence state.

## Phase 4 — Research decision quality

The capability registry and deterministic strategy assessor expose expected information gain, identity discrimination, contact relevance, source independence, success probability, and cost. The model remains responsible for the actual route.

Exit condition: live evaluations demonstrate better useful-pivot/evidence behavior without increasing unsupported claims.

## Phase 5 — Identity and attribution

Source-backed promotion, contact scope, source-family independence, and attribution states are explicit.

Exit condition: grounded cases demonstrate reduced false-person and false-contact admissions.

## Phase 6 — Provider resilience

Provider-aware structured outputs, bounded request-size recovery, explicit provider/model attribution, and failure diagnostics are implemented.

Exit condition: 413/429/5xx/timeout/cancellation tests and live drills remain truthful and durable.

## Phase 7 — Empirical gauntlet

The current grounded registry is 38 cases, version 1.1.1. The next step is repeated matched live runs with preserved raw trajectories/evidence and deterministic scoring.

Exit condition: release claims are reproducible from frozen artifacts and acceptable failure rates.

## Phase 8 — Release hardening

Remaining gates:

1. initialize and verify production schema;
2. canonical boot/health;
3. real Gemini Boss + Right-hand + Investigator smoke;
4. provider/timeout/cancellation/prompt-injection failure drills;
5. UI truth verification;
6. repeated Gauntlet campaign;
7. release artifact pinned to branch/SHA/configuration.

## Roadmap acceptance law

No phase may solve research quality by adding a fixed search sequence, forcing a provider, substituting Gemini for an Investigator, promoting LLM prose without source evidence, deleting durable observations to make prompts fit, or silently converting provider failures into success.

The runtime may compress presentation. It may never rewrite history.
