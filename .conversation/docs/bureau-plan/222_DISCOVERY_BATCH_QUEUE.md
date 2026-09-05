# Volume 222 — Discovery Implementation Batch Queue

Ordered:

1. **D1 — Spec + orientation** (this volume set): no code required beyond docs
2. **D2 — `runDiscoveryAgent` MVP**: ReAct with web_search/visit/done → candidates; wire optional flag `discoveryAgent: true`
3. **D3 — Intake consumes agent candidates** same as broad candidates
4. **D4 — Live Desk**: show discovery spans + basis on review deck
5. **D5 — Degrade**: templates only when agentic LLM unavailable
6. **D6 — Reduce default template blast** when agent path healthy (don’t delete library yet)

## Acceptance D2

- Single discovery agent run produces ≥1 candidate with sourceUrls on integrity-ok desk **or** honest empty with spans showing search
- No force_* query controller
- check-no-force-dig still green (discovery must not reintroduce force pattern)

## KPI

Compare admitted-from-agent vs admitted-from-templates on later dig non-empty rate.

