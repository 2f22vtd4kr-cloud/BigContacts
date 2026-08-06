---
name: Gemini Boss quota behavior
description: Distinguishes Gemini model-catalog availability from usable generation quota in discovery-first Boss runs.
---

The Gemini catalog can identify a suitable Boss model even when all configured generation keys immediately return HTTP 429 quota errors. A resolved model is therefore not proof that the Boss lane is runnable.

**Why:** The first real discovery-first Case Bureau run selected a low-cost Flash-Lite model from the catalog, then all three configured Gemini generation keys were rejected for quota before the mixed-source lanes began.

**How to apply:** Keep the Boss opening fail-closed when generation is unavailable, preserve the quota result in the case audit trail, and do not start web/registry candidate admission without the preliminary Boss context unless the operator explicitly changes the policy.