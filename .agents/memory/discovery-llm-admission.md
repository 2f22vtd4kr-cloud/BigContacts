---
name: Discovery LLM admission
description: The required AI and failure semantics for broad-discovery candidate admission
---

Broad discovery admission must validate the candidate name together with the source snippet and query context. A name-only classifier is insufficient, and the later AI web-enrichment phase cannot repair an entity that was already inserted.

**Why:** A prior pipeline treated AI OSINT as post-insertion enrichment and used a name-only validator with deterministic fallbacks on provider errors. That allowed role fragments and editorial/recipe phrases to enter the target corpus before any evidence review.

**How to apply:** Require the LLM to confirm exact-person attribution, qualifying ownership/wealth/principal evidence, and consistent geography from the source context before insertion. If the validator is unavailable, errors, or returns malformed output, reject the candidate batch; never silently admit deterministic candidates.

Groq quota/auth failures should rotate through configured keys before the gate gives up, but exhaustion must still fail closed. Placeholder registry entities such as `Unknown` must be skipped before corporation person-hop or AI OSINT work.

**Why:** Overnight monitoring showed a 429 on one discovery key and a pre-existing `Unknown` corporation consuming provider calls and producing Wikipedia/religious-text names. Safety and provider efficiency require both protections.

**How to apply:** Keep key failover inside the validator request boundary, and reject placeholder entity names before any per-entity enrichment begins.