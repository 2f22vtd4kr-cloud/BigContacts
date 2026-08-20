# Bureau local verification — 2026-08-20

## Scope
Validate Apex Atlas investigatory bureau (agentic web + Boss Gemini) while Replit credits unavailable.

## Bugs found and fixed (this session)

| Issue | Impact | Fix | Commit |
|-------|--------|-----|--------|
| Groq hard-coded `llama-3.3-70b-versatile` | Agentic loop dead on this key | Model fallback → gpt-oss-120b etc. | `f8bb80a` |
| Visit loop no structured proxy findings | Zero role/related from SEC HTML | `findingsFromProxyPage` on every visit | `4c002e6` |
| Repeat same search/URL | Wasted iterations | skip_repeat_visit + diversity nudge | `4c002e6` |
| SEC proxy ranked low (5) | Missed DEF 14A bio pages | `*proxy*` / DEF14A rank 1 | `4c002e6` |
| Retired Gemini 2.5 ids for new users | Boss 404 | Expand RETIRED denylist | this commit |

## Live agentic smoke (Andrew F Johnson / Hastings)

Exact LLM queries observed:
1. `Hastings Manufacturing Co DEF 14A proxy Andrew F Johnson`
2. `Andrew F Johnson Hastings Manufacturing Co proxy`
3. `Andrew F Johnson Hastings Manufacturing Co DEF 14A 2022`
4. `Andrew F Johnson Hastings Manufacturing Co proxy 2023`

Findings after proxy-page extractor: related **Mark R. S. Johnson** from SC13/proxy HTML.

Deterministic proof on correct DEF 14A URL  
`https://www.sec.gov/Archives/edgar/data/46109/000090572903000166/hastproxy041403.htm`:
- Role: **Hastings' President since November 2001**
- Related: Mark R. S. Johnson, Neil A. Gardner

→ With rank + extractor + `edgar-identity-boost`, CT-001 surface is recoverable.

## Boss (Gemini)
- API key lists models; `generateContent` on 2.5-flash rejected for new users; 3.x / flash-latest hit **503 capacity** intermittently.
- Code already retries next catalog model + backoff; RETIRED list updated so catalog cannot re-pick dead 2.5 ids.

## Not completed in this sandbox
- Full pnpm monorepo + Postgres API server (install stalled on environment)
- End-to-end Launch Atlas job through HTTP

## Operator next step
Redeploy Replit from tip (`4c002e6`+), clear ledger, one bounded run, re-score CT-001.
