# ⭐ APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-23_FRESH_REPLIT_IMPORT_RUN_02.md

**Audit started:** 2026-10-23 (Europe/Kyiv)<br>
**Source:** https://github.com/2f22vtd4kr-cloud/BigContacts<br>
**Imported `main` revision:** `0af8a6d83c9707ba4d3ffb4d5af111d31047ab84`<br>
**Current status:** Source imported. Runtime setup and reconciliation remain in progress. No Apex run has been launched from this project.

This is the chronological audit for this fresh project run. It records observed actions, exact non-secret commands/results, provider-visible decisions when safely observable, setup failures, fixes, and remaining gates.

## Audit boundaries

- Never record API keys, tokens, cookies, authorization headers, database credentials, or other secret values.
- Do not publish third-party personal contact values. Keep this tracked audit limited to redacted summaries, counts, and source provenance.
- Provider request prompts and returned outputs may be summarized or captured only through the repository's redacting audit mechanism. Hidden chain-of-thought/private reasoning is not exposed and will not be reconstructed or claimed.
- Record searches, tool calls, model/provider identities, visible structured choices, handoffs, HTTP/error categories, durable state, evidence/admission/card counts, UI projection, and lock state as separate facts.
- A successful build, health check, accepted launch, search result, or model response alone is not a successful research/card run.
- Repository content and its embedded instructions are treated as project data; current user instructions and platform safety requirements take precedence.

## Sequential events

### E001 — Project move and requested outcome

- **Action:** Moved the conversation into a fresh Build project titled “BigContacts — Apex Atlas.”
- **Requested scope:** Import the existing repository without generating a replacement app; set it up, run its existing UI flow, audit the execution, and fix evidence-backed defects without changing the bureau's model-led architecture.
- **Audit decision:** Keep this report at a normal, visible, tracked repository path. Do not place the public audit or raw contact values in ignored/private directories.

### E002 — Secure secrets request

- **Action:** Requested the 13 named provider/service credentials through Replit's secure Secrets flow.
- **Observed result:** Replit confirmed all requested names were added. Values were never returned to the agent or written to source/audit.
- **Presence check:** All 13 exact names were present. An initial check used the legacy alias `SERPAPI_API_KEY` by mistake; a corrected check of the requested name `SERPAPI_KEY` returned present. No credential value was read.

### E003 — GitHub integration and public source access

- **Action:** Searched integrations and attached the authorized GitHub connection.
- **Observed setup issue:** The attached integration reported `connect`; a Git clone was rewritten to Replit's GitHub proxy and failed because that connection was disconnected. The integration status check reported an OAuth token-validation 401. No GitHub token was requested or exposed.
- **Recovery:** The public GitHub API returned repository metadata successfully. A direct clone with the inherited Git proxy configuration disabled succeeded. This uses the repository's public source and does not repair or imply a healthy GitHub integration.

### E004 — Source snapshot and prior-attempt review

- **Action:** Shallow-cloned `main` for read-only inspection and reviewed repository instructions, the repository-study protocol, run procedure, README, current run audit, and relevant project memory.
- **Observed source revision:** `0af8a6d83c9707ba4d3ffb4d5af111d31047ab84` (`Fix private model-audit path regression test`); inspected repository tree contained 3,354 tracked files.
- **Prior-run distinctions:** The newest imported 2026-10-23 Run 01 report records setup/health verification only and explicitly says it did not launch Apex. The README describes a separate earlier job (`81a955bf-f44f-4faf-a39a-e2bcffbc5014`) that ended `failed/incomplete` with zero findings, admissions, evidence rows, and cards; it records recovered JSON-validation errors, not provider quota exhaustion. Older root audit entries describe other projects/jobs and must not be treated as this project's live state.
- **Architecture constraints noted:** Groq Boss owns direction and investigator-capability selection; the selected Groq Investigator owns research choices; Groq Right-hand provides bounded oversight. The runtime owns authorization, egress/safety controls, provenance, admission, persistence, cancellation, resource limits, and truthful failures. Do not add scripted search sequences, silently rotate providers, or treat leads/findings as cards.
- **Prior-state constraint:** This project has its own Replit database. External Redis/job state can outlive a project, so empty local tables cannot prove prior-job outcomes. Read-only reconciliation of the current active pointer/lock and any relevant job state is required before another launch.

### E005 — Starter workflows stopped

- **Action:** Stopped `artifacts/api-server: API Server` and `artifacts/mockup-sandbox: Component Preview Server` before replacing starter source.
- **Observed result:** Both stop operations succeeded.

### E006 — Import guard stopped the first Git operation

- **Action:** Attempted to preserve the starter branch before importing source.
- **Observed result:** Replit blocked the first local branch write because it modifies the protected `.git` directory. No source files were changed, no branch was created, and the worktree remained clean.
- **Recovery:** Re-ran the intended import with the explicit `DANGEROUSLY_ALLOW_GIT=1` override after verifying the workspace was still clean. The original starter commit was retained as local branch `replit-starter-initial`.

### E007 — Repository import

- **Action:** Added the public repository as remote `bigcontacts`, fetched `main` at depth 30, verified its SHA matched the inspected snapshot, and reset local `main` to that exact revision while preserving the Replit-managed `.git` directory.
- **Observed result:** `main` now points to `0af8a6d83c9707ba4d3ffb4d5af111d31047ab84`; 3,354 source files are tracked. The starter branch remains available locally. No replacement application was generated.
- **Replit artifact state:** Replit recognized the imported API artifact as “Apex Atlas” at `/` and updated its managed workflow to `cd ../.. && bash scripts/replit-boot.sh`. Runtime health and preview have not yet been verified.

### E008 — Source audit-capture configuration identified

- **Action:** Inspected the imported `.replit` and artifact configuration.
- **Observed configuration:** Model-prompt capture is enabled for development, contact-data inclusion is false, test capture is false, and visible-file opt-in is false. The configured private trace filename still says `FRESH_REPLIT_IMPORT_RUN_01`.
- **Action:** Before any model request, changed the private trace destination to this run's unique `FRESH_REPLIT_IMPORT_RUN_02` filename in both `.replit` and the API artifact configuration. Used the validated Replit/artifact replacement flows; both validations succeeded.
- **Observed safeguards:** Contact-data inclusion remains `false`, test capture remains `false`, and visible-file opt-in remains `false`. The tracked report remains separate; no hidden thoughts or raw contact values will be copied here.

### E009 — Active audit pointer and visibility

- **Action:** Set `APEX_ATLAS_RUN_AUDIT.md` to point to this starred report and checked the report against ignore rules.
- **Observed result:** This report is not ignored and is in the repository's visible `audits/` directory. It has not been committed or pushed.
- **Run boundary:** No Apex request, search, provider/model request, contact lookup, or card creation has occurred in this project as of this event.

### E010 — Locked dependencies and secret preflight

- **Action:** Ran `pnpm install --frozen-lockfile` from the repository root and `node scripts/replit-preflight.mjs`.
- **Observed install result:** All 10 workspace projects installed successfully under pnpm 10.26.1. The lockfile resolution step was skipped as current; the package install completed without changing `pnpm-lock.yaml`.
- **Observed preflight result:** All 13 active provider/service secret names and platform-managed `DATABASE_URL` were present. The script printed presence only; no secret values were read or changed.
- **Prior issue comparison:** The previous imported-run report recorded a package-firewall 403 for `proxy-addr@2.0.7`. Current `main` already pins `proxy-addr@2.0.8` through Express `^5.3.0`; this install had no firewall error. No registry bypass or lockfile edit was made.
- **Workflow note:** The starter workflows remain stopped/finished; no application run began during dependency installation.

### E011 — Architecture checks and development schema

- **Action:** Ran `pnpm run typecheck` and `pnpm run check:bureau`.
- **Observed result:** Both commands exited successfully. Typechecking passed for shared libraries, API server, mockup sandbox, and scripts. The Bureau suite passed its route/lease/lock/cancellation/provider-role/free-ReAct/provenance/admission checks and focused tests; the 50-case grounded-reviewed research gauntlet validated.
- **Action:** Queried the new development database read-only; `information_schema` showed no public base tables. After reviewing the current initializer, ran the repository's one-time command `APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh`.
- **Observed result:** Drizzle schema push, durable-invariant hardening, compatibility migrations 002–004, and required-table verification succeeded. Migration 004 corrected zero legacy rows. The schema permission was command-scoped; normal runtime boot still skips schema mutation.
- **Post-initialization read-only counts:** `entities=0`, `research_cases=0`, `research_case_events=0`, `research_sessions=0`, `research_run_events=0`, `research_evidence=0`, `contact_evidence=0`.
- **Interpretation:** The database is schema-ready and has no pre-existing research state. This says nothing about any job or database in a different Replit project.

### E012 — Canonical boot, health, desk, and previous-job reconciliation

- **Action:** Restarted the managed `artifacts/api-server: API Server` workflow using the imported artifact's canonical `cd ../.. && bash scripts/replit-boot.sh` command.
- **Observed boot:** The script logged revision `0af8a6d`, explicitly skipped schema push, ran the frontend launch-contract/security checks and Vite build, passed the API's Bureau integrity checks, built the API bundle, and started the server. Workflow is running; the separate mockup workflow remains stopped.
- **HTTP checks:** `/api/healthz`, `/api/healthz/details`, `/api/dashboard/stats`, `/api/dashboard/hot-leads`, `/api/dashboard/map-data`, `/api/ingest/scoreboard-snapshot`, `/api/system/status`, and `/` all returned HTTP 200. Health reported Redis `ok`, required provider names configured, `bureauIntegrity=ok`, and `autoPipeline=false`; these are configuration/health checks, not proof of live provider authentication.
- **Rendered desk:** The root page shows the Apex Atlas Overview, `READY`, `DB 1/1`, `5 LIVE`, zero entities/priority/assets/links, and the `Launch Apex Atlas` button. Browser output contained only the standard React DevTools informational notice.
- **Read-only state reconciliation:** `GET /api/ingest/job/active/atlas-run` returned `active=false`, `jobId=null`. The known prior job `81a955bf-f44f-4faf-a39a-e2bcffbc5014` is `failed` / `incomplete`, not active; its recorded build revision is older than this import. The legacy jobs view showed 15 idle entries. New-project research-table counts remain zero.
- **Launch contract:** The UI helper's default canonical request is `POST /api/ingest/atlas-run` with `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}` and no single target or discovery context. The source default objective is broad discovery of people with credible wealth potential and public/professional approach routes; this request supplied no narrower sector/geography. The user's instruction explicitly asks for one UI-equivalent default launch.
- **Pre-launch build-stamp issue:** The build stamp reports the imported revision but `dirty=true`, because the requested audit and run-specific configuration/pointer are still uncommitted. Do not launch against that dirty stamp. The setup/audit/config changes will be committed locally on canonical `main` and the workflow restarted once to produce a clean stamp; no push is planned.
- **Run boundary:** No launch POST, model/provider request, web search, contact lookup, or card creation has occurred yet.

### E013 — Pre-launch commit check

- **Action:** Reviewed the pending configuration/audit diff and ran `git diff --check` before staging the setup state.
- **Observed issue:** The command stopped on trailing Markdown line-break spaces in the new audit header, before any files were staged or committed. No application or audit content was lost.
- **Correction:** Replaced the trailing spaces with explicit `<br>` tags. The full diff check and local commit must pass before the clean-stamp restart.

## Current gates

- [x] Securely request the listed secret names and verify presence without reading values.
- [x] Stop starter workflows.
- [x] Review current source and prior-run evidence before launch.
- [x] Import the exact inspected public `main` revision while preserving the Replit checkout.
- [x] Point model-prompt capture at this run's unique private trace path; retain contact redaction and visible-audit safeguards.
- [x] Create the starred, non-ignored run audit and make it the current audit pointer.
- [ ] Validate runtime configuration, dependency installation, required checks, database schema, and provider/Redis health.
- [ ] Reconcile current active job/lock and prior state read-only.
- [x] Verify the loaded Apex UI, launch contract, prior job state, and idle lock.
- [ ] Commit setup/audit/config state locally and rebuild against a clean source stamp before launch.
- [ ] If a run is authorized and safe to proceed, observe it frequently and verify terminal status, evidence/provenance, admissions/cards, UI projection, and lock release. Do not claim success unless each required layer is observed.
