# Volume 20 — Dig Loop State Machine

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Code:** `artifacts/api-server/src/src/lib/agentic-web-research.ts`

## Canonical architecture

There are **two AI layers**, not three:

1. **Bureau oversight: Boss + Right-hand**
   - Boss = Gemini.
   - Right-hand = DeepSeek via NVIDIA NIM.
   - Together they decide the research assignment, choose an Investigator LLM from the Investigator LLM pool, suggest useful non-LLM tools/capabilities, and continuously review the work.
2. **Investigation: Investigator LLM pool + non-LLM tools**
   - The selected Investigator LLM conducts the actual research.
   - It may independently choose any available search, browser, registry, or OSINT capability.
   - It decides what to investigate next, what evidence matters, when to pivot, and what findings are worthy of promotion.

**DeepSeek/NVIDIA is never an Investigator. Gemini is never an Investigator.**

## ReAct lifecycle

```text
Boss + Right-hand
    │
    ├── choose Investigator LLM from the pool
    ├── set objective / scope / review constraints
    └── suggest useful tools (not mandatory)
          ↓
Investigator LLM
    │
    ├── chooses a research action itself
    ├── uses any permitted non-LLM tool/browser
    ├── evaluates the observation
    └── decides the next research action
          ↓
REPORT EVERY ACT + OBSERVATION
    │
    ├── append to this target's living investigation document
    └── Boss + Right-hand see and analyse the report
          ↓
Investigator LLM continues OR stops
          ↺
```

The living investigation document belongs to the **specific research run for the specific target**. Each investigation act contributes its action, tool/provider, observation, provenance, findings, uncertainty, and open questions. Boss and Right-hand receive the accumulating report after every act rather than seeing only the final result.

## States

| State | Meaning |
|-------|---------|
| ASSIGN | Boss + Right-hand establish the current assignment and select an Investigator LLM from the pool |
| INVESTIGATE | Selected Investigator LLM reasons and chooses its own next research action |
| ACT | Execute exactly the selected non-LLM capability/tool/browser action |
| REPORT | Persist the typed observation and append it to the target/run investigation document; make it visible to Boss + Right-hand |
| REVIEW | Boss + Right-hand inspect the new report, identify gaps/risk, and may revise the assignment or suggested tools |
| PROMOTE | Investigator LLM proposes which researched findings deserve promotion; deterministic provenance/identity gates enforce truth and scope |
| DONE | Investigation stops with the accumulated evidence preserved |

## Investigator LLM pool

The pool means **all configured LLMs that are designated as investigators**. Provider names must never be mistaken for the role itself. Groq and Mistral are current investigator implementations; they are investigators, full stop. They are not an extra decision layer.

DeepSeek via NVIDIA NIM belongs only to the Right-hand role. Gemini belongs only to the Boss role. Neither may be inserted into the Investigator pool by fallback.

## Tool surface

The Investigator may use any permitted non-LLM capability that is exposed in the live contract, including:

- Serper, Tavily, Exa;
- HTTP/page visit and browser fetching;
- Scrapfly and ZenRows browser/fetch escalation;
- RDAP / WhoisJSON and registries;
- public email/username footprinting;
- theHarvester, Maigret, Sherlock and other approved OSINT executors.

These tools are capabilities, not stages and not LLMs. The Investigator can choose them independently even when Boss/Right-hand did not explicitly suggest them.

## Continuous bureau visibility

After **every investigation act**, the runtime must:

1. record the selected Investigator LLM and action;
2. record the tool/browser provider actually used;
3. record the observation and exact provenance/status;
4. append the event to the target-specific research document;
5. expose the updated report to Boss + Right-hand;
6. retain their review/advice for the next assignment.

A final-only summary is insufficient for the Bureau control loop.

## Promotion

The Investigator LLM owns the research judgment and proposes promotion/rejection of findings. Deterministic code does **not** invent or select research findings; it only enforces provenance, identity, scope, schema, lifecycle, and persistence rules.

Boss + Right-hand are the oversight layer that watches the accumulating work and prevents unsupported or contaminated findings from silently becoming trusted case data.

## Invariants

1. No fixed search checklist or forced research hop.
2. No separate Investigator decision model between Boss/Right-hand and the Investigator pool.
3. No DeepSeek/NVIDIA Investigator fallback.
4. No Gemini Investigator fallback.
5. Every tool action is selected by an Investigator LLM, unless Boss/Right-hand explicitly reassign the investigation.
6. Every action produces a report visible to Boss + Right-hand and appended to the target/run document.
7. Search/browser vendors are tools, not LLMs.
8. Promotion remains source-backed and scope-safe.
9. Partial evidence survives timeout/cancel/budget exit.
