---
name: Research review guardrails
description: Durable safeguards for bounded single-entity research and outreach state
---

Research reruns must recompute scores from the stable prior; feeding a prior posterior back into the scorer makes repeated runs inflate confidence without new evidence.

**Why:** A bounded isolated-target verification run previously raised the same record's Bayesian score on rerun even though no assets, relationships, or verified direct contact had been added.

**How to apply:** Keep manual seed provenance distinct from public-registry evidence, reject malformed contact values before scoring, and save isolated targets without a corroborated gatekeeper as review-only. Do not generate outreach copy or imply personal reachability until a supported path exists.