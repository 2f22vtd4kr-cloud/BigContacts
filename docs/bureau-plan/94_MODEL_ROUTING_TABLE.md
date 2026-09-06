# Volume 94 — Model Routing Table

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

| Role | Canonical model/provider | Responsibility |
|------|--------------------------|----------------|
| Boss / case direction | **Gemini** | Case direction, strategic orchestration, prioritization, ongoing bureau direction, final case-level judgment |
| Right-hand / case analysis | **DeepSeek via NVIDIA NIM** | Case-file critique, evidence-gap analysis, analysis of ongoing bureau work/results, advisory recommendations to Boss |
| Investigator LLM pool | **Configured Investigator LLM adapters; current adapters: Groq + Mistral** | The additional model-decision step that selects each research action, reads observations, pivots, evaluates evidence and decides when to stop |
| Research/search/browser tools | **Capability pool** | Serper, Tavily, Exa, Scrapfly/ZenRows, HTTP visit, registries, RDAP/WhoisJSON, Holehe, Maigret/Sherlock, theHarvester, etc. |
| Promotion / integrity | Deterministic TypeScript | Provenance, identity, scope, lifecycle and persistence only |

## Hard role boundary

`Boss = Gemini`  
`Right-hand = DeepSeek via NVIDIA NIM`  
`Investigator = configured Investigator LLM pool`  
`Research capabilities = Serper/Tavily/Exa/Scrapfly/ZenRows/etc.`

The Investigator LLM pool is the **single model-decision layer inside the free-ReAct research loop**. It receives the complete live research capability surface and chooses the next action. Search/browser vendors are not LLMs and do not belong in the LLM pool.

**DeepSeek via NVIDIA NIM is strictly the Right-hand model. It is not an Investigator adapter and is never an Investigator fallback. Gemini is strictly the Boss model and is never an Investigator fallback.**

The current Groq + Mistral adapters are an implementation pool, not a closed `Groq → Mistral` research architecture. Adapter fallback is transport/capacity behavior only; the Investigator model remains the owner of research strategy.
