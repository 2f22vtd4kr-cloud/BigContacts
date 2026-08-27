# Volume 24 — DigSpan Schema

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN  
**Inspired by:** OpenTelemetry GenAI conventions, Honeycomb agent timelines, LangSmith traces (see earlier plan citations in dig-span module headers on main).

## Span fields (normative)

| Field | Type | Description |
|-------|------|-------------|
| id | string | unique span id |
| jobId | string | atlas job |
| ts | ISO time | event time |
| kind | tool\|llm\|stage\|promote\|error | taxonomy |
| name | string | web_search, visit, groq, card_promote, … |
| target | string | person or company name |
| status | active\|ok\|error\|cancelled | |
| summary | string | short operator text |
| attrs | object | query, url, provider, findingCount, … |
| parentId | string? | optional parent span |

## Mapping from ReAct

| Loop event | kind | name example |
|------------|------|----------------|
| llmStep start/end | llm | groq\|mistral\|gemini\|nvidia |
| web_search | tool | web_search |
| visit | tool | visit |
| browser_fetch | tool | browser_fetch |
| registry_search | tool | registry_search |
| footprint_* | tool | footprint_email |
| orchestrator stage | stage | foundation_filings |
| card promote | promote | card_promote |

## API

`GET /api/ingest/atlas-status` → `recentSpans: DigSpan[]`

## UI rules

- Render newest first or chronological with clear Now marker
- Idle job → empty spans or aged-out only
- Do not invent spans for tools that did not run
