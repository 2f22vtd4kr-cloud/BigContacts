# Volume 94 — Model Routing Table

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

| Role | Canonical model/provider | Fallback / notes |
|------|--------------------------|------------------|
| Boss / case direction | **Gemini** | No web/OSINT browsing |
| Right-hand / case critique | **DeepSeek via NVIDIA Integrate** | Non-blocking advisory path where configured; no web/OSINT browsing |
| Discovery investigator | **Configured investigator LLM pool** | Provider selection is runtime/configuration; model remains free to choose research actions |
| Dig investigator | **Configured investigator LLM pool** | Actual web/OSINT research, tool selection, pivots, evidence and stopping |
| Research/search tools | **Capability pool** | Serper, Tavily, Exa, Scrapfly/ZenRows, registries, RDAP/WhoisJSON, Holehe, Maigret/Sherlock, theHarvester, etc. |
| Promotion / integrity | Deterministic TypeScript | Provenance, identity, scope, lifecycle and persistence only |

## Hard role boundary

`Boss = Gemini`  
`Right-hand = DeepSeek via NVIDIA Integrate`  
`Discovery/Dig = investigator LLM capability pool + model-selected research tools`

The investigator lane is provider-neutral. LLM adapters are selected from the configured investigator pool; research/search/fetch providers are separate capabilities the investigator can choose. No single pair of vendors is the definition of the investigator role.

Gemini and NVIDIA remain control/advisory roles unless explicitly added as investigator adapters in a separate, intentional architecture change. Provider failure must be reported honestly rather than silently changing roles.

Provider fallback is transport infrastructure, not hierarchy: a fallback investigator receives the same objective/state and independently selects its next action.
