# Volume 304 — Provider Failover Narrative

## Dig LLM

**Investigator lane:** Groq → Mistral. These are the actual web-research providers for the canonical free-ReAct Dig path.

Gemini is the Boss/control lane and NVIDIA NIM is the Right Hand/advisory lane. Neither is a Dig fallback. If the investigator pool is unavailable, Apex must report degraded/unavailable research rather than silently substituting the Boss or Right Hand model into web research.

Failover is capacity, not role substitution.

## Search

Serper → Tavily → Exa → DDG-class fallback as implemented. Missing keys reduce the available search surface; integrity should reflect search capability loss rather than pretending the surface is unchanged.

## Browser

Scrapfly/ZenRows may be selected when a page is blocked, JavaScript-heavy, or otherwise requires browser recovery. They are capabilities selected by the investigator, not mandatory first hops.

## Architectural law

```text
Gemini Boss
    ↓ reasoning / mission direction
NVIDIA Right Hand
    ↓ advisory reasoning / evidence gaps
Groq → Mistral Investigator
    ↓ model-selected actions
Search / browser / registry / OSINT tools
```

The research/tool layer performs actual web and OSINT work. Boss and Right Hand do not browse by virtue of their model identity.
