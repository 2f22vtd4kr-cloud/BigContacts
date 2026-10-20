# Apex Atlas — Sequential Audit — Fresh Project Run 03

- Started: 2026-10-20 (Europe/Kyiv; exact shell timestamps will be recorded as steps occur)
- Repository: `https://github.com/2f22vtd4kr-cloud/BigContacts`
- Branch: `main`
- Imported source revision: `ffde7017fa1270a77c5484a733fc454bb8d57526`
- Audit file: `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-20_FRESH_PROJECT_RUN_03.md`
- Status: setup in progress; no new Apex job has been launched.

## Audit coverage and boundaries

This visible, tracked report is the primary chronological record for this fresh project. It records setup and configuration changes, commands and checks, provider/model/role identifiers, request/job identifiers, model-visible decisions in concise summaries, actions proposed and actually executed, source/provider outcomes, failures, fixes, durable counts, and terminal/lock state when observed.

It does **not** include API-key values, database/Redis credentials, session material, hidden model chain-of-thought or private reasoning fields, or raw personal contact values. Search and page data will be summarized or redacted where copying it would expose personal information; public source URLs and evidence references may be retained when needed to explain an observed result. A model's visible structured action and brief user-facing rationale are observable outputs; neither is represented as private thought.

The audit is append-only in practice: later observations will be added in sequence, and earlier outcomes will not be rewritten as successful. A launch acceptance response, model activity, a green check, or a review-only lead alone does not prove a completed investigation or card creation.

## Sequential log

### 001 — Project and source preparation

- The new project initially contained the Replit pnpm workspace starter at commit `0c05d76b9e518521a819bcdca13cfdf07cc61818`; the starter's `main` worktree was clean and had no source remote.
- Read-only `git ls-remote` and a shallow clone confirmed the public GitHub repository's `main` revision as `ffde7017fa1270a77c5484a733fc454bb8d57526` (`Merge pull request #722 from .../fix/atlas-source-lead-cards-20261020`).
- The repository contains prior run audits, the mandatory repository-study protocol, and a reliability review dated 2026-10-20. These records were checked before starting a new run.
- The previous fresh-project run report (Run 02) records job `741956d5-9069-467c-84b5-e483e2083d4f` as failed/incomplete at phase 3/4, with zero inserts and a failed external page-retrieval action. It does not establish card creation. The reliability review identifies a source change that preserves eligible non-terminal partial findings as review-only leads; source behavior and UI projection still need runtime verification.
- The requested provider/service variable names were sent through Replit's secure Secrets flow and confirmed by the user. Values have not been read, displayed, or copied into this report.

### 002 — Import into the project checkout

- Stopped the starter API Server and Component Preview Server workflows before replacing their source.
- Preserved the starter commit as local branch `replit-starter-initial`.
- Added the supplied public repository as remote `apex-source`, fetched `main`, and verified the fetched commit matched the inspected repository revision.
- Imported by resetting the existing `main` checkout to `apex-source/main`. The source repository's `.git` directory was not copied over the Replit-managed Git metadata.
- Verified `main` now points at `ffde7017fa1270a77c5484a733fc454bb8d57526` and the imported worktree is clean before this audit was created.
- Replit recognized the imported Apex Atlas API artifact at `/` and updated its managed API workflow to run `bash scripts/replit-boot.sh`. This is setup recognition only; no application boot, database mutation, provider request, or Atlas launch has occurred yet.

### 003 — Next gates (not yet run)

- Verify that this audit path is not ignored and that the imported audit configuration does not write raw prompt/contact payloads into tracked files.
- Install from the repository lockfile, inspect the canonical preflight/schema initializer, and check the development database read-only before any schema change.
- Boot the canonical API workflow, verify build revision and health, and read-only reconcile the shared Atlas job/lock state before considering a launch.
- Do not launch while active-job ownership is active or unclear. Use the UI-equivalent default launch only after the pre-launch gates pass.
- At a completed run, verify the terminal job state, durable case/evidence/admission/review-lead/card counts, UI projection, and released lock. If the run fails, preserve the exact failure class and make only evidence-supported fixes without bypassing model ownership, source provenance, or admission gates.

### 004 — Capture controls, dependencies, and database baseline

- 2026-10-20T10:50Z — Confirmed the new audit file is not matched by `.gitignore`; it remains in the visible `audits/` directory.
- The imported API artifact configuration had inherited raw prompt capture, contact-value capture, and visible-file writes enabled for Run 02. Before starting any service, updated the artifact through Replit's validated artifact-configuration flow: prompt capture `false`, contact-value capture `false`, test capture `false`, visible-file writes `false`, and the configured audit path set to this Run 03 report. This prevents raw provider payloads from being appended to a tracked file; this report is maintained as a sanitized chronological audit.
- `pnpm install --frozen-lockfile` succeeded for all 10 workspace projects in about 47 seconds. The lockfile was current; no dependency-version change was requested or made.
- `node scripts/replit-preflight.mjs` reported all 13 requested provider/service variable names present and the platform-managed development `DATABASE_URL` present. The script is presence-only; values were not displayed or inspected.
- A read-only query of `information_schema.tables` for the development database's `public` schema returned no table names. The database is empty, so the repository's one-time first-schema initializer can be evaluated without touching existing app records.
- Workflow status after install was `finished` with no open port. The retained console output shows the earlier starter workflow command and a `/` 404 at 10:43Z, before the imported canonical workflow was configured. Treat that output as stale starter logs, not evidence that the imported `replit-boot.sh` failed. No current canonical API boot has been observed yet.
- Read the canonical initializer and the `001`–`004` migration files. The initializer requires an explicit one-shot `APEX_ALLOW_SCHEMA_PUSH=true`, applies the current Drizzle schema and repository hardening/compatibility migrations, then verifies required durable tables. The public schema was empty at the read-only baseline; the one-shot flag will not be retained for normal runtime.

### 005 — First-time development schema initialization

- 2026-10-20T10:50Z — Ran the repository's explicit initializer once with `APEX_ALLOW_SCHEMA_PUSH=true`; it applied the current Drizzle schema, migration `001-apex-invariants.sql`, and compatibility migrations `002`–`004`, then verified the required durable tables. The initializer exited successfully and reported that the one-shot permission must be disabled for ordinary boot. No persistent schema-push setting was added.
- Migration `004` reported zero legacy registry rows corrected. This is consistent with the preceding empty-database baseline.
- A read-only post-initialization count found zero rows in `entities`, `research_cases`, `research_case_events`, `research_run_events`, `research_evidence`, `contact_evidence`, and `research_sessions`.
- 2026-10-20T10:50:53Z — Started `pnpm run typecheck && pnpm run check:bureau` as a background verification job. Results are pending; no application workflow has been restarted and no provider/API research request has been made.

### 006 — Static and architecture verification

- 2026-10-20T10:52Z — `pnpm run typecheck && pnpm run check:bureau` exited with code `0`. The run includes workspace typechecking, repository architecture/integrity gates, the Bureau regression chain, and focused research-run/campaign validation tests. The captured tail reports 6 Vitest files / 44 tests passed, 6 research-run validator tests passed, and 5 campaign-score tests passed; the final Python OSINT fail-closed, registry-signal, and canonical-job-lock checks also report `PASS`.
- Rechecked GitHub `main` immediately before startup: remote and imported local `main` both resolve to `ffde7017fa1270a77c5484a733fc454bb8d57526`.
- No application source file or dependency manifest was changed. The only tracked change is the audit-capture safety configuration; this run's audit report is new and unignored.
- These checks establish source-level readiness only. The canonical app has not yet been booted, and no live provider request or research job has run.

### 007 — Canonical boot and pre-launch reconciliation

- 2026-10-20T10:52Z — Restarted the imported `artifacts/api-server: API Server` workflow, whose configured command is `cd ../.. && bash scripts/replit-boot.sh`. Fresh logs identify source revision `ffde701`; schema mutation was skipped during normal boot. Frontend build/source-boundary checks, API architecture/build checks, and provider-role checks completed before the API start.
- Read-only `GET /api/healthz` and `/api/healthz/details` both returned HTTP 200. Redis was `ok` (about 160 ms); `bureauIntegrity=ok`; `autoPipeline=false`. Provider readiness counts showed the configured Groq, Right-hand, search, registry, and browser-retrieval capabilities without exposing credential values. This is readiness evidence, not proof every provider will accept a request.
- Read-only `GET /api/ingest/job/active/atlas-run` returned HTTP 200 with `jobId=null` and `active=false`.
- Read-only reconciliation of previous Run 02 job `741956d5-9069-467c-84b5-e483e2083d4f` returned HTTP 200: `status=failed`, `outcome=incomplete`, phase `3/4`, finished at `2026-10-20T09:44:20.161Z`, `inserted=0`, `skipped=0`, and `errors=0`. The earlier audit records its generic external page-retrieval failure; the new development database remains empty. No stale active lock was present, and no cleanup or mutation of the old job was performed.
- The app preview at `/` rendered the real Overview page. It showed `READY`, `DB 1/1`, the `Launch Apex Atlas` control, and zero initial entities/profiles. The screenshot browser reported only the standard React DevTools informational notice; no app error was reported.
- Source inspection confirms the UI button sends the canonical launch request with defaults `targetCount=3`, `researchDepth=standard`, and `targetTimeoutMs=420000`, without a custom discovery context. The next action is one request with exactly that UI-default contract. At this checkpoint, the new Atlas run has not started.

### 008 — UI-equivalent Atlas launch

- 2026-10-20T10:53:11Z — Sent exactly one `POST /api/ingest/atlas-run` through the Replit app proxy with JSON `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`. This is the canonical endpoint and same payload as the Overview button's default action; no direct worker invocation, scripted search, or discovery context was added.
- The server returned HTTP `202`, job `7295606f-bbab-433b-8d3f-290059c3c54e`, and poll path `/api/ingest/job/7295606f-bbab-433b-8d3f-290059c3c54e`. The acceptance response confirms `targetCount=3`, `researchDepth=standard`, `targetTimeoutMs=420000`, `singleTargetId=null`, `discoveryContextIncluded=false`.
- 2026-10-20T10:53:25Z — First read-only poll returned HTTP 200, job `running`, phase `1/4`, progress `1/4`, zero inserts/skips/errors. The active-job endpoint pointed to this job; no duplicate was started.

### 009 — First live action-trace checkpoint

- 2026-10-20T10:54:01Z — The job-scoped trace endpoint returned HTTP 200. In observed order, the Investigator selected `web_search` (10:53:20.825Z, completed `ok`), `browser_fetch` (10:53:33.062Z, `ok`), then `web_search` again (10:53:35.717Z, `ok`). This demonstrates model-selected tool order rather than a forced search/fetch sequence. At that checkpoint the trace contained three tool spans and no durable discovery slots; no LLM model identifier or structured discovery decision was yet exposed by that endpoint.
- Input/result text is intentionally not copied verbatim: the tool span summaries can contain person identifiers, raw search text, or source content. Hidden chain-of-thought and private reasoning are not captured or reconstructed; subsequent entries report only observable model/tool identifiers, structured decisions, redacted action summaries, and result counts.

### 010 — First discovery slot failure observed

- 2026-10-20T10:54:33Z — The job remained `running`, phase `1/4`, with zero inserts/skips/errors. Its structured discovery trace now contained slot 0: model field `openai/gpt-oss-120b`, status `unavailable`, 2 searches, 2 visits, 0 model findings, 0 parsed candidates, 10 trajectory actions, and 2 result URLs. The trace error text matched the rate-limit/quota category; the raw error string is not copied here.
- This is a failure signal, not yet proof that an Investigator API key was exhausted. I have not rotated a key, selected a different model, or altered the run. Next I am checking the typed failure/reassignment path and waiting for the canonical Boss/control flow to decide whether reassignment is appropriate.
