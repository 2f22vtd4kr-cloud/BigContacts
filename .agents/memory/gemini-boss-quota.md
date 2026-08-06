---
name: Gemini Boss quota behavior
description: Distinguishes Gemini model-catalog availability from usable generation quota in discovery-first Boss runs.
---

The Gemini catalog can identify models that are not actually usable by the current project. In this project, the older `gemini-2.0-flash-lite` model reported a free-tier limit of zero, while the same configured key successfully generated with `gemini-3-flash-preview`.

**Why:** The first real discovery-first Case Bureau run selected a catalog-listed Flash-Lite model and all three configured generation keys received HTTP 429. A direct minimal probe then showed the failure was model-specific: Gemini 3 returned HTTP 200.

**How to apply:** Treat model-catalog results as candidates only. Probe generation access before selecting a Boss model, cache the successful selection briefly, and preserve model-specific 429/404 failures in diagnostics. Do not call an entire Gemini key pool unavailable merely because one model is rejected.