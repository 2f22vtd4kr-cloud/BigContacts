---
name: Agentic prompt size
description: Investigator runs can fail at the provider request boundary when durable context grows beyond model API limits.
---

Provider credentials and quota can be healthy while a ReAct request is rejected with HTTP 413 because mounted case context and trajectory observations make the prompt too large.

**Why:** The verified canonical smoke reached Groq successfully for early turns, then all configured Groq model retries rejected a 42.9k-character prompt; the control plane correctly stopped without admitting unsupported contacts.

**How to apply:** Treat HTTP 413 as a prompt-compaction or context-boundary issue, not a quota outage. Bound or compact durable context before provider submission and preserve the case/event provenance when doing so.