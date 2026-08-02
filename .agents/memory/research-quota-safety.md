---
name: Research quota safety
description: Provider and pipeline safeguards for controlled, one-target-at-a-time research.
---

Gemini research uses the lower-quota Flash-Lite model, rotates across configured keys, spaces requests per key, and caps output tokens. Full web research is serialized across entry points; Atlas entity processing is also single-target.

**Why:** The project uses several quota-limited public research providers, and concurrent target work can create avoidable bursts and 429 responses.

**How to apply:** Keep automatic pipeline startup disabled for imports and only enable broader work deliberately. Preserve one-target sequencing even if individual provider calls remain parallel within that target.