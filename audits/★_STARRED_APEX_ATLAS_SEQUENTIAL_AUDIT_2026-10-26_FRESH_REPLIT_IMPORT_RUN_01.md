# ★ STARRED — Apex Atlas Sequential Audit — Fresh Replit Import Run 01 — 2026-10-26

**Status at opening:** repository snapshot downloaded for inspection; not yet imported into the project; Apex has not been started or launched.
**Opened:** 2026-10-26 (Europe/Kyiv).
**Repository:** https://github.com/2f22vtd4kr-cloud/BigContacts
**Branch:** `main`
**Current source commit:** `87fd8d04eb56f8a5dbbc00dfb2076ae1e50c1f69` (2026-10-26T10:29:39Z), “fix(atlas): preserve truthful review-lead evidence tiers (#756)”.
**Audit location:** `audits/`; this file is intentionally visible and starred by filename.
**No push or publication has been attempted.**

## Acceptance contract

One successful run means a single canonical UI-equivalent launch, real model-directed discovery and research, source-backed evidence that passes the repository's actual admission gates, at least one durable card/entity retrievable by the ordinary UI/API path, and terminal job status with the active-job lock released. A successful import, build, health check, accepted launch, model call, or pre-existing card alone is not a successful run.

## Audit boundaries

- Record events in order, with timestamps, exact non-secret commands and requests, observed response/status, model/provider identifiers, visible prompts/completions or a trace pointer, tool/search/source counts, evidence/admission/card deltas, errors, recovery attempts, and operator analysis.
- Keep credentials, bearer values, passwords, cookies, database URLs, and other secrets out of all reports and logs.
- Do not claim or reproduce private hidden chain-of-thought. Record model-visible prompts, observable completions, structured rationales/decisions, and tool-call payloads where safely available.
- This visible tracked report will not publish raw personal contact details or unrestricted raw page contents. Follow the repository's trace design for high-fidelity model-visible data in its ignored `.local/audits/` trace; this report will identify the trace file by path and summarize its contents without copying it.
- Do not fabricate targets/cards, force an itinerary, weaken evidence/admission rules, or start a second job while an accepted job or active lock is unresolved.

## Sequential event log

### E000 — New project and secure credential setup

- The conversation was moved into a new project as requested. The initial files observed were the generated pnpm starter workspace, with starter API and mockup artifacts/workflows; no BigContacts source had been imported at this point.
- The user requested 13 provider/service secrets. The secure Replit secrets flow confirmed the names were added. Values were not displayed, read, copied into commands, or recorded in this audit.
- No Apex process, provider request, search, database write, card creation, or launch occurred.

### E001 — Standard Git transport blocked; public API fallback selected

- `git ls-remote --heads https://github.com/2f22vtd4kr-cloud/BigContacts.git main` failed because the Replit Git transport rewrote the URL to `github.replit.internal`; the proxy reported the GitHub connection disconnected and returned HTTP 400.
- Inspection showed the rewrite originates from `/run/replit/agent-git-proxy.gitconfig`. Disabling only the global Git config did not bypass it; a shallow `git clone` was likewise rewritten and failed before a checkout was created.
- Direct unauthenticated `https://api.github.com/repos/2f22vtd4kr-cloud/BigContacts` returned HTTP 200. No reconnect prompt was issued, consistent with the user's instruction to avoid reconnecting if a public download path works.
- The GitHub API archive endpoint successfully downloaded and extracted `main` under `/tmp/BigContacts`. The resolved commit is recorded in this report header. The temporary extraction command ended with exit 141 because `head` closed a file-listing pipe early under `pipefail`; the archive was valid and extraction completed. This was a listing-command condition, not a download or extraction failure.
- The source archive is still only staged for inspection; the project checkout has not been overwritten or reset.

### E002 — Prior project guidance reviewed before import

- Reviewed the repository's `AGENTS.md`, project-memory index, GitHub-import notes, and run-environment notes, plus the preceding starred audit.
- The repository requires preserving the current Replit `.git` metadata, documenting each run in a visible starred `audits/` file, keeping raw high-fidelity traces separate in ignored `.local/audits/`, and never recording secret values or hidden chain-of-thought.
- Prior run reports emphasize that setup and health checks are not research success; an accepted launch must be reconciled to its job, active lock, evidence/admissions, durable card, UI/API retrieval, and terminal state. Old job identifiers and outcomes are historical only and must not be presumed active or resolved in this project.
- The newest imported source describes Apex as HNWI/operator intelligence with public-source evidence and attributable contact paths. This is not automatically equivalent to generic Apollo-style lead generation. Do not change the product objective or invent a target to force a card; inspect the actual launch contract and record the scope distinction before any run.

### E003 — Audit created before import

- Created this starred audit in the project before importing source files or changing the starter checkout.
- No source code, artifact configuration, Git metadata, database schema, or runtime has been changed by this run so far.

### E004 — Product scope and canonical operator path checked

- The repository describes Apex Atlas as a public-source OSINT research desk for owners, founders, operators, and high-net-worth individuals connected to private companies and capital. This is narrower than generic Apollo-style company/contact prospecting; the run will exercise the imported product as implemented rather than alter its mission to manufacture a generic lead workflow.
- The documented control loop is Groq Boss → Boss-selected Groq Investigator capability → bounded independent Groq Right-hand oversight, with deterministic controls for authorization, evidence, identity, persistence, cancellation, and limits. There is no fixed identity/company/contact itinerary.
- The README explicitly says the product has not yet met live end-to-end acceptance. Historical run evidence includes several genuine model-led loops that ended with zero findings/cards; an earlier acceptance status or current structural checks cannot substitute for this run's live evidence.
- The source's `.replit` development settings request visible model-request capture, contact-data capture, and a local trace destination, while disabling test capture and visible-file opt-in. The configured trace path still names an earlier run. Before startup, change only the destination to a unique current-run path under `.local/audits/` and verify it agrees with the API artifact's development settings; do not enable test capture or visible raw-trace output.
- The canonical startup script explicitly keeps schema mutation disabled by default and maps `REDIS_URL_1` to `REDIS_URL` when needed. First-time schema setup must use the repository initializer only after checking this project's development database is empty.
- No provider call, search, database mutation, launch request, evidence, admission, or card has occurred.

### E005 — Starter services stopped; direct public Git access confirmed

- Stopped both starter-template services (`artifacts/api-server: API Server` and `artifacts/mockup-sandbox: Component Preview Server`); both returned success. This prevents starter logs/previews from being mistaken for the imported application.
- Corrected the earlier Git transport test by disabling both system and global Git configuration: `GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null git ls-remote --heads https://github.com/2f22vtd4kr-cloud/BigContacts.git main` returned the exact GitHub API SHA recorded above.
- This confirms anonymous Git fetch is available without reconnecting. Next import operation will preserve this project's `.git` directory and audit file.
- No provider call, database operation, launch request, search, evidence, admission, or card has occurred.

### E006 — Verified upstream `main` fetched into the existing checkout

- The starter checkout was on local `main` at `fa3ed5c30d531210c738e28913d236fe8ed969a` with no remote configured; the only worktree addition was this visible audit.
- Added the public repository as `origin` and fetched `main` using the corrected system/global Git-config override. The fetch received 3,413 objects (45.62 MiB); `FETCH_HEAD` and `origin/main` both equal `87fd8d04eb56f8a5dbbc00dfb2076ae1e50c1f69`, matching the independent GitHub API response.
- The existing `.git` directory and local `main` worktree are still intact at this event. The next step is the requested source import; the starred audit, `.local` conversation files, and workspace-managed checkout metadata must remain.
- No provider call, database operation, launch request, search, evidence, admission, or card has occurred.

### E007 — Exact upstream source imported into local `main`

- After confirming `origin/main` matched GitHub's public API result, reset the existing local `main` checkout to `origin/main`. The `.git` directory was preserved; the previous starter commit remains in local history. No broad `git clean` was run.
- Verified `HEAD=87fd8d04eb56f8a5dbbc00dfb2076ae1e50c1f69`. The starred audit survived the import as an untracked file under the repository's visible `audits/` directory, and `git check-ignore` confirmed it is not ignored.
- Replit detected the imported API artifact metadata and updated the existing artifact in place to **Apex Atlas**, kind `api`, preview path `/`; its managed workflow now runs the source's canonical `cd ../.. && bash scripts/replit-boot.sh` command. No replacement application was generated.
- The imported `.replit` and API artifact development settings still point to a prior run's local model-audit filename. Before starting the app, align both settings to one unique filename for this run under `.local/audits/`, while retaining test capture disabled and visible-file opt-in disabled.
- The imported `main` is a shallow fetch at the exact current source commit. No push was made. No package install, database change, provider call, launch, search, evidence, admission, or card has occurred.

### E008 — Direct Replit configuration edit rejected by platform guard

- Read the imported root `.replit`, API artifact manifest, and `.gitignore`. The report filename is not ignored; `.local/` remains ignored for the raw trace as the source requires.
- A direct edit to root `.replit` was rejected with Replit's explicit instruction: write the complete updated TOML to a workspace temp file and use `verifyAndReplaceDotReplit`. The rejected operation did not modify `.replit`.
- A sibling temporary artifact manifest was created from the reviewed source configuration, changing only the per-run trace destination. Root and artifact settings will be validated with their respective platform validators before installation or runtime startup. The tracked report remains visible; the raw model trace remains in the source's ignored `.local/audits/` location.
- No provider call, database write, application start, launch request, search, evidence, admission, or card has occurred.

### E009 — Dependencies and static/architecture preflight passed

- `pnpm install --frozen-lockfile` completed for all 10 workspace projects. The lockfile was up to date; Node optional/native postinstall steps completed. Runtime versions are Node `v22.23.4`, pnpm `10.26.1`, and Python `3.13.11`.
- `node scripts/replit-preflight.mjs` reported all 13 requested secret names present and platform-managed `DATABASE_URL` present. The check was presence-only; no values were read or logged.
- `pnpm run typecheck` passed for workspace libraries, API server, mockup sandbox, and scripts.
- `pnpm run check:bureau` passed in full, including canonical route/lease/Redis-fail-closed, free-ReAct/autonomy, evidence/admission, provider-role, source/provenance, timeout, security boundary, Gauntlet, and focused test checks. The Gauntlet validation reported 50 grounded-reviewed cases; phone/source tests passed 44/44, research-run validator tests 6/6, and campaign-score tests 6/6.
- These are structural checks only. No model/provider request, search, launch, evidence row, admission, or card was produced by the checks.

### E010 — Fresh development database confirmed empty

- Read-only query against this project's platform-managed development `DATABASE_URL` found zero public base tables. Counts were therefore absent—not zero rows—for the expected Apex durable tables.
- The repository schema and initializer were inspected first. Because the database is confirmed empty and the project needs the documented Apex schema, the source's one-time initializer is the appropriate next step. No application run or user data exists in this database to overwrite.
- No provider call, launch request, search, evidence, admission, or card has occurred.

### E011 — Documented one-time schema initialization completed

- Ran `APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh` once against the confirmed-empty development database.
- Drizzle applied the current schema. Migrations `001`–`004` completed; migration `004` reported that it corrected zero legacy rows. The initializer verified the required durable Apex tables.
- The initialization opt-in was scoped to this one command. Ordinary API startup remains schema-mutation-disabled; no seed/sample rows were created.
- No provider call, launch request, search, evidence, admission, or card has occurred.

### E012 — Canonical API booted and live health/lock checks passed

- Restarted only the imported managed API workflow. The log identifies the exact source commit, confirms schema push was skipped for ordinary boot, passes the frontend launch and source-boundary guards, passes the API's autonomy/provenance/recovery/provider-boundary checks, builds the frontend and API, and starts the canonical API server.
- The stopped component-preview workflow remains finished; its earlier `SIGTERM` is the expected result of stopping the starter service, not an Apex failure.
- `GET /api/healthz` returned `status=ok`, Redis `ok` (122 ms), and `researchKeysConfigured=true`.
- `GET /api/healthz/details` returned `status=ok`, `bureauIntegrity=ok`, no integrity reasons, `registryShallowRisk=false`, and `autoPipeline=false`. Provider readiness counts included two Groq Investigator capabilities and configured required search/fetch services; no model request is evidenced (`agenticLlmLastOk=null`).
- `GET /api/ingest/job/active/atlas-run` returned `active=false`, `jobId=null`. The canonical lane is idle at this observation. Before the one allowed launch, reconcile known prior job IDs read-only where the imported API can retrieve them.
- No launch, model request, search, page fetch, finding, evidence, admission, or card has occurred.

### E013 — Prior accepted-job IDs reconciled read-only

- Queried the imported API's read-only `GET /api/ingest/job/:jobId` endpoint for job IDs named in prior project audits. The previously accepted `eb10bdd6-2c98-41db-94fc-52d599ca09fe` is now terminal `failed` (`2026-10-25T08:43:50.555Z`); `81a955bf-f44f-4faf-a39a-e2bcffbc5014` is `failed` (`2026-10-22T01:58:03.260Z`); `0bc6087d-4070-4420-a645-ca2606549052` is `failed` (`2026-10-19T12:15:30.566Z`); and `2c9b4725-4544-4712-8556-06627ccea718` is `failed` (`2026-10-24T07:12:54.477Z`).
- Historical IDs `8237e1a8-192a-480e-b415-78f24eb94407` and `4b85fc7c-a239-478c-a455-94baf02ffdee` returned HTTP 404 in this Redis/job view; their individual outcomes remain unknown here. This does not override the current authoritative `atlas-run` active pointer, which returned inactive/null immediately before these queries.
- No returned job was active. No prior job was resumed or modified. The current lane remains safe for one new launch, subject to a final immediate prelaunch lock read.
- No provider call, launch request, search, evidence, admission, or card has occurred.

### E014 — Imported Atlas desk verified in the preview

- Captured the root preview at 1440×1000. The actual Apex Atlas Overview loaded with the "Launch Apex Atlas" control, navigation, and empty-state counts of 0 entities, 0 priority profiles, 0 assets, and 0 links.
- The browser reported only the standard React DevTools informational notice. No sign-in gate or rendering error was observed.
- This confirms the imported UI is visible; it is not a research run or card-creation result.

### E015 — Final prelaunch gate passed

- Source revision remains `87fd8d04eb56f8a5dbbc00dfb2076ae1e50c1f69`; required provider secret names are present; API health and Redis are `ok`; Bureau integrity is `ok`; `autoPipeline=false`.
- Immediate read-only `GET /api/ingest/job/active/atlas-run` returned `jobId=null`, `active=false`.
- Post-schema read-only baseline counts are zero for `entities`, `assets`, `relationships`, `research_cases`, `research_case_events`, `research_sessions`, `research_run_events`, `research_evidence`, and `contact_evidence`.
- The imported UI handler was inspected: one ordinary, non-mock, non-single-target launch sends `POST /api/ingest/atlas-run` with `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`. This is the UI-default-equivalent request; no target or scripted search itinerary is being supplied.
- Historical status checks show no retrieved prior job is active. The two IDs returning 404 are not treated as terminal proof; the current Redis active pointer is the safety authority and is idle.
- Exactly one launch is authorized by the user's request. Do not retry if the POST response is ambiguous; reconcile the returned job ID instead.

### E016 — One canonical UI-equivalent launch accepted

- At `2026-10-26T10:50:42Z`, sent exactly one `POST /api/ingest/atlas-run` with `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`.
- The API returned HTTP `202`, job ID `6e183bb4-0811-4735-84dd-c439698d44fa`, and poll path `/api/ingest/job/6e183bb4-0811-4735-84dd-c439698d44fa`. The response says “Canonical model-owned discovery started”; options confirm three targets, standard depth, 420-second target timeout, no single-target override, and no prior discovery context.
- No retry was sent. All subsequent observations must be correlated to this job ID. The run is accepted, not yet proven successful.

### E017 — First live model-control checkpoint

- First read-only poll shortly after `2026-10-26T10:50:42.497Z` showed job `6e183bb4-0811-4735-84dd-c439698d44fa` as `running`, phase `1/4`, progress `1/4`, with `inserted=0`, `skipped=0`, `errors=0`.
- The API status identifies `GROQ-INVESTIGATOR-1` as the active free-ReAct discovery capability. This is the selected role/capability, not evidence of exhausted quota or a reason to rotate credentials.
- The status result exposes structured oversight metadata: Groq Right-hand (`openai/gpt-oss-120b`) rejected the initial proposed direction because it assumed Companies House shareholder registers would supply individual contact details; it noted those filings may contain names only and asked for verification of actual contact availability. Groq Boss (`openai/gpt-oss-120b`) completed the control response and selected `groq-investigator-1`; discovery case ID is `1`. This is an observable structured decision/rationale, not hidden chain-of-thought.
- The project-local raw model trace had been created at the configured `.local/audits/APEX_ATLAS_MODEL_AUDIT_2026-10-26_FRESH_REPLIT_IMPORT_RUN_01.md` path (77,109 bytes at the first filesystem check). It is the private, high-fidelity trace for visible prompts/responses and source contact evidence; this public report does not copy that payload.
- No findings, admissions, inserts, or cards are reported at this checkpoint. The run remains active; no stop, retry, manual model change, or second launch was issued.

## Current checkpoint

- **Source snapshot:** verified public `main` archive at `87fd8d04eb56f8a5dbbc00dfb2076ae1e50c1f69`.
- **Project import:** not yet performed.
- **Secret presence:** the 13 requested names were confirmed by the secure flow; values have not been inspected, and app-level availability has not yet been verified.
- **Workflows/runtime:** starter-template workflows exist; no Apex workflow or Apex health check has been verified.
- **Database/Redis/job lane:** not yet checked.
- **Provider calls, search, evidence, admission, card creation:** none.
- **Current acceptance:** NOT MET.

Append each subsequent action and result below in chronological order, including any setup issue and the exact recovery. Do not delete or rewrite earlier events; correct errors in a new event.
