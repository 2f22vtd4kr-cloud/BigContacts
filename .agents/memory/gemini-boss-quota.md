---
name: Gemini Boss quota behavior
description: Distinguishes Gemini model-catalog availability from usable generation quota in discovery-first Boss runs.
---

The Gemini catalog can identify models that are not actually usable by the current project. In this project, both a prior key and a newly supplied key successfully listed models but received HTTP 429 for the grounded Boss generation request with `gemini-3-flash-preview`. Header and documented query-parameter authentication produced the same result.

**Why:** Catalog access and generation quota are separate provider decisions; changing accounts or authentication transport did not change the provider response for the actual grounded request.

**How to apply:** Treat model-catalog results as candidates only, keep the selected model paired with the key that exposed it, preserve model-specific 429/404 failures, and stop on project-level quota responses rather than rotating through the whole key pool.