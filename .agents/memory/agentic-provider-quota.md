---
name: Agentic provider quota
description: Live Bureau smokes can fail closed when the investigator provider pool is quota-exhausted even though credentials are configured.
---

Configured-provider presence is not live provider capacity. Groq model fallback stays within the same shared quota, and Mistral can independently return 429; when both lanes are exhausted, discovery must remain degraded and admit nothing. Gemini Boss model catalogs can likewise put overloaded models ahead of healthy same-role fallbacks, so the fallback set and aggregate deadline must cover the usable catalog without substituting roles.

Groq can return a token-rate-limit 429 even while the remaining-token header is nonzero; the provider error type and reset headers may be more informative than remaining counters alone.

**Why:** Live runs have failed at control after provider capacity errors despite configured keys and earlier successful model calls. One token-type 429 included a short reset hint; the single bounded retry hit another token 429 with nonzero remaining tokens, no reset hint, and request capacity still available. This is not proof of a hard exhausted key.

**How to apply:** Check `bureauIntegrity`, `agenticLlmLastOk`, and provider logs before rerunning. Classify provider error types together with rate-limit/reset headers; only retry within the same role and bounded job deadline, otherwise fail closed and wait for reset rather than launching repeated jobs. Do not substitute models across role contracts.