# ⭐ ACTIVE AUDIT — Apex Atlas Fresh Replit Import / Run 04

**Audit file:** `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-24_FRESH_REPLIT_IMPORT_RUN_04.md`<br>
**Started:** 2026-10-24 (Europe/Kyiv; exact clock times are not available for every event)<br>
**Source:** https://github.com/2f22vtd4kr-cloud/BigContacts<br>
**Branch / imported revision:** `main` / `623695da0b8e78e4a6ba5dce0c04d5b4d4f5bbc4`<br>
**Status:** Repository imported and previous audits reviewed. Preflight, current-job reconciliation, boot, and the requested live run are pending. No Apex research run has started in this project.

## Audit scope and disclosure boundary

Record the full observable sequence from setup through discovery, Investigator research, oversight, persistence, card projection, and terminal-state verification. Include commands/routes, timestamps when available, model/provider/role identifiers, exact visible prompts or safely sanitized excerpts, tool inputs and results, source URLs, decisions with concise rationale, failures, retries, code/config changes, evidence/admission/card counts, and verification outcomes.

- Preserve chronological order and distinguish **Observed**, **Inferred**, and **Not yet observed**.
- Record model-visible actions, structured decisions, outputs, and concise explanations. Hidden private chain-of-thought is not exposed or recorded.
- Never record secret values, authorization material, cookies, or credential-bearing URLs. Secret presence is not proof of validity or remaining quota.
- Do not place raw personal contact values in this tracked audit. Record source attribution, evidence state, and non-identifying counts; redact direct emails, phone numbers, and unnecessary identifiers.
- Do not turn on unbounded prompt/page capture or route raw private traces into tracked files. Capture exact provider-visible prompt text only when it is safely available and sanitized; otherwise record the prompt template/version and observable structured result.
- A launch accepted with HTTP 202, search activity, or an intermediate model response is not a successful run. Verify terminal job state, durable evidence/admission/card counts, UI projection, and released active-job lock.
- Do not manufacture findings, contacts, evidence, confidence, progress, or cards. Preserve unknown/insufficient-evidence outcomes and the Boss-selected Investigator architecture.

## Historical evidence reviewed before this run

- `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-24_FRESH_REPLIT_IMPORT_RUN_03.md` records a separate fresh Replit project at source revision `501224c3df0eff933ca231bff629081284c99361`. That attempt completed preflight, typecheck, Bureau checks, and first-time development schema initialization, but did not boot Apex or start a research run. Its note warns that Redis may be shared and that job/lock state must be checked read-only before launching.
- The older root audit `APEX_ATLAS_AUDIT.md` records a 2026-10-20 UI-equivalent launch (job `fa964622-144a-465a-a657-bc0916b4615f`) that was accepted and started, then showed a Groq Boss/Right-hand-controlled run with Investigator slot 0 unavailable after three searches and one visit, zero model findings, and a quota-exhaustion category. That audit excerpt stops before terminal reconciliation for that job; the unresolved terminal outcome must not be guessed.
- Earlier audit/status notes report runs with no evidence-backed findings or cards, one malformed shortened source URL, and separate HTTP 413/context-size errors. These are historical reports, not results from this project. A quota failure, context-size rejection, and source/tool error are different failure classes; do not treat them as interchangeable or silently rotate providers.
- Repo architecture law: Groq Boss directs the case and selects Investigator capability; the selected Groq Investigator owns the research trajectory; Groq Right-hand performs bounded independent oversight. The Investigator capability is not a scripted provider ladder. Any recovery or capability change must be an observable, durable Boss decision supported by the runtime.

## Sequential log

### 001 — Project handoff and blank-project baseline

- **Observed:** The conversation moved into a new project titled “BigContacts Apex Atlas.” The initial workspace contained the standard Replit pnpm scaffold, API Server, and Canvas starter artifacts; it did not contain the requested application.
- **Observed:** Initial Git branch was `main` at starter commit `fa3ed5c30d531210c738e28913d236fe8ed969a7`, with no remote and only the audit draft untracked.
- **Decision:** Import the existing repository. Do not generate a replacement app or add another product.

### 002 — Secret request and confirmation

- **Observed:** Requested through Replit Secrets: `COMPANIES_HOUSE_API_KEY`, `EXA_API_KEY`, `GROQ_BOSS_API_KEY`, `GROQ_RIGHT_HAND_API_KEY`, `GROQ_INVESTIGATOR_API_KEY`, `HF_TOKEN`, `GROQ_INVESTIGATOR_API_KEY_1`, `REDIS_URL_1`, `SCRAPFLY_API_KEY`, `SERPAPI_KEY`, `SERPER_API_KEY`, `TAVILY_API_KEY`, and `ZENROWS_API_KEY`.
- **Observed:** Replit confirmed all 13 secret names are configured in this project. Values were not read, printed, copied, or written here.
- **Interpretation:** Presence checks do not establish that credentials are valid or have quota.

### 003 — GitHub integration failure and recovery attempts

- **Observed:** The GitHub connector returned a disconnected-session error; its OAuth status check reported HTTP 401. A helper named `connectorFetch` was unavailable in this runtime, so that failed attempt made no request.
- **Observed:** The connection was attached, but Git operations routed through Replit's GitHub proxy still failed. The documented OAuth reauthorization proposal and standard connect proposal both failed at the Replit integration-card layer before a user-facing authorization flow opened.
- **Recovery:** Used the public repository page and GitHub's public codeload archive. No GitHub write, push, or private-data access was performed.

### 004 — Public repository and previous-attempt review

- **Observed:** The public repository page identified `main`; its latest commit was `623695da0b8e78e4a6ba5dce0c04d5b4d4f5bbc4` (“Document Apex Atlas Replit Run 03 setup”). The public page listed audit files and repository history.
- **Observed:** Downloaded the public `main` archive to `/tmp` for inspection (49 MB; 3,447 entries). Read `AGENTS.md`, the mandatory repository-study protocol, the new-account setup contract, `docs/RUN_BUREAU.md`, and the newest Run 03 audit before source import.
- **Decision:** Preserve previous audit history and reconcile job/lock state before any new launch. Do not repeat the prior agent's unsupported assumption that an accepted job or a model/tool response proves card creation.

### 005 — Starter workflows stopped

- **Observed:** Stopped `artifacts/api-server: API Server` and `artifacts/mockup-sandbox: Component Preview Server` before import. Both stop operations succeeded.
- **Reason:** Prevent starter-service output from being confused with Apex runtime behavior.

### 006 — Source revision verified and imported

- **Observed:** `GIT_CONFIG_NOSYSTEM=1 git ls-remote https://github.com/2f22vtd4kr-cloud/BigContacts.git refs/heads/main` returned `623695da0b8e78e4a6ba5dce0c04d5b4d4f5bbc4`.
- **Action:** Preserved the original starter commit on local branch `replit-starter-initial`; added local remote `bigcontacts-source`; fetched public `main`; verified the fetched SHA; reset local `main` to the verified source revision.
- **Observed:** Fetch received 70,961 Git objects (217.90 MiB). Local `main` now tracks `bigcontacts-source/main` at the verified SHA. The Replit `.git` metadata was retained. No source was pushed to GitHub.
- **Observed:** Replit recognized the imported API artifact as Apex Atlas at `/` and changed its managed workflow command to `cd ../.. && bash scripts/replit-boot.sh`. The canonical workflow has not been started.
- **Audit continuity:** The repository already contained older tracked root and dated audit files. This new run-specific file is the active detailed log; older audit content remains historical and is not overwritten.

### 007 — Current run state

- **Observed:** The imported worktree was clean immediately after source reset. Both starter workflows are stopped.
- **Not yet observed:** Dependency install/preflight, database state in this project, Redis status or active-job pointer, canonical API boot, UI readiness, any new launch request, model/tool activity, research findings, evidence/admission, card creation, or terminal lock release.
- **Next action:** Inventory the imported repository, check current runtime/provider configuration and the development database read-only, then follow the canonical setup gates. Reconcile any shared Redis/job state before considering one UI-equivalent launch.

### 008 — Current source status and architecture reviewed

- **Observed:** `README.md`, `docs/context.md`, `docs/BUREAU_REACT_ARCHITECTURE.md`, `docs/APEX_ATLAS_VERY_STRONG_ROADMAP.md`, and imported `replit.md` were reviewed.
- **Prior empirical status:** The latest cited run before this project ended `failed/incomplete` with zero findings, admissions, evidence rows, or cards; earlier runs also reached iteration limits without cards. Static green checks and an accepted launch are not evidence of live research success.
- **Architecture constraints:** Boss chooses direction and Investigator capability; the selected Groq Investigator chooses research actions; Right-hand performs bounded oversight. No fixed search itinerary, silent credential/provider rotation, synthetic activity, fabricated finding, or weakened evidence/admission gate.
- **Evidence constraints:** Search snippets are unverified leads. A person or contact may only be promoted through the existing source-backed identity, attribution, provenance, and deterministic gates. Unknown/insufficient evidence is valid.
- **Runtime contract:** desk at `/`, API under `/api/`, API port `8080`, canonical boot `bash scripts/replit-boot.sh`; schema initialization is a separate explicit one-shot action and ordinary boot must not mutate schema.
- **Configuration question retained:** The current docs disagree about whether model-request capture is enabled. Inspect actual `.replit` and artifact configuration before any run; do not enable unbounded raw capture or put secret/contact values in the visible tracked audit.
- **Not yet observed:** Current environment state or runtime behavior. Historical runs and checks belong to their recorded project/revision only.

### 009 — Earlier Replit attempts inspected for repeatable failures

- **Observed — Run 01:** The 2026-10-24 Run 01 report documents a starter API `/` 404 from using the wrong workflow, a rejected direct `.replit` edit, and a whitespace error that was missed because an untracked audit was not staged before `git diff --check`. Its setup did not launch Apex.
- **Observed — Run 02:** The report documents the same GitHub proxy 401/connect-card failures and the public Git fallback. Its latest recorded action accepted UI-default job `2c9b4725-4544-4712-8556-06627ccea718` with HTTP 202, then its report stops before terminal status, evidence/admission/card counts, or lock release.
- **Observed — Run 03:** The newest imported setup audit records successful preflight/typecheck/Bureau checks and empty-database schema initialization in a different project, but no boot or launch there.
- **Decision:** Do not assume any prior accepted job is complete. After canonical boot, check the actual shared Redis active pointer and allowlisted status for all relevant recent job IDs before launching. Use the imported `scripts/replit-boot.sh` workflow; do not edit managed `.replit`/artifact configuration directly.

### 010 — Effective audit and runtime configuration

- **Observed:** The imported `.replit` and `artifacts/api-server/.replit-artifact/artifact.toml` both set `APEX_CAPTURE_MODEL_PROMPTS=false`, `APEX_MODEL_AUDIT_INCLUDE_CONTACT_DATA=false`, `APEX_CAPTURE_MODEL_PROMPTS_IN_TEST=false`, and `APEX_MODEL_AUDIT_ALLOW_VISIBLE_FILE=false`.
- **Observed:** This conflicts with stale/historical prose in `docs/context.md` and handoff notes that describe prompt capture enabled for an earlier run. The current source configuration and current run procedure are the authority for this project.
- **Decision:** Keep capture disabled by default. Log safe visible prompts/decisions only when available through normal observable run output; do not enable raw contact capture or copy private traces into the tracked audit. Hidden reasoning is not available for disclosure.
- **Audit visibility:** `git check-ignore` did not match the new run-audit path. The current detailed audit and root pointers are ordinary visible project files.

### 011 — Frozen install, secret preflight, and database baseline

- **Action:** Ran `pnpm install --frozen-lockfile`, followed by `node scripts/replit-preflight.mjs`.
- **Observed install:** All 10 workspace projects installed successfully with pnpm `10.26.1`; the lockfile was current, and no firewall or postinstall failure occurred.
- **Observed preflight:** All 13 requested provider/service secret names and platform-managed `DATABASE_URL` were present. The script checked presence only; secret values were not read or changed.
- **Action:** Queried `information_schema.tables` read-only for public base tables in this project's development database.
- **Observed database baseline:** Query succeeded and returned no public base tables. No schema mutation or data write has occurred.
- **Not yet observed:** Provider key validity/quota, Redis connectivity or active-job state, API health, or any new Apex run.
- **Next:** Run source typecheck/Bureau checks, inspect the current source initializer/migrations, and then use the canonical one-time schema initializer only after confirming this empty baseline.

### 012 — Static and architecture validation

- **Action:** Ran `pnpm run typecheck && pnpm run check:bureau`.
- **Observed result:** Both commands exited successfully. Workspace library, API, mockup, and script typechecks passed. The Bureau suite passed its canonical route/lock/lease, startup/migration, SSRF/egress, free-ReAct, provider-role, evidence/provenance/admission, cancellation, and runtime-boundary checks.
- **Focused results:** Six phone/source/scoreboard test files passed (44 tests); research-run validator passed (6 tests); campaign-score tests passed (6 tests). The combined research registry validated all 50 cases as `grounded-reviewed`.
- **Interpretation:** These checks verify source/static contracts at imported SHA `623695da0b8e78e4a6ba5dce0c04d5b4d4f5bbc4`; they do not establish provider validity, live research performance, or card creation.
- **Next:** Inspect the migration contents and database package scripts before initializing this confirmed-empty development database.

### 013 — Schema-migration safety review

- **Action:** Read the canonical initializer, database package scripts, and migrations `001`–`004`.
- **Observed scope:** Migration `001` adds durable invariants/triggers; `002` adds the contact-outcome column when absent; `003` and `004` only reclassify rows with specific legacy markers. Migration `004` explicitly skips malformed metadata and trusted/promoted rows.
- **Safety condition:** This project's development database was independently queried before setup and contains no public base tables; therefore there are no existing app rows for compatibility migrations to update.
- **Decision:** Use the repository's documented first-time initializer exactly once with `APEX_ALLOW_SCHEMA_PUSH=true` scoped to that shell command. Ordinary API boot remains schema-mutation-disabled.

### 014 — One-time development schema initialization

- **Action:** Ran `APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh` once.
- **Observed result:** Drizzle created the current repository schema; invariant migration `001` and compatibility migrations `002`–`004` completed; the initializer verified the required durable Apex tables. Migration `004` reported `0` corrected legacy rows.
- **Safety:** The mutation opt-in was scoped to the command, and ordinary boot remains configured to skip schema push. The pre-initialization database was empty; no existing app rows were modified and no sample data was inserted.
- **Next:** Independently verify required tables and zero-row baseline, then inspect the current launch UI/route and reconcile the shared Redis job/lock state after canonical API boot.

### 015 — Post-initialization database verification

- **Action:** Queried exact row counts from the seven required durable tables using read-only SQL.
- **Observed result:** `entities`, `research_cases`, `research_case_events`, `research_sessions`, `research_run_events`, `research_evidence`, and `contact_evidence` exist and each contains `0` rows.
- **Interpretation:** Schema setup created no synthetic lead, contact, case, or prior-run data.
- **Next:** Finish source-level launch/recovery inspection; then boot only the canonical API artifact and reconcile shared Redis job state before any new launch.

### 016 — Canonical launch and Investigator recovery contract traced

- **Action:** Read the current UI launch helper, canonical API launch route, active-job route, API boot script, Investigator credential registry, and quota-recovery code.
- **UI launch contract:** The ordinary “Launch Apex Atlas” path uses `POST /api/ingest/atlas-run` with three targets, standard depth, and a 420,000 ms target timeout; it supplies no target ID, custom objective, or fixed search itinerary. Mock mode is a separate UI path and must remain off.
- **API contract:** The canonical handler checks schema readiness, enables permanent Redis, rejects an active nonterminal owner, creates and claims the distributed `atlas-run` lock, and starts `runCanonicalAtlasPipeline`. Do not use the retired status/launch surface or manually create jobs.
- **Recovery contract:** The Investigator registry treats each configured Groq key as a capability, fingerprints aliases without exposing values, and deduplicates identical credentials. For explicit hard request-quota exhaustion, canonical discovery asks Groq Boss to select a different available capability, excludes the exhausted credential, persists the reassignment/history, and continues the same case. Token-per-day and token-window capacity failures are classified separately and use their own bounded Boss-directed path. If no distinct capability is viable or Boss does not select one, Apex parks/fails the case rather than silently rotating or scripting a path.
- **Assessment:** This matches the requested autonomous, model-directed recovery architecture. The preflight confirms both Investigator secret names are present, but does not prove either value is valid or that the two credentials belong to distinct quota pools.
- **Next:** Run the focused recovery unit tests; then perform the canonical build/boot, inspect health/status, reconcile prior job records and Redis lock, and only then send one UI-default launch.

### 017 — Quota and capability-recovery regression tests

- **Action:** Ran the focused recovery, quota-identity, Investigator-provider, and provider-error-diagnostic unit tests. Provider transport was mocked; these tests did not contact Groq or other external services.
- **Observed result:** Recovery classification suite passed 8/8 tests. Three additional files passed 38/38 tests, including same-credential alias exclusion, hard request-quota vs token-window distinction, and provider-boundary behavior.
- **Interpretation:** The existing code and tests support Boss-directed reassignment only to a distinct configured credential capability. No application-source fix is indicated before the live run.
- **Next:** Stage and whitespace-check the visible audit/pointer changes, commit them locally without pushing, and boot the exact configured API workflow.

### 018 — Staged whitespace preflight caught Markdown hard breaks

- **Action:** Staged the three audit/pointer documents and ran `git diff --cached --check` before committing.
- **Observed issue:** The check rejected trailing Markdown hard-break spaces in the new report header and root audit metadata. No commit was created; the API was not booted and no research action occurred.
- **Correction/result:** Replaced those metadata hard breaks with explicit `<br>` markers. This is the same failure class recorded by Run 01; the staged `git diff --cached --check` now passes before any commit or boot.

## Run record

Append each subsequent command, request, model/tool event, visible prompt/structured response, oversight decision, durable state delta, error, fix, and verification here in sequence. Keep raw third-party personal contact values and hidden reasoning out of this tracked file.
