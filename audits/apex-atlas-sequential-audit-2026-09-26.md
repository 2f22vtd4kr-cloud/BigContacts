# Apex Atlas Sequential Audit — 2026-09-26

## Audit scope

This file records the launch attempt in strict chronological order, from repository import through Apex Atlas discovery, research, card creation, and any later continuation or failure. Secret values are never recorded.

## Sequence

### 000 — Audit opened

- Status: `started`
- The audit was opened before the application launch attempt.
- Audit file: `audits/apex-atlas-sequential-audit-2026-09-26.md`

### 001 — Source repository selected

- Source: `https://github.com/2f22vtd4kr-cloud/BigContacts`
- Branch: `main`
- Imported source commit: `95af4a4` (`test(atlas): remove unused Right-hand fallback export`)
- Action: preserved the repository's own UI, backend, runtime, schema scripts, documentation, and prior audit history; no replacement implementation was created.

### 002 — Runtime secrets confirmed

- The requested secret names were supplied through secure project secrets.
- Secret values were not read, printed, or written to this audit.

### 003 — Canonical runtime path identified

- Repository contract: `bash scripts/replit-boot.sh`
- Expected application port: `8080`
- Expected desk surface: `/`
- Expected API surface: `/api/`
- Auto-pipeline setting from the imported project: `ENABLE_AUTO_PIPELINE=false`

### 004 — Launch attempt

- Status: `failed-before-port`
- The first restart of the managed API service returned a server-disconnect failure before the workflow opened its port.
- Workflow logs contained no application output.

### 005 — Dependency installation

- Action: installed the imported repository with `pnpm install --frozen-lockfile`.
- Result: completed successfully for all 10 workspace projects; the lockfile was unchanged.
- No source implementation was changed.

### 006 — Launch retry

- Status: `passed`
- The managed service started on the repository's canonical port.
- Startup completed the repository's own desk build and API build.
- The service reported no schema push because ordinary runtime boot keeps schema mutation disabled.

### 007 — Runtime readiness

- `GET /api/healthz`: HTTP `200`
- Health result: `status=ok`
- Redis: `status=ok`
- Research keys: configured
- Desk root: HTTP `200`, served the original Apex Atlas desk HTML.

### 008 — Pre-launch UI contract

- The original UI launch control posts to `/api/ingest/atlas-run`.
- Default launch payload from the imported source: `targetCount=3`, `researchDepth=standard`, `targetTimeoutMs=420000`.
- No mock flag or alternate implementation will be used.

### 009 — Canonical launch

- Status: `accepted`
- Request: `POST /api/ingest/atlas-run`
- Response: HTTP `202 Accepted`
- Job ID: `5abb5432-f9f9-4829-9594-38b109fb7f82`
- Server message: canonical model-owned discovery started.
- Poll URL: `/api/ingest/job/5abb5432-f9f9-4829-9594-38b109fb7f82`

### 010 — Discovery observation

- Status: `failed-at-durable-case-creation`
- Job record: status `failed`, progress `0`, outcome `incomplete`.
- The server entered the canonical discovery opening path: Gemini Boss opening → Gemini Right-hand review → model-owned Investigator discovery.
- Failure occurred while inserting the discovery case into `research_cases`.
- Exact compatibility signal: the insert referenced `research_cases.target_entity_id`, but the live schema rejected the operation because that column is missing.
- No target discovery, research act, oversight cycle, or card creation ran after this failure.
- No schema mutation was performed during this launch attempt.

### 011 — Break point preserved

- This is the first functional break in the fresh run.
- The original repository's README and run procedure had already identified this missing-column compatibility blocker; the failure reproduces it on the current environment.
- Next action: inspect the repository's explicit schema initialization contract and verify current database state before any schema mutation.

### 012 — Runtime database verification

- Read-only schema inspection through the project's database surface returned no public Apex tables.
- A second read-only inspection through the same `DATABASE_URL` package context used by the repository also returned no public tables or Apex columns.
- The project has the platform-managed `DATABASE_URL` runtime variables available.
- This confirms a first-time schema initialization is required for this fresh project; no existing application rows were found in the inspected public schema.

### 013 — Explicit schema initialization

- Status: `passed`
- Using only the repository's documented first-time command: `APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh`.
- The mutation window will be limited to this explicit initialization command; ordinary boot remains schema-mutation disabled.
- Drizzle applied the current repository schema successfully.
- Required durable tables were verified present.

### 014 — Post-schema runtime restart

- Status: `passed`
- The canonical service restarted successfully.
- Startup log again reported schema push skipped during ordinary boot.
- Health: HTTP `200`, Redis `ok`, research keys configured.
- Active Atlas job check: no active job remained from the failed pre-schema launch.

### 015 — Canonical launch retry

- Status: `accepted`
- Request: `POST /api/ingest/atlas-run`
- Response: HTTP `202 Accepted`
- Job ID: `797c5ef3-cfbd-4965-9eaf-646feefb1854`
- Server message: canonical model-owned discovery started.
- This retry reached the pipeline after schema initialization.

### 016 — Discovery retry observation

- Status: `failed-at-right-hand-oversight`
- Job record: status `failed`, progress `3`, outcome `incomplete`, `atlasPhase=3/4`.
- Gemini Boss completed opening guidance.
- Gemini Right-hand opening review completed with a `proceed` decision and strict attribution/reachability guidance.
- Investigator lane selected: Groq.
- One model-owned Serper search executed; it returned `0 URLs`.
- No page visits occurred.
- The discovery case was created as `caseId=1`.
- The run then failed closed because Gemini Right-hand became unavailable with `gemini-3.8-flash gemini cooldown`.
- No target-scoped research act ran and no contact card was created.

### 017 — Durable discovery state capture

- Status: `passed`
- Case `1` persisted with `caseType=discovery`, `status=review`, `directorMode=gemini_boss`, `currentAction=canonical-control-unavailable`, and no target entity.
- The case memory retained the exact job/run binding, Investigator lane (`groq`), one failed Serper observation (`HTTP_400`, zero URLs), and no candidate/contact facts.
- The append-only event ledger recorded Boss opening, Right-hand opening review, Groq assignment, the Serper error observation, and the fail-closed Right-hand control decision.
- Durable state confirms no target-scoped research act or trusted contact promotion occurred.

### 018 — Clean retry window

- Status: `accepted`
- The provider cooldown window was allowed to clear without changing source or provider policy.
- Request: `POST /api/ingest/atlas-run`
- Response: HTTP `202 Accepted`
- Job ID: `f8f93280-baf1-4824-937b-9b44fbb05ead`
- Payload remained `targetCount=3`, `researchDepth=standard`, `targetTimeoutMs=420000`.

### 019 — Third discovery observation

- Status: `failed-at-boss-opening`
- Job record: status `failed`, progress `1`, outcome `incomplete`, `atlasPhase=1/4`.
- The run was accepted and entered the canonical Boss opening stage.
- Gemini Boss became unavailable after its bounded same-role model fallback.
- Exact terminal message: `Gemini Boss gemini-3.5-flash request deadline exceeded after 30002ms with no HTTP response`.
- No discovery case, Investigator action, target-scoped research act, or contact card was created by this run.

### 020 — Third-run terminal state capture

- Status: `passed`
- The only durable discovery case is case `1`, from the earlier Right-hand failure; it remains `review` with no target entity.
- Durable counts after the third run: `entities=0`, `contact_evidence=0`.
- No target card, target-scoped research session, trusted contact, or card promotion exists.
- The canonical API remains running with ordinary schema mutation disabled.

## Terminal outcome

- The original Apex Atlas UI and backend were run without replacement code.
- The first schema blocker was resolved through the repository's explicit first-time schema command.
- Three canonical UI-equivalent launches were audited:
  1. Pre-schema run: failed at durable case creation because the live schema lacked `research_cases.target_entity_id`.
  2. Post-schema run: reached real discovery, persisted a case and event ledger, then failed closed at Gemini Right-hand cooldown after one Serper `HTTP_400` search with zero URLs.
  3. Clean retry: failed closed at Gemini Boss opening after the bounded same-role fallback; `gemini-3.5-flash` timed out after 30,002 ms with no HTTP response.
- Terminal blocker: external Gemini provider availability/capacity, with a separate Serper `HTTP_400` during discovery.
- Research, target oversight, and contact-card creation were not reached; the audit stops at the next provider failure rather than fabricating success.
