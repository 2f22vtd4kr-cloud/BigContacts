# Apex Atlas — Investigator Performance Plan

**Date:** 2026-09-07  
**Scope:** canonical Discovery/Dig Investigator lane  
**Goal:** maximize research quality and contact depth per unit of LLM quota without replacing model autonomy with deterministic research logic.

## North-star metric

Apex should beat a strong single-agent baseline on **verified research completeness and attributable contact discovery**, while minimizing unnecessary LLM work.

The primary optimization unit is:

> **verified useful intelligence per physical LLM token**

Not raw call count, search count, or elapsed time.

## Non-negotiable constraints

1. The Investigator remains free-ReAct.
2. The model chooses queries, tools, pivots, evidence sufficiency, and stopping.
3. Deterministic code may enforce safety, budgets, provenance, identity, scope, persistence, and truthful failure semantics.
4. No fixed search sequence may be introduced to improve benchmarks.
5. No synthetic candidate/contact extraction may be introduced.
6. A provider failure must not be disguised as successful research.
7. Optimization must be measured against a blind target set.

## Phase 1 — Cost microscope

Instrument every physical Investigator LLM attempt with:

- provider
- model
- attempt/retry index
- HTTP status
- success/failure
- prompt character count
- input tokens
- cached input tokens when the provider reports them
- output tokens
- total tokens
- latency
- failure reason

Never record prompts, completions, secrets, or source content in telemetry.

### Required derived metrics

- input tokens / iteration
- output tokens / iteration
- total tokens / successful decision
- physical attempts / logical Investigator step
- provider-failure fan-out
- retry waste
- cached-input ratio
- latency / successful decision
- tokens / useful finding
- tokens / verified contact

## Phase 2 — Eliminate retry waste

A 429, 401, or 403 is a provider-capacity/authentication condition, not a reason to walk every model on that same provider.

Current policy therefore stops provider-local model/key fan-out for those terminal conditions and permits at most one cross-provider transport fallback.

Future changes must preserve this invariant.

Malformed JSON repair is a separate quality mechanism and must be measured as a repair cost. It must not silently become a second full research turn.

## Phase 3 — Prompt economics

Measure the canonical ReAct prompt composition.

Separate:

- static orientation/instructions
- tool definitions
- target/objective
- trajectory
- findings/evidence
- latest observation
- dynamic status

The objective is to preserve high-value context while removing repeated low-information prose.

### Groq-specific opportunity

Groq automatically supports prompt caching on supported models. Current supported Investigator-relevant models include `openai/gpt-oss-20b` and `openai/gpt-oss-120b`. Cache hits can reduce cached input cost/processing and cached tokens do not count toward rate limits. Exact prefix stability is required.

Therefore the prompt architecture should place stable system/orientation/tool material before dynamic research state whenever the selected model supports caching.

Do not force Qwen onto GPT-OSS merely for caching. Compare research quality per token first.

## Phase 4 — Model selection experiment

Compare Investigator models under identical blind targets and budgets.

Candidate lanes currently include Qwen and GPT-OSS models exposed by the configured provider pool.

Measure:

- identity accuracy
- evidence quality
- source diversity
- meaningful pivots
- direct/personal contact discovery
- false positives
- hallucinations
- completion rate
- tokens
- latency
- tokens per verified contact

Select the model/setting on the quality-efficiency frontier, not reputation or raw speed.

## Phase 5 — Observation compression

Observations should preserve the information required for the next research decision:

- authoritative URLs
- important claims
- identity evidence
- contact leads
- contradictions
- unresolved questions
- prior model decisions

Avoid repeatedly sending low-value boilerplate or duplicated page text.

Compression must never remove provenance or enough evidence to make the next model decision unsafe.

## Phase 6 — Research-value feedback

Add soft signals for:

- repeated query intent
- repeated URLs
- repeated findings
- no-new-evidence turns
- unresolved identity questions
- unresolved contact questions

These are **signals to the model**, not deterministic pivots.

The Investigator remains responsible for deciding whether to continue, pivot, investigate a different surface, or stop.

## Phase 7 — Contact-depth optimization

Apex's purpose is not to collect more generic facts. The high-value endpoint is a well-supported contact dossier.

The Investigator should naturally recognize when research has moved from:

identity → role → authoritative source → contact surface → attributable contact → corroboration.

Do not hard-code that sequence.

Instead improve the model's orientation and observation quality so it can discover this path itself.

## Phase 8 — Blind evaluation

For each fixture target:

1. Run independent baseline research without Apex's trajectory.
2. Run Apex with the same objective and fresh state.
3. Compare only evidence that can be independently verified.
4. Record:
   - useful facts
   - authoritative sources
   - corroborated identity
   - direct/personal contacts
   - organization contacts
   - contact attribution
   - provenance
   - false positives
   - total LLM tokens
   - unnecessary attempts
   - latency
5. Repeat across multiple targets.

Apex passes the performance objective only if it demonstrates a repeatable quality advantage that justifies its multi-tool architecture.

## Current implementation work

- Investigator attempt telemetry exists.
- Provider-local 429/401/403 fan-out is blocked.
- Mistral structured-action generation is capped at 768 tokens to match the hardened Groq action lane.
- Telemetry now records cached input tokens and latency where provider responses expose them.

## Immediate next engineering tasks

1. Verify canonical build transforms the new telemetry without duplicate instrumentation.
2. Run the full existing test/guard suite.
3. Capture one real bounded Investigator run with fresh provider capacity.
4. Produce the first token-economics table.
5. Inspect prompt-token composition before changing prompt structure.
6. Compare Qwen vs GPT-OSS on the same blind target.
7. Only then modify context packing/prompt structure.

## Release standard

Performance work is successful only when:

> **Apex finds deeper, better-supported results—including attributable contact routes—than a strong single-agent baseline, without paying for large volumes of redundant LLM work.**

Cheaper but shallower is not an optimization.

Deeper but wastefully expensive is not an optimization.

The target is **better research per unit of quota**.
