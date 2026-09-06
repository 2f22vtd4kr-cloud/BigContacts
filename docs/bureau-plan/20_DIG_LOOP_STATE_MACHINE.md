# Volume 20 — Dig Loop State Machine

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Code:** `artifacts/api-server/src/src/lib/agentic-web-research.ts`

## States

| State | Meaning | Transitions |
|-------|---------|-------------|
| INIT | Objective + target loaded; orientation applied | → REASON |
| REASON | **Investigator LLM decision** using the configured Investigator LLM pool and the complete live research capability surface | → ACT on valid action; → END_FAIL/DEGRADED if investigator unavailable; → END_BUDGET on limit |
| ACT | Execute the model-selected research action/tool/browser/OSINT capability | → OBSERVE |
| OBSERVE | Append typed observation, publish trajectory span | → REASON; → END_DONE when model selected done and lifecycle guards allow |
| END_DONE | Model stopped; findings/evidence preserved | terminal |
| END_TIMEOUT | Wall-clock limit; partial evidence preserved | terminal |
| END_CANCEL | Cancellation; partial evidence preserved | terminal |
| END_BUDGET | Iteration limit; partial evidence preserved | terminal |
| END_FAIL | Investigator/provider/tool failure that prevents further honest research | terminal |

## Invariants

1. Every healthy REASON turn is model-owned; no force hop or scripted research action is injected.
2. The Investigator LLM pool is a distinct role from **Boss = Gemini** and **Right-hand = DeepSeek via NVIDIA NIM**. DeepSeek/NVIDIA never participates as the Investigator or as an Investigator fallback.
3. The current Investigator adapters are Groq and Mistral. This is an implementation pool, not a closed research architecture; the pool can be extended with additional Investigator LLM adapters without changing the ReAct loop.
4. ACT executes only the action selected by the Investigator, subject to deterministic safety/schema checks.
5. The Investigator can select research capabilities including **Serper, Tavily, Exa, Scrapfly, ZenRows, browser/HTTP fetch, registries and OSINT tools** as available in the live tool contract. These are tools, not LLM providers.
6. OBSERVE preserves source URLs and retrieval status; it never promotes arbitrary page text to identity.
7. `done` is a model decision, not a code-selected stopping point.
8. Partial evidence is retained on timeout/cancel/budget exit.

## Data carried across states

- Investigator objective and target;
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
  → REASON: Investigator LLM chooses the next action
  → ACT: execute exactly the selected research capability
  → OBSERVE: return typed result + provenance
  → REASON ...
  → Investigator selects done OR hard lifecycle bound fires
```

If no Investigator LLM can produce a decision, terminate/degrade honestly. Do **not** substitute Gemini, DeepSeek/NVIDIA, deterministic search, or a fixed recovery recipe.

## Role boundary

```
Boss (Gemini)
    │ case direction / orchestration / review
    ↓
Right-hand (DeepSeek via NVIDIA NIM)
    │ critique / evidence-gap analysis / ongoing-work analysis / advice
    ↓
Investigator LLM decision
    │ chooses one capability
    ├── Serper / Tavily / Exa search
    ├── HTTP visit / browser fetch
    ├── Scrapfly / ZenRows escalation
    ├── registries / RDAP / WhoisJSON
    └── public OSINT tools
         ↓
typed observation + provenance
         ↺ Investigator LLM decision
```

The right-hand may advise the Boss about the bureau; it does not enter the Investigator tool loop.

## Failure interpretation

A green static guard proves only the control-plane invariant. Research quality requires an actual provider-backed trajectory with real Investigator model decisions, tool actions and observations.
