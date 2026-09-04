# Apex Atlas live audit — 2026-09-04

This is the execution audit for the current BigContacts Replit App run. It is
append-only during the run and intentionally records blockers instead of
turning partial startup into a success claim.

## Source update

- Remote: `origin/main`
- Remote tip fetched: `e43f2f285ccd197ef9f45bc4d470ad18b2c0e5ca`
- Working tip after reconciling the local project commit: `4e84804`
- Update result: latest `origin/main` changes are present; the local project
  commit was rebased on top rather than discarded.
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

Replace `REDIS_URL_1` with a usable Upstash Redis URL through the secure
Secrets flow. After restart, require health to show Redis connected before
launching the bounded discovery-first seed and the proof Dig.