# Volume 02 — Free ReAct and Tool Surface

**Suite:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Code anchors:** `artifacts/api-server/src/src/lib/agentic-web-research.ts`, discovery investigator, Bureau agentic pass

## 1. Free ReAct loop

```
objective + target + current evidence/trajectory
  → Investigator LLM decision
  → one model-selected research action
  → tool / browser / OSINT execution
  → typed observation + provenance
  → Investigator LLM reasons/pivots/stops
  → repeat until model selects done or a hard lifecycle bound fires
```

The **Investigator LLM decision is the single additional model step** that controls the research loop. It receives the complete live tool surface and decides what to do next. There is no mandatory first tool, fixed sequence, force hop, or scripted checklist.

## 2. Role boundary

The roles are deliberately separate:

- **Boss = Gemini:** case direction, strategic orchestration and case-level judgment.
- **Right-hand = DeepSeek via NVIDIA NIM:** supports the Boss with case-file critique, evidence-gap analysis, ongoing bureau-work/result analysis and advisory recommendations.
- **Investigator LLM pool:** the model(s) that actually decide each research action in the free ReAct loop.

DeepSeek/NVIDIA is **not** an Investigator LLM and must never be inserted into the Investigator pool or used as a Dig fallback. Gemini is also not a Dig fallback.

The current implementation has Groq and Mistral Investigator adapters. That is a provider pool, not a `Groq → Mistral` research architecture: adapter ordering is only transport/capacity fallback. The ReAct strategy remains model-owned and extensible.

## 3. Tool surface

The Investigator LLM can choose any useful capability exposed by the live contract:

| Capability | Providers / implementation |
|---|---|
| `web_search` | **Serper / Tavily / Exa** (plus DDG emergency transport) |
| `visit` | HTTP page retrieval |
| `browser_fetch` | **Scrapfly / ZenRows** browser/scrape escalation |
| `footprint_email` | Holehe public account signals |
| `footprint_username` | Maigret / Sherlock profile investigation |
| `domain_lookup` | RDAP / WhoisJSON |
| `harvest_domain` | theHarvester domain evidence |
| `registry_search` | EDGAR / Companies House / BRREG / GLEIF / other configured registries |
| `done` | Investigator-selected stop |

These providers are **research capabilities, not LLMs**. The Investigator chooses the capability; the capability implementation may fail over between its configured vendors. That transport behavior does not replace the Investigator decision.

For `web_search`, the action schema may explicitly request `serper`, `tavily`, or `exa` when the Investigator expects different information gain. For `browser_fetch`, the browser layer handles Scrapfly/ZenRows escalation according to availability and anti-bot conditions.

## 4. Observation and evidence

Tool output remains typed observation. Deterministic parsing may improve readability or extract literal contact tokens, but it is not an identity authority. Raw page text, snippets, headings, addresses, departments and organization names must not become person candidates merely because they resemble a name.

Model-emitted discovery findings are kept separate from auto-extracted observations. Promotion requires identity and provenance gates.

## 5. Harness bounds

- iteration budget;
- hard wall-clock timeout;
- cooperative cancellation;
- event-loop yielding;
- provider/request deadlines;
- resource caps for heavy tools where needed for safety.

These bounds constrain resources, not intellectual choices.

## 6. Acceptance

A healthy live trajectory should show the Investigator LLM making the decision, the selected tool/browser actually executing, real observations, and a model-owned stop/finding decision. Static checks prove only control-plane invariants; research quality requires a provider-backed run.

Empty research is valid. A missing person or contact must never be manufactured to satisfy target counts.

## 7. Banned patterns

- `force_*` research hops;
- mandatory company → LinkedIn → Instagram sequences;
- scripted registry sweeps masquerading as model research;
- Gemini/Boss as Dig browser;
- DeepSeek/NVIDIA right-hand inserted into the Investigator pool;
- deterministic fallback search after an Investigator LLM failure;
- promotion from auto-extracted identity candidates;
- treating Tavily/Exa/Serper/Scrapfly/ZenRows as if they were LLM roles.
