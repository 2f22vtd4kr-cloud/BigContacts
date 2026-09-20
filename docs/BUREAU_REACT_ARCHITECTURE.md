# Apex Atlas — ReAct Bureau Architecture

**Canonical role law:** Boss = **Gemini**. Right-hand = **Gemini**. Investigation = **the configured Investigator LLM pool + non-LLM research tools**.

Apex has **two AI layers only**: the Gemini Boss/Right-hand oversight layer and the Investigator LLM layer. There is no additional Investigator decision model.

## 1. Boss + Right-hand

### Boss — Gemini
Owns case direction, strategic prioritization, assignment, Investigator selection, continuation disposition and high-level review. It does not browse or invent evidence.

### Right-hand — Gemini
A separate bounded Gemini oversight invocation. It critiques the latest act, evidence gaps and research objective. It does not browse, select a tool, or invent evidence, and it is never an Investigator fallback.

If the Right-hand is unavailable, Apex records that fact and fails closed where oversight is required. It never fabricates a completed review.

## 2. Investigator LLM pool

The active pool is exactly:

```text
groq
mistral
```

The selected Investigator is the researcher. It receives the assignment and durable case/run context and owns the research trajectory.

Permitted non-LLM capabilities include Serper, Tavily and Exa search; HTTP/page visits; Scrapfly and ZenRows browser/fetch; RDAP/domain inspection; registries; public footprinting; and approved OSINT executors.

Tools are capabilities, not stages. The Investigator may choose among permitted capabilities based on its current evidence and hypotheses.

## 3. ReAct loop

```
GEMINI BOSS + RIGHT-HAND
        ↓
select Investigator + research objective
        ↓
GROQ / MISTRAL INVESTIGATOR
        ↓
choose action
        ↓
validated tool execution
        ↓
observation + provenance
        ↓
claim / identity hypothesis / contradiction
        ↓
durable evidence graph + event ledger
        ↺
Right-hand review → Boss disposition → next Investigator act
```

The runtime must not impose a hidden fixed sequence such as identity → organization → contact → disproof. There is **no forced search order** and no mandatory hop recipe; these are possible research objectives/actions, not required stages.

## 4. Continuous visibility

After every act, the durable target/run record exposes:

1. Investigator model;
2. selected action;
3. actual tool/provider;
4. execution status;
5. observation and provenance;
6. findings, conflicts and uncertainty;
7. open questions and next leads;
8. Right-hand/Boss oversight disposition.

The record is the working context for subsequent reasoning and replay.

## 5. Evidence and promotion

An observation is not an attributed fact.

```
observation
  ↓
model-authored claim/hypothesis
  ↓
identity + provenance + scope validation
  ↓
evidence graph / immutable event
  ↓
explicit promotion
  ↓
projection
```

Discovery admission must be tied to actual successful observed evidence. Search-result snippets, LLM prose, inherited target names and guessed contact patterns are not proof.

Multi-source corroboration should use typed observation/claim/support relationships. Independent sources can support a claim without making corroboration automatic.

## 6. Safety invariants

- Investigator pool remains Groq/Mistral only.
- Gemini is never an Investigator fallback.
- DeepSeek/NVIDIA is absent from active execution.
- Model-selected actions are checked against actual capabilities.
- Tool failures remain failures.
- Cancellation propagates through the actual network operation.
- SSRF/egress, response-size, concurrency, trajectory and iteration ceilings are enforced.
- Durable evidence and event records are append-only/immutable where the architecture requires them.
- No arbitrary prompt truncation may erase evidence.
- Python network OSINT stays fail-closed until enforceable sandbox egress exists.

## 7. Evaluation boundary

The five-green CI result proves structural/regression invariants; it does not prove investigative superiority.

Research quality is now evaluated separately through **Apex Research Gauntlet v1**, using frozen case ground truth, blind repeated runs, matched baselines and deterministic scoring. See `docs/APEX_RESEARCH_GAUNTLET_V1.md`.

## 8. Hard invariants

1. Two AI layers only.
2. Gemini Boss + Gemini Right-hand are oversight/control.
3. Groq/Mistral are investigators.
4. Investigator owns the research trajectory.
5. Tools are capabilities, not fixed stages.
6. Every act is durably inspectable.
7. Promotion requires source-backed deterministic validation.
8. No provider fallback from Investigator to Gemini/DeepSeek.
9. No forced research order.
10. Benchmark conclusions must come from measured system runs, not model-brand comparisons.
