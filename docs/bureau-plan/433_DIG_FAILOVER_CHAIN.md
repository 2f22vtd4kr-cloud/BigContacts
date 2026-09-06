# Volume 433 — Investigator Capability Pool

**Status:** superseded by Volume 434 where this file conflicts.

The investigator lane is **not** the Bureau leadership lane.

- **Boss / Head Investigator = Gemini.** Gemini owns case direction and does not browse or execute web/OSINT tools.
- **Right-hand Advisor = NVIDIA NIM.** NVIDIA owns advisory reasoning and does not browse or execute web/OSINT tools.
- **Investigator = research-capable investigator model(s).** This lane owns actual web research and model-selected tool use.

There is **no closed `Groq → Mistral` architecture**. Those are current investigator LLM adapters, not the definition of the investigator role. The investigator LLM pool is extensible and selects an available configured adapter without changing research decision rights.

Separately, the investigator has a **research capability pool**. Current search capabilities include **Serper, Tavily and Exa**. Current browser/fetch escalation includes **Scrapfly, ZenRows, Browserless and Playwright** when configured. Registry, domain, email-footprint and username-footprint tools are also available. These are research tools, not investigator LLMs.

The model chooses whether to search, which configured search backend to request, which page to visit, whether to escalate a blocked page through browser/scrape infrastructure, which OSINT/registry capability to use, which pivot to make, and when to stop.

Provider fallback preserves the same research objective and the same model-owned decision rights. It must never inject a fixed search sequence, forced hop, target ranking, or deterministic research playbook.

If no configured investigator LLM adapter is available, the run fails closed with degraded/critical integrity rather than silently borrowing the Boss/right-hand control-plane role for web research.
