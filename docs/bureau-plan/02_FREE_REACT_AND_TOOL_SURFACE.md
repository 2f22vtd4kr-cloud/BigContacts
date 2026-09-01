# Volume 02 — Free ReAct and Tool Surface

**Suite:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Code anchors:** `artifacts/api-server/src/src/lib/agentic-web-research.ts`, discovery investigator, Bureau agentic pass

## 1. Free ReAct loop

```
objective + target + current evidence/trajectory
  → investigator LLM decision (Groq → Mistral)
  → one model-selected action
  → tool executes
  → typed observation + provenance
  → model reasons/pivots/stops
  → repeat until model selects done or a hard lifecycle bound fires
```

The model invents queries and chooses tools from the live schema. There is no mandatory first tool, fixed six-step sequence, force hop, or ranked source menu.

## 2. Model/provider boundary

**Groq → Mistral is the Dig/discovery investigator capability.** Gemini is Boss; NVIDIA NIM is right-hand. Neither is a web-research fallback.

Provider failover changes transport capacity, not research strategy. The fallback model receives the same objective and state and chooses its own next action.

If Groq and Mistral cannot produce a decision, the capability fails/degrades honestly. The harness must not substitute a deterministic search recipe or borrow Gemini/NVIDIA for browsing.

## 3. Harness bounds

- iteration budget;
- hard wall-clock timeout;
- cooperative cancellation;
- event-loop yielding;
- provider/request deadlines;
- resource caps for heavy tools where needed for safety.

These bounds constrain resources, not intellectual choices.

## 4. Observation and evidence

Tool output remains typed observation. Deterministic parsing may improve readability or extract literal contact tokens, but it is not an identity authority. Raw page text, snippets, headings, addresses, departments and organization names must not become person candidates merely because they resemble a name.

Model-emitted discovery findings are kept separate from auto-extracted observations. Promotion requires identity and provenance gates.

## 5. Tool surface

| Action | Capability |
|--------|------------|
| `web_search` | Serper / Tavily / Exa / DDG transport |
| `visit` | HTTP page retrieval |
| `browser_fetch` | Scrapfly / ZenRows escalation |
| `footprint_email` | Holehe public account signals |
| `footprint_username` | Maigret / Sherlock profile investigation |
| `domain_lookup` | RDAP / WhoisJSON |
| `harvest_domain` | theHarvester domain evidence |
| `registry_search` | EDGAR / Companies House / other configured registries |
| `reverse_whois` | Whoxy when available |
| `done` | Model-selected stop |

Every action is optional. The model decides whether it is useful.

## 6. Acceptance

A healthy live trajectory should show model-selected actions and real observations. Static checks prove only control-plane invariants; research quality requires a provider-backed run.

Empty research is valid. A missing person or contact must never be manufactured to satisfy target counts.

## 7. Banned patterns

- `force_*` research hops;
- mandatory company → LinkedIn → Instagram sequences;
- scripted registry sweeps masquerading as model research;
- Gemini/NVIDIA as Dig browsers;
- deterministic fallback search after an investigator failure;
- promotion from auto-extracted identity candidates.
