---
name: Agentic provider quota
description: Live Bureau smokes can fail closed when the investigator provider pool is quota-exhausted even though credentials are configured.
---

Configured-provider presence is not live provider capacity. Groq model fallback stays within the same shared quota, and Mistral can independently return 429; when both lanes are exhausted, discovery must remain degraded and admit nothing.

**Why:** A bounded three-slot smoke had valid search and visit activity but no model decisions because Groq hit its daily token limit and Mistral returned rate limits.

**How to apply:** Check `bureauIntegrity`, `agenticLlmLastOk`, and provider logs before rerunning. Wait for the provider reset rather than launching repeated jobs, and do not substitute Gemini/NVIDIA for the investigator lane without changing the documented provider-role contract.