# Volume 304 — Provider Failover Narrative

## Investigator LLM

The **Investigator LLM pool** is the model-decision boundary for free-ReAct research. Current Investigator adapters are **Groq and Mistral**. They receive the same target/objective/trajectory and choose the next research capability; adapter fallback is transport/capacity behavior, not a research strategy.

**DeepSeek via NVIDIA NIM is the Right-hand, not an Investigator LLM.** Gemini is the Boss, not an Investigator LLM. Neither may be borrowed as an Investigator fallback.

If all configured Investigator adapters are unavailable, Apex must report degraded/unavailable research rather than silently substituting another role's model or a deterministic research recipe.

## Research search tools

The Investigator can choose among **Serper / Tavily / Exa** search capabilities. Tool-level fallback among configured search transports changes retrieval transport for the model's chosen query; it does not choose the query or replace the Investigator.

## Browser tools

**Scrapfly / ZenRows** are browser/fetch capabilities available to the Investigator when a page is blocked, JavaScript-heavy, or otherwise requires browser recovery. They are not LLM providers and are not a mandatory first hop.

## Architectural law

```text
Gemini Boss
    ↓ case direction / orchestration
DeepSeek via NVIDIA NIM Right-hand
    ↓ critique / evidence gaps / ongoing-work analysis / advice
Investigator LLM decision
    ↓ chooses one capability
Serper / Tavily / Exa / browser / Scrapfly / ZenRows / registry / OSINT
    ↓ typed observation + provenance
Investigator LLM decision
    ↺
```

The research/tool layer performs actual web and OSINT work. The Investigator LLM owns the research choices. Boss and Right-hand retain their distinct strategic/advisory roles.
