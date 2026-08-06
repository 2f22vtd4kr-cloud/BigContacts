---
name: Gemini Boss quota behavior
description: Distinguishes Gemini model-catalog availability from usable generation quota in discovery-first Boss runs.
---

The Gemini catalog can identify models that are not actually usable by the current project. Multiple newly supplied keys successfully listed models but received HTTP 429 for grounded Boss generation, including `gemini-3.6-flash`. The current Interactions API request uses the documented header and `tools: [{ type: "google_search" }]`.

**Why:** Catalog access and generation quota are separate provider decisions; changing accounts did not change the provider response. The prior legacy generateContent path and old preview model were also stale relative to the current Google docs.

**How to apply:** Treat model-catalog results as candidates only, keep the selected model paired with the key that exposed it, use Interactions for the Boss, preserve model-specific 429/404 failures, and stop on project-level quota responses rather than rotating through the whole key pool.