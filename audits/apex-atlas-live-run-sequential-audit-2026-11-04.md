# ⭐ ACTIVE AUDIT — Apex Atlas Live Run — 2026-11-04

**Audit file:** `audits/apex-atlas-live-run-sequential-audit-2026-11-04.md`  
**Status:** Import and setup in progress. No investigation has been launched in this project.  
**Source:** `https://github.com/2f22vtd4kr-cloud/BigContacts`, canonical branch `main`, expected revision `19cd5ed7e4a6fcb9c789e5bea238f9f5b15fc99c`.  
**Disclosure boundary:** This tracked audit records observable model outputs, action intent, tool calls and outcomes, evidence provenance, operator decisions, failures, corrections, and timings. It does not record secrets or private chain-of-thought. Contact details will be represented with source/attribution status and masked values here; the existing job-scoped private model trace remains separate and git-ignored.

## Sequential audit

### 001 — New project intake
- **Stage:** Project setup.
- **Action:** Moved this build into a new Apex Atlas project as requested.
- **Observed state:** The project initially contained the standard Replit pnpm starter, an API Server artifact, and a component-preview artifact; these are not the Apex product source.
- **Decision:** Import the repository's complete `main` into this existing checkout rather than scaffold a replacement application.
- **Impact:** No Apex code has been launched or investigated yet.

### 002 — Secure provider credential setup
- **Stage:** Credentials.
- **Action:** Checked whether the 13 user-listed secret names already existed and searched Replit integrations for the named providers.
- **Result:** None of the requested secret names was present. Exa and Tavily integrations were discoverable but not connected; no applicable ready provider connection was available. The user supplied the listed keys through Replit's secure secret flow.
- **Security:** Only names and presence were checked. Secret values were not returned, inspected, printed, or written to this report.
- **Impact:** Provider validity and quota remain unverified until the app's presence-only preflight and provider calls.

### 003 — Public source verification
- **Stage:** Repository source selection.
- **Action:** Checked the public repository and canonical `main` branch.
- **Result:** GitHub's public page reported `19cd5ed7e4a6fcb9c789e5bea238f9f5b15fc99c` as the latest `main` revision. The Replit GitHub integration/proxy rejected requests as disconnected; a public codeload archive was readable for inspection. A direct read-only `git ls-remote`, with the system GitHub URL rewrite disabled for that command, resolved `main` to the same SHA.
- **Decision:** Use the existing Replit Git checkout and fetch the verified `main` commit. Do not replace `.git`, push upstream, or reset the starter checkout until the source fetch is verified.
- **Impact:** The source is verified; the project checkout has not yet been changed.

### 004 — Prior-run and architecture review
- **Stage:** Pre-run review.
- **Action:** Read the repository README, current handoff, Nov 2 readiness record, Oct 27 live-run audit, import/setup guide, and audit-related project memory.
- **Observed history:** Earlier runs include Investigator quota exhaustion, rejected/blocked actions, and at least one job whose last recorded state was still running. The Nov 2 readiness record explicitly says it is not a live-run success report and contains no new evidence/card read-back. Those historical IDs do not prove this project's active-job state.
- **Architecture constraint:** Preserve Boss case direction and Investigator selection, bounded Right-hand oversight, model-owned Investigator strategy, and the runtime's safety, provenance, identity, persistence, cancellation, and terminal-state gates. Do not add a fixed search itinerary, force a target, silently rotate a selected credential, or manufacture a card.
- **Next gate:** After boot, inspect this project's database and canonical active-job/lock state read-only. Launch only one run through the normal UI after that state is unambiguous.

### 005 — Starter preview stopped; audit visibility checked
- **Stage:** Pre-import cleanup.
- **Action:** Stopped the generated API Server and Component Preview Server workflows, then checked the new audit file against ignore rules.
- **Result:** Both starter workflows stopped. The starred audit exists at the path above and is not ignored. The current Replit checkout remains on its original `main` commit; it has no remote configured.
- **Reason:** Prevent starter services from being confused with Apex and preserve the requested visible audit during the source import.

### 006 — Git safety gate on source fetch
- **Stage:** Repository import.
- **Action:** Attempted to fetch the verified public `main` revision into the existing Replit Git checkout without changing the worktree.
- **Result:** Replit's Git safeguard rejected the fetch before it could update `FETCH_HEAD` or import objects.
- **Impact:** No source files or branch state changed. The reviewed next step is to repeat this specific public fetch with the safeguard override, then verify the fetched SHA before any worktree reset.

### 007 — Exact public `main` fetched
- **Stage:** Repository import.
- **Action:** Repeated the specific fetch with the scoped Git-safeguard override and system URL rewrite disabled.
- **Result:** The shallow source fetch completed; `FETCH_HEAD` exactly matched `19cd5ed7e4a6fcb9c789e5bea238f9f5b15fc99c`.
- **Safety:** The source commit is verified before reset. The existing `.git` directory and audit file remain in place; no push has occurred.

### 008 — Repository imported into the existing checkout
- **Stage:** Repository import.
- **Action:** Saved the blank starter revision on a local backup branch, configured the public source as `origin`, and reset the existing `main` worktree to the verified fetched commit.
- **Result:** `HEAD` is `19cd5ed7e4a6fcb9c789e5bea238f9f5b15fc99c`; the original Replit `.git` directory remains intact. Replit recognized the imported API artifact as **Apex Atlas** at `/` and updated its single API workflow to `cd ../.. && bash scripts/replit-boot.sh`.
- **Audit result:** This file remains visible and is not ignored. No files were pushed to GitHub.
- **Next action:** Install the imported lockfile once, run the repository's presence-only preflight, and inspect the new development database without changing its schema.

### 009 — First install, provider preflight, and database baseline
- **Stage:** Minimum runtime setup.
- **Action:** Ran the repository-pinned frozen pnpm install once, the source's presence-only provider preflight, and a read-only development-database table-count query.
- **Install result:** Exit status 0 using the source-pinned pnpm 9.15.9. No dependency or source edits were requested by the operator.
- **Provider result:** All 11 active provider/service secret names required by this source revision are present. `SERPAPI_KEY` was supplied but is not part of the source's active preflight contract. Values were not printed or tested here.
- **Database result:** The platform-managed `DATABASE_URL` is available; the new development database has 0 public base tables.
- **Decision:** The development DB is confirmed empty, so the repository's one-time schema initializer may run once. Ordinary boot will continue to skip schema mutation.

### 010 — Schema initialization attempt blocked before DDL
- **Stage:** Development database initialization.
- **Action:** Ran the repository's one-time schema initializer with its documented, command-scoped schema-push opt-in.
- **Result:** The script acquired its single-writer lock, then failed before Drizzle schema push. The nested package-manager command repeatedly tried to add the repository-pinned pnpm version and aborted with `SIGABRT`.
- **Impact:** No successful schema push or migration was reported. Before retrying, re-check table/lock state and inspect the initializer's package-manager invocation; do not assume partial completion or repeat the same command unchanged.

### 011 — Safe retry condition verified
- **Stage:** Development database recovery.
- **Action:** Re-read the public table count and advisory locks after the failed initializer; inspected the initializer and package-manager resolution.
- **Result:** The database remains at 0 public tables and 0 other advisory locks. The failed child command used the global pnpm 10.26.1 despite the repository pinning pnpm 9.15.9; the repository's normal boot wrapper already provides the pinned version.
- **Recovery:** Retry the same documented initializer once through `npm exec --package=pnpm@9.15.9 -- bash ...`, so its nested `pnpm` calls resolve to the repository-pinned version. No source files or database rows were changed by the first attempt.

### 012 — Development schema initialized
- **Stage:** Development database initialization.
- **Action:** Re-ran the documented one-time initializer through the pinned pnpm 9.15.9 environment after confirming the database and schema-operation lock were still empty.
- **Result:** Drizzle schema push, durable hardening, compatibility migrations 002–004, and required-table verification all completed. Migration 004 corrected 0 legacy rows. The one-shot `APEX_ALLOW_SCHEMA_PUSH=true` was confined to this command.
- **Safety:** No existing application tables or rows were present before initialization; ordinary application boot remains configured to skip schema mutation.
- **Next action:** Start the single imported Apex Atlas API/UI workflow and check its startup logs, health, database, Redis, and provider status before any research launch.

### 013 — Canonical API/UI boot stopped at frontend dependency resolution
- **Stage:** Application startup.
- **Action:** Restarted the imported Apex Atlas workflow, which ran the canonical boot script and began the frontend build.
- **Result:** The frontend contract and source-boundary checks passed, but the build stopped at `vite: not found`; pnpm reported that the `apex-finder` package had no `node_modules`.
- **Impact:** The API/UI did not start. No provider/model call, search, investigation launch, or card creation occurred.
- **Recovery:** Check whether the earlier frozen install actually linked workspace dependencies. If not, perform one corrected install before another boot attempt; do not repeat the application build until dependencies resolve.

### 014 — Corrected dependency install
- **Stage:** Dependency recovery.
- **Action:** Confirmed the remaining `node_modules` links belonged to the starter project and that `artifacts/apex-finder/node_modules` was absent. Re-ran the source-pinned frozen install once with `CI=true` and `--force` to replace the stale generated links.
- **Result:** pnpm 9.15.9 resolved the imported lockfile unchanged and installed 782 packages across 10 workspace projects; native postinstall steps completed. The earlier “successful” install had not populated the imported frontend links.
- **Security/cost:** No new dependency or lockfile change was requested; the force option applied only to generated `node_modules`.
- **Next action:** Verify the frontend binary is now linked, then restart the same canonical workflow once.

### 015 — Dashboard and service readiness
- **Stage:** Runtime readiness.
- **Action:** Restarted the single imported Apex Atlas workflow after dependencies were linked; checked the workflow log, browser preview, `/api/healthz`, and `/api/system/status`.
- **Build result:** Frontend and API build checks completed; the API/UI server started from commit `19cd5ed7e4a6fcb9c789e5bea238f9f5b15fc99c`. The dashboard preview shows the normal Overview and **Launch Apex Atlas** control. Browser output contained only the React DevTools notice.
- **Service result:** Health reports `ok`; Postgres is ready; local Redis and configured Upstash slot are ready. `bureauIntegrity` is `ok`.
- **Provider configuration:** Groq Boss and Right-hand roles are configured; Investigator credential slots 0 and 1, plus one Serper, Tavily, and Exa slot, are configured. Status is cached/configuration-only and does not establish live provider quota or successful research. Python-backed specialist tools remain unavailable because no fresh worker attestation is present.
- **No investigation yet:** No model/provider request, search, target discovery, or card creation has occurred. Next, read the canonical active-job endpoint and confirm it is idle before launching.

### 016 — Pre-launch lock reconciliation and UI request selection
- **Stage:** Immediately before investigation.
- **Read-only lock checks:** `GET /api/ingest/job/active/atlas-run` and `GET /api/ingest/job/active/case-bureau-discovery` both returned `active:false` and `jobId:null`. No existing Atlas/case-discovery job needs recovery or reconciliation.
- **Mission selection:** The UI already contains its documented default objective; no sector or country was supplied, so I am preserving that broad default rather than inventing a target or adding a fixed search itinerary.
- **Exact UI objective:** “Identify real operating companies and their current business decision-makers for B2B prospecting. No sector or country is specified; keep discovery broad. A source-backed operating company is a valid finding even if its decision-maker remains unresolved; preserve its company card and state the gap. Identify people only when fetched public company or professional sources support their current decision-maker role and company connection. Seek legitimate public professional or company contact routes when published; do not use private or personal contact details or infer wealth. Treat snippets and search results as unverified leads, not evidence. Let Boss and Investigator choose targets, hypotheses, providers, sources, queries, actions, pivots and stopping from evidence; do not impose a fixed research sequence.”
- **UI-equivalent request:** `POST /api/ingest/atlas-run` using the same request builder and defaults as the dashboard button: `targetCount: 3`, `researchDepth: "standard"`, `targetTimeoutMs: 420000`, the exact objective above, and no `singleTargetId`.
- **Safeguard:** This is the canonical model-owned launch endpoint, not a legacy route or direct job-queue write. Its server-side distributed-lock check remains authoritative if another operator starts work between the read-only check and the request.

### 017 — First live model-owned investigation accepted
- **Stage:** Canonical launch.
- **Action:** Submitted the exact UI-equivalent request to `POST /api/ingest/atlas-run`.
- **Result:** HTTP `202`; Apex created job `62fdf9b0-5827-4baa-83c2-258cc085061f` and returned its canonical poll URL. The server confirmed `targetCount: 3`, `researchDepth: standard`, no `singleTargetId`, objective included, and no extra discovery context.
- **Integrity:** This is a real run, not mock mode. Do not launch another job; follow this job through terminal reconciliation and card persistence.

### 018 — Discovery control entered model-selected identity resolution
- **Stage:** Initial discovery, first live poll.
- **Observed at:** `2026-11-04T09:58:18Z` (UTC).
- **Job state:** `running`, progress `1`, errors `0`; started at `2026-11-04T09:58:11.444Z`.
- **Observable bureau event:** `actor=web`, `kind=tool`, `title=llm_wait`, `targetName=discovery`, `provider=groq-investigator-1`; event says the system is waiting for the Boss-selected Investigator decision at `identity_resolution`.
- **Interpretation:** The canonical workflow is running and has entered its model-owned discovery/control path. This event is not evidence of a search, company, person, or card yet.
- **Audit boundary:** Continue recording observable model decisions, tool calls, provider outcomes, evidence references, and concise action rationale. Do not reproduce hidden private chain-of-thought, secrets, or private/personal contact details in this visible audit.

### 019 — Investigator-selected parallel search returned leads
- **Stage:** Discovery.
- **Observed at:** `2026-11-04T09:59:03.277Z` (UTC).
- **Tool span:** Agent `investigator` invoked `parallel_web_search` for target `discovery`; status `ok`.
- **Outcome reported by the trace:** 18 search-result lead URLs were surfaced from independent searches.
- **Evidence status:** These are leads only, not fetched/source-verified evidence and not a company/person admission. The public span stores only the generic tool name and this result summary; it does not expose the exact query text or raw snippets. No raw query is inferred or reconstructed.
- **Next check:** Follow the Investigator’s fetch/verification and admission decisions through the same job’s live trace and durable case events.

### 020 — Discovery still active; runtime surfaced bounded provider recoveries
- **Stage:** Discovery monitoring.
- **Polls:** At `2026-11-04T10:00:22Z` and `2026-11-04T10:01:10Z`, job `62fdf9b0-5827-4baa-83c2-258cc085061f` remained `running`, progress `1`, errors `0`; the canonical active lock still pointed to this same job. No second run was launched.
- **Trace:** No new public tool span had arrived after the successful parallel search at `09:59:03Z`.
- **Runtime log preview:** Groq Boss 120B calls were succeeding with some bounded HTTP 429 retries; the Investigator had one `json_validate_failed` response followed by a successful retry. No Investigator key-exhaustion signal was observed, so the architecture’s alternate-key reassignment was not invoked.
- **Audit-tool issue:** The first attempt to aggregate these log records used CommonJS `require` alongside top-level `await` under Node 22 and failed before reading any records. This affected only the audit command, not Apex or its job. Retry with an ESM-safe reader and record exact attempt counts.

### 021 — First run terminated during oversight control
- **Stage:** Discovery/control, terminal poll at `2026-11-04T10:02:06Z`.
- **Job state:** `failed`, progress `1`, errors `1`; public job message classifies the failure as `oversight_control_decision` / `unexpected_programming_error` / `unexpected_exception` and exposes only digest `8af5571b0c17fa19`. The active Atlas lock is now clear. Durable case `1` was created.
- **Attempt telemetry captured so far:** 16 Groq GPT-OSS 120B attempts: 11 Boss, 2 Right-hand, 3 Investigator. Eleven returned HTTP 200; one Investigator HTTP 400 `json_validate_failed` was followed by a successful retry; four Boss HTTP 429 `rate_limit_exceeded` responses were logged, three followed by successful retry responses. The last visible Boss 429 had no successful retry in this snapshot. Its relationship to the terminal exception is unconfirmed until the server error record is inspected.
- **Key decision:** This was not an Investigator quota-exhaustion event. No investigator-key reassignment was warranted. Do not retry by creating a new run; first inspect the durable case, terminal event, and correlated server error, then use the repository’s bounded canonical recovery path only if its eligibility checks allow it.

---

Append each subsequent setup, launch, model handoff, action, observation, error, recovery, and final reconciliation below in chronological order. Distinguish observed facts from operator interpretation; never describe a build or accepted launch as a successful investigation without terminal state, evidence, durable card read-back, and released lock.
