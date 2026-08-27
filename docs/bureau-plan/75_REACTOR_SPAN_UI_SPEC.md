# Volume 75 — Reactor Span UI Spec (Detailed)

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

## Data

`GET /api/ingest/atlas-status` → `recentSpans[]` with spanType, name, status, inputSummary, resultSummary, targetName, startedAt.

## Desktop Live Desk

- List newest-first or chronological with NOW marker on active  
- Group optional by targetName during multi-target jobs  
- Click span filters scheme node if mapped  
- Empty idle: “No active dig spans”  

## Mobile

- Compact one-line: `{spanType} {name} · {target}`  
- Expand for summaries  

## Mapping scheme nodes

| Span name contains | Node family |
|--------------------|-------------|
| web_search / serper / tavily / exa | Search |
| visit / browser | Visit |
| registry / edgar / companies | Registry |
| maigret / holehe / sherlock | Footprint |
| groq / mistral / gemini / nvidia | LLM |
| promote | Card |

## Banned UI

Fixed dig step counter; LIVE when recentSpans empty and job idle.
