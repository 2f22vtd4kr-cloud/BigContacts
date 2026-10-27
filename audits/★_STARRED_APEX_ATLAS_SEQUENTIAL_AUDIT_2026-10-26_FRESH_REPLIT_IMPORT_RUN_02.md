# ★ STARRED — Apex Atlas Sequential Audit — Fresh Replit Import Run 02 — 2026-10-26

**Status at opening:** public source staged for inspection in `/tmp`; not yet imported into the project; Apex has not been started or launched.
**Opened:** 2026-10-26 (Europe/Kyiv).
**Repository:** https://github.com/2f22vtd4kr-cloud/BigContacts
**Branch:** `main`
**Current source commit:** `d972d2d7b43cdda03747f57399c7548a6a761d99` — “Add sequential audit report and update project configuration”.
**Audit location:** `audits/`; this visible file is intentionally starred in its filename and is not intended to be ignored.
**No push or publication has been attempted.**

## Acceptance contract

One successful run requires a single canonical UI-equivalent launch, model-directed discovery and research, source-backed evidence that passes the repository's admission gates, at least one durable card/entity retrievable through the ordinary UI/API path, a terminal job status, and release of the active-job lock. A successful import, build, health check, accepted launch, model call, or pre-existing card alone is not success.

## Audit boundaries

- Record actions in sequence: timestamps, non-secret commands/requests, observable prompts and outputs where safely available, provider/model/role, searches/tools/sources, structured decisions, evidence/admission/card deltas, errors, recovery, and concise operator analysis.
- Never record API keys, bearer values, passwords, cookies, database URLs, or other credentials.
- Do not claim or reproduce private hidden chain-of-thought. Record model-visible prompts, observable completions, structured decisions/rationales, and tool-call payloads where available.
- This audit is visible in the project. Contact values and raw source details will be recorded only when they are public, relevant to the product run, and source-attributed; sensitive or unrelated personal data will not be copied. No data will be pushed or published externally by this run.
- Do not fabricate targets/cards, force a search itinerary, weaken evidence/admission rules, manually switch models, or start another job while an accepted job or active lock is unresolved.
- A provider quota error is distinct from context-size, iteration-budget, validation, network, or evidence failures. Only follow the app's existing same-role, model-owned recovery path.

## Sequential event log

### E000 — New project and secure credential setup

- The conversation was moved into a new project as requested. The initial project was the generated pnpm starter, with API Server and Canvas artifacts/workflows.
- The user requested 13 provider/service secrets. Replit's secure Secrets flow confirmed all requested names were added. A presence-only check confirmed the names; secret values were not read, displayed, copied into commands, or recorded.
- No Apex process, provider request, database mutation, launch, search, evidence, admission, or card creation occurred.

### E001 — GitHub integration unavailable; public Git transport confirmed

- The ready GitHub connector returned a disconnected-connection error when queried for repository metadata, latest commit, and root contents. No reconnect was attempted.
- An initial `git ls-remote` using the default Replit Git rewrite also failed because it routed to the disconnected internal proxy.
- Public `webFetch` of the repository confirmed that `main` is the default branch and showed latest commit `d972d2d7b43cdda03747f57399c7548a6a761d99`.
- Retrying Git with system/global Git configuration disabled succeeded: `GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null git ls-remote --heads https://github.com/2f22vtd4kr-cloud/BigContacts.git main` returned that same SHA.
- A shallow clone of public `main` completed in `/tmp/BigContacts-main` (3,414 objects, 45.63 MiB received). This staged copy is for review; no project source files have been replaced yet.

### E002 — Existing audit history reviewed; lessons carried forward

- Reviewed the latest starred upstream audit, the root run audit, the import audit, repository instructions, workspace manifests, and source layout.
- The latest upstream audit recorded a prior run accepted on 2026-10-26, but its last recorded point was an active first discovery checkpoint with no evidence, admissions, inserts, or cards. Its current outcome in this project must not be presumed; after boot, read-only reconciliation of the actual shared active-job pointer is required before any new launch.
- Earlier audit records show a canonical run ending incomplete with zero admitted people/cards after exhausting two discovery acts and the configured discovery budget. The model's next proposed pivot was not executed; the captured provider metrics did not show quota exhaustion. Therefore do not rotate Investigator keys for iteration-budget, prompt, validation, or handoff issues.
- Prior evidence included a sign-in page's `example@domain.com` placeholder and generic franchisor contact snippets. Neither is a verified target-owned contact and neither may be admitted as such.
- Preserve the repository's Boss-selected Investigator architecture, bounded Right-hand oversight, free-ReAct behavior, source attribution, fail-closed evidence/admission rules, truthful terminal status, and ordinary card projection. Do not invent a scripted itinerary or switch providers outside the existing explicit same-role quota-recovery mechanism.
- The source describes Apex as public-source OSINT for owners, founders, operators, and private-capital principals with credible wealth potential and attributable professional contact routes. This is narrower than generic Apollo-style company/contact prospecting. Exercise the actual imported product; do not alter its objective or manufacture a target to force a card.
- The upstream repository contains many historical audits, but they are not evidence of success in this new project's database or shared runtime.

### E003 — Audit started before source import

- Created this visible, starred audit before changing the starter checkout.
- At this event, source files, Git metadata, database schema, and runtime remain unchanged. No dependency install, provider call, search, launch, evidence, admission, or card exists in this project.

### E004 — Starter workflows stopped; latest source delta checked

- Stopped `artifacts/api-server: API Server` and `artifacts/mockup-sandbox: Component Preview Server`; both stop operations succeeded. This prevents starter services from being mistaken for Apex.
- Fetched the source's immediate parent for comparison. `d972d2d` changes only the root `.replit` audit destination, the API artifact's corresponding audit destination, and adds the prior starred run report. It contains no application-code fix for the earlier discovery-budget / handoff failure.
- The repository logger supports an explicitly enabled development-only visible trace path. Its implementation must be verified after import before enabling it; visible capture must keep credential redaction and private-reasoning field removal active. The user's request authorizes public-source search text and contact details in the visible audit, but not secrets or hidden chain-of-thought.
- `git check-ignore` returned no ignore rule for this audit. The file remains visible and unignored.
- No source workspace import, dependency install, database mutation, Apex startup, provider call, search, launch, evidence, admission, or card creation occurred.

### E005 — Import safety check stopped on Git's Unicode path quoting

- A pre-reset guard compared the starred audit path against `git status --short` output. Git escaped the Unicode star as octal bytes, so the exact-path assertion failed and the shell stopped before `git reset`.
- Follow-up inspection confirmed `main` remained at the starter commit and the audit was the only untracked worktree path. No source files or audit content were changed by the rejected reset attempt.
- Recovery: use `git -c core.quotepath=false ls-files --others --exclude-standard` for the exact path comparison, then perform the already reviewed reset to the fetched `origin/main`. Do not run `git clean`.

### E006 — Exact public `main` imported into the existing checkout

- After confirming the audit was the sole untracked path and did not collide with an upstream file, reset the existing local `main` worktree to `origin/main`. No `git clean` was run.
- Verified `HEAD= d972d2d7b43cdda03747f57399c7548a6a761d99`, matching the independently verified public branch SHA. The existing `.git` directory and starter commit remain; the latter is preserved on `replit-starter-initial`.
- The starred audit survived under `audits/`; `git check-ignore` returned no matching ignore rule.
- Replit recognized the imported API artifact in place as **Apex Atlas**, kind `api`, preview path `/`, and updated its managed workflow to `cd ../.. && bash scripts/replit-boot.sh`.
- This is a shallow import of current `main`; no push occurred. Dependencies are not installed yet. No database operation, model/provider call, search, launch, evidence, admission, or card creation occurred.

### E007 — Visible model trace opt-in prepared

- Source review confirmed the prompt-audit writer removes separate private-reasoning fields and credential-shaped values, but the upstream implementation redacted contacts from all visible `audits/` files.
- To meet the user's explicit request for public-source contact values in the visible audit, changed the contact-retention gate narrowly: a visible `audits/` path retains contact fields only when both `NODE_ENV=development`, `APEX_MODEL_AUDIT_ALLOW_VISIBLE_FILE=true`, and `APEX_MODEL_AUDIT_INCLUDE_CONTACT_DATA=true`. Secret redaction remains unconditional; hidden reasoning fields remain excluded; test capture remains off.
- Updated the focused tests for this explicit development opt-in. No change was made to research strategy, model/provider selection, evidence/admission, or card behavior.
- Updated both root `.replit` and the API artifact's development environment using their Replit validators. The per-run prompt trace is temporarily directed to `audits/★_STARRED_APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-26_FRESH_REPLIT_IMPORT_RUN_02_MODEL_TRACE.md`; it will be incorporated into this primary sequential audit after the run is terminal, then only the combined audit will remain.
- **Not yet verified:** focused logger tests, typecheck, Bureau checks, trace output, or actual prompt capture. No workflow is running and no provider/search request has occurred.

### E008 — Frozen dependency install completed

- Ran `pnpm install --frozen-lockfile` against the imported workspace. pnpm completed successfully for all 10 workspace projects in about 25 seconds; optional/native postinstall tasks completed.
- Compared `sha256sum` for the installed and staged upstream lockfiles: both are `9f68564b9a8e909b8e10cf3444beaa756d1bbb42b74c65b438b11fb943785ee5`; the lockfile is unchanged. pnpm displayed only its standard notice that a newer pnpm release exists; no upgrade was requested.
- No source schema, database, provider, search, launch, evidence, admission, or card operation occurred.

### E009 — Secret preflight and source checks passed

- `node scripts/replit-preflight.mjs` reported all 13 requested provider/service secret names and platform-managed `DATABASE_URL` present. This check was presence-only; no values were read or changed.
- Focused logger tests: 1 file / 18 tests passed. Two expected refusal messages came from negative tests that intentionally omitted the visible-path opt-in; they did not indicate a failed test.
- `pnpm run typecheck` passed for workspace libraries, API server, mockup sandbox, and scripts.
- `pnpm run check:bureau` passed. The suite confirmed canonical routing/locks/leases, free-ReAct autonomy, provider-role boundaries, provenance/admission, fail-closed paths, and other architecture checks. The research Gauntlet validated 50 grounded-reviewed cases; the bundled focused tests passed (44 phone/source tests, 6 research-run validator tests, 6 campaign-score tests, plus the included control tests).
- The prompt-trace path under `audits/` is not ignored. No model/provider request, search, database write, launch, evidence, admission, or card creation was produced by these checks.
- Next: read the development database schema/table baseline. Initialize only if confirmed empty, then boot normally with schema mutation disabled.

### E010 — Fresh development database confirmed empty

- Read-only `executeSql` queries listed public tables and counted public base tables in this project's development database. The table listing was empty and `public_base_table_count=0`.
- Reviewed `scripts/initialize-apex-schema.sh`: it requires an explicit one-command `APEX_ALLOW_SCHEMA_PUSH=true`, acquires a single-writer lock, applies the current Drizzle schema plus repository hardening and migrations 002–004, then verifies required durable tables. The ordinary API boot script skips schema mutation unless separately opted in.
- With no existing public tables or application data to overwrite, the documented initializer is appropriate. No user records or sample rows exist to delete or alter.
- No model/provider request, search, launch, evidence, admission, or card creation occurred before schema setup.

### E011 — Documented one-time schema initialization completed

- Ran `APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh` once against the confirmed-empty development database.
- Drizzle reported schema changes applied. The durable hardening migration and compatibility migrations 002–004 completed; migration 004 corrected `0` pending legacy rows.
- The initializer verified the required Apex durable tables and integrity setup. No seed/sample rows were added.
- `APEX_ALLOW_SCHEMA_PUSH=true` was scoped to this single shell invocation. The managed workflow's ordinary boot remains configured to skip schema mutation.
- No provider call, search, launch, evidence, admission, or card creation occurred.

### E012 — API boot, UI, Redis, and prior-job reconciliation

- Restarted only `artifacts/api-server: API Server`. Fresh boot logged the verified `d972d2d` source revision and explicitly skipped schema push. Frontend and API builds completed; the API bundle emitted a nonfatal size warning. Startup architecture checks passed; the mockup preview workflow's SIGTERM reflects the earlier intentional stop, not an Apex failure.
- Read-only `/api/healthz` and `/api/healthz/details` returned HTTP 200: API `ok`, Redis `ok` (154 ms on the fresh check), Bureau integrity `ok`, no integrity reasons, `autoPipeline=false`, and research keys configured. Safe provider status showed two Groq capabilities and configured service counts without exposing any credential values.
- Read-only `/api/ingest/job/active/atlas-run` returned `active=false`, `jobId=null`.
- Reconciled upstream run `6e183bb4-0811-4735-84dd-c439698d44fa`: shared Redis reports terminal `failed` / `incomplete`, progress `3`, `inserted=0`, `skipped=0`, `errors=0`, with message `Canonical Investigator iteration ceiling reached after 20 Investigator iteration(s); case preserved for review.` It is no longer active. Its prior-project durable case is not evidence in this new project's database.
- New development DB read-only counts remain zero for `entities`, `research_cases`, `research_case_events`, `research_sessions`, `research_run_events`, `research_evidence`, and `contact_evidence`.
- Captured the running UI at `/`: visible **Launch Apex Atlas** CTA, **Depth · standard** selected, empty entity/priority/evidence/relationship counts, ready database indicator, and no demo data. Browser output contained only the normal React DevTools informational notice.
- The imported launch helper confirms the UI-default request is `POST /api/ingest/atlas-run` with `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}` and no target override. This preserves model-owned discovery and lets the UI-default standard budget operate; no custom search route or target is injected.
- **No new launch has been sent yet.** The prior 20-iteration incomplete result is being considered before the single authorized fresh launch; no retry of that old job is possible or intended.

### E013 — A different live job appeared on shared Redis; launch withheld

- A later read-only check of `/api/ingest/job/active/atlas-run` no longer returned idle. It reported job `2acb2f47-450e-489f-a49c-f134c73e681a`, outer type `atlas-run` / nested type `case-bureau-discovery`, status `running`, progress `1`, `inserted=0`, `errors=0`, started `2026-10-27T06:46:43.006Z`.
- Runtime metadata reports build revision `76bbac5046a18ac6158791a75971e3ca8a7751aa`, `buildDirty=dirty`, build timestamp `2026-10-27T06:25:59.322Z`, unlike this imported checkout. This is not the UI-equivalent Atlas run started by this session.
- Observable structured control state says Right-hand approved a Companies House/PSC investigation focused on West Midlands manufacturers and mid-market owners; Boss selected `groq-investigator-1`. This is logged as visible decision metadata, not private model reasoning. No contacts, findings, or card writes were reported.
- The job occupies the shared Atlas active-job lane. The active pointer changed after the earlier idle read, so one prelaunch check is insufficient.
- **Safety action:** did not send a launch, cancel, or mutate this other-build job. Do not launch this project until a fresh authoritative read confirms the shared pointer is idle; recheck immediately before the intended canonical launch.

### E014 — Foreign shared job terminated without admission; depth choice recorded

- Read-only `GET /api/ingest/job/2acb2f47-450e-489f-a49c-f134c73e681a` returned HTTP 200 with terminal `failed` / `incomplete`, progress `1`, `inserted=0`, `skipped=0`, `errors=0`, and message `Investigator stopped without a durably evidenced candidate admission; case preserved for review.` This remains an other-build job, not this project's run.
- The active pointer subsequently returned idle. No cancellation, retry, or mutation was sent to the foreign job.
- The imported `research-depth.ts` documents depth as a coordination/budget hint: Investigator chooses trajectory and stopping; hard timeout is the operational boundary. Standard allows 20 iterations / 6 iterations per act / 210 seconds; Deep allows 32 / 8 / 360 seconds. Neither mode specifies a search route.
- Because the prior standard run hit its 20-iteration ceiling and another project's shared job stopped without admission, the planned fresh run will use the UI's existing **Deep** option with the same default `targetCount=3` and `targetTimeoutMs=420000`. This raises only the model-owned bounded budget; no target, query, or tool sequence is injected, and the run-wide timeout remains in force.
- **Prelaunch gate still required:** check health and the shared active pointer again immediately before sending exactly one canonical launch request.

### E015 — One canonical Deep-budget UI-equivalent launch accepted

- Immediately before launch, read-only `GET /api/healthz` returned HTTP 200 with API `ok`, Redis `ok`, and research keys configured. A fresh `GET /api/ingest/job/active/atlas-run` returned HTTP 200 with `active=false`, `jobId=null`.
- Sent exactly one `POST /api/ingest/atlas-run` with `{"targetCount":3,"researchDepth":"deep","targetTimeoutMs":420000}`. This matches the imported UI helper with its existing Deep selector; no single-target override or prior discovery context was supplied.
- The API returned HTTP `202`, job ID `0ac23b27-a5ca-4a41-8756-763de55fc2d2`, and message `Canonical model-owned discovery started`. Options echoed targetCount `3`, singleTargetId `null`, depth `deep`, timeout `420000`, and `discoveryContextIncluded=false`.
- No retry or second launch was sent. This is the only run started by this project. Next observations must correlate to this job ID and verify the prompt trace is actually being appended to the visible companion file.
- The request preserves model-directed search/tool choices and deterministic evidence/admission gates. No model/provider prompt or search result has yet been audited in this event.

### E016 — First local Deep run stopped at invalid/no-usable Investigator action

- Read-only polling job `0ac23b27-a5ca-4a41-8756-763de55fc2d2` returned HTTP 200 and terminal `failed` / `incomplete`: start `2026-10-27T06:48:49.226Z`, finish `2026-10-27T06:49:16.001Z`, progress `3`, `inserted=0`, `skipped=0`, `errors=0`.
- The durable status message is `Canonical Investigator continuation stopped before a usable new research pass; case preserved for review.` Structured failure metadata: `failureDomain=model_action`, `failureKind=no_usable_action`, digest `19447e39d46c8ec4`; no raw error/stack was exposed in the status endpoint.
- Visible Right-hand decision approved an initial scope to search UK renewable-energy private limited companies through Companies House. Its structured rationale said this is a public registry path to members/directors/shareholders and a concrete sector/geography, without assuming unavailable filing fields. Right-hand model: `openai/gpt-oss-120b`; Boss model: `openai/gpt-oss-20b`; Boss selected `groq-investigator-1`.
- The visible model trace exists at the configured companion path: 207,963 bytes, 12 request sections and 12 response sections. The source logger's private-reasoning and credential filters remain in force. The trace is being inspected to classify the no-usable-action boundary before any retry.
- Fresh workflow logs show Groq GPT-OSS 120B requests returning HTTP 200 as well as one HTTP 429 `rate_limit_exceeded` classified as `tokens`; subsequent call(s) succeeded. This is token-window pressure, not hard request-quota exhaustion, so no alternate Investigator key/provider was selected or forced.
- No admission, evidence-backed contact, entity/card insert, or successful research pass is reported. Do not retry until the raw visible trace identifies a repairable issue and the shared active pointer is rechecked.

### E017 — Trace isolates the first blocked action and scope-control mismatch

- Parsed all 12 visible request/response sections from the prompt trace. The Boss's first accepted hypothesis was UK renewable-energy private limited companies; it selected `groq-investigator-1`. Right-hand approved the public-source hypothesis.
- Investigator turn 1 emitted `registry_search` with query `renewable energy private limited company site:companieshouse.gov.uk`; the deterministic scope guard blocked it before any external request because the query text omitted the required geography.
- Investigator turn 2 repeated the same query after its prompt explicitly reported `SCOPE GUARD BLOCKED ACTION` and `failed scope dimension(s): query geography`. It added `locale=en-GB` and `market=UK`, but still omitted geography from the actual query string, so the guard blocked it again. Both turns had zero observed/lead URLs; no Companies House request or web fetch occurred.
- Right-hand then advised `stop` because lead counts and unfetched URLs were zero. Boss's later visible control response chose `continue_discovery` and proposed a different German/Bavarian manufacturing direction, selecting `groq-investigator-2`; the following Investigator response nevertheless repeated the prior UK renewable-energy direction. The controller's new scope was not consistently reflected in the next action.
- A subsequent Investigator provider response was classified `upstream_tok` after token-window 429s; this is not hard request-quota exhaustion. The run ended with `no_usable_action` and no admissions.
- Root cause to address: the prompt feedback does not sufficiently translate the scope-guard's geography failure into a concrete validation requirement for the `query` field, and the control-to-Investigator direction appears stale across continuation. No external source data or contact details were produced.
- Next: inspect the scope-guard and continuation handoff implementation/tests. Any repair must keep query, geography, provider, tool, and pivot decisions model-owned; deterministic code may only reject mis-scoped actions and provide actionable diagnostics.

### E018 — Durable case events confirm automatic Investigator rotation and stale scope

- Read-only SQL of `research_case_events` for case `1` returned 12 ordered events. It confirms two model-selected `registry_search` attempts were blocked before outbound execution: first for missing query geography, then for repeating the same rejected query. Both had zero observed/lead URLs.
- After Right-hand advised stop, Boss returned `continue_discovery` without a new structured direction. The durable objective stayed on the original UK renewable-energy scope.
- Investigator 1 then emitted `upstream_token_quota_exhausted`. The durable classifier records `tokenDailyQuotaExhausted=true` and `hardRequestQuotaExhausted=false`. Boss automatically reassigned `groq-investigator-1` → `groq-investigator-2`; this is the requested same-role fallback and happened without agent intervention.
- Investigator 2's next action repeated the earlier UK renewable-energy / Companies House query and was blocked by the repeat-pivot guard, despite Boss's visible report proposing Bavaria/Germany manufacturing. The durable control objective still reflected the original UK objective; this is evidence of stale/misaligned direction handoff after a provider-capacity rotation.
- The later daily token-quota classification is distinct from the earlier short-window `rate_limit_exceeded` events. Correcting E016: an Investigator capacity exhaustion did occur, and Apex did switch to another Investigator capability naturally. No hard request-quota exhaustion was recorded.
- Case events report `cumulativeSearches=0`, `cumulativeVisits=0`, `investigatorActionExecuted=false`, two blocked Investigator turns before the provider error, and no durable admission. No external registry/search request ran; no person/contact evidence or cards were produced.
- Likely repair area is the structured Boss-to-Investigator scope handoff when `continue_discovery` or provider rotation occurs. Inspect its contract and tests before changing anything; preserve model authority over the chosen direction.

### E019 — Repair scope narrowed to actionable feedback and explicit control recovery

- The persisted trace shows the full first scope-guard observation named the active UK pivot, but `compactEmergencyTrajectoryObservation()` reduced it to only `failed scope dimension(s): query geography`. The Investigator received a generic “revise those dimensions” message and repeated the same query.
- The model's second action included `locale=en-GB` and `market=UK`, but the deterministic guard correctly requires geography in the query itself. The recovery prompt did not say that those separate fields do not satisfy the query-text gate.
- `resolveBossDirectedDiscoveryObjective()` intentionally reuses the active objective for a directionless `continue_discovery`. That is useful after productive work, but after an episode with no external Investigator action it allowed a null direction to reuse the same blocked scope.
- Planned narrow changes: preserve active-scope context in the compact block message; explicitly name that a geography failure must be repaired in the query field itself, not just locale/market; and reject only directionless `continue_discovery` when the preceding episode executed no external research action. The Boss can still stop or provide a model-chosen scope refinement; no target, query, provider, or tool sequence will be scripted.
- No change to Investigator selection or quota recovery is planned. The daily token quota case already triggered the intended Boss-owned `groq-investigator-1` → `groq-investigator-2` switch.
- No second local launch has been sent; the first job is terminal and all external actions were blocked before egress.

### E020 — Recovery repair implemented; focused verification passes

- Updated blocked-scope prompt compaction to preserve the active Boss-approved scope. For a `query geography` failure it now says the query field itself must contain geography from that scope; locale/market metadata or a registry domain alone do not satisfy the gate.
- Added a targeted control invariant: after the latest Investigator episode executed no external research action, Boss cannot use directionless `continue_discovery` to replay the same accepted objective. The response is rejected before another Investigator action; Boss may provide a structured research direction or stop. Productive episodes still retain directionless same-scope continuation.
- Added a matching Boss prompt rule: narrative reports and `nextDirections` do not alter the accepted objective; only the structured direction field does. This preserves role separation and avoids inferring scope from prose.
- No provider, target, query, source route, or tool sequence was added. The existing automatic same-role quota recovery remains unchanged.
- Correction to E017/E018 wording: Boss's report mentioned Bavaria/Germany, but its structured direction was null. The controller correctly preserved the UK scope rather than inferring a pivot from narrative text. The actionable defect was allowing a directionless continuation after a no-action episode, not a stale structured handoff.
- Verification: `pnpm run typecheck` passed. The first focused test run reported 202/203 passing because one assertion expected lowercase capitalization; only the assertion was corrected. The rerun passed all 203 tests across the four focused suites. `git diff --check` passed before that test-only wording correction.
- No second run has been launched yet; the full bureau check and runtime restart are next.

## Current checkpoint

- **Source snapshot:** public `main` imported at `d972d2d7b43cdda03747f57399c7548a6a761d99`; local commit `51194099d74a1dbfdb768614e91db93a814d453b` adds the development-only visible audit capture opt-in and tests. Nothing was pushed.
- **Project import:** completed in the existing checkout; `.git` and the starter backup branch are preserved.
- **Secret presence:** all 13 requested names confirmed; values not inspected.
- **Workflows/runtime:** canonical API is running; first local Deep run is terminal incomplete; recovery repair is implemented and focused tests/typecheck pass; full bureau verification is next.
- **Database/Redis/job lane:** development schema is initialized; case `1` has 12 control/trajectory events, no durable admission or card.
- **Provider calls, search, evidence, admission, card creation:** no outbound search/registry calls; two scope-blocked actions; automatic Investigator 1→2 rotation occurred after classified daily token quota exhaustion.
- **Current acceptance:** NOT MET; complete full verification, restart, then continue to one full run.

Append each subsequent action and result below in chronological order, including setup issues and their exact recovery. Do not delete or rewrite earlier events; correct mistakes in a new event.
