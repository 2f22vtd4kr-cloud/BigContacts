# Apex Atlas 40K Plan — Canonical Bureau Architecture Addendum

**Date:** 2026-08-30  
**Status:** binding correction to the living 40K plan  
**Scope:** model-role ownership, Bureau topology, provider terminology, and capability placement

## Why this addendum exists

The living 40K research-agent plan accumulated provider and fallback language that can be read as if all LLMs are interchangeable directors. That is not the current Apex architecture. The repository implementation has explicit model roles. The plan must describe those roles unambiguously so that implementation work, evaluation, telemetry, and future agents do not accidentally swap the Boss and right-hand responsibilities or confuse role ownership with transport failover.

This addendum is **binding** wherever an older planning passage uses ambiguous or contradictory provider-role terminology. It does not remove model freedom. It clarifies who owns which decision in the current Bureau.

## 1. Canonical model-role map

| Bureau role | Canonical provider/model family | Owns | Does not own |
|---|---|---|---|
| **Boss / Head Investigator** | **Gemini** | Case direction, investigator brief, final case-level judgment, accept/override of right-hand advice, progress/stopping judgment | Direct web browsing, direct OSINT tool execution, invented evidence/contact facts |
| **Right-hand Advisor** | **NVIDIA NIM** | Independent case-file critique/advice, complementary angle selection, evidence-gap identification, recommendation to Boss | Direct browsing, direct OSINT execution, final case decision |
| **Investigator / Dig** | **Groq → Mistral** | Actual web research, queries, page selection, pivots, tool selection, evidence collection, stopping within budget | Bypassing provenance/integrity boundaries |
| **Discovery Agent** | Model-selected discovery path using the Dig-capable research lane | Discover and propose attributable people from web evidence | Final card promotion |
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
     model-led           case coordination  free ReAct research
          |                   |                   |
          |          +--------+--------+           |
          |          |                 |           |
          |          v                 v           |
          |       GEMINI           NVIDIA NIM     |
          |       BOSS             RIGHT-HAND     |
          |          |                 |           |
          |          +--------+--------+           |
          |                   |                   |
          +-------------------+-------------------+
                              |
                              v
                  DIG INVESTIGATOR — GROQ → MISTRAL
                              |
                              v
                    WEB / OSINT TOOL BRIDGE
                              |
                              v
                       OBSERVATIONS / EVIDENCE
                              |
                              v
                 IDENTITY / PROVENANCE BOUNDARIES
                              |
                              v
                         PROMOTION / CARD
```

### Boss

The Boss is the **Gemini** Head Investigator. It receives the living case state, including progress and right-hand advice. It chooses case direction and writes an investigator assignment as goals rather than a numbered search recipe. It records whether it accepts or overrides the right-hand recommendation and why.

### Right-hand

The right-hand is **NVIDIA NIM**. It is deliberately complementary rather than a second Boss. It reasons over the case file, identifies gaps and suggests a high-leverage next case action. It does not browse and does not execute web tools. The Boss owns the final accept/override decision.

### Investigators / Dig

The research agent owns the actual web investigation. Its configured provider lane is **Groq → Mistral**. It is model-led and free-ReAct: the model invents queries, chooses pages/tools, inspects observations, pivots, verifies, and decides when to stop. Deterministic code supplies the tool bridge and hard integrity boundaries but does not replace research judgment with a fixed ladder.

## 3. Discovery-first path

For `discoveryFirst=true`, the canonical path is model-selected discovery. The runtime must not silently resurrect the legacy Phase-0/template farm. The model chooses discovery queries and observations. Discovery output is a candidate hypothesis until identity and provenance admission succeeds. Discovery does not itself become the final contact card.

When a discovered person is admitted for research, the Bureau may hand that identity to the Target Contact / Dig path. The Dig agent then researches realistic public or intermediary routes for that specific identity.

## 4. What provider failover means

Provider failover is a **transport/capacity mechanism**, not a research hierarchy.

- A Gemini Boss outage may make the Boss unavailable; the runtime must record that state and follow the documented fallback policy for the specific Boss capability if one exists.
- An NVIDIA right-hand outage may remove advisory input; the Boss can still reason from the case file if the architecture permits it.
- A Dig provider outage may switch from **Groq to Mistral** for the same Dig capability.
- If the Dig-capable providers are unavailable, the correct result is an explicit unavailable/degraded research state, not a successful Dig run using Gemini or NVIDIA.
- None of these events may cause deterministic code to choose `search A -> visit B -> registry C` as a substitute for model judgment.

The canonical hierarchy and Dig failover are therefore separate:

```text
BUREAU HIERARCHY
  Boss = Gemini
  Right-hand = NVIDIA NIM
  Investigator = Groq → Mistral

DIG FAILOVER
  Groq → Mistral
```

Gemini and NVIDIA do not conduct web research in the current architecture.

## 5. No model training is required

Apex Atlas is not being made capable by training new models. The implementation should use the capable existing provider models and place them correctly into the Bureau.

Do **not** introduce fine-tuning, reinforcement training, continued pre-training, adapters, or similar training workflows as a substitute for fixing orchestration, state, tool exposure, provenance, identity integrity, or provider routing.

“No training” does not mean “weak models.” The investigator must receive the strongest supported configuration available for its capability lane, useful case state, and relevant tools. The model owns research judgment. Deterministic software owns resource and integrity boundaries.

## 6. Research freedom is preserved

Role separation is not research restriction. The Dig investigator remains free to choose:

- whether to search;
- what query to issue;
- which result to inspect;
- whether to visit or browser-fetch;
- which OSINT tool to invoke;
- what hypothesis to pursue;
- when to pivot;
- whether to corroborate;
- whether to follow a company, transaction, filing, family-office, intermediary or other route;
- when evidence is sufficient;
- when to stop.

The orchestrator may constrain budgets, timeouts, rate limits, permissions, valid tool arguments, provenance, identity integrity, and persistence. Those controls are hard safety/integrity boundaries, not a research playbook.

## 7. Source-of-truth implementation anchors

The following repository artifacts are the authoritative implementation anchors for this architecture:

- `docs/context.md` — current role map and runtime law.
- `docs/bureau-plan/223_BUREAU_ARCHITECTURE_LAYOUT.md` — Bureau topology and ownership rules.
- `docs/bureau-plan/224_BOSS_RIGHT_HAND_CONTRACT.md` — Boss/right-hand contract.
- `docs/bureau-plan/434_PROVIDER_ROLE_SOURCE_OF_TRUTH.md` — provider-role correction.
- `docs/bureau-plan/437_MODEL_CAPABILITY_PLACEMENT_NO_TRAINING.md` — no-training/capability-placement contract.
- `artifacts/api-server/src/src/lib/apex-bureau-orientation.ts` — role orientation injected into model prompts.
- `artifacts/api-server/src/src/lib/case-bureau.ts` — typed case-file state, Gemini Boss plan ownership, and provider-role representation.
- `artifacts/api-server/src/src/lib/nvidia-nim-case-reasoning.ts` — NVIDIA right-hand implementation.
- `artifacts/api-server/src/src/lib/agentic-web-research.ts` — canonical free-ReAct Dig loop.

## 8. Documentation rule going forward

Every new architecture or provider document must answer these separately:

1. **Which model owns the role?**
2. **What decision does that role own?**
3. **Which tools can that role directly call?**
4. **What is the failover policy for that capability?**
5. **Does failover preserve the same architectural role and objective?**
6. **Does the design preserve the model's research freedom rather than replacing it with a script?**
7. **Is any proposed training actually necessary, or is the problem architectural?**

Never collapse those questions into a single phrase such as "provider chain" or "LLM fallback." That ambiguity is how a correct Gemini-Boss/NVIDIA-right-hand architecture can become misrepresented in the living plan.

## 9. Correction to previous planning language

If a planning passage says or implies that Groq, Mistral, NVIDIA, or Gemini are simply interchangeable "director" models, interpret it as obsolete unless it explicitly distinguishes **Boss**, **Right-hand**, **Dig**, and **Discovery** capability roles.

If a planning passage says that the Boss is NVIDIA/GLM, or that the right-hand is Gemini/GLM, it is incorrect and must be corrected.

If a planning passage lists `Groq → Mistral → Gemini → NVIDIA`, it is obsolete. The current Dig failover is **`Groq → Mistral`**. Gemini is Boss; NVIDIA NIM is right-hand.

If a planning passage implies that model training is required to unlock Apex's research capability, it is obsolete. The current engineering objective is correct model placement, complete tool/state exposure, and preservation of model-owned research judgment.

## 10. Evaluation consequence

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
  provider = groq | mistral
```

A fallback event must include the capability, previous provider, replacement provider, reason, and whether the replacement preserved the same role/objective. A Gemini/NVIDIA web-research event is a **provider-role violation**, not a successful fallback.

The architecture is successful only when these roles preserve the underlying objective: make capable existing models act as unusually capable autonomous researchers with tools and evidence, without turning the system into a deterministic scraping pipeline.
