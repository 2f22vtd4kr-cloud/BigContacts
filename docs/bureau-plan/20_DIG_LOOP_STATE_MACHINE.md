# Volume 20 — Dig Loop State Machine

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Code:** `artifacts/api-server/src/src/lib/agentic-web-research.ts`

## States

| State | Meaning | Transitions |
|-------|---------|-------------|
| INIT | Objective + target loaded; orientation applied | → REASON |
| REASON | Investigator LLM decision using **Groq → Mistral** capability failover | → ACT on valid action; → END_FAIL/DEGRADED if investigator unavailable; → END_BUDGET on limit |
| ACT | Execute the model-selected tool | → OBSERVE |
| OBSERVE | Append typed observation, publish trajectory span | → REASON; → END_DONE when model selected done and lifecycle guards allow |
| END_DONE | Model stopped; findings/evidence preserved | terminal |
| END_TIMEOUT | Wall-clock limit; partial evidence preserved | terminal |
| END_CANCEL | Cancellation; partial evidence preserved | terminal |
| END_BUDGET | Iteration limit; partial evidence preserved | terminal |
| END_FAIL | Investigator/provider/tool failure that prevents further honest research | terminal |

## Invariants

1. Every healthy REASON turn is model-owned; no force hop or scripted research action is injected.
2. Dig LLM provider failover is **Groq → Mistral only**. Gemini and NVIDIA are not investigator providers.

   **Provider roles:** **Boss = Gemini**; **Right-hand = NVIDIA NIM**; **Investigator = Groq → Mistral**.
3. ACT executes only the action selected by the investigator, subject to deterministic safety/schema checks.
4. OBSERVE preserves source URLs and retrieval status; it never promotes arbitrary page text to identity.
5. `done` is a model decision, not a code-selected stopping point.
6. Partial evidence is retained on timeout/cancel/budget exit.

## Data carried across states

- investigator objective and target;
- model-selected action history;
- typed tool observations and exact source URLs;
- model-emitted findings (`modelFindings`);
- visited URL set;
- search/visit/tool counts;
- start time and hard timeout;
- provider/model telemetry;
- live-step callback for trajectory persistence.

## Depth profiles

Depth changes resource bounds, not the research path. Absolute runtime caps may enforce safety, but no depth profile may inject a tool order.

## Pseudocode

```
INIT
  → REASON: Groq → Mistral investigator call
  → ACT: execute exactly the selected action
  → OBSERVE: return typed result + provenance
  → REASON ...
  → model selects done OR hard lifecycle bound fires
```

If no investigator provider can produce a decision, terminate/degrade honestly. Do **not** substitute deterministic search, Gemini, NVIDIA, or a fixed recovery recipe.

## Failure interpretation

A green static guard proves only the control-plane invariant. Research quality requires an actual provider-backed trajectory with real model decisions, tool actions and observations.
