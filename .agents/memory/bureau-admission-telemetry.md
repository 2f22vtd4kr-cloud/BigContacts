---
name: Bureau admission telemetry
description: Distinguishes model/tool activity and extracted contact facts from a valid persisted discovery admission.
---

Discovery status summaries may report entities or contacts encountered during page research even when no new person crosses the admission boundary. A valid discovery proof requires a fresh persisted entity with model-emitted identity, visited HTTP(S) provenance, and auditable metadata.

**Why:** A live bounded smoke completed with real LLM/search/visit spans and reported one entity/contact, but the before/after ledger contained only the unchanged prior row. Counting the summary alone would have falsely claimed discovery success.

**How to apply:** For every discovery-first audit, snapshot entity IDs and timestamps before launch, compare the post-run ledger delta, and run the canonical audit against only newly admitted rows. Do not start a proof Dig against an old row when the fresh admission count is zero.