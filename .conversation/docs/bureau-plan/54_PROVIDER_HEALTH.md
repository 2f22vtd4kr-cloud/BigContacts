# Volume 54 — Provider Health Matrix

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

| Provider | Role | Integrity impact if 0 |
|----------|------|------------------------|
| Serper | Primary SERP | Search leg critical if no other SERP |
| Tavily | SERP | Partial |
| Exa | SERP | Partial |
| Groq | Dig LLM | Dig critical if all LLMs 0 |
| Mistral | Dig LLM | Partial |
| Gemini | Boss + dig | Boss missing degrades judgment |
| NVIDIA | RH + dig | Narration/adaptive fallback weak |
| Scrapfly/ZenRows | Browser | Visits may fail on CF |
| Companies House | Registry | UK path weak |
| WhoisJSON | RDAP/whois | Domain path weak |

Perplexity 0 is OK if not advertised LIVE.
