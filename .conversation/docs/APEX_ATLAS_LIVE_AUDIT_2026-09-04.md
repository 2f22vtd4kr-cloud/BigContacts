# Apex Atlas live audit — 2026-09-04

This is the execution audit for the current BigContacts Replit App run. It is
append-only during the run and intentionally records blockers instead of
turning partial startup into a success claim.

## Source update

- Remote: `origin/main`
- Remote tip fetched: `e43f2f285ccd197ef9f45bc4d470ad18b2c0e5ca`
- Runtime source tip: `2360bd9`
- Update result: latest `origin/main` changes are present; the local project
  commits were retained on top rather than discarded.
- No second application or separate product was created.

## Runtime configuration

- API workflow: `API Server`
- API port: `8080`
- `ENABLE_AUTO_PIPELINE=false`
- `INSTALL_PYTHON_OSINT=false`
- `APEX_SKIP_SEMANTIC=1`
- `RESEARCH_DEPTH=standard`
- Secrets: all 14 requested runbook keys were added through the secure
  environment flow; values are not recorded here.

## Build and static checks

- Dependency install: **OK**
- Database schema push: **OK** — no changes detected
- Apex desk build: **OK** — `artifacts/apex-finder/dist/public/index.html`
  exists
- API build: **OK** — bundled API completed and started
- `check:no-force-dig`: **OK**
- `check:free-react`: **OK**
- Full `pnpm run typecheck`: **BLOCKED**
  - Current canonical API source still reports 110 TypeScript diagnostics,
    including missing `extractTextFromPdfBuffer` /
    `resolveResearchDepth`, stale entity-field types, and several
    `DiscoveryContactEvidence` / telemetry type mismatches.
  - The mockup-sandbox Vite mismatch was corrected; its typecheck now passes.

## API startup and health gate

- API server: **RUNNING**
- Desk static serving: **ENABLED**
- Provider slots loaded: Groq, Gemini, Tavily, Exa, Serper, Mistral, NVIDIA
  NIM, Companies House, Scrapfly, ZenRows, and WhoisJSON
- `bureauIntegrity`: `ok`
- Health endpoint status: `ok`
- Redis: **ERROR**
- Redis runtime evidence: the sole Upstash slot (`upstash-1`) reported
  `Quota exhausted`, then `Connection is closed`; permanent Redis commands
  failed and the connection was marked unavailable.
- Entities ledger at check time: empty

## Bureau launch decision

Discovery-first seed, single-target Dig, polling, rehydration, and scoreboard
were **not started**. This is a deliberate hard stop: Apex must not run a
research job while its permanent Redis store is unavailable, and the runbook
requires the operator to replace `REDIS_URL_1`, restart the API, and re-check
health first.

## Next required action

The initial Redis blocker was resolved by replacing `REDIS_URL_1` through the
secure Secrets flow. After restart, the health gate showed Redis connected and
the bounded proof was launched.

## Live proof result

- Job: `ddf9c0a5-9c5d-4ca3-9dbd-fc7ef3566310`
- Launch: discovery-first, 3 exploration slots, `researchLimit=2`,
  `skipFaa=true`, standard research depth
- Started: `2026-09-04T07:04:03.664Z`
- Finished: `2026-09-04T07:14:18.674Z`
- Runtime outcome: `done` / `complete` at the lifecycle layer
- Research result: **0 admitted entities, 0 hot leads, 0 contacts**
- Errors: `0`
- Discovery result: **0 source-backed model candidates**
- Provider/model observed: Dig-capable Groq lane, model
  `qwen/qwen3.8-27b`
- Discovery telemetry: **10 model-selected searches, 11 model-selected
  visits**, `degraded=false`
- Model-selected action vocabulary observed: `web_search`, `visit`,
  `browser_fetch`, `llm_step`, and `llm_wait`
- No `force_*` action, fixed hop, scripted playbook, or fabricated candidate
  was observed.
- Observed source URLs included:
  - `https://compass.seraf.io/compass/article/family-office-investor-profile-series-rashaun-williams-founder-and-chairman-value`
  - `https://www.modus.news/p/family-offices-enter-a-new-stage-of-the-portfolio-continuum`
  - `https://thebusinessjournal.com/one-year-later-realty-concepts-acquisition-of-guarantee-real-estate-surpasses-expectations/`
  - `https://thebusinessjournal.com/realty-concepts-acquisition-of-guarantee-forges-valleys-biggest-brokerage/`
  - Search results also exposed organization/personal surfaces such as
    LinkedIn, but none met the admission boundary.

Because admission was zero, there was no valid `singleTargetId`; Dig,
promotion/rehydration, and contact-card verification were correctly not
attempted. This is an honest **research-quality failure**, not a successful
scoreboard proof.

## Scoreboard and final health

- Final Redis health: `ok`, cached health probe
- Final `bureauIntegrity`: `ok`
- Agentic LLM last success: `true`
- Agentic LLM last model: `qwen/qwen3.8-27b`
- Entity ledger: empty
- Scoreboard snapshot: `count=0`, `mean=0`, `milestonePass=false`
- No scoreboard pass is claimed.

## Redis usage audit

- Exactly one permanent Redis slot was configured: `REDIS_URL_1`.
- No `REDIS_URL_2`–`REDIS_URL_9` slot was added or used.
- The initial quota error was not retried against the exhausted slot after it
  was marked unavailable; the API was restarted only after the replacement
  secret was supplied.
- The API performed one bounded launch and one restrained status poller
  (15-second interval); no second Atlas job or parallel launch was started.
- The job queue uses 7-day TTLs for job hashes, logs, and active pointers;
  logs are capped at 200 entries.
- Active-job reads use an 8-second cache; the dashboard status response uses a
  15-second cache and batches multi-job pointer reads with `MGET`.
- The status path does not scan `apex:job:*`. These are the relevant
  protections against an idle-dashboard Redis command leak.

## Remaining blockers

1. The live bounded proof admitted zero people, so the required
   named-person → free-ReAct Dig → honest card chain remains unproven.
2. Full `pnpm run typecheck` remains blocked by 110 existing API
   TypeScript diagnostics, despite successful runtime build and static
   free-ReAct/no-force checks.