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
- **Attempt telemetry:** The first log snapshot contained 16 Groq GPT-OSS 120B attempts: 11 Boss, 2 Right-hand, 3 Investigator. A later refresh showed the final Boss HTTP 429 `rate_limit_exceeded` also received a successful retry (HTTP 200; 1,622 prompt / 340 completion tokens; 979 ms). Thus all four Boss rate limits recovered within bounded retries. The Investigator HTTP 400 `json_validate_failed` likewise recovered on retry. The terminal exception is not explained by an exhausted key or an unrecovered provider response.
- **Key decision:** This was not an Investigator quota-exhaustion event. No investigator-key reassignment was warranted. Do not retry by creating a new run; first inspect the durable case, terminal event, and correlated server error, then use the repository’s bounded canonical recovery path only if its eligibility checks allow it.

### 022 — Persisted case state recorded before source update
- **Stage:** Post-failure reconciliation.
- **Read-only case inspection:** `GET /api/research/bureau/cases/1` returned a discovery case in `review` state, created at `09:58:13.559Z` and updated at `10:01:42.166Z`; its `targetEntityId` is null. The event endpoint returned six events: assignment, observation, control decision, assignment, then two tool observations.
- **Outcome:** The case has not produced a company-bound card. The failed job and its active lock are terminal/cleared. No prompt, `thought` field, raw private contact, or secret was copied into this visible audit.
- **Next action:** Preserve this audit and the initialized DB, fetch the user-specified `main` commit `ff3e799bca5f67d4ed4ad2230044d9ce2940afb7`, inspect the source delta and migration impact, then verify the new canonical route before the next launch.

### 023 — Requested commit fetched; local branch is not a fast-forward
- **Stage:** Source update.
- **Action:** Fetched `origin/main` and verified it resolves exactly to `ff3e799bca5f67d4ed4ad2230044d9ce2940afb7`.
- **Finding:** The current local `main` is at `6578afe22778fb8141eaa4f37042aac446e86565`, so the fetched commit is not a fast-forward from this checkout. The fetched tree adds the new Bureau Playbook/orientation/control changes and has no schema migration paths. Its tree also omits this visible audit file.
- **Safeguard:** No reset, checkout, merge, or audit deletion was performed. Inspect the commit graph and preserve the visible audit before applying the source changes. The current API workflow and database remain untouched.

### 024 — Latest Bureau Playbook integrated without resetting the project
- **Stage:** Source integration.
- **Integration:** The graph showed both local audit commit and requested source commit descend from `19cd5ed`. A merge preview reported no conflicts; the preview command first needed its documented Git-guard override. Merged `ff3e799bca5f67d4ed4ad2230044d9ce2940afb7` into existing `main`, producing local merge commit `2a52d1a356ce5484d12085ae180800c547347353`.
- **Change reviewed:** The source adds an adaptive Bureau Playbook and supplies it to Boss/Right-hand orientation and control prompts, while keeping Investigator execution model-owned and the playbook explicitly non-deterministic. It preserves provenance, identity, scope, and contact-safety boundaries. The API build now copies the text reference into `dist`.
- **Preservation:** The visible audit file remains at `audits/apex-atlas-live-run-sequential-audit-2026-11-04.md`; no force reset or database replacement occurred. No package/lockfile or schema/migration paths changed, so do not reinstall dependencies or rerun schema initialization.
- **Next action:** Restart the canonical API/UI workflow once so the new build and prompt contract are active; then recheck health and both active-job lanes before launching a new run.

### 025 — Updated runtime ready; both research lanes idle
- **Stage:** Post-update readiness.
- **Build:** Canonical API workflow restarted from merge commit `2a52d1a356ce5484d12085ae180800c547347353`. The imported API build and source-contract checks passed; the new playbook asset is present in `dist` (9,951 bytes). The API/UI server is running.
- **Services:** `/api/healthz` reports `ok`; `/api/system/status` reports Postgres `ok` (20 ms), local Redis `ready` (130 ms), configured Upstash `ready`, and `bureauIntegrity=ok`.
- **Provider configuration:** Boss and Right-hand are configured; Investigator slots 0 and 1 are active; one Serper, Tavily, Exa, and Companies House lane is active. These checks establish configuration, not live quota; the investigation itself will verify actual provider behavior.
- **Lock reconciliation:** Both `atlas-run` and `case-bureau-discovery` return `active:false`, `jobId:null`. The previous failed case remains in the database; no data/schema reset was performed.
- **Non-blocking setup issue:** The separate, unused mockup-sandbox workflow again failed while trying to self-install pnpm 9.15.9 under the environment’s package-manager wrapper. Apex serves its dashboard from the API workflow, so no mockup workflow or extra install was started.
- **Next action:** Launch one new run through the canonical UI-equivalent request using the same built-in broad B2B objective and standard defaults.

### 026 — Second live run accepted on updated main
- **Stage:** Canonical launch after source update.
- **Action:** Submitted the dashboard-equivalent request to `POST /api/ingest/atlas-run` on merged commit `2a52d1a356ce5484d12085ae180800c547347353`.
- **Result:** HTTP `202`; new job `b939bfff-fbb2-4573-b1b6-bc3dd3923f41`; canonical poll URL `/api/ingest/job/b939bfff-fbb2-4573-b1b6-bc3dd3923f41`.
- **Options:** Three targets, standard depth, 420,000 ms target timeout, exact built-in B2B objective from event 016, no single target or extra discovery context. The server confirmed the objective was included.
- **Integrity:** One new job only. Monitor this job through terminal status, durable evidence, and card creation; do not launch another concurrently.

### 027 — Updated run’s first control and Investigator calls
- **Stage:** Opening control/assignment, first runtime-log snapshot.
- **Observed calls:** The first seven telemetry records show Boss GPT-OSS 120B success, two Right-hand GPT-OSS 120B successes, then a successful Boss control decision. Boss selected capability `groq-investigator-20b` / model GPT-OSS 20B for the first Investigator identity-resolution turn; that call succeeded (1,774 prompt / 1,201 completion tokens; 1,871 ms). This is the model-owned selection on the updated run, not a fallback after key exhaustion.
- **Rate limit:** One subsequent Boss call returned HTTP 429 `rate_limit_exceeded`; the bounded retry outcome is not yet visible in this snapshot.
- **Evidence:** No new search span, fetched-source verification, or company card is yet confirmed for this run.
- **Audit-tool issue:** The first status/trace poll command omitted its `node` heredoc wrapper and failed at shell parsing before issuing any HTTP request. No application state changed; retry with the valid wrapper.

### 028 — Updated run completed first model-selected discovery turn
- **Observed at:** `2026-11-05T04:45:40Z` (UTC).
- **Job/case:** Job `b939bfff-fbb2-4573-b1b6-bc3dd3923f41` is still `running` with errors `0` and the same active lock; new discovery case `2` is `active`, iteration `1`, `currentAction=investigator-completed`.
- **Tool result:** Investigator’s `parallel_web_search` span completed `ok` at `04:45:08.406Z`; trace reports 18 independent search-result lead URLs. Search leads are not yet verified company/person evidence.
- **No cards yet:** Case 2 has no target entity at this checkpoint. Next inspect the structured tool-observation record for exact search arguments and public source URLs, excluding any hidden `thought` field.

### 029 — Raw discovery queries and search-result leads
- **Stage:** Case 2, Investigator turn 1, `parallel_web_search`; event `11`, `2026-11-05T04:45:08.420Z` UTC.
- **Selected capability/model:** `groq-investigator-20b` / GPT-OSS 20B. The Investigator selected three concurrent provider queries; the tool returned 18 URLs (six per provider), `findingsCount=0`, `sourceBindingsCount=0`, and no fetched/observed URLs.
- **Structured hypothesis:** “Public business directories and annual company listings contain names of companies that are currently operating as of 2023, which can serve as a source‑backed foundation for B2B decision‑maker identification.” Purpose: “Identify real operating companies for B2B prospecting.” Declared expected information gain: `0.6`.
- **Exact searches:**  
  1. Serper, locale `US`, market `US`: **“publicly active companies 2023”** — purpose: discover companies listed as active in 2023.  
  2. Tavily, locale `global`, market `US`: **“business directory of operating companies”** — purpose: discover companies via business directories.  
  3. Exa, locale `global`, market `US`: **“list of companies currently in operation 2023”** — purpose: discover companies via annual listings.
- **Returned lead URLs (all unverified):**
  - Serper: https://www.forbes.com/lists/global2000/ ; https://en.wikipedia.org/wiki/List_of_public_corporations_by_market_capitalization ; https://justcapital.com/rankings/ ; https://tuck.dartmouth.edu/news/articles/where-did-all-the-public-companies-go ; https://companiesmarketcap.com/ ; https://www.sec.gov/files/rules/other/4-460list.htm
  - Tavily: https://leadiq.com/c/dale-operating-company/5a1d9d3b2300005c008d15a2/employee-directory?page=4 ; https://guides.newman.baruch.cuny.edu/c.php?g=188235&p=1243714 ; https://leadiq.com/c/aero-operating-llc-and-family-of-companies/5a1d9d8123000054008d5a73/employee-directory ; https://guides.loc.gov/entrepreneurs-reference-guide/directories ; https://www.zoominfo.com/pic/kr-operating-llc/76252471 ; https://www.zoominfo.com/pic/stp-nuclear-operating-co/36782491
  - Exa: https://www.founded.org/companies/status/active/ ; https://ukcompanyhub.co.uk/companies/ ; https://www.kaggle.com/datasets/mfrye0/bigpicture-company-dataset ; https://aidb.si/d/us-company-financials-2023 ; https://fortune.com/ranking/fortune500/2023/explore/ ; https://github.com/EatMoreOranges/Fortune-500-Dataset/blob/main/data/2023-fortune-500-data.csv
- **Raw result excerpts, still leads:** Forbes’ result lists Intel, Coherent, Richemont, Lennar, H&M, Samsung Electronics, and TDK. The Wikipedia result says its list is current only as of 31 December 2023. Dartmouth’s article describes the decline in U.S. public-company counts through 2020. The SEC URL is a legacy “List of Companies” page. Tavily’s LeadIQ snippet describes Dale Operating Company as an oil-and-gas company founded in 1981 with about 39 employees; the returned directory summary says it provides no specific contact details or official websites for the named companies. Exa surfaced a 2023-Q4 company dataset, 2023 SEC financials, a 2023 Fortune 500 explorer, and a 2023 Fortune 500 CSV.
- **Evidence/provenance assessment:** This call produced search snippets and URLs only; no company operating status, role, identity, or contact route is verified. Several sources are secondary directories or historical datasets, not current primary evidence. No card should be admitted from these results alone.
- **Quality note for later analysis:** The model chose `2023` queries and `US` markets despite the broad, country-unspecified objective. These are the Investigator’s emitted tool arguments, not operator-imposed scope. They risk stale/narrow discovery; I did not inject a replacement target or query. Observe whether Boss/Investigator challenge the age/source quality and pivot autonomously.

### 030 — Oversized-observation compaction failed closed; Boss continued discovery
- **Observed at:** Trace error span `2026-11-05T04:47:00.594Z` UTC.
- **Runtime event:** `ai_recent_observation_compaction_unavailable` for target `discovery`: AI compaction of the oversized recent observation was unavailable or failed its size/provenance checks. The trace explicitly says no action was sent using a deterministically truncated substitute.
- **Durable control response:** At `04:47:42.035Z`, case 2 recorded a completed Boss control decision `continue_discovery`, confidence `0.85`, with the concise reason: “No specific candidate identified yet; unfetched leads (e.g., global company lists) remain and could yield operating companies. Continue broad discovery to fetch and assess leads.” The full human objective remained unchanged in the following control-objective event.
- **Current state:** Job remains `running`, errors `0`, active lock held by job `b939bfff-fbb2-4573-b1b6-bc3dd3923f41`; case 2 remains active, iteration `1`, `currentAction=canonical-control-continue_discovery`, and has no target entity.
- **Decision:** This is a material runtime warning, but the guarded failure did not replace source context with a truncated version and the Boss selected a continuation. Do not patch or manually direct the Investigator yet; observe whether the next autonomous action resumes normally or the same boundary blocks it again.

### 031 — Repeated control calls without a new research action
- **Observed through:** `2026-11-05T04:50:31Z` UTC, workflow telemetry and read-only job/case/trace polls.
- **Provider activity:** Groq GPT-OSS 120B continued making Boss `control_decision` calls; Right-hand also completed a `control_advisory` call. Several Boss HTTP 429 `rate_limit_exceeded` attempts were retried successfully. A Boss control response returned HTTP 400 `json_validate_failed` and then succeeded on retry index 3. The newest telemetry snapshot ends with another Boss 429 whose retry outcome is not yet visible.
- **No Investigator quota exhaustion:** There is no `upstream_quota_exhausted` or Investigator provider-error event, and the assigned Investigator remains `groq-investigator-20b`. Do not rotate investigator credentials or reassign based on transient Boss rate limits or a recovered JSON validation error.
- **No durable progress:** At `04:50:30.984Z`, the job was still running with errors `0`; case 2 remained active at iteration `1`, `currentAction=canonical-control-continue_discovery`, no target entity, and its last durable event remained event `13` at `04:47:42.590Z`. The trace still contains only the original search and the compaction error: 18 unverified leads, 0 fetched URLs, 0 findings, 0 source bindings, and no card.
- **Implementation diagnosis:** The source fails closed when Boss context compaction returns no valid summary; it does not send deterministic excerpts as a substitute. The compaction helper returns `null` for provider, prompt-size, summary-schema, or URL-provenance failures, but the current trace exposes only a generic compaction-unavailable message, not which condition occurred. This is an observability gap, not evidence of a depleted Investigator key.
- **Action:** Keep the active job untouched while it remains within its configured timeout; no code edit or manual query/target has been applied. If it terminalizes without a new Investigator action, inspect the complete failure path, add only the minimum safe diagnostic/recovery change, then make a fresh canonical UI launch.

### 032 — Updated-main run terminalized before a usable continuation
- **Terminal state observed:** Job `b939bfff-fbb2-4573-b1b6-bc3dd3923f41` failed at `2026-11-05T04:50:39.527Z`; progress `3`; error count `0`. The active Atlas-run lock is released.
- **Case state:** Case 2 moved to `review`, iteration `3`, `currentAction=canonical-investigator-episode-failed`, no target entity. Event `14` records: “Canonical Investigator continuation failed before producing a usable research pass; case parked for review.”
- **Failure classification:** Job message classifies the continuation as `failureDomain=model_action`, `failureKind=no_usable_action` (error digest `da9b1db98bf22e26`). The trace still records the earlier AI recent-observation compaction failure. This is not a classified exhausted Investigator key, so no Investigator switch was appropriate.
- **Run result:** The only research action was the initial `parallel_web_search`; 18 results remained unverified leads, with no fetched URLs, claim-grade findings, source bindings, target entity, or company cards. This is not a successful run.
- **Next step:** Inspect only the sanitized failure payload and the compaction/control path to identify the smallest architecture-preserving fix; then relaunch via the canonical Atlas UI action with the unchanged objective and source-verification safeguards.

### 033 — Sanitized failure metrics
- **Case event:** Event `14` reports `failureCode=investigator_episode_no_action`, `reportedStatus=timeout`, `stopReason=HARD_TIMEOUT`, `iterations=1`, `newTrajectoryRecordCount=0`, and `investigatorActionExecuted=false`.
- **Cumulative run counters:** 3 search-provider calls, 0 visits, 3 cumulative Investigator iterations across the failed attempt and continuation, and 1 cumulative trajectory record (the initial search). No target research episode or card admission occurred.
- **Failure semantics:** `failureDomain=model_action`, `failureKind=no_usable_action`; no runtime-stage code, provider error code, or quota-exhaustion signal was recorded. This confirms a bounded timeout/no-action failure, not a reason to swap Investigator keys.
- **Evidence state:** The case remains available in review; the initial three searches and their raw result evidence remain durably recorded. No reset or deletion was performed.

### 034 — Targeted test command hit the global pnpm bootstrap shim
- **Attempt:** Ran only `ai-investigation-context-compaction.test.ts` with the global `pnpm` command.
- **Result:** The Replit shim recursively attempted `pnpm add pnpm@9.15.9` and exited with `SIGABRT` before the test runner started. No test ran and no project files or dependencies were changed by that attempt.
- **Recovery:** Use the repository’s established pinned invocation (`npm exec --yes --package=pnpm@9.15.9 -- pnpm ...`) for the targeted test and required API build; do not repeat installs or schema initialization.

### 035 — Bounded compaction headroom and task telemetry updated
- **Diagnosis:** The recent-observation compactor had only a 1,024-token first-response cap for the 1,200-character summary, with 1,280 tokens for repair. The source notes that GPT-OSS completion budgets include private reasoning tokens. The live failure did not expose the precise compaction rejection cause, so insufficient output headroom is a plausible risk, not a proven root cause.
- **Minimal change:** Raised the initial compaction output budget to 1,536 tokens and repair to 1,920 (provider cap remains 2,048). Both Boss calls now identify `cognitiveTask=context_compaction`, so future operational telemetry distinguishes summary work from control decisions. The helper still enforces the same 1,200-character summary limit, exact-URL provenance checks, source-grounding rules, and fail-closed behavior; no deterministic excerpt fallback was added.
- **Verification:** The targeted `ai-investigation-context-compaction.test.ts` suite passed: 10 tests. It ran with the repository’s pinned pnpm invocation after the global shim failed to bootstrap.
- **Next:** Restart the existing API workflow once; its canonical boot script will rebuild the changed API bundle. Then verify health and use the canonical Atlas launch with the unchanged objective.

---

Append each subsequent setup, launch, model handoff, action, observation, error, recovery, and final reconciliation below in chronological order. Distinguish observed facts from operator interpretation; never describe a build or accepted launch as a successful investigation without terminal state, evidence, durable card read-back, and released lock.
