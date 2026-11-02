# ★ STARRED — Apex Atlas Sequential Audit — 2026-11-02 Replit Import Run 01

**Audit file:** `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-11-02_REPLIT_IMPORT_RUN_01.md`  
**Status:** Audit opened before source import; no Apex launch has occurred.  
**Source:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Requested source branch:** `main`  
**Verified source HEAD at audit opening:** `69523e937fcdaf3d55bf915f99906b907df89212`  
**Disclosure boundary:** Record timestamps, setup actions, visible prompts and structured model outputs when available, model/provider/tool identifiers, tool inputs and results, source URLs, failures, concise decisions, evidence/admission/card counts, and durable run identifiers. Never record secret values, hidden chain-of-thought, or unredacted personal contact details in this visible audit. Keep private contact data within the application's existing protected handling; do not weaken source disclosure safeguards.

## Acceptance contract

A successful run requires one canonical UI-equivalent launch; real model-directed discovery and research; source-backed findings that pass the repository's admission rules; at least one durable card retrievable through the ordinary UI/API; a truthful terminal job state; and a released active-job lock. Import, install, build, health, or an accepted launch alone do not satisfy this contract. Do not force a target, fabricate evidence, or run a duplicate while job state is ambiguous.

## Sequential event log

### E000 — New project and task handoff
- **Stage:** Project setup.
- **Action:** Moved the conversation into a new blank project as requested.
- **Initial state:** Project contained a generated pnpm starter workspace, no BigContacts source, and two template workflows (`artifacts/api-server: API Server`, `artifacts/mockup-sandbox: Component Preview Server`). Git was clean on local `main` with no remote.
- **Impact:** No Apex source was present; no install, launch, provider call, search, research write, or card creation occurred.

### E001 — Secret request and secure confirmation
- **Stage:** Runtime configuration.
- **Action:** Requested the 13 user-listed names through Replit's secure secrets flow: `COMPANIES_HOUSE_API_KEY`, `EXA_API_KEY`, `GROQ_BOSS_API_KEY`, `GROQ_RIGHT_HAND_API_KEY`, `GROQ_INVESTIGATOR_API_KEY`, `HF_TOKEN`, `GROQ_INVESTIGATOR_API_KEY_1`, `REDIS_URL_1`, `SCRAPFLY_API_KEY`, `SERPAPI_KEY`, `SERPER_API_KEY`, `TAVILY_API_KEY`, `ZENROWS_API_KEY`.
- **Result:** Replit confirmed these names were added. Secret values were not returned, viewed, copied, or recorded.
- **Impact:** Presence and validity will be checked only through the repository's presence-only preflight after import.

### E002 — Initial GitHub connector failure and public-fetch decision
- **Stage:** Source verification.
- **Action:** Tried the connected GitHub integration for read-only repository metadata, contents, and latest commit.
- **Result:** The connector reported a disconnected GitHub credential and HTTP 400. No reconnect flow was opened.
- **Recovery:** Direct unauthenticated GitHub API/web access confirmed the repository is public, TypeScript-based, and uses `main` as its default branch. Direct `git ls-remote` first failed because the environment rewrote GitHub traffic through the disconnected connector proxy.
- **Decision:** Do not reconnect. Use `GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null` for public Git transport, as verified by an earlier repository audit and this session.

### E003 — Current source revision confirmed
- **Stage:** Source verification.
- **Action:** Queried the public GitHub API and repository page for `main`.
- **Result:** Current `main` HEAD is `69523e937fcdaf3d55bf915f99906b907df89212`, commit date 2026-11-02. Repository is public. The merge message is “Merge PR #811: preserve semantic memory and runtime prompt scope.”
- **Decision:** Import only this verified `main` revision, not a feature or archive branch.

### E004 — Prior audit and product-scope findings reviewed
- **Stage:** Pre-import review.
- **Action:** Read the current README, repository study protocol, new-account setup, latest readiness record (2026-11-02), latest tracked live-run audit (2026-10-27), fresh-import audit (2026-10-24), and autonomous-run audit (2026-10-26).
- **Observed architecture:** Groq Boss owns case direction and Investigator selection; the selected Groq Investigator owns research strategy; Groq Right-hand performs bounded oversight. Deterministic controls enforce safety, provenance, identity, persistence, and limits. Preserve free-ReAct behavior and do not substitute a fixed search itinerary.
- **Prior run findings:** The 2026-10-27 audit records an incomplete run after Investigator quota exhaustion, but terminal reconciliation created five review-only organization cards. Later attempts in that audit reached no searches because provider/contract failures occurred. The 2026-11-02 readiness file reports no new live run and requires reconciliation of job, lock, evidence, cards, and read-back before acceptance.
- **Scope finding:** The repository describes an OSINT research desk that can investigate high-net-worth individuals and contact paths; this is broader and more privacy-sensitive than company-level Apollo-style B2B prospecting. Any live test must be bounded to public professional, company-related evidence. Do not run wealth profiling or collect private/personal contact details.
- **Audit boundary:** Capture visible prompts, explicit model-generated rationales, structured decisions, actions, tool outputs, and source provenance when safely available. Do not capture hidden chain-of-thought, secrets, or unredacted personal contact details.
- **Impact:** No model request, search, launch, evidence, admission, or card was created during this review.

### E005 — Template workflows stopped
- **Stage:** Pre-import cleanup.
- **Action:** Stopped `artifacts/api-server: API Server` and `artifacts/mockup-sandbox: Component Preview Server`.
- **Result:** Both stop operations succeeded.
- **Impact:** Prevents the starter API or unrelated mockup preview from being mistaken for Apex during import.

### E006 — Audit opened before source import
- **Stage:** Audit initialization.
- **Action:** Created this starred file at the visible repository path `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-11-02_REPLIT_IMPORT_RUN_01.md`.
- **Initial file policy:** Keep this audit visible and unignored. Never place the main audit in a private or ignored folder. Do not include secrets, hidden reasoning, or raw private contact details.
- **Current checkpoint:** Source is verified but not yet imported. No install, schema change, runtime boot, live launch, provider request, web search, finding, evidence, admission, or card has occurred.

### E007 — Public Git transport bypass verified
- **Stage:** Source import preparation.
- **Action:** Ran `GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null git ls-remote --heads https://github.com/2f22vtd4kr-cloud/BigContacts.git main`.
- **Result:** Command succeeded without GitHub authorization and returned `69523e937fcdaf3d55bf915f99906b907df89212` for `refs/heads/main`, matching the public GitHub API response.
- **Impact:** Public Git transport is available when the environment rewrite is disabled. This avoids reconnecting the stale GitHub connector. No source files have been fetched or changed yet.

### E008 — Git safeguard blocked the first backup operation
- **Stage:** Source import preparation.
- **Action:** Began a preflight that would create a local backup branch, add the public source as `origin`, and fetch the verified `main`.
- **Result:** Replit's Git safeguard stopped the command at the backup-branch lock path and requested its explicit `DANGEROUSLY_ALLOW_GIT=1` override. No branch, remote, or source file change was made by the blocked operation.
- **Recovery:** Retry only the reviewed backup-branch, remote-add, and exact-branch fetch commands with the required scoped override. The later reset remains gated on exact SHA and worktree checks.

### E009 — Exact public `main` fetched
- **Stage:** Source import preparation.
- **Action:** Created local backup branch `replit-starter-main-2026-11-02`, added the public repository as `origin`, and fetched `main` at depth 1 using the scoped Git override and system/global Git-config bypass.
- **Result:** Fetch received 3,455 objects (45.92 MiB). `FETCH_HEAD` equals verified GitHub API SHA `69523e937fcdaf3d55bf915f99906b907df89212`. The backup branch preserves the starter commit `fa3ed5c30d531210c738e28913d236fe8ed969a7`. Before reset, the only untracked path is this audit file.
- **Impact:** Source is fetched but not yet checked out. No starter file has been overwritten, no dependencies installed, no schema changed, and no runtime or research run started.

### E010 — Verified upstream source imported
- **Stage:** Source import.
- **Action:** Reset local `main` to the verified `origin/main` SHA. No `git clean` was used.
- **Result:** `HEAD` is exactly `69523e937fcdaf3d55bf915f99906b907df89212`. The starter commit remains on `replit-starter-main-2026-11-02`. The active audit survived and `git check-ignore` confirms it is not ignored. The only worktree change is this audit file.
- **Artifact/workflow:** Replit recognized the imported API artifact as **Apex Atlas** at preview path `/` and updated its managed API workflow to `cd ../.. && bash scripts/replit-boot.sh`. The unrelated starter mockup workflow remains stopped.
- **Impact:** Full source is imported. No dependencies installed, schema changed, API booted, provider call or research launch sent, or card created.

### E011 — Active secret contract cross-check
- **Stage:** Configuration review.
- **Action:** Read the imported presence-only preflight script.
- **Result:** It checks 12 active names and never prints values. Of the 13 names the user supplied, `SERPAPI_KEY` is not in this revision's active preflight contract; `SERPER_API_KEY` is checked. All requested names remain configured through Replit's secure flow.
- **Impact:** Record this as a source/configuration mismatch, not a secret-value failure. Do not add or rename provider credentials until source capability usage is verified.

### E012 — Correction: SERPAPI_KEY is intentionally not active
- **Stage:** Configuration review correction.
- **Action:** Cross-checked the preflight result against the current 30 October successor handoff.
- **Result:** The handoff explicitly states that `SERPAPI_KEY` was removed from preflight and the manual because this revision has no model-selectable executor action for that provider. `SERPER_API_KEY` is the supported search credential. Therefore E011's phrase “source/configuration mismatch” was inaccurate; the user-supplied `SERPAPI_KEY` is an extra configured secret, not a missing active capability.
- **Impact:** No code or secret changes are needed for this key. The correction is appended; E011 remains as the original observation.

## Live-run checkpoint

Not started. Record every subsequent setup, import, verification, runtime, and research action below in chronological order. Do not rewrite earlier events; append a correction event if needed.

### E013 — Canonical launch scope and setup blockers inspected
- **Stage:** Launch-contract and environment review.
- **Action:** Traced the UI button, canonical `/api/ingest/atlas-run` route, and model-owned discovery pipeline. Read-only inspected the Replit development database's public base tables.
- **Result — scope:** The UI button sends target count, research depth, and timeout only. The route's optional `discoveryContext` is appended as prior-attempt context; it does not replace the base objective. The active default objective seeks people with credible wealth potential and treats companies as paths to their owners/operators/investors. This is materially different from the user's stated Apollo-like B2B goal.
- **Decision:** No live research request has been sent. Asked the user whether to adapt the existing objective/admission scope to B2B-only or finish setup without a live run. Preserve the model-owned discovery/research architecture; do not pretend a context string changes the objective.
- **Result — database:** Read-only query of `information_schema.tables` for `public` base tables returned none. No schema initializer or database write has run.
- **Result — runtime tools:** Node is `v22.23.4`. Invoking the configured `pnpm` shim for `pnpm --version` repeatedly attempted `pnpm add pnpm@9.15.9` and ended in `SIGABRT`; the shell command timed out before Git status, ignore verification, or the presence-only preflight ran. No dependency installation was started.
- **Impact:** Next recovery is to inspect the package-manager shim and use the repository-pinned pnpm executable without changing the lockfile. Then run preflight and static checks. The live run remains blocked on the objective decision.

### E014 — Pinned package manager recovered; install state is incomplete
- **Stage:** Dependency setup and initial static verification.
- **Action:** Ran the presence-only preflight, then used the repository's supported wrapper: `npm exec --yes --package=pnpm@9.15.9 -- pnpm --version`; it returned `9.15.9`. Ran the same wrapper for `pnpm install --frozen-lockfile`.
- **Result — preflight:** All 12 active provider/integration secret names are present; the script printed presence only. `DATABASE_URL` is platform-managed. The extra `SERPAPI_KEY` is intentionally not active.
- **Result — install:** The command returned success but only showed the node-modules rebuild confirmation and update notice. Installed-directory timestamps remained at 23 October and the API package's `tsx` link was absent, so success is not yet trusted as a complete install.
- **Result — typecheck:** `pnpm run typecheck` exited 2. The API workspace reports many missing packages/types (including Vitest and ioredis); the mockup sandbox and scripts typechecks passed. This is an incomplete dependency-state failure, not evidence of source-code type errors.
- **Workflow observation:** The managed API workflow briefly built and listened on port 8080, then received `SIGTERM`; the stopped starter mockup workflow also briefly ran Vite on 8081 and received `SIGTERM`. No build crash was logged. Both remain stopped; only the managed API workflow will be restarted after setup.
- **Recovery:** Inspect the stale module metadata and force a lockfile-frozen reinstall in non-interactive mode. No lockfile, database, or source code has been changed.

### E015 — Forced frozen reinstall completed; discovery scope clarified
- **Stage:** Dependency recovery and workflow selection.
- **Action:** Re-ran the repository-pinned package manager in CI mode with `--force --frozen-lockfile --reporter=append-only`.
- **Result — dependencies:** pnpm 9.15.9 recreated the stale workspace modules directory, confirmed the lockfile was current, and installed 782 packages. The install completed in 1m 13.7s; package lifecycle scripts completed. No project dependency or lockfile edits were requested.
- **Result — user scope:** The user reiterated that Apex's discovery phase should be used and referred to the original instructions. Treat the original B2B description as the intended research scope; do not silently launch the repository's wealth-first default.
- **Workflow selection:** The imported repo has a canonical discovery-case API that accepts a human objective and feeds the same model-owned Atlas pipeline. Its route is explicitly `discoveryOnly`, so verify how its research continuation and card materialization work before using it as the full run.
- **Impact:** Retry static verification with the repaired dependencies. No provider calls, searches, schema writes, live cases, or cards have been created.

### E016 — Starred audit filename established
- **Stage:** Audit destination setup.
- **Action:** Renamed this visible audit to `audits/★_STARRED_APEX_ATLAS_SEQUENTIAL_AUDIT_2026-11-02_REPLIT_IMPORT_RUN_01.md`, matching Apex's explicit allowlist for a one-run visible sequential audit.
- **Result:** `git check-ignore` confirms the path is not ignored. The active API workflow is stopped, so no model trace was writing during the rename.
- **Correction:** Earlier event references to the prior filename describe the path at that time; this is the same audit, not a second report.
- **Impact:** This remains the single human-readable run audit. No model prompt/response trace has been written yet.

### E017 — Optional B2B objective added to the canonical full-run boundary
- **Stage:** Objective-scope compatibility fix.
- **Action:** Extended the existing canonical launch request to accept an optional `discoveryObjective`, reject non-string and oversized values, and forward a non-empty objective to `runCanonicalAtlasPipeline`. Extended the existing client launch helper's options and request body, and strengthened the Atlas launch contract check.
- **Design boundary:** No default objective was changed. If omitted, the existing objective remains intact. Boss control, Right-hand advice, Investigator selection/actions, evidence/provenance admission, quota recovery, and review-card reconciliation are unchanged.
- **Impact:** The full canonical route can now run one user-scoped B2B mission without substituting the discovery-only route or a scripted research sequence. No live request or database write has occurred.
