# ★ ACTIVE AUDIT — Apex Atlas Fresh Replit Import / Run 01

**Audit file:** `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-24_FRESH_REPLIT_IMPORT_RUN_01.md`<br>
**Status:** In progress — source imported; runtime setup and live run not yet verified.<br>
**Purpose:** Sequential, evidence-based record of import, setup, launch, discovery, research, admission, and card creation for this run. Append entries in order as events occur; do not replace earlier entries.

## Audit scope and disclosure boundary

This is a visible, repository-tracked technical audit. It records observable setup actions, commands, outcomes, failures, provider/model identifiers and transport status, bounded prompt/response summaries, public research actions, evidence/admission transitions, cards, and concise decision explanations.

It does **not** contain API keys, Redis credentials, raw personal email addresses or phone numbers, other unnecessary personal data, or private model chain-of-thought. Model reasoning is represented by the model's visible decision/output and a short operational rationale; hidden reasoning is not available for disclosure. Any prompts or provider results copied here must be redacted and limited to what is needed to diagnose the run.

## Sequential record

### 001 — Repository and prior-run reconnaissance

- The user requested a new project populated from `https://github.com/2f22vtd4kr-cloud/BigContacts`, an actual Apex Atlas launch, and frequent sequential auditing.
- GitHub API reconnaissance identified a public TypeScript repository, canonical branch `main`, and latest source commit `4ac361586ed68bc01356ea45dc12b48e1fda6ec2` (`Enable private development audit capture`, 2026-10-24).
- Recent repository history and issue/PR summaries show recurring live-run failure patterns: empty Investigator findings; false stop decisions while search leads remained; prompt compaction corrupting source URLs; no evidence passing admission; and therefore no person/contact cards. These are historical diagnostics, not proof of a defect in the current imported head.
- Prior merged fixes specifically preserved case-wide lead inventories and source URLs, improved stop/liveness checks, and kept admission evidence-gated. Do not bypass those controls or insert a scripted research sequence to force a card.
- The repository's own current guidance says historical CI and audit results do not establish a successful current live run. Verify the exact imported SHA, runtime configuration, terminal state, evidence, and card counts before claiming completion.

### 002 — Fresh-project initialization

- The new Replit project initially contained only the standard generated pnpm workspace scaffold and an initial local commit (`fa3ed5c`, `Initial commit`); the requested application was not preloaded.
- The working tree was clean before import. No pre-existing user application changes were present to preserve.
- The project generated API-server and canvas placeholders during initialization. These were scaffolding, not part of the BigContacts source.

### 003 — Secret request and confirmation

- Requested the 13 user-listed provider values through Replit's secure Secrets flow.
- Replit confirmed all requested secret names are present. No secret values were read, echoed, written to this file, or used in shell output.
- Runtime availability and whether each provider is actually required will be checked from the imported app's configuration; presence alone is not evidence that a credential is valid.

### 004 — Source import

- Cloned the public `main` snapshot into a temporary directory to inspect the source before replacing the generated scaffold. The checkout contained 3,354 files and was approximately 81 MB excluding `.git`.
- Added the GitHub repository as `origin`, fetched `main` at depth 1, and reset the fresh project to the fetched source commit. No push or write to GitHub was performed.
- Imported commit: `4ac361586ed68bc01356ea45dc12b48e1fda6ec2`.
- The audit directory is a visible root-level `audits/` path and is not excluded by the imported `.gitignore`; this file is deliberately kept outside `.local/audits/`.

### 005 — Audit started

- This file was created immediately after the import, before dependency setup or application launch, to preserve setup issues and later process events in chronological order.
- Next: read the repository's current setup/run instructions and relevant audit/privacy configuration; verify the imported worktree and runtime prerequisites; then install/setup only what is required by the repository.

## Subsequent events

### 006 — Import auto-start mismatch and privacy configuration review

- **Observed workflow issue:** The imported API artifact was recognized and renamed “Apex Atlas,” but the running process had started from the starter command `pnpm --filter @workspace/api-server run dev`, not the repository's canonical `bash scripts/replit-boot.sh`.
- **Observed behavior:** The starter API listened on port 8080 but returned HTTP 404 for `/`; it was not serving the Apex desk. The starter Component Preview Server also remained running at `/__mockup`, which is unrelated to this imported application.
- **Recovery:** Stopped both starter workflows before dependency setup or a canonical boot. No model/provider request, external search, research launch, or card creation occurred during this failed preview.
- **Configuration mismatch:** Both `.replit` and the API artifact enabled `APEX_MODEL_AUDIT_INCLUDE_CONTACT_DATA=true` and pointed the private prompt trace at a different run (`REPLIT_RUN_03`). This contradicts `docs/context.md`, `APEX_ATLAS_RUN_AUDIT.md`, and the tracked-audit privacy boundary.
- **Safety correction planned before launch:** Keep development prompt capture in the repository's private logger only if its contact-value inclusion remains disabled; assign it this run's unique path. Keep visible-file opt-in false and use this root-level tracked audit for sanitized observations. Update the prompt-audit configuration test with the same contract.
- **Runtime facts:** The requested 13 secret names and platform-managed `DATABASE_URL` are present; no values were read. No application/database schema initialization has occurred. The API 404 is a starter-workflow misconfiguration, not evidence of an Apex route failure.
- **Next:** Apply the configuration/test correction, update the audit pointer, install from the lockfile, run secret preflight and required checks, initialize the fresh database only through the documented one-time initializer, then boot canonically.

### 007 — Auditing configuration corrected

- **Tooling issue:** A direct patch to `.replit` was rejected by the platform because Replit configuration files require schema-validated replacement. The rejected portion made no `.replit` change; the independent test and audit-pointer edits in the same patch did apply.
- **Recovery:** Re-read both current configurations, changed their development contact-capture flag to `false`, assigned the private prompt-audit destination to this run's unique name, and applied both with Replit's validated config-replacement flows. Both validators returned success.
- **Regression contract:** Updated `model-prompt-audit.test.ts` to require contact-value capture to be disabled and to require the unique per-run trace path. Prompt capture remains development-only, test capture and visible-file opt-in remain false.
- **Audit visibility:** `APEX_ATLAS_RUN_AUDIT.md` now points to this starred report. The report remains at a normal root `audits/` path; `git check-ignore` confirmed it is not ignored.
- **Data boundary:** The tracked report will contain sanitized model-visible exchanges and decisions where observable, not hidden reasoning or raw personal contact values. No live model request has been made.
- **Prior-run constraint:** `docs/RUN_BUREAU.md` identifies job `0bc6087d-4070-4420-a645-ca2606549052` as last observed in discovery with terminal state unknown. The imported 2026-10-23 audit separately records job `b1933986-969e-4f02-9fcd-41353cc594a2` as active at its last poll. Neither observer stopping nor the fresh project database proves either job ended; reconcile actual Redis-backed status and the active lock before a launch.
- **Run-policy correction:** The repository run procedure says raw prompt capture stays off by default and a per-run private destination must not become a permanent service override. After reviewing it, the initial plan to leave private prompt capture enabled was superseded: this run will use structured/sanitized durable traces and workflow metrics only. No model prompt trace file will be configured or produced.
- **Next:** Install dependencies from the imported lockfile, run the presence-only secret preflight and required architecture checks, initialize the empty development schema explicitly, then boot and reconcile old jobs before deciding whether a new launch is safe.

### 008 — Fresh project baseline and pre-launch contract

- **Dependency setup:** `pnpm install --frozen-lockfile` completed for all 10 workspace projects under pnpm 10.26.1. The lockfile was current; no lockfile change occurred. No package firewall error was observed.
- **Secret preflight:** `node scripts/replit-preflight.mjs` reported all 13 requested secret names present and `DATABASE_URL` available. Only presence was tested; values were not read or modified.
- **Database baseline:** A read-only `information_schema.tables` query against this project's development database returned no public base tables. This database is fresh and uninitialized; it is distinct from job state that may live in shared external Redis.
- **Launch-contract inspection:** UI uses `launchAtlasPipeline`; the default launch is the canonical `/api/ingest/atlas-run` request with 3 targets, standard depth, and a 420000 ms target timeout. The active route mount registers the canonical router before legacy compatibility routes. No launch request was sent.
- **Audit policy:** Both validated development configs now have prompt capture disabled, contact capture disabled, test capture disabled, visible-file opt-in disabled, and no `APEX_MODEL_AUDIT_FILE` override. The tracked report is the only run audit being created.
- **Workflow state:** API and mockup starter workflows are stopped/finished pending a canonical build. The report is not ignored; `git diff --check` passed at this checkpoint.
- **Prior-run blockers:** The actual Redis-backed status for the documented 10/19 job and the 10/23 run must be checked after canonical boot. No new run is safe while their state or the active lock is unclear.
- **Next:** Run typecheck, the changed audit-config test, and the complete Bureau integrity/build check. Then initialize the empty development schema using the repository's explicit one-time command, boot canonically, verify health and old-job state, and only then decide whether to launch.

### 009 — Static and architecture validation

- **Typecheck:** `pnpm run typecheck` passed for shared libraries, API server, mockup sandbox, and scripts.
- **Audit-config regression test:** `pnpm --filter @workspace/api-server exec vitest run src/src/lib/model-prompt-audit.test.ts` passed all 18 tests. Two expected negative-path test messages stated that unapproved workspace audit paths were refused; no audit file was written.
- **Bureau suite/build:** `pnpm run check:bureau` exited successfully. Canonical route/lock/lease/cancellation, free-ReAct, provider-role, prompt budget, provenance/admission, migration/startup boundaries, and other architecture checks passed. The research gauntlet registry validated all 50 grounded-reviewed cases; focused tests also passed.
- **Interpretation:** These checks establish source/build contracts, not live research quality or provider authentication. No API workflow, database mutation, provider/model request, search, or launch has occurred.
- **Next:** Initialize this confirmed-empty development database only through `APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh`, then boot the repository's canonical API workflow and reconcile old job IDs and the active lock read-only.

### 010 — Explicit development schema initialization

- **Action:** With the read-only baseline confirming no public tables, ran the repository's documented one-time command: `APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh`.
- **Observed result:** The single-writer schema lock was acquired; current Drizzle schema push and durable hardening/compatibility migrations completed; migration 004 corrected 0 pending legacy rows; required Apex durable tables and invariants verified.
- **Post-initialization read-only verification:** Required tables `entities`, `research_cases`, `research_case_events`, `research_sessions`, `research_evidence`, `contact_evidence`, and `research_run_events` are present. Counts are all zero; no sample or synthetic records were inserted.
- **Safety:** `APEX_ALLOW_SCHEMA_PUSH=true` was scoped to this command only. It is not configured for ordinary runtime startup. No data was deleted or overwritten.
- **Next:** Review the pending import/setup/config/audit changes for secrets or unintended edits, save them in a local commit (without pushing), and start only the canonical API workflow.

### 011 — Commit preflight caught audit whitespace

- **Attempt:** Staged the reviewed setup/config/test/audit files and ran `git diff --cached --check` before a local commit.
- **Observed issue:** The check caught two trailing Markdown line-break spaces in the new, previously untracked report. The earlier unstaged `git diff --check` had not inspected that untracked file, so the first commit attempt stopped before creating a commit or pushing anything.
- **Correction:** Replaced the trailing spaces with explicit `<br>` tags. This is the same whitespace failure documented in the previous Replit run; it was repeated because the earlier check omitted the untracked report. The next commit attempt will run the cached check after staging all five files.

_Append new entries below in chronological order. Record failed attempts and corrective actions as separate entries; do not erase or rewrite history._
