# ⭐ Apex Atlas Sequential Audit — LIVE RUN 07

- **Status:** Audit opened; no live research request has been submitted yet.
- **Audit file:** `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-14_LIVE_RUN_07.md`
- **Repository:** `2f22vtd4kr-cloud/BigContacts`, branch `main`.
- **Source revision:** `34276cb3a92f0e52d39b84b5da80cc95fc819272` (`Align Atlas budget and history contract tests with durable behavior`).
- **Scope:** UI-equivalent discovery-first launch, model-led discovery and target research, validated tool activity, durable evidence/provenance, admission/card outcome, and terminal reconciliation.
- **Planned run bounds:** discovery-first, no `singleTargetId`, `targetCount=1`, `researchDepth=deep`, `targetTimeoutMs=420000`. This follows the previous audit's recommendation for a deeper, bounded retry; it does not choose a person, search, tool sequence, or result.

## Audit boundary

This file records observable system behavior: timestamps, job/case/event identifiers, provider role/model metadata, request-shape information, structured decisions and concise rationales exposed by the application, tool names and outcomes, source references where safe, classified errors, state changes, and before/after ledger counts.

It does **not** contain private chain-of-thought, hidden model reasoning, API keys, credentials, cookies, or raw personal email/phone details. The optional model audit hook is request-shape-only; it does not capture prompt or response bodies. The API requests reasoning-disabled outputs. Observable structured decisions are not hidden reasoning.

This file is in the ordinary, Git-tracked `audits/` directory and is not ignored. Minimize personal information: summarize search/page content, redact personal contact values, and record evidence identifiers and attribution outcomes instead.

## Prior-attempt review

### Run 04

- Earlier standard-depth discovery attempts ended incomplete without a candidate/card.
- The selected Investigator encountered token-window HTTP 429 responses after bounded same-capability retries. Remaining request quota was present, so these did not establish hard quota exhaustion.
- A `json_validate_failed` response is an output-contract error, not a quota signal.

### Run 05

- A prior Right-hand output-contract mismatch was repaired with a bounded same-role/model fallback.
- The canonical run later used a Boss-directed, durably recorded Investigator reassignment after a classified quota-exhaustion signal. The reassigned Investigator still produced no evidence-backed admission/card.
- Do not treat a search result, model pivot, contact-like string, malformed output, token-window limit, or generic provider error as a valid basis for reassignment or admission.

### Run 06

- Discovery used three four-action episodes, produced no Investigator `done(findings)` action, no candidate admission, and no card. The final Boss decision to stop was honored.
- Audit diagnosis found an allocation defect: the standard-depth allocator reserved target actions before any candidate existed, preventing an otherwise valid discovery continuation. The fix was committed on `main` and is present in the current source revision: unused reserve is available to valid model-directed discovery continuation when no candidate is admitted; reserve remains protected once a candidate exists.
- Run 06 explicitly recommended a deeper, one-target-bounded retry while preserving the default model-owned discovery objective and all evidence/admission gates. This run follows that recommendation.
- **Provider-boundary rule:** only explicit `upstream_quota_exhausted` may enter the existing Boss-directed reassignment path, which must record a different configured Investigator capability. Token-window pressure, invalid structured output, HTTP 413, and ordinary tool failures are not hard-quota exhaustion. No manual or silent credential rotation.
- Do not force `done`, synthesize findings, weaken source independence/materiality/contact attribution, override Boss stop, or create a card outside canonical admission.

## Setup and preflight chronology

### Event 000 — audit opened before launch

- **Time:** 2026-10-14; before any run-07 model, search, registry, browser, or contact-research request.
- **Action:** created this visible audit before submitting the canonical launch request.
- **Current source:** `main` at `34276cb3a92f0e52d39b84b5da80cc95fc819272`, tracking `origin/main`.
- **Baseline:** API health previously returned HTTP 200; the active Atlas lane was empty; `/api/entities` returned an empty list. The current development database was initialized through the repository's one-time setup after confirming it had no public tables. No app records were seeded.
- **Secret check:** the 13 required secret names are configured. Values were not read or logged.
- **External activity for run 07:** none.

### Setup issues from this Replit import

- The GitHub connector available before project transition was disconnected and could not be reauthorized through its setup flow. The repository was publicly readable, so source was fetched over HTTPS without requesting GitHub credentials; the existing Replit checkout was then linked to `origin/main`. The starter commit remains on `replit-starter-main-backup`.
- `rsync` was unavailable in the environment; repository files were imported with a tracked-file copy instead. The resulting checkout was verified at the source revision above.
- The first preview showed HTTP 500 responses for database-backed dashboard routes because the fresh development database had no tables. The repository's explicit first-time initializer completed successfully; the failing routes then returned HTTP 200. Ordinary runtime boot continues with schema mutation disabled.
- Dependency install used `pnpm install --frozen-lockfile`; the project typecheck passed. The canonical API workflow and desk are running. No live research was initiated during setup.

## Live trace

Append each material observation promptly and chronologically. Use UTC timestamps where available. Separate direct observations from interpretation. Do not launch a second run while one is active. Preserve failed/incomplete runs and their durable records. Claim a successful run only after verifying terminal state plus fresh persisted admission/card and source-backed evidence.

### Event 001 — readiness and safe model-request trace review

- **Time:** 2026-10-14, before enabling capture or submitting a live request.
- **Direct observation:** `GET /api/healthz` returned HTTP 200 with Redis `ok` and `researchKeysConfigured=true`; the active Atlas lane reported no job; `/api/entities?limit=1` returned an empty array.
- **Workflow state:** canonical API workflow is running. The unrelated Component Preview Server is also running and will be stopped before research, consistent with the repository's API-only run procedure.
- **Capture review:** reviewed `artifacts/api-server/src/src/lib/model-prompt-audit.ts`. Its opt-in development hook records request ID, provider/role/model, attempt, job/case IDs, safe scalar request parameters, message roles/counts/character counts, response-format shape, and tool names/counts. It never serializes message bodies, source/target details, contact values, tool descriptions, or full schemas. This is request-shape telemetry, not access to private model reasoning.
- **Capture environment before setup:** `NODE_ENV=development`; both run-scoped capture variables were absent. They will be enabled only for this run and removed afterward.
- **External activity for run 07:** none. No provider, search, registry, page-fetch, or contact-research request has been made.

### Event 002 — preflight passed; startup database error under investigation

- **Time:** 2026-10-14, approximately 12:37 UTC.
- **Preflight:** `node scripts/replit-preflight.mjs` exited 0. All 13 active secret names were present; the script printed names/status only and did not print or modify values. Platform `DATABASE_URL` was present.
- **Architecture checks:** `pnpm run check:bureau` exited 0, including canonical-route/launch boundaries, free-ReAct and Investigator autonomy checks, evidence/admission provenance checks, SSrf/browser boundaries, research-gauntlet validation (50 cases), and focused tests. The focused groups reported 44, 6, and 5 passing tests respectively.
- **Workflow change:** run-scoped shape-only capture variables were set in the development environment; stopping the unrelated Component Preview Server succeeded. The API workflow reports running.
- **New observation requiring verification:** the API workflow status output included a SQL error stack from the entity-list query in `routes/entities.ts` while booting. It is not yet known whether this is a current request failure or an earlier startup log. No live research request has been submitted; launch is paused until this is resolved.

### Event 003 — live database and read-only route verification

- **Time:** 2026-10-14, approximately 12:38 UTC.
- **Database:** the expected public tables exist, including entities, assets, relationships, research cases/events/evidence, research sessions, and run events. The checked entity, asset, and relationship columns match the code's current query contract. No app rows were found in the entity list.
- **Direct API probes:** health, entities, dashboard hot leads, dashboard stats, dashboard map data, and the scoreboard snapshot all returned HTTP 200. Dashboard/statistics output reports zero entities, assets, relationships, and cards; bureau integrity is `ok`. The active run lane remains empty.
- **SQL-log discrepancy:** the workflow log contains eight query failures timestamped `2026-10-14T12:38:10.440Z`, around the API restart. Later direct probes of the corresponding dashboard routes succeeded. The log excerpt lacks the underlying PostgreSQL error code, so the exact cause is unproven; these are recorded as startup-window failures, not as a confirmed fix. No code or database changes were made in response.
- **Decision:** current readiness probes pass and the schema is present, so proceed with the bounded canonical launch while watching for recurrence. Do not disregard any new failure during the run.
- **External activity for run 07:** none so far.

### Event 004 — immediately before canonical launch

- **Launch contract:** `POST /api/ingest/atlas-run`; discovery-first (`singleTargetId` omitted); `targetCount=1`, `researchDepth=deep`, `targetTimeoutMs=420000`. This uses the canonical pipeline and the prior audit's bounded-retry recommendation. It does not inject a target, query, tool choice, finding, or admission.
- **Expected sequence:** Boss directs the work and selects capability; Investigator owns model-led discovery/research and tool selection; validated observations and provenance determine admission; Right-hand oversight and Boss control follow existing policy; card creation remains evidence-gated.
- **Provider fallback:** only a classified hard `upstream_quota_exhausted` response may use the existing Boss-directed, durably recorded switch to another configured Investigator capability. Token-window limits, 413s, invalid outputs, and ordinary tool errors are not hard quota exhaustion.
- **Pre-launch state:** latest health and read-only routes passed; active lane showed no job; no provider or search request has yet been made.
- **Request status:** not yet submitted at the time of this entry.

### Event 005 — canonical launch accepted

- **Time:** 2026-10-14 UTC, immediately after Event 004.
- **Precondition check:** `GET /api/ingest/job/active/atlas-run` returned `active=false`, `jobId=null`.
- **Action:** submitted the recorded JSON to the canonical `/api/ingest/atlas-run` endpoint.
- **Response:** HTTP 202; server message: `Canonical model-owned discovery started`; options echoed as `targetCount=1`, `singleTargetId=null`, `researchDepth=deep`, `targetTimeoutMs=420000`.
- **Job:** `600a21c5-cda2-444a-8124-ee1c596b8cbd`; poll endpoint `/api/ingest/job/600a21c5-cda2-444a-8124-ee1c596b8cbd`.
- **Interpretation:** the canonical pipeline accepted the launch. This is not evidence of a successful research result or card. Record each subsequent model/tool/state transition before making a success claim.

### Event 006 — first persisted job poll

- **Time:** `2026-10-14T12:40:08.925Z` job `startedAt`; poll occurred shortly afterward.
- **Observed state:** `status=running`, `progress=1/4`, `atlasPhase=1/4`, `inserted=0`, `skipped=0`, `dedupCount=0`, `errors=0`, `cancelRequested=false`.
- **Job log:** five entries exist. Their raw contents are not copied here because they may contain target/search text or personal data; extract safe action/model/tool metadata separately.
- **Interpretation:** the run is in its first phase. No admission or card is established at this point.

### Event 007 — Investigator tool activity and provider telemetry

- **Time window:** `2026-10-14T12:40:21Z`–`12:41:27Z`.
- **Persisted action spans, chronological order:** Investigator `web_search` (ok; input/result summaries 82/15 characters), `web_search` (ok; 49/15), `visit` (ok; 68/7), and `parallel_web_search` (ok; 19/42). These are observed tool names and telemetry lengths only; raw queries, page text, URLs with identifying paths, and contact values are intentionally not copied.
- **Provider log:** two successful Groq calls using `openai/gpt-oss-120b` were visible in the API workflow log. Request-shape metrics were 7,072 characters each; 2,183 and 2,208 prompt tokens; 779 and 723 completion tokens; latency 2,383 ms and 1,894 ms. The log did not identify the agent role, so role attribution is left unknown rather than inferred. No hard-quota error was reported in these two records.
- **Trace state:** four Investigator tool spans were present; no completed discovery-trace slot or admission had yet been persisted at this poll.
- **Request-shape audit gap:** the opt-in capture environment values are present in the development environment, but the audit file had zero model-request blocks when checked after these calls. Exact cause is not yet established (runtime environment propagation or relative-path resolution are possible). Do not restart or alter the active worker; continue from job state and application telemetry, then diagnose the capture gap after terminal state.
- **Interpretation:** this confirms successful search/visit tool executions, not grounded findings, admission, or card creation.

### Event 008 — continued discovery poll and durable ledger delta

- **Time window:** through `2026-10-14T12:42:14.262Z`.
- **Job:** still `running`, `progress=1/4`, `atlasPhase=1/4`, no cancellation, zero job errors; log entries increased from 5 to 13.
- **New Investigator spans:** `web_search` (ok; input/result summaries 45/15 characters) at `12:42:11.959Z`, then `visit` (ok; 54/7 characters) at `12:42:14.262Z`. Raw query/page/contact text remains excluded.
- **Durable state delta:** one research case and nine case events now exist. Research evidence, run events, entities, and contact-evidence rows remain at zero. The in-memory discovery trace still has no completed slot. No candidate admission/card is evidenced.
- **Interpretation:** the Investigator is continuing tool use; the run has not yet emitted/persisted eligible evidence. No `upstream_quota_exhausted` signal has been observed, so no capability reassignment is warranted.

### Event 009 — first tool error recorded; classification pending

- **Time:** `2026-10-14T12:43:28.287Z`.
- **Durable case-event sequence:** events 1–3 are `groq_boss/assignment`, `right_hand/observation`, and `head_investigator/assignment`, all recorded. Events 4–9 are successful `head_investigator/tool_observation` events. Event 10 is a `head_investigator/tool_observation` with status `error`. Event summaries/payloads are not copied verbatim because they may contain search text, page content, or personal data; the event schema permits inspecting safe error classifications.
- **Provider log:** a Groq `openai/gpt-oss-120b` call succeeded after retry index 2; request size was 7,071 characters, 1,553 prompt tokens, 596 completion tokens, 2,149 total tokens, and 60,059 ms latency. Provider error code/type were null; remaining-token/request counters were nonzero. This is not evidence of hard quota exhaustion.
- **Job state:** still running at phase 1/4; `inserted=0`, `skipped=0`, API job `errors=0`, 14 log entries. The case ledger's error event is being classified; it does not yet establish a job failure or quota condition.
- **Action:** inspect only typed error/tool/status fields next. Do not reassign an Investigator based solely on this event.

### Event 010 — model control transition after tool errors

- **Time window:** through `2026-10-14T12:43:34.349Z`.
- **New durable events:** event 11 is a completed `control_decision` at iteration 8; event 12 is a recorded `control_objective` at iteration 9; event 13 is a blocked `tool_observation` at iteration 9. The decision/objective/action occurred after the Investigator tool-observation error at iteration 7. Their free-text fields are not copied; typed action/status/direction, confidence, accepted state, and error classification will be inspected separately.
- **Trace:** eight spans now exist: the six earlier successful Investigator searches/visits, plus `browser_fetch` error at `12:43:28.253Z` and `web_search` error at `12:43:34.349Z`. The latter summaries are not copied verbatim.
- **Current persisted result:** still zero research-evidence rows, zero entities/cards, and zero contact-evidence rows. One discovery-trace slot has appeared, but its model findings/admission state have not yet been summarized.
- **Job:** remains `running`, phase 1/4, with 17 log entries and no job-level errors. No explicit upstream hard-quota classification has been observed.
- **Next action:** read only safe structured fields and counts from the control/error records; keep the active job undisturbed.

### Event 011 — completed Investigator episode and Boss-directed pivot

- **Time:** through `2026-10-14T12:43:34Z`.
- **Investigator episode:** capability `groq-investigator-1`, provider model `openai/gpt-oss-120b`, status `completed`; six searches, two visits, 14 trajectory entries, 29 observed/result URL references, zero model findings, zero parsed candidates, and no admission object. URLs themselves are not copied.
- **Typed error:** event 10 identifies `browser_fetch` / `external_page_fetch` / `request_failure`, with no provider fallback. This is a page-fetch/tool failure, not an Investigator-key exhaustion signal.
- **Boss control output:** `groq_boss/control_decision` completed with action `pivot_discovery`, model `openai/gpt-oss-120b`, confidence `0.78`, followed by an accepted `control_objective`. The model chose a pivot toward Pacific Northwest specialty-coffee importers/roasters, using local registries, chamber filings, or trade-association member lists to seek publicly profiled owners/operators. This is an observable structured direction, not hidden chain-of-thought; the free-text rationale (236 characters) is not copied.
- **Post-pivot action:** the next `web_search` observation is `blocked` at iteration 9; its failure classification is blank in the top-level typed fields and remains under investigation. Do not infer the reason from the status alone.
- **Result boundary:** zero evidence rows, candidates, admissions, cards, or contact-evidence rows at this point. The job remains running; no Investigator reassignment has occurred or is justified by the observed errors.

### Event 012 — blocked pivot-scope action followed by continued research

- **Time window:** through `2026-10-14T12:45:23.757Z`.
- **Blocked event classification:** event 13's typed `failureDomain`/`failureKind` fields are empty. Its observation mentions pivot context; the exact free-text reason is not copied. The block was not terminal: the Investigator continued with later successful actions.
- **New spans, chronological:** `web_search` ok at `12:44:26.041Z` (59/15 input/result characters); `browser_fetch` ok at `12:44:40.953Z` (34/180); `web_search` ok at `12:45:17.898Z` (25/15); `visit` ok at `12:45:20.729Z` (34/7); `browser_fetch` error at `12:45:23.757Z` (13/72).
- **Current trace:** 13 spans total. The first completed Investigator slot remains at six searches, two visits, zero findings/candidates/admission. The next work has not yet produced a completed slot.
- **Job:** still running in phase 1/4; no card/evidence admission is present. The 12:45 browser-fetch error is a tool event, not by itself a provider quota signal.

### Event 013 — quiet interval; successful model call near token-window boundary

- **Time:** latest poll after `2026-10-14T12:45:23Z`.
- **Job:** still running at `progress=1/4`, `atlasPhase=1/4`; `inserted=0`, `skipped=0`, no job-level errors, and the job log remains at 20 entries. The case ledger's latest event is a blocked Investigator tool observation at iteration 13.
- **Tool trace:** no new DigSpan has appeared after `12:45:23.757Z`; the last observed span is the Investigator's `browser_fetch` error. No new discovery slot or admission has appeared.
- **Provider telemetry:** a later Groq `openai/gpt-oss-120b` request succeeded (`status=200`, retry index 1, 2,168 prompt tokens, 739 completion tokens, 2,907 total, 2,713 ms). The log does not identify its role. It reported 84 tokens remaining with a ~59-second token reset and 982 remaining requests; this was a successful call, not hard quota exhaustion.
- **Interpretation:** the token-window counter is low but the call succeeded. Do not rotate an Investigator capability on this basis. Continue monitoring; no card/evidence is established.

### Event 014 — terminal parse failure in Investigator slot 2; Boss pivots and continues

- **Time window:** `2026-10-14T12:46:26Z`–`12:47:07Z`.
- **Investigator failure:** event 19 is a terminal `parse_failure` for capability `groq-investigator-1`, with no provider fallback. Discovery slot 1 is `error`; it completed two searches and two visits, retained 14 trajectory entries and 30 URL references, but produced zero findings, zero parsed candidates, and no admission.
- **Classification:** structured-output parsing failure, not provider `upstream_quota_exhausted`; it does not authorize key/capability rotation. The failure is preserved in the case/trace rather than converted into a finding.
- **Boss recovery:** event 20 completed a `pivot_discovery` decision with confidence `0.78`; event 21 recorded the objective as accepted. The observable direction pivoted to public Washington Secretary of State filings and trade-association member lists for specialty-coffee importers/roasters to seek concrete owner names. The 400-character free-text rationale is not copied.
- **Continuation:** Investigator capability 1 then completed a `web_search` span at `12:47:07.623Z` (69/15 input/result characters). No alternate Investigator capability was selected.
- **Job/result:** still running at phase 1/4; zero inserts, evidence rows, candidates, admissions, cards, and contact-evidence rows. The latest error is explicitly a parse failure, not quota exhaustion.

### Event 015 — post-pivot provider call succeeded; no persisted progression yet

- **Time:** latest workflow poll after `12:47:07Z`.
- **Provider telemetry:** another Groq `openai/gpt-oss-120b` request succeeded (`status=200`, retry index 1, 2,196 prompt tokens, 582 completion tokens, 2,778 total, 2,016 ms); remaining-token counter was 1,941 and remaining-request counter 978. The log does not identify the role; do not infer it.
- **State:** the job remains running at phase 1/4 with zero inserts and no job-level errors. Case event 22 (successful Investigator `web_search` at `12:47:07.633Z`) remains the newest durable case event; the trace has 15 spans and two discovery slots.
- **Quota conclusion:** provider capacity recovered and the latest call succeeded. No hard-exhaustion error exists; no Investigator capability switch is appropriate.

### Event 016 — Investigator continuation; bounded prompts despite large durable case file

- **Time window:** through `2026-10-14T12:47:59.821Z`.
- **New durable events:** Investigator events 23–25 occurred at `12:47:53.873Z`, `12:47:57.049Z`, and `12:47:59.800Z`, with statuses `blocked`, `success`, and `blocked`. Exact tool/error labels are being read from typed fields next; no event text is copied.
- **Case state:** case 1 remains `active`, directed by Groq Boss (`openai/gpt-oss-120b`), iteration 18. Its durable case file is 318,330 characters, while observed outgoing model-request-size telemetry remains around 7,000 characters; this is not itself a provider 413. Continue monitoring compaction and provider responses.
- **Provider telemetry:** a Groq `openai/gpt-oss-120b` request succeeded (`status=200`, retry index 1, 2,174 prompt tokens, 959 completion tokens, 3,133 total, 2,429 ms); 402 tokens and 975 requests remained. Role is not identified in the log. No hard quota error or 413 has been observed.
- **Job/result:** still `running`, phase 1/4, `inserted=0`, no job-level errors. No evidence/admission/card/contact record has been established.

### Event 017 — blocked and successful search turns inside Investigator episode

- **Time window:** `2026-10-14T12:47:53.852Z`–`12:47:59.785Z`.
- **Case-event order:** Investigator capability 1, turn 16 `web_search` = blocked; turn 17 `web_search` = success; turn 18 `parallel_web_search` = blocked. Provider fallback lists are empty; typed failure-domain/kind fields are blank for both blocked events.
- **DigSpans:** matching statuses are error / ok / error, with only tool names, times, and input/result lengths retained. The successful search's result summary is not copied. The blocked observations are marked `blocked`; the exact policy reason is not established from safe typed fields.
- **Job and evidence:** still running at phase 1/4, with no new discovery slot, findings, candidates, or admission. No key exhaustion or provider error is present.
- **Interpretation:** mixed tool outcomes are preserved distinctly; a blocked action did not prevent the next search from succeeding. Do not relabel blocked actions as quota failures.

### Event 018 — further successful model call; no new persisted action

- **Time:** latest workflow poll after the turn-18 events.
- **Provider telemetry:** another Groq request succeeded (`status=200`, 5,598 request characters, 2,189 prompt tokens, 931 completion tokens, 3,120 total, 2,306 ms). The log does not identify the role. Remaining-token/request counters were 2,728 / 973.
- **State:** job remains running at phase 1/4 with zero inserts and zero job errors. No case event or tool span newer than `12:47:59Z` has been observed; no new discovery slot or admission exists.
- **Interpretation:** successful provider output has not yet corresponded to a new persisted action in the inspected ledger. Continue monitoring for the model-selected next step or terminal control decision; do not force progress.

### Event 019 — new Investigator turns and another Boss control cycle

- **Time window:** `2026-10-14T12:49:03Z`–`12:49:47Z`.
- **Case events:** Investigator turn 19 `tool_observation/success` at `12:49:03.082Z`; turn 20 `tool_observation/blocked` at `12:49:05.745Z`; then Boss `control_decision/completed` at `12:49:46.888Z` and Boss `control_objective/recorded` at `12:49:47.560Z`.
- **Provider output-contract issue:** the latest API log includes `json_validate_failed` / `invalid_request_error`, retry index 1, 3,590 ms, with token/request capacity remaining. Token totals were unavailable for that failed call. This is not hard quota exhaustion; no Investigator switch is indicated.
- **Job:** still running at phase 1/4, zero inserts, and zero job-level errors. The new Boss direction is accepted; summarize its safe structured fields before the next poll.

### Event 020 — second accepted source-lane pivot; third slot completed without findings

- **Time window:** through `2026-10-14T12:49:47.560Z`.
- **Investigator turns:** turn 19 `parallel_web_search` succeeded; turn 20 `web_search` was blocked. Both ran under `groq-investigator-1` with no provider fallback.
- **Boss control:** event 28 is a completed `pivot_discovery` decision by `openai/gpt-oss-120b` at confidence `0.78`; event 29 records that pivot as accepted. The safe category is still specialty-coffee discovery through public registry/filing sources. Direction text and rationale are not copied verbatim.
- **Discovery slot 2:** `completed`, four searches, zero visits, zero model findings, zero parsed candidates, 12 trajectory entries, 30 URL references, no admission. The earlier slots remain: slot 0 completed (6 searches, 2 visits, no findings); slot 1 errored (2 searches, 2 visits, no findings). Across the three slots there are no candidate/card/contact records.
- **Job:** remains running at phase 1/4 with zero inserts and no job-level errors. Boss continues model-directed discovery; no hard-quota signal has occurred.

### Event 021 — first Investigator provider error; quota classification pending

- **Time window:** `2026-10-14T12:50:42.997Z`–`12:50:51.026Z`.
- **New case events:** event 30 is `head_investigator/provider_error/error` at iteration 22; the next event is a blocked `parallel_web_search` at iteration 24. Discovery slot 3 is `unavailable` with zero searches, zero visits, zero findings/candidates, no admission, and two trajectory entries.
- **Trace:** a `provider_error` span is recorded; a subsequent `parallel_web_search` span is error/blocked. The typed error domain/code is not yet available in this entry.
- **Quota boundary:** the immediately preceding logged provider call had succeeded with 390 tokens and 968 requests remaining, but that does not classify this later error. Do not rotate the Investigator until the provider error's explicit type is checked. If it is only token-window pressure or a transient/invalid-output error, keep the selected capability and follow the existing bounded retry policy; if it is explicit hard `upstream_quota_exhausted`, use the existing Boss-directed durable reassignment path.
- **Result:** no evidence, admission, card, entity, or contact-evidence record exists. The canonical job remains active with zero job-level errors.

### Event 022 — classify provider failures; no hard quota exhaustion

- **Time window:** through `2026-10-14T12:51:52.816Z`.
- **Event 30 classification:** `head_investigator/provider_error`, capability `groq-investigator-1`, `failureDomain=model_provider`, `failureKind=invalid_provider_request`, with no provider fallback. This is an invalid provider request/output-contract failure, not quota exhaustion.
- **Provider HTTP 429:** workflow telemetry explicitly reports `rate_limit_exceeded`, type `tokens`, reason `upstream_rate_limited`, 1,235 tokens remaining with a 50,737 ms token reset, and 965 requests remaining. The request budget is available; this is token-window pressure, not a hard exhausted key.
- **Required response:** keep the selected Investigator capability; do not rotate credentials. Let the application's bounded same-capability retry/wait behavior proceed. No manual retry or provider mutation is being issued.
- **Control flow:** Boss event 31 completed another `pivot_discovery` decision and event 32 recorded the objective as accepted. The safe categorization remains specialty-coffee discovery through public registry/filing sources; no target/person value is copied.
- **Tool/slot outcome:** after a blocked `parallel_web_search`, two web-search spans errored at `12:51:50.386Z` and `12:51:52.816Z`. Discovery slot 4 is marked `completed` with zero searches, visits, findings, candidates, and admission; six trajectory entries and 30 URL references are retained.
- **Job/result:** still running at phase 1/4 with zero inserts and no job-level errors. No evidence-backed card exists yet.

### Event 023 — same-capability retry after token reset; search tool still errors

- **Time window:** through `2026-10-14T12:52:52.803Z`.
- **Retry behavior:** after the reported token-window reset interval, the same Investigator lane emitted two `web_search` error spans at `12:52:50.600Z` and `12:52:52.803Z`. No new admission or discovery slot appeared.
- **Job:** still `running`, phase 1/4, zero inserts, zero job-level errors. Trace contains 26 spans and five persisted slots; all slots still report zero findings/candidates/admissions.
- **Classification pending:** these are search-tool errors, distinct from the earlier Groq token-window 429. Inspect typed case events/provider metadata before attributing them to an exhausted key. No capability switch has been made.

### Event 024 — repeated blocked searches; Boss accepts another pivot; provider call succeeds

- **Time window:** `2026-10-14T12:51:50.410Z`–latest workflow poll.
- **Case events:** Investigator capability 1 had `web_search` blocked at turns 24 and 26, then another `web_search` blocked at turn 26 after Boss control. All reported `providerFallback=[]`; `failureDomain` and `failureKind` are blank on the blocked tool events.
- **Boss control:** event 36 completed another `pivot_discovery` decision (`openai/gpt-oss-120b`, confidence `0.78`, 252-character rationale); event 37 recorded the new objective as accepted. The model continues within the same specialty-coffee/public-registry category; free-text objective/rationale is not copied.
- **Provider capacity:** subsequent Groq telemetry shows a successful call (`status=200`, 2,153 prompt tokens, 577 completion tokens, 1,765 ms; 2,229 tokens and 963 requests remaining). The earlier HTTP 429 was specifically `type=tokens`; no hard quota classification has appeared.
- **Interpretation:** repeated blocked search actions are not yet classified as provider-key exhaustion. No credential/capability rotation is justified. The run remains active with no evidence-backed admission/card.

### Event 025 — two more blocked searches around another Boss pivot

- **Time window:** through `2026-10-14T12:53:47.928Z`.
- **Case events:** turn 27 `web_search` blocked at `12:53:39.043Z`; Boss `pivot_discovery` decision at `12:53:44.253Z`; accepted objective at `12:53:45.030Z`; turn 29 `web_search` blocked at `12:53:47.946Z`. Blocked events again have no typed provider-failure domain/kind.
- **Trace:** 28 spans, six discovery slots. Slots 0–5 have zero findings, candidates, and admission; slot 1 is an Investigator parse error, slot 3 is unavailable, and the other slots are marked completed despite no findings.
- **Ledger:** research-evidence, entity/card, contact-evidence, and research-run-event counts remain zero. The run is still active at phase 1/4, no job-level error.
- **Assessment:** repeated pivot/search blocking is now the main observed liveness risk. It is not a hard-key-exhaustion signal. Continue to inspect the model-directed control trajectory and bounded stop conditions; do not synthesize a card or widen evidence rules.

### Event 026 — repeated pivot-scope blocks; model JSON validation failure

- **Time:** through the latest API workflow poll after event 43.
- **Scope correlation:** blocked search events 33–35 share one hashed pivot-scope key; events 38–40 share a second; event 43 uses a third. The recorded observations mention pivot/scope; two explicitly match a repeat marker. Hashes are used only to correlate retries and do not reveal query/objective text.
- **Boss control:** event 41 completed another `pivot_discovery` decision (confidence `0.88`) and event 42 accepted it. The direction remains in the specialty-coffee/registry discovery category, but has changed scope fingerprint. The next Investigator web search was still blocked.
- **Provider error:** the latest Groq log is HTTP 400 `json_validate_failed` / `invalid_request_error`, 54,781 ms, with 4,854 tokens and 959 requests remaining. This is an output-contract error, not hard quota exhaustion. No alternate capability is selected.
- **Liveness/result:** phase remains 1/4; zero findings, candidates, evidence, admissions, and cards. Repeated pivot-scope blocks and long invalid-output attempts are now the primary run risks. Continue only through canonical Boss/Investigator control and preserve the terminal outcome.



## Post-Event-026 source review and repair

The saved Run 07 trace stops with the job still active at phase 1/4. This file therefore does **not** establish the final job outcome after the last explicitly timestamped event window ending at 2026-10-14T12:53:47Z; Event 026 itself has no precise timestamp. Within the recorded window, no candidate was admitted and the evidence/contact/card tables remained empty because the Investigator did not produce admissible findings; the earlier durable case-event ledger still preserved action observations. The captured provider data does not support classifying the run as a hard quota failure: one HTTP 429 was token-window rate limiting, while the later HTTP 400 was a structured-output validation failure.

The control-loop defect is cross-pivot recovery: existing repeat-block detection is scoped to one exact accepted pivot fingerprint, so the wrapper returns to Boss after repeated blocks, but Boss can accept another slightly changed pivot in the same general lane and restart the local block streak without gaining evidence. The existing evidence, identity, attribution, and terminal gates should remain strict.

The follow-on repair adds two safeguards without prescribing research strategy: (1) repeated preflight scope blocks are surfaced to Boss and Right-hand as explicit control-state feedback across pivot variants, and are explicitly distinguished from negative source evidence; (2) the same blocked records receive typed `model_action / out_of_scope_action` diagnostics instead of blank failure fields. The feedback leaves the next research question and any stop decision to the models. Added regression tests cover cross-pivot no-progress detection and reset after a successful external action. CI validation is pending for the new main commit; this repair does not retroactively prove that Run 07 would have yielded a candidate.

### Event 028 — source-contract assertion adapted to typed trajectory diagnostics

The first CI run for `b83fe5e1c17549fb624cb98eebba3e638411dd25` passed production typechecks and the static discovery/frontend gates, but the API regression suite and the control-contract gate failed one source-based assertion. The assertion required the normalized trajectory record to remain on one physical line; the repair expanded that object to add typed scope-guard fields. This was a test-contract formatting failure, not a failing typecheck. The regression now asserts the normalized-record count and the explicit `failureDomain`/`failureKind` assignments without requiring the implementation to use a one-line object literal. CI has been retriggered by this follow-up commit.

Timing correction: Event 026 does not give an exact UTC timestamp. The last explicitly timestamped event window in the preceding event entries ends at `2026-10-14T12:53:47Z`; the final Run 07 outcome remains unverified from this saved audit snapshot.

### Event 029 — durable-turn source assertion updated for the multi-line normalized record

On follow-up revision `3af25aa8433cc9fa154928f81e66d4715df47ea5`, the previous formatting-sensitive API contract assertion passed. The full API regression suite then exposed a second copy of the same style-dependent assertion in `discovery-runtime-correctness.test.ts`, under `keeps absolute durable Investigator turns across one-action continuation episodes`. The failure was `expected 2 declarations but got 1` because one normalized record was expanded to multiple lines to attach typed scope-guard fields.

The test now still requires two normalized-record construction sites, checks that the durable turn-offset prohibition remains, and explicitly asserts the new `failureDomain`/`failureKind` assignments. This avoids tying the test to a one-line object literal while preserving its intended durable-turn and diagnostic coverage. This correction is being committed to `main`; CI validation is pending.