---
name: Case Bureau architecture
description: Durable target-scoped investigation cases sit above adaptive research and preserve human review.
---

The Case Bureau is the durable coordination layer above the adaptive research director: one target-scoped case has a shared living case file, bounded specialist assignments, a next-action queue, human directives, and an append-only event trail.

**Why:** The investigation should adapt from evidence gaps without creating a parallel pipeline, while the human remains the final decision-maker for contact routes and prior evidence cannot be silently rewritten.

**How to apply:** Keep the initial local director provider-key independent; connect future LLM directing to the same case/action/event contract. Preserve broad direct-to-organization route summaries as review-only evidence, and never let the bureau promote contacts, infer identity, or generate outreach.