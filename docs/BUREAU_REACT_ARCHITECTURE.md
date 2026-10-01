# Apex Atlas — ReAct Bureau Architecture

**Updated:** 2026-09-20

**Canonical role law:** Boss = **Gemini**. Right-hand = **Gemini**. Investigation = **Groq/Mistral Investigator + permitted non-LLM research tools**.

Apex has **two AI layers only**: Gemini oversight/control and the Investigator LLM layer.

## 1. Boss + Right-hand

### Boss — Gemini

Owns case direction, strategic prioritization, Investigator selection, continuation disposition and high-level review. It does not browse or invent evidence.

### Right-hand — Gemini

A separate bounded Gemini oversight invocation. It critiques the latest act, evidence gaps, contradictions and objective. It does not browse, choose the Investigator's tool, or invent evidence.

If the Right-hand is unavailable where required, Apex records that fact and fails closed. It never fabricates a completed review.

## 2. Investigator LLM pool

The active pool is exactly:

```text
groq
mistral
```

The selected Investigator is the researcher. It receives the assignment plus durable case/run context and owns the research trajectory.

Permitted non-LLM capabilities include web search, page/HTTP retrieval, browser/fetch escalation, public registries, domain/RDAP inspection, approved footprint/contact tools, and disproof/verification capabilities.

Tools are capabilities, not stages.

## 3. ReAct loop

```
GEMINI BOSS + RIGHT-HAND
        ↓
select Investigator + objective
        ↓
GROQ / MISTRAL INVESTIGATOR
        ↓
choose action
        ↓
validated capability execution
        ↓
observation + provenance
        ↓
evidence graph state
        ↺
Right-hand review → Boss disposition → next Investigator act
```

There is **no forced identity → organization → contact sequence** and no mandatory search-provider order.

## 4. Evidence graph cognition

The Investigator's bounded working context can include:

- objective and current findings;
- identity hypotheses and discriminators;
- contradictions;
- contact states;
- negative findings;
- open questions;
- recent actions;
- source-family coverage;
- source-quality summaries;
- durable mission context.

Complete observations and trajectory records remain durable outside the prompt. Compaction changes presentation, not history.

## 5. Adaptive discovery

Discovery can allocate future slots using historical lane feedback while preserving diversity across geography, occupation, wealth mechanism, source kind, and reachability.

This is an adaptive portfolio, not a hidden deterministic research route.

## 6. Independent trajectories

The optional ensemble path can run multiple Investigator lanes in parallel. Each lane remains inspectable. Findings are merged deterministically and source coverage is deduplicated without pretending that copied sources are independent.

## 7. Structured action contracts

Investigator action responses use provider-aware structured outputs where supported.

- Groq: structured JSON/schema response with reasoning separated from the action payload.
- Mistral: strict JSON-schema response format.
- Semantic action validation follows schema validation.
- Provider failures remain explicit.

Structured output reduces parser ambiguity; it does not remove the need for deterministic validation.

## 8. Source independence and failure observability

Apex distinguishes source families/classes so URL count is not mistaken for corroboration.

Diagnostic signals include identity collision/overcommitment, insufficient evidence, misleading search result, stale source, copied contact, wrong entity, contact misattribution, contradiction misclassification, missed/unnecessary pivot, tool-selection error, premature/late stop, prompt injection, source-quality error, and system failure.

These diagnostics do not silently mutate the research result.

## 9. Safety invariants

- Investigator pool remains Groq/Mistral only.
- Gemini is never an Investigator fallback.
- DeepSeek/NVIDIA is absent from active execution.
- Model-selected actions are checked against actual capabilities.
- Tool failures remain failures.
- Cancellation propagates through the actual operation.
- SSRF/egress, response-size, concurrency, trajectory, and iteration ceilings are enforced.
- Durable evidence/event records are immutable where required.
- No arbitrary prompt truncation may erase evidence.
- Python network OSINT stays fail-closed until enforceable sandbox egress exists.

## 10. Evaluation boundary

Structural CI proves architecture/regression invariants. It does not prove research superiority.

Research quality is evaluated separately through the 38-case grounded Research Gauntlet v1 and controlled live runs.

## 11. Hard invariants

1. Two AI layers only.
2. Gemini Boss + Gemini Right-hand are oversight/control.
3. Groq/Mistral are investigators.
4. Investigator owns the research trajectory.
5. Tools are capabilities, not fixed stages.
6. Every act is durably inspectable.
7. Promotion requires source-backed deterministic validation.
8. No provider fallback from Investigator to Gemini/retired providers.
9. No forced research order.
10. Benchmark conclusions come from measured system runs, not model-brand comparisons.
