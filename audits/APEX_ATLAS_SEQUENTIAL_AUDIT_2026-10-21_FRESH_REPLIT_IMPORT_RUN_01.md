# ⭐ APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-21_FRESH_REPLIT_IMPORT_RUN_01.md

**Audit started:** 2026-10-21 (Europe/Kyiv)  
**Source:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Source branch / revision:** `main` / `5c05ef760f431b734035a2dc2348abc786b9a222`  
**Status:** Import fetch is ready; the source checkout and app run have not started.

This is the visible, append-only audit for this fresh Replit project. It records observed setup, source/runtime actions, model/tool activity summaries, failures, fixes, and verification. It does not contain API-key values, private chain-of-thought, or raw personal contact data. Model records are limited to messages and decisions actually exposed by the application/runtime; hidden reasoning is not an auditable output.

## Sequential events

### E001 — Fresh project baseline

- **When:** 2026-10-21 (Europe/Kyiv; exact minute not captured)
- **Action:** Inspected the newly opened project before import.
- **Observed:** The project started from the standard pnpm workspace template, on local `main` at `0c05d76` (`Initial commit`), with a clean tracked worktree. It contained starter API Server and Canvas artifacts; both starter workflows were running. No source remote was configured.
- **Assessment:** This is starter scaffolding, not the requested BigContacts application.

### E002 — Secure application secrets

- **When:** 2026-10-21 (Europe/Kyiv; exact minute not captured)
- **Action:** Requested the 13 application credential names through Replit's secure Secrets flow.
- **Observed:** The user confirmed all requested names were added. A presence-only check returned `true` for each requested name. Secret values were not read, printed, copied, or included in this report.

### E003 — Repository reachability

- **When:** 2026-10-21 (Europe/Kyiv; exact minute not captured)
- **Action:** Ran `git ls-remote` against the supplied public repository URL.
- **Observed:** `main` resolved to `5c05ef760f431b734035a2dc2348abc786b9a222`.

### E004 — GitHub connection attached

- **When:** 2026-10-21 (Europe/Kyiv; exact minute not captured)
- **Action:** Checked the current project's GitHub integration and attached the already-authorized connection.
- **Observed:** The connection was initially available as `not_added`; `addIntegration` succeeded and reported it was active/already attached. An earlier conversation-scoped connector attempt had returned a 401, but it was stale for this new project and was not used for repository contents.

### E005 — Source clone and recent history

- **When:** 2026-10-21 (Europe/Kyiv; exact minute not captured)
- **Action:** Shallow-cloned the source to a temporary inspection directory and reviewed the latest commit list and repository root.
- **Observed:** Clone completed successfully (6,256 enumerated objects; 45.84 MiB received). The inspected `main` HEAD matched E003. Recent commits included audit/source-card changes and prior agent progress.
- **Assessment:** The repository contains the existing application, substantial engineering documentation, previous sequential audits, and a root-level `APEX_ATLAS_AUDIT.md` with an unresolved prior run. No replacement application was generated.

### E006 — Prior-run constraints reviewed

- **When:** 2026-10-21 (Europe/Kyiv; exact minute not captured)
- **Action:** Read repository instructions, README, living context, repository-study protocol, run procedure, new-account setup, master handoff, recent root audit, and project memory on run reconciliation and visible audits.
- **Observed prior state:** Previous runs repeatedly ended incomplete or lacked verified admission/card counts. The latest root audit records job `fa964622-144a-465a-a657-bc0916b4615f` still running at its last observation, with an Investigator quota-exhaustion classification; its terminal state and durable outcome are unknown. Separate older reports also leave job `0bc6087d-4070-4420-a645-ca2606549052` unreconciled.
- **Architecture constraints:** Groq Boss selects direction and Investigator capability; Right-hand provides bounded oversight; the selected Investigator owns the research trajectory. Configured Investigator slots are capabilities, not a silent rotation ladder. No fixed search itinerary, weakened evidence/admission gate, fabricated activity, or card claim is acceptable.
- **Next gate:** After import and boot, read-only reconcile the current Atlas pointer/lock and known prior job records against this project's actual runtime before considering any new launch. An empty new database cannot establish the outcome of a prior project's run.
- **Audit constraint:** This report will record visible inputs/decisions/tool outcomes and concise rationale summaries, not hidden model reasoning, secrets, or raw personal contact values.

### E007 — Starter workflows stopped

- **When:** 2026-10-21 (Europe/Kyiv; exact minute not captured)
- **Action:** Stopped the starter API Server and Component Preview Server workflows before source import.
- **Observed:** Both stop operations succeeded.

### E008 — Source history fetched without replacing Replit Git metadata

- **When:** 2026-10-21 15:49 Europe/Kyiv
- **Action:** Preserved the starter commit on local branch `replit-starter-initial`, added source remote `apex-source`, and fetched `main`.
- **Observed:** Fetch succeeded; `apex-source/main` resolved to `5c05ef760f431b734035a2dc2348abc786b9a222`. The project's `.git` directory was preserved. Source checkout has not yet occurred.

### E009 — Audit visibility check

- **When:** 2026-10-21 15:49 Europe/Kyiv
- **Action:** Checked the chosen audit pathname against both the starter and source `.gitignore` rules.
- **Observed:** `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-21_FRESH_REPLIT_IMPORT_RUN_01.md` is not ignored by either ruleset.

### E010 — Source imported into the preserved project checkout

- **When:** 2026-10-21 (Europe/Kyiv; exact minute not captured)
- **Action:** Reset the existing local `main` checkout to the already-fetched `apex-source/main`. Kept the starter commit on `replit-starter-initial`; did not replace `.git`, push to GitHub, or remove workspace-local data.
- **Observed:** Local `main` now points at `5c05ef760f431b734035a2dc2348abc786b9a222` (“Add APEX ATLAS audit documentation”). The new sequential audit survived the import and remains the sole untracked project file. Replit automatically updated the existing Apex Atlas API artifact preview path to `/` and its workflow command to `cd ../.. && bash scripts/replit-boot.sh`.
- **Assessment:** The requested repository is now the project source; no replacement app was scaffolded. The upstream GitHub repository has not been modified.

### E011 — Frozen workspace dependency install

- **When:** 2026-10-21 15:50 Europe/Kyiv
- **Action:** Ran `pnpm install --frozen-lockfile`.
- **Observed:** Succeeded across all 10 workspace projects with pnpm 10.26.1. The lockfile was current; no lockfile update was requested. The install added 268 packages and removed 137 starter-version packages; native/runtime postinstall steps completed.
- **Assessment:** Dependency setup succeeded. No app workflow was running during installation.

### E012 — Secrets preflight, source gates, and development database baseline

- **When:** 2026-10-21 (Europe/Kyiv; exact minute not captured)
- **Actions:** Ran `node scripts/replit-preflight.mjs`; ran `pnpm run typecheck && pnpm run check:bureau`; queried public development-database table names read-only.
- **Observed:** Preflight succeeded: all 13 expected provider/service secret names were present, platform-managed `DATABASE_URL` was available at runtime, and no values were printed. Typecheck and the full `check:bureau` command returned exit code 0. Included focused results were 44 Vitest tests, 6 research-run validator tests, 5 campaign-score tests, and validation of 50 grounded-reviewed Gauntlet cases. The database query returned no public tables.
- **Assessment:** Imported source checks pass and the development database appears fresh. No schema or research data has been written yet. The repository's explicit one-time initializer remains the only approved schema setup path.

### E013 — Schema initializer reviewed before execution

- **When:** 2026-10-21 (Europe/Kyiv; exact minute not captured)
- **Action:** Reviewed the database package scripts, Drizzle config, the canonical initializer, and migrations `001`–`004`.
- **Observed:** The initializer runs the current Drizzle schema push, the durable-invariant migration, contact-outcome migration, and two narrowly scoped legacy-classification updates, then verifies required tables. The invariant migration replaces selected foreign-key constraints and adds append-only/cancellation/provenance guards; it does not drop tables. Migrations `003` and `004` can update qualifying existing rows, but the preceding read-only catalog query found no public tables in this new development database.
- **Decision:** Run the documented one-shot initializer once against this fresh development database. Do not keep schema-push permission enabled during normal boot.

### E014 — One-time development schema initialization

- **When:** 2026-10-21 (Europe/Kyiv; exact minute not captured)
- **Action:** Ran `APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh` once.
- **Observed:** Drizzle applied the schema; migrations `001`–`004` completed; the registry-classification migration reported `0` corrected legacy rows; required durable tables were verified. The one-shot environment override ended with the process and is not part of normal workflow configuration.
- **Assessment:** Development schema setup succeeded on the initially empty database. No prior application records were present to alter.

### E015 — Post-initialization baseline

- **When:** 2026-10-21 (Europe/Kyiv; exact minute not captured)
- **Action:** Queried critical development tables read-only and checked workflow state.
- **Observed:** `entities`, `research_cases`, `research_case_events`, `research_run_events`, `research_evidence`, `contact_evidence`, and `research_sessions` each contained 0 rows. The canonical API workflow and obsolete starter Canvas workflow were both stopped/finished.
- **Assessment:** The database remains empty and safe for a new project-scoped run. This does not reconcile any prior project's historical job records.

### E016 — Canonical boot, health, and desk preview

- **When:** 2026-10-21 15:55 Europe/Kyiv
- **Action:** Restarted the canonical `artifacts/api-server: API Server` workflow, then inspected fresh workflow output, health endpoints, source revision, and the root preview.
- **Observed boot:** The workflow logged revision `5c05ef760f431b734035a2dc2348abc786b9a222`, skipped schema mutation, built the frontend/API, passed the boot-time source/integrity checks, and started the API process.
- **Observed health:** `/api/healthz` and `/api/healthz/details` returned `status=ok`; Redis was `ok`; `bureauIntegrity=ok`; all expected active provider slots were reported configured; `autoPipeline=false`. No credential values were returned.
- **Observed UI:** The actual Apex Atlas Overview loaded at `/`; status showed READY and DB 1/1, with zero entities, priority profiles, assets, or links. The real “Launch Apex Atlas” control was visible. Browser output contained only the React DevTools informational notice.
- **Assessment:** App boot and preview are operational on the imported revision. This is not yet research-run acceptance.

### E017 — First read-only historical-job reconciliation attempt

- **When:** 2026-10-21 (Europe/Kyiv; exact minute not captured)
- **Action:** Queried the current Atlas active-job pointer and the three most recently cited prior-job status routes. No launch request was sent.
- **Observed:** The active pointer returned HTTP 200 with `active=false`. One historical job route returned HTTP 200, but the first local summary helper could not extract its allowlisted status fields. Two responses exceeded the operating system argument-size limit because the helper passed the full response body as a process argument; those raw bodies were not printed or saved.
- **Correction:** Retry the historical status reads with a streaming parser that never emits trace, prompt, finding, or contact payloads. The prior jobs remain unreconciled until their status fields are observed.

### E018 — Historical jobs reconciled through filtered status reads

- **When:** 2026-10-21 (Europe/Kyiv; exact minute not captured)
- **Action:** Retried read-only status calls using a streaming JSON filter that emitted only allowlisted job/lock fields.
- **Observed:** Current Atlas pointer returned HTTP 200, `active=false`. Jobs `fa964622-144a-465a-a657-bc0916b4615f`, `0bc6087d-4070-4420-a645-ca2606549052`, and `8237e1a8-192a-480e-b415-78f24eb94407` each returned HTTP 200 with terminal `status=failed`, `outcome=incomplete`, `progress=3`, `inserted=0`, `skipped=0`, `errors=0`, and `cancelRequested=false`.
- **Interpretation:** The previously observed Investigator quota error belongs to a terminal incomplete run; no key was manually rotated. The statuses and idle pointer clear the concurrency gate for a separate fresh run. The prior project's Postgres records are not attached to this new project, so its historical case/evidence/card totals remain unverified and are not inferred from this project's empty database.

### E019 — Canonical UI request and audit boundaries confirmed

- **When:** 2026-10-21 (Europe/Kyiv; exact minute not captured)
- **Action:** Read the live Launch button caller, API launch helper, canonical launch route, job-status route, and Investigator trace contract before invoking the UI-equivalent request.
- **Observed request contract:** The Overview button calls `launchAtlasPipeline`; without user options it posts `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}` to `POST /api/ingest/atlas-run`. The route validates schema readiness, checks the shared Redis lock, creates the canonical job, then starts the model-owned discovery pipeline. It is not a direct worker invocation.
- **Observed audit contract:** The source's bounded discovery trace stores model/action/tool outcomes and structured decisions, and explicitly excludes hidden chain-of-thought/free-form model reasoning. Visible prompt capture and contact-data capture remain disabled in workflow configuration. The audit will record observable actions, model/capability labels, tool counts, public-source domains, structured decisions, outcomes, errors, timings, and sanitized summaries; it will not copy secrets, hidden reasoning, or raw individual contact details.
- **Architecture constraint:** Boot-time checks confirm Groq Boss, independent Groq Right-hand oversight, and model-selected Groq Investigator execution. If an Investigator reports explicit hard quota exhaustion, only the built-in Boss-directed reassignment path may choose another configured Investigator capability; no manual key rotation or forced search sequence will be introduced.
- **Next gate:** Recheck the active pointer and health immediately before one canonical UI-equivalent launch with the default request above.

### E020 — Immediate pre-launch gate

- **When:** 2026-10-21 (Europe/Kyiv; approximately 15:57)
- **Action:** Rechecked API/Redis/bureau health, the Atlas active pointer, and new-project baseline counts immediately before launch.
- **Observed:** Health `status=ok`, Redis `ok`, `bureauIntegrity=ok`, and `autoPipeline=false`; Atlas pointer `active=false`, `jobId=null`; `entities`, `assets`, `relationships`, `contact_evidence`, `research_cases`, `research_case_events`, `research_evidence`, and `research_run_events` each remained at 0 rows.
- **Decision:** Send one UI-equivalent request with the exact default payload `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`. No single target or custom discovery context is supplied. The server-side canonical lock remains authoritative if another operator races this check.

### E021 — Canonical UI-equivalent launch accepted

- **When:** 2026-10-21 (Europe/Kyiv; exact minute not captured)
- **Action:** Sent one `POST /api/ingest/atlas-run` with the exact Overview-button default payload.
- **Observed:** HTTP 202; job `a72a121e-9ff8-4145-bc8d-39e74df9320a`; poll route `/api/ingest/job/a72a121e-9ff8-4145-bc8d-39e74df9320a`; accepted options were target count 3, standard depth, 420,000 ms timeout, no single target, and no discovery context.
- **Assessment:** The canonical model-owned discovery job was admitted. HTTP 202 is only launch acceptance; no research, admission, evidence, or card success is claimed yet.

### E022 — First live job and trace checkpoint

- **When:** 2026-10-21 15:59 Europe/Kyiv
- **Action:** Read the canonical job status, active pointer, and bounded Atlas trace through read-only GET routes. The local parser emitted only status fields, span types/statuses, model/agent identifiers, and trace counts.
- **Observed:** Job `a72a121e-9ff8-4145-bc8d-39e74df9320a` was `running`, phase 1/4, progress 1/4, with 0 inserted, 0 skipped, and 0 errors. Active pointer matched this job. Trace contained 2 successful tool spans and no discovery slot had been persisted yet; the observed role was Investigator.
- **Assessment:** The run has entered the discovery lane, but no candidate, evidence, or card result is present yet. Continue observing before judging model behavior.

### E023 — Discovery case and model-led tool activity

- **When:** 2026-10-21 (Europe/Kyiv; approximately 16:00)
- **Action:** Re-read job/active/trace projections and queried only aggregate durable case/event/evidence counts for this job.
- **Observed:** Job remained `running` in phase 1/4; active lock matched. The live trace now had 4 successful tool spans: `web_search`, `parallel_web_search`, and `visit` actions. The current durable discovery case was `active` with `current_action=investigator-completed`. The append-only case ledger showed one Boss `control_objective`, one Boss `assignment`, one Investigator `assignment`, one Right-hand `observation`, and four Investigator `tool_observation` events. Research evidence, contact evidence, and entity counts were still 0.
- **Assessment:** The Bureau has recorded the expected control/oversight/Investigator handoffs and successful public-web actions, but no admission or card has been materialized. No prompt text, hidden reasoning, raw query string, or individual contact value was copied into this audit.

### E024 — First discovery act assessed; Boss selected a pivot

- **When:** 2026-10-21 (Europe/Kyiv; approximately 16:01)
- **Action:** Summarized the completed Investigator discovery slot, live tool-span outcomes, and only allowlisted model/decision fields from durable case events. The `thought`, prompt, observation-body, result, and candidate-name fields were not queried for output.
- **Observed:** Slot 0 completed under capability `groq-investigator-1`; the observable trace model label was `openai/gpt-oss-120b`. The act recorded 6 searches, 3 visits, 12 structured trajectory entries, two public-source domains (`apps.ilsos.gov`, `www.ilsos.gov`), 0 model findings, 0 parsed candidates, and no admission. The Right-hand observation recorded approval at confidence 0.70. Groq Boss persisted `pivot_discovery` at control turn 1 with confidence 0.78 and opened a new discovery objective. A visit action returned an HTTP error; the trace also showed tool errors, but no Investigator quota-exhaustion signal was present.
- **Assessment:** The first research act did not meet the admission gate, so no card was created. The Bureau continued through the Boss-selected discovery pivot rather than forcing a target or changing Investigator keys. Further research remains active; no success is claimed.

### E025 — Boss continued discovery after the first pivot

- **When:** 2026-10-21 (Europe/Kyiv; exact minute not captured)
- **Action:** Rechecked the canonical job and lock, live span aggregates, discovery slots, and aggregate durable case/event/evidence counts.
- **Observed:** Job and active pointer remained `running`/owned by this job in phase 1/4. Slot 1 also completed under the same `groq-investigator-1` capability and `openai/gpt-oss-120b` trace label: 7 searches, 0 visits, 12 trajectory entries, 0 findings, 0 candidates, and no admission; its observed source domains were again the two Illinois SOS hosts. The trace had 12 tool spans total (9 successful, 3 error); the durable ledger showed two Boss control decisions, three control-objective events, two Investigator error observations, one HTTP-error observation, and nine success observations. The case remained active at `canonical-control-continue_discovery`, iteration 12. Evidence, contacts, and entities remained at 0.
- **Assessment:** Boss chose to continue model-led discovery after the pivot; the Investigator has not produced claim-grade findings. The errors remain tool-level observations, not a reported hard LLM quota exhaustion, so no Investigator reassignment is warranted yet. Continue observing for a meaningful objective change or admission.

### E026 — Second discovery act reached its action ceiling

- **When:** 2026-10-21 (Europe/Kyiv; exact minute not captured)
- **Action:** Rechecked job/lock/trace and aggregate case, tool-observation, evidence, and entity counts; classified failure fields without reading search arguments, observations, or `thought`.
- **Observed:** The job remained `running`, active pointer matched, and phase remained 1/4. The discovery case was active at `investigator-completed`, iteration 16. Slots 0 and 1 remained completed with 0 findings/candidates/admissions and no evidence or entities. The durable tool ledger now counted 9 successes, 4 request errors on the external-page-fetch boundary, 1 HTTP page-fetch error, and 2 subsequently blocked browser-fetch attempts. Error metadata classified these as external page fetch/request failures, not LLM quota exhaustion; the selected Investigator capability remained `groq-investigator-1`.
- **Assessment:** The Investigator encountered a repeatable public-page-fetch problem after successful search actions. The application has not yet recorded a third Boss decision or terminal run state. No provider key rotation or code change is justified from these observations alone; keep the lock untouched and wait for the model-owned control/terminal decision.

### E027 — First new-project run terminated incomplete

- **When:** 2026-10-21 16:05:54 Europe/Kyiv (terminal timestamp 2026-10-21T13:05:41.895Z)
- **Action:** Rechecked the job, active pointer, and sanitized trace immediately after the run stopped.
- **Observed:** Job `a72a121e-9ff8-4145-bc8d-39e74df9320a` ended `failed` / `incomplete`, phase 3/4, progress 3/4, with 0 inserted, 0 skipped, and 0 job errors. The shared active pointer is now idle (`active=false`, `jobId=null`). The trace held 18 spans (9 successful, 9 error) and three completed Investigator slots using the same model label. Slots 0 and 1 recorded searches but no findings/candidates/admission; slot 2 recorded 0 searches, 0 visits, 0 findings, 0 candidates, and no admission. No card success is present.
- **Assessment:** This is an incomplete run, not the requested successful end-to-end result. The terminal provider-error class and final durable row counts still need to be checked before deciding whether a targeted fix and a new run are appropriate.

### E028 — Terminal decision and provider/runtime diagnostics

- **When:** 2026-10-21 16:05–16:06 Europe/Kyiv
- **Action:** Read the job's terminal diagnostic through a category-only filter; grouped final durable rows; summarized only the allowed model telemetry fields from the fresh workflow log.
- **Observed terminal control:** Discovery case is `review`, `canonical-evidence-terminal-incomplete`, iteration 18. Groq Boss persisted its third control decision as `stop` at confidence 0.92. No evidence, contact evidence, or entities/cards were created; the append-only case ledger shows 9 successful tool observations, 4 external-page request failures, 1 external-page HTTP error, and 4 subsequent blocked browser-fetch attempts. The job message classified as an evidence/admission outcome, not an LLM quota failure.
- **Observed provider telemetry:** 20 Groq calls to model label `openai/gpt-oss-120b`: 18 HTTP 200 and 2 HTTP 400 `json_validate_failed` (`invalid_request_error`). Both 400s were followed by a retry that succeeded; 18 calls used retry index 1 and 2 used retry index 2. Recorded prompt *lengths* ranged 4,666–5,560 characters (system prompt 1,542); no prompt body or private reasoning was present in the audit output. No 429/quota-exhaustion event was observed.
- **Setup/runtime warnings:** The workflow logged missing optional `@napi-rs/canvas` and PDF.js font/rendering warnings (`ImageData`, `Path2D`, and `standardFontDataUrl`). They were non-fatal; their relevance to the failed evidence admission has not been established.
- **Assessment:** The first run stopped honestly after Boss judged the evidence insufficient. The recurring issue is external-page fetch reliability and zero qualifying findings, not exhausted Groq credentials. The exact browser-fetch provider/fallback behavior and whether PDF handling contributed remain to be checked before another launch.

### E029 — Failure boundary isolated; informed model-led retry prepared

- **When:** 2026-10-21 (Europe/Kyiv; approximately 16:07)
- **Action:** Inspected only the safe provider/action fields for failed observations, the browser-fetch implementation, the PDF text-only extractor, and current health/lock state.
- **Observed fetch failures:** One `visit` was denied with HTTP 403. Four model-selected `browser_fetch` calls selected `scrapfly` and failed as network/request failures; four later calls were blocked by the repeat-failure guard. Their `providerFallback` arrays were empty. Source code intentionally runs only the provider chosen by the Investigator—there is no silent cross-provider fallback—so this is not a missing automatic key rotation. The model made the final `stop` decision at turn 3 after no evidence was admitted.
- **Observed setup issue:** PDF.js warnings are not evidence that a required package is missing: the repository explicitly uses a text-only PDF path and excludes native canvas because it never renders pages. No dependency was installed on the basis of these non-fatal warnings.
- **Decision:** Use the canonical `discoveryContext` capability for one fresh model-led retry. Keep target count 3, standard depth, and the 420,000 ms target timeout; do not pass a target, choose a provider, add a search itinerary, alter evidence gates, or rotate keys manually. The exact operational context to be sent is:

  > Prior-run operations only, not evidence: an older pre-migration attempt reported an Investigator quota error, but the current run used `groq-investigator-1` successfully and had no current quota response. The current run found no admissible evidence; an Illinois SOS page returned HTTP 403 and four Investigator-selected Scrapfly browser fetches failed at network/request level, followed by repeat-failure blocks. Use your own judgment to choose any new discovery objective, source, query, action, and configured provider. Do not repeat a failed action/provider without new evidence. No target or candidate is supplied.

- **Pre-retry gate:** Fresh health remains `ok`, Redis `ok`, `bureauIntegrity=ok`, `autoPipeline=false`; active Atlas pointer is `false` with `jobId=null`. Prior case remains terminal in review, not active.

### E030 — Canonical retry accepted

- **When:** 2026-10-21 (Europe/Kyiv; approximately 16:11)
- **Action:** Rechecked health and active-job pointer immediately before using the canonical `POST /api/ingest/atlas-run` route.
- **Request:** Same UI defaults as the first run (`targetCount=3`, `researchDepth=standard`, `targetTimeoutMs=420000`), plus the 617-character prior-run context recorded in E029. No entity/contact target or chosen source/provider was supplied.
- **Preflight:** HTTP 200; app `ok`, Redis `ok`, bureau integrity `ok`, auto-pipeline disabled, no active job.
- **Result:** HTTP 202 accepted job `e2942191-4263-4626-b6d8-88d44246d213`; the response confirmed all three defaults and `discoveryContextIncluded=true`. This is a fresh model-led run, not a direct worker invocation or replay of the prior case.

## Run acceptance boundary

Do not mark a run successful based on HTTP 202, healthy boot, model traffic, search activity, a lead, or a UI animation. Record the terminal job result, persisted evidence/admission/card deltas, UI projection, and released active-job lock separately. Do not start a new run while a prior job/lock is active or ambiguous.
