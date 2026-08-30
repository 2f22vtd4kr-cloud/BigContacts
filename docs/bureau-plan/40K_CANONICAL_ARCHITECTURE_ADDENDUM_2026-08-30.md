# Apex Atlas 40K Plan — Canonical Bureau Architecture Addendum

**Date:** 2026-08-30  
**Status:** binding correction to the living 40K plan  
**Scope:** model-role ownership, Bureau topology, and provider terminology

## Why this addendum exists

The living 40K research-agent plan accumulated provider and fallback language that can be read as if all LLMs are interchangeable directors. That is not the current Apex architecture. The repository implementation has explicit model roles. The plan must describe those roles unambiguously so that implementation work, evaluation, telemetry, and future agents do not accidentally swap the Boss and right-hand responsibilities or confuse role ownership with transport failover.

This addendum is **binding** wherever an older planning passage uses ambiguous or contradictory provider-role terminology. It does not remove model freedom. It clarifies who owns which decision in the current Bureau.

## 1. Canonical model-role map

| Bureau role | Canonical provider/model family | Owns | Does not own |
|---|---|---|---|
| **Boss / Head Investigator** | **Gemini** | Case direction, investigator brief, final case-level judgment, accept/override of right-hand advice, progress/stopping judgment | Direct web browsing, direct OSINT tool execution, invented evidence/contact facts |
| **Right-hand Advisor** | **NVIDIA NIM** | Independent case-file critique/advice, complementary angle selection, evidence-gap identification, recommendation to Boss | Direct browsing, direct OSINT execution, final case decision |
| **Investigator / Dig** | Configured research LLM(s), with the current Dig failover chain documented separately | Actual web research, queries, page selection, pivots, tool selection, evidence collection, stopping within budget | Bypassing provenance/integrity boundaries |
| **Discovery Agent** | Model-selected discovery path | Discover and propose attributable people from web evidence | Final card promotion |
| **Orchestrator** | Deterministic runtime | Lifecycle, budgets, timeouts, concurrency, permissions, provider readiness, integrity gates | Choosing the useful research move |

The key distinction is **role vs failover**. Gemini being the Boss does not mean every Gemini call is a Dig call. NVIDIA being the right-hand does not mean NVIDIA is a generic fallback for every model role. A provider fallback may preserve availability for a particular capability, but it must not silently change the architectural role or inject a scripted research strategy.

## 2. Canonical Bureau topology

```text
                         OPERATOR / DESK
                              |
                              v
                     ATLAS ORCHESTRATOR
              lifecycle / budget / safety / state
                              |
          +-------------------+-------------------+
          |                   |                   |
          v                   v                   v
     DISCOVERY           CASE BUREAU        TARGET CONTACT / DIG
     model-led           optional case       free ReAct research
          |              coordination               |
          |                   |                     |
          |          +--------+--------+             |
          |          |                 |             |
          |          v                 v             |
          |       GEMINI           NVIDIA NIM       |
          |       BOSS             RIGHT-HAND       |
          |          |                 |             |
          |          +--------+--------+             |
          |                   |                     |
          +-------------------+---------------------+
                              |
                              v
                       RESEARCH AGENTS
                 model-selected tools/actions
                              |
                              v
                       EVIDENCE / PROVENANCE
                              |
                              v
                     PROMOTION / CARD STATE
```

### Boss

The Boss is the **Gemini** Head Investigator. It receives the living case state, including progress and right-hand advice. It chooses case direction and writes an investigator assignment as goals rather than a numbered search recipe. It records whether it accepts or overrides the right-hand recommendation and why.

### Right-hand

The right-hand is **NVIDIA NIM**. It is deliberately complementary rather than a second Boss. It reasons over the case file, identifies gaps and suggests a high-leverage next case action. It does not browse and does not execute web tools. The Boss owns the final accept/override decision.

### Investigators / Dig

The research agent owns the actual web investigation. It is model-led and free-ReAct: the model invents queries, chooses pages/tools, inspects observations, pivots, verifies, and decides when to stop. Deterministic code supplies the tool bridge and hard integrity boundaries but does not replace research judgment with a fixed ladder.

## 3. Discovery-first path

For `discoveryFirst=true`, the canonical path is model-selected discovery. The runtime must not silently resurrect the legacy Phase-0/template farm. The model chooses discovery queries and observations. Discovery output is a candidate hypothesis until identity and provenance admission succeeds. Discovery does not itself become the final contact card.

When a discovered person is admitted for research, the Bureau may hand that identity to the Target Contact / Dig path. The Dig agent then researches realistic public or intermediary routes for that specific identity.

## 4. What provider failover means

Provider failover is a **transport/capacity mechanism**, not a research hierarchy.

- A Gemini Boss outage may make the Boss unavailable; the runtime must record that state and follow the documented fallback policy for the specific Boss capability if one exists.
- An NVIDIA right-hand outage may remove advisory input; the Boss can still reason from the case file if the architecture permits it.
- A Dig provider outage may switch to another Dig-capable provider according to the configured Dig failover chain.
- None of these events may cause deterministic code to choose `search A -> visit B -> registry C` as a substitute for model judgment.

The current context explicitly distinguishes **Boss = Gemini**, **Right-hand = NVIDIA**, and **Dig failover = Groq → Mistral → Gemini → NVIDIA**. That Dig chain must not be described as the Boss/right-hand hierarchy.

## 5. Source-of-truth implementation anchors

The following repository artifacts are the authoritative implementation anchors for this architecture:

- `docs/context.md` — current role map and runtime law.
- `docs/bureau-plan/223_BUREAU_ARCHITECTURE_LAYOUT.md` — Bureau topology and ownership rules.
- `docs/bureau-plan/224_BOSS_RIGHT_HAND_CONTRACT.md` — Boss/right-hand contract.
- `artifacts/api-server/src/src/lib/apex-bureau-orientation.ts` — role orientation injected into model prompts.
- `artifacts/api-server/src/src/lib/case-bureau.ts` — typed case-file state, Gemini Boss plan ownership, and provider-role representation.
- `artifacts/api-server/src/src/lib/nvidia-nim-case-reasoning.ts` — NVIDIA right-hand implementation.
- `artifacts/api-server/src/src/lib/agentic-web-research.ts` — canonical free-ReAct Dig loop.

## 6. Documentation rule going forward

Every new architecture or provider document must answer these separately:

1. **Which model owns the role?**
2. **What decision does that role own?**
3. **Which tools can that role directly call?**
4. **What is the failover policy for that capability?**
5. **Does failover preserve the same architectural role and objective?**

Never collapse those five questions into a single phrase such as "provider chain" or "LLM fallback." That ambiguity is how a correct Gemini-Boss/NVIDIA-right-hand architecture can become misrepresented in the living plan.

## 7. Correction to previous planning language

If a planning passage says or implies that Groq, Mistral, NVIDIA, or Gemini are simply interchangeable "director" models, interpret it as obsolete unless it explicitly distinguishes **Boss**, **Right-hand**, **Dig**, and **Discovery** capability roles.

If a planning passage says that the Boss is NVIDIA/GLM, or that the right-hand is Gemini/GLM, it is incorrect and must be corrected.

If a planning passage lists `Groq → Mistral → Gemini → NVIDIA`, it must label that chain as the **Dig failover chain**, not as the Boss/right-hand architecture.

## 8. Evaluation consequence

The evaluator must record the actual role/provider used at every model decision:

```text
case decision:
  role = boss
  provider = gemini

case advisory decision:
  role = right_hand
  provider = nvidia-nim

web research decision:
  role = dig/investigator
  provider = <actual configured dig provider>
```

A fallback event must include the capability, previous provider, replacement provider, reason, and whether the replacement preserved the same role/objective. This is necessary to distinguish provider degradation from research-agent judgment failures.
