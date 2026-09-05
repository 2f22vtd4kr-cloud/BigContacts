# Volume 94 — Model Routing Table

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

| Role | Canonical model/provider | Fallback / notes |
|------|--------------------------|------------------|
| Boss / case direction | **Gemini** | No web/OSINT browsing |
| Right-hand / case critique | **DeepSeek via NVIDIA Integrate** | Non-blocking advisory path where configured; no web/OSINT browsing |
| Discovery investigator | **Groq → Mistral** | Same investigator capability; model remains free to choose research actions |
| Dig investigator | **Groq → Mistral** | Actual web/OSINT research, tool selection, pivots, evidence and stopping |
| Promotion / integrity | Deterministic TypeScript | Provenance, identity, scope, lifecycle and persistence only |

## Hard role boundary

`Boss = Gemini`  
`Right-hand = DeepSeek via NVIDIA Integrate`  
`Discovery/Dig = Groq → Mistral`

Gemini and NVIDIA **must not** be used as Dig/discovery web-research fallbacks. If Groq and Mistral are unavailable, the research capability fails/degrades honestly. It must not borrow the control-plane models or invoke a deterministic search recipe.

Provider fallback is transport infrastructure, not hierarchy: the fallback investigator receives the same objective/state and independently selects its next action.
