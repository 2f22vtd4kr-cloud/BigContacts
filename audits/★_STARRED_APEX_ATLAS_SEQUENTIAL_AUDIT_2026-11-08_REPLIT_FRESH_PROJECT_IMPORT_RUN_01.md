# ⭐ ACTIVE AUDIT — Apex Atlas Fresh Project Import and Live Run — 2026-11-08

**Audit file:** `audits/★_STARRED_APEX_ATLAS_SEQUENTIAL_AUDIT_2026-11-08_REPLIT_FRESH_PROJECT_IMPORT_RUN_01.md`  
**Status:** Import and runtime setup in progress. No investigation has been launched in this project.  
**Source:** `https://github.com/2f22vtd4kr-cloud/BigContacts`, canonical branch `main`, cloned revision `97915e7ddffd444ca05a347fd31773e88bc5f37f`.  
**Disclosure boundary:** This visible audit records the chronological setup, observable model role/capability, non-sensitive prompts and structured outputs where available, actual tool calls and outcomes, public evidence URLs, persistence/card reconciliation, operator decisions, failures, corrections, and timings. It never records secret values, hidden chain-of-thought, or unmasked personal email/phone values. Contact attribution and source status may be recorded with contact values masked. Do not infer an action, result, quota failure, or successful run from missing telemetry.

## Sequential audit

### 001 — New project intake
- **Observed at:** 2026-11-08 (UTC; exact time not captured for this initial inspection).
- **Stage:** Project setup.
- **Action:** Moved the requested build into a new Apex Atlas project.
- **Observed state:** The initial project contained only the standard Replit pnpm starter, a generic API Server artifact/workflow, and a component-preview artifact/workflow. It contained no Apex application code or earlier Apex run trace.
- **Decision:** Import the complete public canonical `main` source into this checkout. Do not scaffold a replacement product.

### 002 — Provider credentials requested securely
- **Observed at:** 2026-11-08 (UTC; exact time not captured).
- **Stage:** Credentials.
- **Action:** Requested the 13 user-listed credential names through Replit's secure Secrets form. The user submitted them; only names/status are available to the agent.
- **Names supplied:** `COMPANIES_HOUSE_API_KEY`, `EXA_API_KEY`, `GROQ_BOSS_API_KEY`, `GROQ_RIGHT_HAND_API_KEY`, `GROQ_INVESTIGATOR_API_KEY`, `HF_TOKEN`, `GROQ_INVESTIGATOR_API_KEY_1`, `REDIS_URL_1`, `SCRAPFLY_API_KEY`, `SERPAPI_KEY`, `SERPER_API_KEY`, `TAVILY_API_KEY`, `ZENROWS_API_KEY`.
- **Security:** No credential value was read, printed, copied into a command, or written to this audit. Presence, provider validity, and quota are not yet verified.

### 003 — Replit Git proxy rejected the first public lookup
- **Observed at:** 2026-11-08 (UTC; exact time not captured).
- **Stage:** Source selection.
- **Action:** Ran a read-only `git ls-remote` against the public repository using the environment's default Git configuration.
- **Result:** Replit rewrote GitHub traffic to its internal GitHub proxy, which returned HTTP 400 and reported the GitHub connection as disconnected. This was a Replit proxy/auth-routing failure, not evidence that the repository was private or missing.
- **Decision:** Do not request GitHub credentials or reconnect. Verify public HTTPS endpoints and use a direct public read.

### 004 — Public source verified without reconnecting
- **Observed at:** 2026-11-08T17:54:52Z (GitHub response timestamp).
- **Stage:** Source selection.
- **Action:** Checked the repository page, public codeload endpoint, and GitHub repository metadata over HTTPS.
- **Result:** GitHub and codeload returned HTTP 200. Repository metadata identifies `2f22vtd4kr-cloud/BigContacts` as public with default branch `main`.
- **Import:** A shallow clone of `main` succeeded with the environment's Git URL rewrites disabled for that command. No credentials or integrations were used.
- **Revision:** `97915e7ddffd444ca05a347fd31773e88bc5f37f`.

### 005 — Prior-run evidence and architecture constraints reviewed
- **Observed at:** 2026-11-08T17:55:47Z (UTC).
- **Stage:** Pre-run review.
- **Action:** Read the repository README, repository-study protocol, living context, current successor index/handoff, new-Replit setup contract, and latest tracked job-bound live-run audit (`audits/apex-atlas-live-run-sequential-audit-2026-11-04.md`).
- **Prior run 1:** The Nov. 4 job failed in oversight control with an unexpected programming error. The recorded Boss rate limits and Investigator structured-output error recovered on bounded retries; no typed Investigator quota-exhaustion signal was observed. The resulting discovery case had no target entity or card.
- **Prior run 2:** Job `b939bfff-fbb2-4573-b1b6-bc3dd3923f41` made one Investigator-selected parallel search and returned 18 unverified leads. Recent-observation compaction then failed closed; the continuation ended as `model_action / no_usable_action`. The recorded state was zero fetched URLs, findings, source bindings, admissions, and cards. No Investigator quota-exhaustion event occurred.
- **Source-level recovery already present in history:** The prior audit raised bounded compaction output budgets and added task telemetry; the current cloned `main` is newer (`97915e7…`, commit subject `fix(apex): accept open provenance questions in compaction`). Verify the current code and focused existing checks before deciding whether another change is needed.
- **Decision:** Preserve Boss case direction/Investigator selection, independent bounded Right-hand oversight, model-owned research choices, provider failure typing, provenance, identity, persistence, cancellation, and terminal-state gates. Do not add a fixed search itinerary, synthetic target, forced card, or silent credential rotation. A key switch is only appropriate when the canonical runtime records the qualifying typed Investigator capacity failure and directs its existing bounded reassignment.
- **Important distinction:** Historical run IDs do not establish this new project's active-job state. Reconcile this project's own job pointers and locks before launch.

### 006 — Source inventory found existing audits and full application
- **Observed at:** 2026-11-08T17:55:47Z (UTC).
- **Stage:** Import planning.
- **Action:** Inspected the source root, run-audit filenames, and README.
- **Result:** The repository already contains Apex Atlas source, prior sequential audits, handoff documents, and a canonical Replit boot contract. The latest actual run audit found during this import is the Nov. 4 audit above; later-dated source notes are not themselves proof of a later live job.
- **Decision:** Retain the repo's existing audit history and add this run as a separate starred file. Do not overwrite historical audits or treat source documentation as live runtime evidence.

### 007 — Git safety gate blocked the first checkout update
- **Observed at:** 2026-11-08 (UTC; exact time not captured).
- **Stage:** Repository import.
- **Action:** Started a local Git fetch/reset procedure to import the already-verified source while preserving the starter commit.
- **Result:** Replit's Git safeguard stopped the operation while creating the proposed local backup branch. Read-only checks confirmed that no backup branch, remote, or source reset was created; `main` remains at starter commit `133c0f1e3c1581628263af291a8dfa48aab62eb2`, and the audit file remains present.
- **Recovery:** Repeat only this requested import operation with the platform's explicit Git-safeguard override. Keep the starter commit recoverable; verify the fetched SHA before resetting.

### 008 — Local import hit the shallow-source boundary
- **Observed at:** 2026-11-08 (UTC; exact time not captured).
- **Stage:** Repository import.
- **Action:** Repeated the import with the approved Git safeguard. The starter backup branch was created and the public source URL was configured as `origin`. A local fetch from the already-cloned source transferred the source objects.
- **Result:** Git rejected the shallow source ref update because the local fetch did not allow the shallow boundary to be updated; `FETCH_HEAD` was not written. Read-only verification confirmed the exact source commit object is present, while `main` and its working tree remain unchanged.
- **Recovery:** Use Git's explicit shallow-update fetch option against the already-fetched local source, verify `origin/main` equals `97915e7…`, then reset once. No additional network fetch is needed.

### 009 — Canonical source imported and setup preflight completed
- **Observed at:** 2026-11-08 (UTC; source and workflow observations below).
- **Stage:** Import and minimum setup.
- **Import result:** The shallow-aware local fetch set `origin/main` to `97915e7ddffd444ca05a347fd31773e88bc5f37f`; `main` now points to that exact source revision and tracks `origin/main`. The original starter commit `133c0f1e3c1581628263af291a8dfa48aab62eb2` is preserved on local backup branch `backup/replit-starter-2026-11-08`. The existing `.git` directory was retained; no push occurred.
- **Replit mapping:** Replit recognized the source as the **Apex Atlas** API artifact at preview path `/` and updated its API workflow to `cd ../.. && bash scripts/replit-boot.sh`. The separate starter Canvas artifact remains registered but is not part of Apex's canonical runtime.
- **Starter-only process:** The refreshed log for the old generated API workflow shows it briefly built the starter API, served `/` as 404, then stopped. It did not execute Apex, contact a provider, or launch an investigation. Both starter workflows are stopped.
- **Credential preflight:** `scripts/replit-preflight.mjs` reports all 11 active provider/integration secret names present. `HF_TOKEN` and `SERPAPI_KEY` are also present but are not active preflight capabilities in this source revision. The platform-managed `DATABASE_URL` is present. This checks presence only—not secret validity, quota, provider reachability, or research capability. No values were inspected or printed.
- **Dependency blocker:** The imported workspace has starter `node_modules`, but `artifacts/apex-finder/node_modules/.bin/vite` is absent. The API build tool link is present. The prior import audit records that an ordinary frozen install left stale generated links; the first install for this import will therefore use the repository-pinned pnpm with `CI=true` and the justified `--force` relink, once.
- **Audit visibility:** This starred file is present at a normal root-repository path and `git check-ignore` did not match it. It remains untracked (not ignored); no audit content has been committed or pushed.

### 010 — Pinned dependency install succeeded; database is empty
- **Observed at:** 2026-11-08 (UTC; exact completion time not captured).
- **Stage:** Minimum setup.
- **Action:** Because the imported Vite link was absent, ran one forced relink using the repository-pinned pnpm 9.15.9: `CI=true npm exec --yes --package=pnpm@9.15.9 -- pnpm install --frozen-lockfile --force`.
- **Install result:** Exit status 0; lockfile resolution was unchanged; pnpm installed/linked 782 packages across 10 workspace projects. No package or lockfile edits were requested.
- **Database baseline:** A read-only development query found 0 public base tables. No schema initialization or data write has happened yet.
- **Decision:** The repository's documented one-time schema initializer is required for this empty development database. Inspect its exact package-manager invocation, then run the canonical initializer once with the repository-pinned pnpm; ordinary boot must keep schema mutation disabled.

### 011 — Development schema initialized once
- **Observed at:** 2026-11-08 (UTC; exact completion time not captured).
- **Stage:** Database setup.
- **Action:** Ran `APEX_ALLOW_SCHEMA_PUSH=true npm exec --yes --package=pnpm@9.15.9 -- bash scripts/initialize-apex-schema.sh` after the read-only empty-database check.
- **Result:** The canonical Drizzle schema push and migrations 001–004 completed; required durable tables were verified. Migration 004 corrected 0 legacy rows. No existing application tables or data were present before setup.
- **Safety:** `APEX_ALLOW_SCHEMA_PUSH=true` was scoped to this one-shot command. Normal boot remains configured to skip schema mutation. No production database was accessed.

### 012 — Canonical API and dashboard became ready
- **Observed at:** 2026-11-08T18:03:43Z (UTC, API status response).
- **Stage:** Runtime startup and minimum service check.
- **Action:** Restarted the existing Apex Atlas API workflow once after the dependency install and one-time schema setup. It ran `scripts/replit-boot.sh`, skipped schema mutation, built the frontend and API, then started the canonical server.
- **Build evidence:** Frontend launch/source-boundary checks and the API's embedded canonical-route, provider-boundary, persistence, cancellation, and integrity checks shown in the boot log passed. This was the normal boot build, not a full test suite or a claim of research acceptance.
- **Service evidence:** `/api/healthz` returned HTTP 200 / `status=ok`; Postgres reported `ok`; local Redis and configured Upstash reported `ready`; `bureauIntegrity=ok`.
- **Configured provider lanes:** Groq Boss and Right-hand configured; Investigator credential capabilities 0 and 1 active; Serper, Tavily, Exa, and Companies House lanes configured. This is configuration status only. Actual provider reachability/quota will be evidenced by the run's calls.
- **Unavailable optional tools:** Holehe, Maigret, Sherlock, theHarvester, SpiderFoot, and OpenDeepResearch reported unavailable because this project has no fresh worker attestation. The UI correctly leaves them unavailable; no bypass was attempted.
- **Dashboard:** The root preview renders the Apex Atlas overview, reports an empty desk, and shows the normal **Launch Apex Atlas** control. Browser output contained only the React DevTools informational notice.
- **No investigation yet:** No Atlas job, model call, search, observation, target, finding, or card has been created in this project.

### 013 — Pre-launch state and exact UI request
- **Stage:** Immediately before the first investigation.
- **Read-only lock checks:** `GET /api/ingest/job/active/atlas-run` and `GET /api/ingest/job/active/case-bureau-discovery` both returned HTTP 200 with `active:false` and `jobId:null`.
- **UI objective:** Use the dashboard's unchanged default: “Discover lesser-known people with credible wealth potential and public/professional routes. ‘Lesser-known’ describes prominence, not a search term, name fragment, brand, or target type. A person is the ultimate investor-identification goal. Companies are leads and may be selected for target-scoped research to identify owners, operators, founders, shareholders, investors or assets. Focus on private/mid-market firms, controlling owners, investors and concession/license holders. Seek public ownership/equity/investment/control evidence, material assets or exits, plus practical public/professional routes. Never infer wealth from seniority, fame, prestige or brand leadership; avoid celebrity/richest lists and global household brands unless evidence identifies a realistic local operator/intermediary. Do not compare sectors/geographies; use only human-specified geography. Select one company, person or asset from a public source; one useful candidate starts target research. The Investigator chooses each action; no fixed sequence. Promote only exact named people whose role, wealth basis and approach route are source-supported. Never invent people, relationships, wealth, contacts or URLs.”
- **UI-equivalent payload:** The current frontend helper sends `targetCount: 1`, `researchDepth: "standard"`, `targetTimeoutMs: 420000`, this exact objective, and no `singleTargetId`. The same canonical `POST /api/ingest/atlas-run` boundary will be used; server-side lock validation remains authoritative.
- **Scope:** No target, query, sector, or geography was supplied or added. The model-led bureau chooses its research actions from evidence.

### 014 — First canonical UI-equivalent investigation accepted
- **Stage:** Canonical launch.
- **Action:** Sent one `POST /api/ingest/atlas-run` request with the exact dashboard-helper payload documented in event 013.
- **Result:** HTTP 202; Apex created job `cbab286d-3bb1-4995-bc5d-8b4ad4e873be` and returned poll URL `/api/ingest/job/cbab286d-3bb1-4995-bc5d-8b4ad4e873be`.
- **Integrity:** This is an accepted real job, not a successful investigation result. No second job has been launched. Follow this job through terminal state, evidence/card read-back, and lock release.

### 015 — Opening live poll entered Investigator discovery
- **Observed at:** 2026-11-08T18:05:38Z (UTC).
- **Stage:** Discovery, first post-launch poll.
- **Job:** `cbab286d-3bb1-4995-bc5d-8b4ad4e873be` is `running`, progress `1`, errors `0`; started at `2026-11-08T18:05:09.712Z`.
- **Active lock:** `GET /api/ingest/job/active/atlas-run` points to this same job and reports `active:true`. No duplicate run was launched.
- **Observable runtime message:** `GROQ-INVESTIGATOR-1 Investigator running free-ReAct discovery…`. This identifies the selected capability and phase, but does not yet prove a search, fetched page, finding, or card.
- **Model trace:** The repo-configured model audit writer has created this job's local trace file (70,409 bytes at this checkpoint). Raw prompt/contact capture remains in the app's configured non-public audit destination; this visible file will contain a sanitized chronology, not a copy of that raw trace.
- **Next check:** Inspect the job's public log/event shape and sanitized trace headings, then record actual model/tool outputs as they arrive. Exclude hidden reasoning fields and mask personal contact values.

### 016 — First run failed during oversight control; lock released
- **Observed at:** 2026-11-08T18:07:21Z (UTC).
- **Stage:** Terminal reconciliation.
- **Job result:** Job `cbab286d-3bb1-4995-bc5d-8b4ad4e873be` is `failed`, progress `1`, errors `1`, inserted `0`, skipped `0`. The API classifies it as `stage=oversight_control_decision`, `failureDomain=unexpected_programming_error`, `failureKind=unexpected_exception`, digest `8af5571b0c17fa19`.
- **Lifecycle:** Both the Atlas-run and case-bureau-discovery active endpoints now report `active:false`, `jobId:null`. The failed job is terminal and its active lock is released; no concurrent job exists.
- **Actual research actions:** One model-added geography/market search was blocked by `unapproved_geography_guard` before outbound execution. A separate Serper query, **“private technology companies with less than $500 million revenue,”** returned six search-result leads. A visit to `https://www.inc.com/inc5000` ended with `http_error`.
- **Evidence/cards:** No fetched claim-grade source, finding, source binding, admitted target, insertion, or card is evidenced in the job summary. Search leads remain unverified.
- **Provider classification:** The terminal error is not a typed Investigator quota-exhaustion signal. No Investigator credential reassignment is justified by this result.
- **Next action:** Correlate the error digest with the API logs and durable case events, and summarize the sanitized model call sequence. Do not rerun until the specific failure is understood and the canonical state remains idle.

---

Append every subsequent import, setup, launch, model handoff, action, observation, error, recovery, and final reconciliation below in chronological order. Distinguish observed facts from interpretation. A healthy boot or accepted launch is not a successful investigation: success requires terminal reconciliation, source-backed evidence, durable card read-back, truthful UI projection, and a released lock.

### 017 — Forensic replay isolated the Right-hand prompt-budget failure and company-realism gap
- **Observed at:** 2026-11-08 (follow-up engineering review; source revision at review start: `58bb75d747607aaa56f6078dcb2a145ace3a311d`).
- **Stage:** Post-run code diagnosis.
- **Run evidence:** The Investigator's scope-recovery path rejected one unapproved geography action before outbound execution. It then chose a Serper query for private technology companies and attempted the Inc. 5000 landing page; the page visit returned HTTP 403. Search-result URLs remained leads, not fetched evidence.
- **Failure boundary:** The exception occurred while assembling the next Right-hand oversight prompt, before a new Right-hand or Boss model request. The local replay reproduced the failure: the fixed policy prefix consumed too much of the bounded prompt, leaving insufficient room for mandatory lead counts and an exact unfetched URL. This was prompt assembly budget exhaustion, not provider quota exhaustion or a model refusal.
- **Repair:** The redundant fixed policy wording was shortened while retaining role ownership, human scope, lead/fetch distinctions, access-control rules, budget semantics, and the full authoritative pinned lead inventory. A regression test asserts the prompt remains within budget and preserves the counts plus an exact URL.
- **Additional mission correction:** The standing realism/targetability policy previously addressed famous people but did not define equivalent realism for companies. It now states that Inc. 5000/fast-growth or unicorn rankings, valuation headlines, brand prestige, and size alone do not qualify a company or establish investor capacity. Ranking-only company mentions remain leads, not qualified targets; model judgment should favor operating private/mid-market firms with source-backed objective fit, identifiable decision-makers, and practical professional routes. Ownership/capital proof remains objective-dependent. This is guidance for cognitive judgment, not a hard-coded name/domain blacklist.
- **Test hygiene:** The temporary live-server replay test was not suitable for the isolated unit suite because it depended on a running localhost API. Its deterministic regression coverage remains in the focused unit tests; the network-dependent temporary test is removed.
- **Architecture:** Boss retains control decisions, Right-hand remains advisory, and the Investigator retains free-ReAct authority over queries, sources, tools, pivots, and stopping. No forced provider, fixed query, synthetic target, or fabricated evidence was added.
