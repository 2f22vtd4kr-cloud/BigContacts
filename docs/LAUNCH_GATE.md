# Apex Atlas Launch Gate

Launch is blocked until the canonical discovery-first path satisfies all of these invariants:

- Discovery is model-led: the investigator chooses searches, pivots, stopping, and whether a named person is worth promotion.
- Dig is model-led and uses Groq → Mistral only; Gemini is direction and NVIDIA is advice only.
- Deterministic code validates safety, identity, provenance, scope, budgets, and schema; it does not choose research targets or promote candidates on its own.
- A promoted person must have an observed HTTPS source page and a named identity. Search/query URLs are not claim provenance.
- Contact evidence without exact observed HTTPS provenance is dropped from the canonical promotion path.
- Activity-only Reactor shows only currently active real tool spans/tool IDs; phase/status strings cannot manufacture active nodes.
- Batch execution is bounded to three targets for live smoke; no hidden expansion.
- Research completion is truthful: timeout, budget exhaustion, provider failure, or interruption cannot be represented as a successful committed research state.
- Entity profile routes have explicit loading, error, not-found, and render failure surfaces; no blank failure state.
- Entity cards use `cookedAt` for the committed-research timestamp and show an explicit uncommitted state otherwise.
- Legacy persistence callers cannot bypass the strict provenance boundary on the canonical discovery/Dig path.
- Final live proof must demonstrate: objective → investigator trajectory → named person admission → Dig trajectory → investigator-selected contact evidence → honest card → committed timestamp.

This file is a gate, not a research playbook. It does not prescribe queries, hops, providers beyond the architectural provider boundary, or promotion thresholds for the investigator.
