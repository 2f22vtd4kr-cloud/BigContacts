---
name: Agentic provider quota
description: Live Bureau smokes can fail closed when the investigator provider pool is quota-exhausted even though credentials are configured.
---

Configured-provider presence is not live provider capacity. Groq model fallback stays within the same shared quota, and Mistral can independently return 429; when both lanes are exhausted, discovery must remain degraded and admit nothing. Gemini Boss model catalogs can likewise put overloaded models ahead of healthy same-role fallbacks, so the fallback set and aggregate deadline must cover the usable catalog without substituting roles.

**Why:** A bounded three-slot smoke had valid search and visit activity but no model decisions because Groq hit its daily token limit and Mistral returned rate limits.

**How to apply:** Check `bureauIntegrity`, `agenticLlmLastOk`, and provider logs before rerunning. Wait for provider resets rather than launching repeated jobs, keep Gemini fallback within the Boss role, and do not substitute Gemini/NVIDIA for the Investigator lane without changing the documented provider-role contract.