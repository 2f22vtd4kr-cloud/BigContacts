# Volume 26 — Acceptance Test Catalog

**Part of:** APEX_ATLAS_MASTER_BUREAU_PLAN

Each test: id, preconditions, steps, expected.

| ID | Pre | Steps | Expected |
|----|-----|-------|----------|
| T-HEALTH-01 | Serper keyed | GET healthz | web search active > 0; integrity not critical solely for search |
| T-HEALTH-02 | Groq keyed | GET healthz | agentic LLM slots > 0 |
| T-HEALTH-03 | No Gemini | GET healthz | Boss slot reflects missing; integrity may degrade |
| T-LAUNCH-01 | Idle integrity ok | POST atlas-run canonical | 202 jobId |
| T-LAUNCH-02 | Already running | POST atlas-run again | 409 existing jobId |
| T-STOP-01 | Running job | DELETE atlas-lock | idle; no LIVE |
| T-PAUSE-01 | Running with pause route | POST pause | paused; resume continues |
| T-DIG-01 | Healthy keys | singleTargetId known public filer | trajectory has web_search or visit |
| T-DIG-02 | After visit HTML with email | inspect evidence | evidence row with sourceUrls |
| T-DIG-03 | done with empty findings array but bag full | loop | accepts done |
| T-DIG-04 | cancel mid dig | stop | partial findings retained |
| T-PROM-01 | evidence phone+url | after dig | entities.phone set |
| T-PROM-02 | agentic then EDGAR enrich | order passes | agentic phone remains |
| T-PROM-03 | agentic-web-org phone only | outcome | organization_contact |
| T-ID-01 | different surname personName | promote | blocked personal |
| T-ID-02 | graph edge different surname | POST relationship | rejected without stable id |
| T-UI-01 | idle | Reactor | no LIVE spans |
| T-UI-02 | running dig | Live Desk | span names match tools |
| T-UI-03 | mobile running | header | Pause/Stop not clipped |
| T-UI-04 | scheme live mode | during dig | unused nodes dim/hidden |
| T-REDIS-01 | exhausted then PING ok | status | slot not stuck exhausted forever |
| T-REDIS-02 | redis down single node | Launch | memory job progresses |
| T-PHASE-01 | during discovery | status message | single taxonomy string |
| T-CMP-01 | fixture target | Vol 16 protocol | scoreboard file written |

## Automation notes

Prefer API-level tests for T-HEALTH/T-LAUNCH/T-PROM. UI tests use Playwright when available. Comparison T-CMP remains human-assisted for baseline agent.
