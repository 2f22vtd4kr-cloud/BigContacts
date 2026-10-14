# ⭐ Apex Atlas Sequential Audit — LIVE RUN 08

- **Status:** Audit opened before any Run 08 launch. Current active-job state and durable baseline are still to be checked.
- **Audit file:** `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-14_LIVE_RUN_08.md`
- **Repository:** `2f22vtd4kr-cloud/BigContacts`, branch `main`.
- **Source revision at audit open:** `b4371efc7af4131d7743ec249bb09ac36b635932` (observed 2026-10-14 15:18:03 UTC).
- **Scope:** UI-equivalent discovery-first launch; model-led discovery and research; validated tool activity; durable evidence/provenance; candidate admission/card projection; terminal and ledger reconciliation.
- **Planned launch:** only after confirming no active Atlas job. Use the UI helper's defaults exactly: `targetCount=3`, `researchDepth=standard`, `targetTimeoutMs=420000`; omit `singleTargetId`. Do not add a person, geography, seed, query, tool order, or desired outcome.

## Audit boundary

Record timestamped, directly observed events: run/job/case/event identifiers; provider, role, model and selected Investigator capability from execution records; structured model decisions and exposed concise rationales; tool inputs/results and source references where safe; typed failures; evidence/admission/card identifiers; and before/after durable counts. Distinguish direct evidence from interpretation.

The app's `model-prompt-audit.ts` is request-shape telemetry only: it records request metadata and sizing, not message bodies, prompts, source text, contact values, or hidden model reasoning. Record observable model outputs and hand-offs; do not solicit, infer, or reproduce private hidden chain-of-thought. Public professional/business contact routes may be documented with provenance; redact secrets, authorization material, cookies, private personal contact values, and non-public data.

This file is in the ordinary `audits/` directory and `git check-ignore` confirmed it is not ignored. No secrets or credential values are written here.

## Prior-attempt review

- **Runs 04–05:** no evidence-backed card. Token-window HTTP 429s and structured-output failures were not hard quota exhaustion. A separate hard-quota reassignment was recorded in Run 05, but it did not produce an admission/card. Do not manually or silently rotate capabilities.
- **Run 06:** no candidate/card; the final Boss stop was honored. A discovery-budget allocation defect was subsequently fixed on `main`; the fix is not evidence of a successful live run.
- **Run 07:** the saved audit ends without verified terminal reconciliation. It reports phase 1/4, repeated pivot-scope blocks, one token-window rate limit, invalid structured output, and zero evidence-backed admissions/cards through its last observed window. Its final job state is unknown from that audit. Inspect this Replit's active-job pointer before any new launch; do not assume Run 07 is terminal or repeat it.
- **Quota rule:** only typed `upstream_quota_exhausted` permits the app's existing Boss-directed, durably recorded Investigator-capability reassignment. Token-window pressure, HTTP 413, invalid output, tool failures, and configured-key presence alone do not justify a switch. Preserve the selected capability unless the canonical runtime records an authorized transition.
- **Admission rule:** count a new persisted admission/card and reconcile its source evidence; do not treat search results, model claims, contact-like strings, or summary counts as a card.

## Setup and preflight chronology

### Event 000 — audit opened before Run 08

- **Time:** 2026-10-14 15:18:03 UTC.
- **Observed repository state:** `main`, revision `b4371efc7af4131d7743ec249bb09ac36b635932`; `git status -sb` showed no worktree changes at this timestamp.
- **Earlier setup in this Replit:** imported the repository at `bc41e91`, installed dependencies using `pnpm install --frozen-lockfile`, and ran the documented first-time schema initializer after confirming the new development database had zero public tables. Initialization completed and verified required tables.
- **Setup issue:** the first API workflow attempt failed because its working directory was `artifacts/api-server`, so `bash scripts/replit-boot.sh` was not found. The Replit service command was corrected to `cd ../.. && bash scripts/replit-boot.sh`; the canonical boot then built the desk and API and the API workflow started.
- **Preflight:** all 13 active provider-secret names were present in the secret store; the presence-only preflight passed. No secret values were read or logged.
- **Prior smoke:** desk route and `/api/healthz` both returned HTTP 200; health reported Redis `ok` and research keys configured. `pnpm run check:no-force-dig` passed. These are setup checks, not research evidence.
- **Current-run external activity:** none observed yet. Do not infer that no earlier job remains active until the active pointer is checked.

## Live trace

Append each material observation promptly and chronologically. Use UTC timestamps where available. Do not start a duplicate while an active job exists or its terminal state is ambiguous. Preserve failed/incomplete runs; no card may be manufactured or admitted by weakening evidence rules.

### Event 001 — pre-launch active-job and ledger baseline

- **Time:** 2026-10-14 UTC, shortly after Event 000.
- **Health:** `GET /api/healthz` returned HTTP 200; API status `ok`, Redis status `ok`, reported latency 170 ms (`cached=true`), research keys configured.
- **Active-lane guard:** `GET /api/ingest/job/active/atlas-run` returned HTTP 200 with `active=false`, `jobId=null`, `job=null`. The old Run 07 job ID in its audit is not active in this runtime; its historical terminal outcome remains unverified.
- **Exact durable baseline (count / max ID):** `assets 0/0`; `contact_evidence 0/0`; `entities 0/0`; `relationships 0/0`; `research_case_events 0/0`; `research_cases 0/0`; `research_evidence 0/0`; `research_run_events 0/0`; `research_sessions 0/0`. These are exact PostgreSQL `count(*)` and `max(id)` reads; no row content/contact values were selected.
- **Runtime settings:** API process reported `APEX_CAPTURE_MODEL_PROMPTS=true`, `APEX_MODEL_AUDIT_FILE=audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-14_LIVE_RUN_07.md`, `ENABLE_AUTO_PIPELINE=false`, `NODE_ENV=development`. The capture path would append request-shape telemetry to the wrong historical audit; correct it before launching.
- **Audit probe issue:** the first read-only `/proc` environment probe used a malformed `tr` redirection and failed before reading environment values. It was corrected; only the four allowlisted non-secret settings above were printed. No application state changed.
- **Launch contract confirmed from the current UI helper:** default request body is `{targetCount:3,researchDepth:"standard",targetTimeoutMs:420000}` with no `singleTargetId`; the research-depth selector defaults to `standard`. It calls `POST /api/ingest/atlas-run`, which is the only launch boundary to use.
- **Decision:** baseline and active guard permit a new run. Change only the audit destination, restart the existing API workflow to load it, then recheck health/active lane before one canonical launch. No provider, web search, or target research request has been made for Run 08.
- **Configuration-edit issue:** a direct patch to `.replit` was rejected by the platform's configuration guard; the audit-file patch succeeded, but `.replit` remained unchanged. No service state changed. Use the platform's TOML validation/replacement operation for the audit-path update.

### Event 002 — model request-shape audit destination updated

- **Time:** 2026-10-14 UTC, before launch.
- **Action:** updated only `APEX_MODEL_AUDIT_FILE` from the Run 07 path to this Run 08 audit using Replit's TOML validator/replacement operation.
- **Result:** validation/replacement returned success. `APEX_CAPTURE_MODEL_PROMPTS` remains enabled; the implementation records request shape and sizing only, not message bodies or hidden reasoning.
- **Restart:** the temporary validator input was removed and the existing API workflow restarted successfully. Workflow status is `RUNNING`; desk and API builds completed, canonical architecture/provider/discovery/provenance guards passed, and startup explicitly skipped schema push. This is the one restart for the configuration change.
- **Post-restart health:** `/api/healthz` returned HTTP 200 with API `ok`, Redis `ok` (167 ms, uncached), research keys configured. Active Atlas lane remained empty (`active=false`, null job ID).
- **Live process settings:** verified `APEX_CAPTURE_MODEL_PROMPTS=true`, `APEX_MODEL_AUDIT_FILE` points to this Run 08 file, `ENABLE_AUTO_PIPELINE=false`, `NODE_ENV=development`.
- **Post-restart durable baseline:** exact counts/max IDs remained zero for assets, contact evidence, entities, relationships, case events, cases, research evidence, run events, and research sessions.
- **Mode check:** the UI helper bypasses the API only for explicit `?mock=1` or `?demo=1`; the current root route has neither. The request below targets the canonical live API endpoint with the helper's normal default body.
- **No research activity yet:** no model, search, registry, or candidate-research request has been made for Run 08.

### Event 003 — final pre-launch gate

- **Time:** 2026-10-14 UTC, immediately before the Run 08 launch request.
- **Active guard:** clear after API restart; no current job.
- **Database baseline:** all listed relevant tables are empty with max IDs 0. No existing candidate/card can be mistaken for Run 08 output.
- **Workflow/readiness:** API workflow running; health 200; auto-pipeline disabled; required key presence is configured. This does not prove provider quota or guarantee a research outcome.
- **Launch body:** `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`. This matches the UI launch helper and the standard depth selector default; no `singleTargetId`, target, seed, query, geography, action sequence, or forced card.
- **Quota/failure handling:** allow the canonical architecture to select and control the Investigator. Only a durable Boss-directed reassignment after explicit `upstream_quota_exhausted` is valid. Do not manually rotate keys or treat token-window errors, parse errors, or tool failures as hard quota exhaustion.
- **Launch decision:** proceed with one canonical `POST /api/ingest/atlas-run`. If the active-lock gate rejects it, inspect that job instead of retrying. After acceptance, poll the returned job and durable case/events at bounded intervals; append observations before any success claim.

### Event 004 — canonical launch accepted

- **Time:** 2026-10-14 UTC, immediately after Event 003.
- **Action:** submitted the one UI-equivalent request to `POST /api/ingest/atlas-run` with body `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`.
- **Response:** HTTP 202; server message `Canonical model-owned discovery started`; options echoed `targetCount=3`, `singleTargetId=null`, `researchDepth=standard`, `targetTimeoutMs=420000`.
- **Job:** `9884c4a6-203b-43fa-a6cc-45a87e2f9a7c`; poll route `/api/ingest/job/9884c4a6-203b-43fa-a6cc-45a87e2f9a7c`.
- **Interpretation:** launch accepted. This does not establish discovery, a finding, evidence, admission, or card creation. Do not submit a second launch; inspect this job until verified terminal.

### Event 005 — first persisted job observation and request-audit write failure

- **Time:** job `startedAt=2026-10-14T15:21:33.610Z`; first safe poll shortly after launch.
- **Job state:** `running`, `progress=1`, `atlasPhase=1`, `inserted=0`, `skipped=0`, `dedupCount=0`, `errors=0`, `cancelRequested=false`. This is active work, not a terminal result.
- **Provider telemetry visible in the workflow log:** three Groq `openai/gpt-oss-120b` calls returned HTTP 200. Each reported 7,072 total prompt characters (1,472 system / 5,600 user), with `(prompt, completion, total tokens; latency ms)` of `(2183,652,2835;2327)`, `(2201,627,2828;1651)`, and `(2191,907,3098;2234)`. Each had `retryIndex=1`; no provider error code/type was reported. The log does not include role/case attribution, so these calls are not assigned to Boss, Right-hand, or Investigator without durable corroboration. No hard-quota event is present in this sample.
- **Audit-capture failure:** at least five `[atlas_model_prompt_audit] append failed` messages appeared. Request shape was not written to this file by the hook. No prompt body or hidden reasoning was present in the workflow excerpt. Diagnose the relative-path failure while leaving the live worker untouched.
- **State boundary:** the job poll contains a log field, but raw entries were deliberately not printed because they may contain target/search/contact material. Query durable case/event columns with text omitted or safely summarized next. No admission/card is established.

### Event 006 — durable discovery sequence observed

- **Time window:** `2026-10-14T15:21:36.914Z`–`15:23:02.357Z`.
- **Case:** case `1`, `case_type=discovery`, `status=active`, director `groq_boss` / Groq / `openai/gpt-oss-120b`, at iteration 6. The case file measured 142,964 characters; objective 1,413, opening prompt 105, current action 22. These are lengths only, not prompt or case-file content.
- **Persisted sequence, in ID/time order:** event 1 Boss `assignment` / recorded; event 2 Right-hand `observation` / recorded; event 3 `head_investigator` `assignment` / recorded; events 4–7 Investigator `tool_observation` / success (iterations 1–4); event 8 Boss `control_decision` / completed (iteration 5); event 9 Boss `control_objective` / recorded (iteration 6); event 10 Investigator `tool_observation` / success (iteration 6).
- **Payload-size observations:** event payload lengths were 906, 1,308, 150, 4,274, 3,847, 21,181, 3,557, 1,890, 5,038, and 3,713 characters. The 21,181-character tool observation is a notable source/context growth point; the outgoing request telemetry still shows 7,072 prompt characters. No HTTP 413 is present in the observed logs.
- **Durable side tables:** the sampled `research_evidence` and `research_run_events` queries were empty. No admission or card is established. Search/tool payload text is being inspected for safe structured fields before any verbatim audit inclusion.

### Event 007 — root cause found for request-audit append failures

- **Time:** after the first request-audit failures, 2026-10-14 UTC.
- **Root cause:** the live API process working directory is `/home/runner/workspace/artifacts/api-server`, while `APEX_MODEL_AUDIT_FILE` is the relative path `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-14_LIVE_RUN_08.md`. The root-level audit file is writable, but the process resolves that relative path under the package directory, where `artifacts/api-server/audits/` did not exist. The writer uses `appendFileSync` and does not create missing parent directories.
- **Prior-attempt relevance:** Run 07 also reported missing request-shape blocks without identifying the cause. This is the same failure class and should have been corrected before launch; it was not.
- **Recovery plan:** create a temporary package-relative symlink to the single root audit file. This avoids restarting or disturbing the active worker, keeps the audit in the visible root `audits/` directory, and does not create a second audit copy. Verify the target and wait for a normal model call to confirm subsequent shape records append. Remove the temporary alias after terminal state.

### Event 008 — controller outputs, objective changes, and Investigator tool trace

- **Observed through:** case-event ID 23; case remains a live discovery case. The trace below records persisted structured outputs and selected search/action fields, not the separate `thought` field or hidden chain-of-thought.
- **Initial control:** event 1 assigned `groq-investigator-1` in `canonical-atlas-discovery` mode and directed a German Handelsregister search for private manufacturing firms in Baden-Württemberg, including shareholder identification. Event 2 Right-hand observation agreed with that direction (confidence `0.86`) and recommended checking beneficial owners/holding-company structures, chambers of commerce, and privacy constraints. The Investigator's first four persisted searches instead covered Pacific Northwest luxury-goods owners and Tennessee leather boutiques. This is a traceable objective divergence, not evidence of a candidate.
- **Investigator capability:** events 4–23 identify `runModel=groq-investigator-1`; no alternate Investigator was selected. The explicit role/capability fields do not show `upstream_quota_exhausted`.
- **Persisted model-selected queries and outcomes** (tool argument text as stored; no contact values were present):
  - Event 4 / turn 1 / `web_search` / success: `private boutique luxury goods owners wealthy under-the-radar Pacific Northwest`; purpose: identify people for deeper OSINT. Six observed URLs, zero findings, zero lead URLs.
  - Event 5 / turn 2 / `web_search` / success: `handcrafted leather goods boutique owner Tennessee net worth`; purpose: identify boutique owners for deeper investigation. Six observed URLs, zero findings, zero lead URLs.
  - Event 6 / turn 3 / `parallel_web_search` / success: `owner of handcrafted leather boutique Nashville TN` | `leather goods shop founder Memphis Tennessee` | `custom leather accessories business owner Knoxville TN`. Eighteen observed URLs, zero findings, zero lead URLs.
  - Event 7 / turn 4 / `web_search` / success: `owner of handcrafted leather boutique Nashville Tennessee`. Six observed URLs, zero findings, zero lead URLs.
  - Event 10 / turn 5 / `web_search` / success: `Washington state mid-market technology company founder property record`. Six observed URLs, zero findings, zero lead URLs.
  - Event 11 / turn 6 / `parallel_web_search` / success: `Washington private technology company owners property records` | `Oregon mid-market manufacturing company founder equity filing` | `Washington state corporation filing owner equity 2023 technology`. Eighteen observed URLs, zero findings, zero lead URLs.
  - Event 12 / turn 7 / `parallel_web_search` / success: `Washington private technology company owner property record filing` | `Oregon private manufacturing company founder land ownership record`. Twelve observed URLs, zero findings, zero lead URLs.
  - Event 13 / turn 8 / `visit` / blocked: purpose was to extract an owner name from King County property records; typed failure `model_action / out_of_scope_action`. No source observation or finding.
  - Event 16 / turn 9 / `web_search` / success: `Washington Secretary of State corporate filing aerospace component manufacturer`. Six observed URLs, zero findings, zero lead URLs.
  - Event 17 / turn 10 / `web_search` / blocked: `Washington state aerospace component manufacturers site:sos.wa.gov "corporate"`; typed failure `model_action / out_of_scope_action`. No source observation or finding.
  - Event 18 / turn 11: `parse_failure`; typed failure `model_action / invalid_contract`. This is invalid structured output, not an exhausted-key event.
  - Event 21 / turn 12 / `parallel_web_search` / blocked: `Washington County property assessor aerospace component manufacturer owner` | `Oregon county property assessor aerospace components owner` | `Washington Secretary of State corporate filing aerospace component manufacturer founder`; typed failure `model_action / out_of_scope_action`.
  - Event 22 / turn 13 / `web_search` / blocked: `Washington County WA property assessor aerospace component manufacturer owner`; typed failure `model_action / out_of_scope_action`.
  - Event 23 / turn 14 / `web_search` / blocked: `Washington County WA property assessor records land ownership individual owners`; typed failure `model_action / out_of_scope_action`.
- **Boss control events:** event 8 selected `pivot_discovery` at confidence `0.78`, shifting from the initial Germany direction to private mid-market technology/manufacturing in Washington and Oregon. Its exposed rationale cites earlier Cashiers, NC wealthy-resident and Nashville leather-boutique attempts as unsupported. Nashville appears in this case's own events; Cashiers does not appear in the recorded Run 08 actions through event 23, so that part is unverified context and not a finding. Event 9 persisted the objective.
- Event 14 selected a second `pivot_discovery` at confidence `0.78`, narrowing to Washington aerospace-component or renewable-energy-equipment manufacturers and public owner/contact routes. Event 15 persisted it. After event 18's parse failure, event 19 selected `continue_discovery` at confidence `0.86`; event 20 persisted a Washington/Oregon county-assessor and Washington Secretary of State filing search objective.
- **Quality signal:** despite 14 Investigator turns, observed successful searches returned 0 model findings, 0 lead URLs, and the sampled evidence table remained empty; five out-of-scope actions and one invalid-contract parse failure are now recorded. These are real blockers to evidence-backed admission, but the job is still active; do not inject a target or force the next step. No candidate contact details exist in the persisted finding/admission tables at this observation.

### Event 009 — request-shape capture restored without restarting the worker

- **Time:** first verified entry `2026-10-14T15:24:58.763Z`; latest sampled entry `2026-10-14T15:29:11.958Z`.
- **Action:** the temporary package-relative symlink resolves to the one root-level Run 08 audit. A read-only append-open test succeeded from the API package working directory. No workflow restart or job interruption was used.
- **Verification:** 20 shape-only `atlas_model_request` blocks are present in this file. Aggregate: 14 `groq_investigator`, 3 `groq_right_hand`, 3 `groq_boss`; all use `openai/gpt-oss-120b`; 14 have the Run 08 job ID and case 1, while 6 lack job/case IDs and are kept unassigned. Schemas: 12 Investigator action, 2 `json_object` retry requests, 3 Right-hand, 3 Boss control. All 20 explicitly set `include_reasoning=false`.
- **Data boundary:** blocks record request IDs, roles/models, message roles and character counts, response schemas/tool metadata, and safe scalar settings only. No prompt bodies or hidden reasoning are captured. This path fix recovers future shape telemetry; requests attempted before `15:24:58.763Z` remain unavailable as shape records and are not reconstructed.
- **Log check:** the newest provider log after the alias contains no new `append failed` line. Keep the alias until the job is terminal, then remove it.

### Event 010 — second control pivot, typed model failures, and token-window rate limit

- **Time window:** `2026-10-14T15:26:53.652Z`–`15:29:11.958Z`.
- **Boss event 24:** `pivot_discovery`, confidence `0.78`; the exposed rationale says repeated blocked actions made the current Washington/Oregon property-record route non-executable and calls for a materially different question. The direction narrowed to King County aerospace-component firms and publicly available owner/founder profiles; event 25 persisted the objective.
- **Provider event 26:** Investigator capability `groq-investigator-1`, turn 15, `provider_error`, failure domain `model_provider`, failure kind `invalid_provider_request`. This is an invalid provider request/structured-output failure, not quota exhaustion.
- **Boss event 27:** `pivot_discovery`, confidence `0.88`; it selected Washington State Secretary of State corporate filings for privately held aerospace-component companies in King County. Event 28 persisted that objective. The controller is using the policy's objective update path; it has not created a candidate.
- **Investigator events:** event 29 / turn 16 `parallel_web_search` was blocked (`model_action / out_of_scope_action`) for three King County/state-filing queries. Event 30 / turn 17 successfully searched `Washington State Secretary of State corporate filing aerospace component company King County WA` and observed six URLs, but produced 0 findings and 0 lead URLs. Event 31 / turn 18 blocked `Washington State corporation search aerospace component King County` with the same typed out-of-scope classification.
- **Provider rate limit:** workflow log at `2026-10-14T15:29:07Z` reports HTTP 429, `rate_limit_exceeded`, type `tokens`, reason `upstream_rate_limited`, 46 ms latency, and 979 requests remaining. This is a token-window limit with a roughly 20-second reset, not an exhausted-key signal. Keep `groq-investigator-1`; do not manually reassign. Check the durable retry/error outcome before interpreting it.
- **Job/ledger snapshot:** job remains running, phase 1/4, `progress=1`, `inserted=0`, `skipped=0`, `dedupCount=0`, job errors 0, log count 20. Exact counts: entities/assets/contact evidence/research evidence/research sessions/run events all 0; one discovery case and 31 case events. No evidence-backed admission or card exists.

### Event 011 — Run 08 terminated without an evidence-backed card

- **Time:** terminal state observed after the provider-capacity event at `2026-10-14T15:29:12Z`.
- **Job:** `status=failed`, `progress=3`, `atlasPhase=3/4`, `inserted=0`, `skipped=0`, `dedupCount=0`, job-level `errors=0`, `cancelRequested=false`, log count 20. The active case is case 1, `status=review`, iteration 19; case-file size 393,134 characters.
- **Terminal case event:** event 32, Investigator `provider_error`, status `error`, `failureDomain=model_provider`, `failureKind=provider_capacity_exhausted`, selected capability `groq-investigator-1`, turn 19.
- **Durable result:** entities 0, assets 0, contact evidence 0, research evidence 0, research sessions 0, run events 0. The only new rows are the discovery case and 32 case events. No candidate, admission, card, or contact record was persisted.
- **Classification not yet reconciled:** workflow telemetry separately shows a 429 with `providerErrorType=tokens`, `rate_limit_exceeded`, 979 requests remaining, followed by a retry-2 429 with the same token-window type. The latter workflow line has no job/case/role attribution, so it is not assumed to belong to this case. No `upstream_quota_exhausted` signal has been observed. The durable `provider_capacity_exhausted` label must be checked against its originating typed provider response before considering any capability reassignment.
- **Next:** do not submit another launch or manually rotate a key. Check whether the canonical case-recovery route permits this exact durable state, inspect the typed provider-error payload and retry logic, then decide whether a minimal architecture-preserving fix and authorized continuation are possible.

### Event 012 — provider-capacity failure reconciled; canonical recovery is available

- **Job result:** the terminal message is `Canonical Atlas Investigator provider remained unavailable for 2 consecutive discovery episodes; no further capacity reassignment is available, so the case is parked for review.` The structured `providerRecovery` values are `consecutiveUnavailable=2/limit 2`, `consecutiveTokenCapacityFailures=1/tokenCapacityLimit 2`, `capacityReassignmentUsed=false`, `unavailableInvestigators=[]`, and `lastProviderError=INVESTIGATOR_PROVIDER_ERROR upstream_token_window_wait_exceeded`. Discovery result: `status=unavailable`, one search and zero visits in the final episode; the result reports six cumulative discovery runs.
- **Failure classification:** case event 26 is an invalid provider request; event 32 is a token-window wait timeout. Those are two different provider-unavailable episodes, not two consecutive hard request-quota failures or two token-capacity episodes. Provider event 32's observation is exactly `INVESTIGATOR_PROVIDER_ERROR upstream_token_window_wait_exceeded`; no `upstream_quota_exhausted` was recorded.
- **Fallback decision:** the hard-quota reassignment condition did not fire. The persistent-token reassignment threshold also did not fire because only one token-capacity episode was counted (limit two). No Investigator key/capability switch occurred. This follows the architecture's distinction between key/request-quota exhaustion and token-window throttling.
- **Diagnostic discrepancy:** the job message says “no further capacity reassignment is available,” but the result says `capacityReassignmentUsed=false` and `unavailableInvestigators=[]`; the message overstates what was attempted. Record this for an accuracy fix after continuation; do not infer that no alternate credential exists. Secret values remain unread.
- **Recovery guard:** case 1 is `review` with `currentAction=canonical-investigator-provider-unavailable`, which is explicitly in the canonical `/api/research/bureau/cases/:caseId/recover-control` allowlist. The Atlas active-job pointer is clear. This route first asks Right-hand to review shared context, then lets Boss select whether/how an Investigator continues; it does not prescribe a tool or query and preserves the current case.
- **Next action:** because the user explicitly authorized continuing until a complete run, submit one empty-body canonical `recover-control` request for case 1. This is a case continuation, not a manual capability swap or duplicate Atlas launch. Record its returned job ID and monitor it; do not force a candidate or card.

### Event 013 — canonical recovery admitted

- **Action:** POST `/api/research/bureau/cases/1/recover-control` with `{}`; response `202`, `status=running`, `mode=canonical-control-recovery`, `caseId=1`, `jobId=583c11a6-e704-4588-81d9-2bb81cf7a297`.
- **Reason:** the active-job fence was clear and the exact case action matched the route's recoverable provider boundary. Recovery uses the persisted case and model-owned Right-hand/Boss/Investigator sequence; no Investigator was manually selected.
- **State:** asynchronous job started. No outcome, research finding, admission, entity, or card is assumed at admission time; polling and case-event deltas remain required.


### Model request d85dd288-23dc-412c-a768-50f4f5e5db20

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T15:24:58.763Z",
  "requestId": "d85dd288-23dc-412c-a768-50f4f5e5db20",
  "provider": "groq",
  "role": "groq_investigator",
  "model": "openai/gpt-oss-120b",
  "attempt": 1,
  "jobId": "9884c4a6-203b-43fa-a6cc-45a87e2f9a7c",
  "caseId": 1,
  "requestSummary": {
    "model": "openai/gpt-oss-120b",
    "max_completion_tokens": 1024,
    "reasoning_effort": "medium",
    "include_reasoning": false,
    "messageCount": 2,
    "messages": [
      {
        "role": "system",
        "contentKind": "text",
        "contentChars": 1472,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 5586,
        "itemCount": null
      }
    ],
    "messagesTruncated": false,
    "responseFormat": {
      "type": "json_schema",
      "schemaName": "apex_investigator_action",
      "hasSchema": true,
      "strict": true,
      "schemaPropertyCount": 19,
      "requiredFieldCount": 19,
      "additionalProperties": false
    },
    "toolCount": null,
    "tools": [],
    "toolsTruncated": false,
    "toolChoiceKind": "undefined"
  }
}
```


### Model request b513cf23-87a7-447e-a40f-fd5953ccd343

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T15:25:02.064Z",
  "requestId": "b513cf23-87a7-447e-a40f-fd5953ccd343",
  "provider": "groq",
  "role": "groq_investigator",
  "model": "openai/gpt-oss-120b",
  "attempt": 1,
  "jobId": "9884c4a6-203b-43fa-a6cc-45a87e2f9a7c",
  "caseId": 1,
  "requestSummary": {
    "model": "openai/gpt-oss-120b",
    "max_completion_tokens": 1024,
    "reasoning_effort": "medium",
    "include_reasoning": false,
    "messageCount": 2,
    "messages": [
      {
        "role": "system",
        "contentKind": "text",
        "contentChars": 1472,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 5587,
        "itemCount": null
      }
    ],
    "messagesTruncated": false,
    "responseFormat": {
      "type": "json_schema",
      "schemaName": "apex_investigator_action",
      "hasSchema": true,
      "strict": true,
      "schemaPropertyCount": 19,
      "requiredFieldCount": 19,
      "additionalProperties": false
    },
    "toolCount": null,
    "tools": [],
    "toolsTruncated": false,
    "toolChoiceKind": "undefined"
  }
}
```


### Model request 15423c13-3e9d-41c9-9d6c-6b60f3399513

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T15:25:44.205Z",
  "requestId": "15423c13-3e9d-41c9-9d6c-6b60f3399513",
  "provider": "groq",
  "role": "groq_investigator",
  "model": "openai/gpt-oss-120b",
  "attempt": 1,
  "jobId": "9884c4a6-203b-43fa-a6cc-45a87e2f9a7c",
  "caseId": 1,
  "requestSummary": {
    "model": "openai/gpt-oss-120b",
    "max_completion_tokens": 1024,
    "reasoning_effort": "medium",
    "include_reasoning": false,
    "messageCount": 2,
    "messages": [
      {
        "role": "system",
        "contentKind": "text",
        "contentChars": 1472,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 5447,
        "itemCount": null
      }
    ],
    "messagesTruncated": false,
    "responseFormat": {
      "type": "json_schema",
      "schemaName": "apex_investigator_action",
      "hasSchema": true,
      "strict": true,
      "schemaPropertyCount": 19,
      "requiredFieldCount": 19,
      "additionalProperties": false
    },
    "toolCount": null,
    "tools": [],
    "toolsTruncated": false,
    "toolChoiceKind": "undefined"
  }
}
```


### Model request 43077d1b-ff70-4747-8afd-40bb02aa4c6e

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T15:25:47.018Z",
  "requestId": "43077d1b-ff70-4747-8afd-40bb02aa4c6e",
  "provider": "groq",
  "role": "groq_investigator",
  "model": "openai/gpt-oss-120b",
  "attempt": 2,
  "jobId": "9884c4a6-203b-43fa-a6cc-45a87e2f9a7c",
  "caseId": 1,
  "requestSummary": {
    "model": "openai/gpt-oss-120b",
    "max_completion_tokens": 1024,
    "reasoning_effort": "medium",
    "include_reasoning": false,
    "messageCount": 2,
    "messages": [
      {
        "role": "system",
        "contentKind": "text",
        "contentChars": 1472,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 5447,
        "itemCount": null
      }
    ],
    "messagesTruncated": false,
    "responseFormat": {
      "type": "json_object",
      "schemaName": null,
      "hasSchema": false,
      "strict": null,
      "schemaPropertyCount": null,
      "requiredFieldCount": null,
      "additionalProperties": null
    },
    "toolCount": null,
    "tools": [],
    "toolsTruncated": false,
    "toolChoiceKind": "undefined"
  }
}
```


### Model request b6b228e7-cdf0-485b-8b57-b4d0ab2c5841

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T15:25:50.593Z",
  "requestId": "b6b228e7-cdf0-485b-8b57-b4d0ab2c5841",
  "provider": "groq",
  "role": "groq_right_hand",
  "model": "openai/gpt-oss-120b",
  "attempt": 1,
  "jobId": null,
  "caseId": null,
  "requestSummary": {
    "model": "openai/gpt-oss-120b",
    "max_completion_tokens": 768,
    "temperature": 0.1,
    "stream": false,
    "reasoning_effort": "medium",
    "include_reasoning": false,
    "messageCount": 2,
    "messages": [
      {
        "role": "system",
        "contentKind": "text",
        "contentChars": 1775,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 10590,
        "itemCount": null
      }
    ],
    "messagesTruncated": false,
    "responseFormat": {
      "type": "json_schema",
      "schemaName": "apex_atlas_right_hand",
      "hasSchema": true,
      "strict": true,
      "schemaPropertyCount": 4,
      "requiredFieldCount": 4,
      "additionalProperties": false
    },
    "toolCount": null,
    "tools": [],
    "toolsTruncated": false,
    "toolChoiceKind": "undefined"
  }
}
```


### Model request 3a4b364a-3770-4a82-8884-ffdebeea5a66

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T15:25:52.568Z",
  "requestId": "3a4b364a-3770-4a82-8884-ffdebeea5a66",
  "provider": "groq",
  "role": "groq_boss",
  "model": "openai/gpt-oss-120b",
  "attempt": 1,
  "jobId": null,
  "caseId": null,
  "requestSummary": {
    "model": "openai/gpt-oss-120b",
    "max_completion_tokens": 1536,
    "reasoning_effort": "medium",
    "include_reasoning": false,
    "temperature": 0.1,
    "stream": false,
    "messageCount": 1,
    "messages": [
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 12975,
        "itemCount": null
      }
    ],
    "messagesTruncated": false,
    "responseFormat": {
      "type": "json_schema",
      "schemaName": "apex_atlas_boss_control",
      "hasSchema": true,
      "strict": true,
      "schemaPropertyCount": 5,
      "requiredFieldCount": 5,
      "additionalProperties": false
    },
    "toolCount": null,
    "tools": [],
    "toolsTruncated": false,
    "toolChoiceKind": "undefined"
  }
}
```


### Model request b02ec053-9965-487c-8b34-bf584f551ff0

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T15:25:55.040Z",
  "requestId": "b02ec053-9965-487c-8b34-bf584f551ff0",
  "provider": "groq",
  "role": "groq_investigator",
  "model": "openai/gpt-oss-120b",
  "attempt": 1,
  "jobId": "9884c4a6-203b-43fa-a6cc-45a87e2f9a7c",
  "caseId": 1,
  "requestSummary": {
    "model": "openai/gpt-oss-120b",
    "max_completion_tokens": 1024,
    "reasoning_effort": "medium",
    "include_reasoning": false,
    "messageCount": 2,
    "messages": [
      {
        "role": "system",
        "contentKind": "text",
        "contentChars": 1472,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 5600,
        "itemCount": null
      }
    ],
    "messagesTruncated": false,
    "responseFormat": {
      "type": "json_schema",
      "schemaName": "apex_investigator_action",
      "hasSchema": true,
      "strict": true,
      "schemaPropertyCount": 19,
      "requiredFieldCount": 19,
      "additionalProperties": false
    },
    "toolCount": null,
    "tools": [],
    "toolsTruncated": false,
    "toolChoiceKind": "undefined"
  }
}
```


### Model request f4bf9ec2-0fb7-4e7a-865d-199ee13e7dfe

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T15:26:45.361Z",
  "requestId": "f4bf9ec2-0fb7-4e7a-865d-199ee13e7dfe",
  "provider": "groq",
  "role": "groq_investigator",
  "model": "openai/gpt-oss-120b",
  "attempt": 1,
  "jobId": "9884c4a6-203b-43fa-a6cc-45a87e2f9a7c",
  "caseId": 1,
  "requestSummary": {
    "model": "openai/gpt-oss-120b",
    "max_completion_tokens": 1024,
    "reasoning_effort": "medium",
    "include_reasoning": false,
    "messageCount": 2,
    "messages": [
      {
        "role": "system",
        "contentKind": "text",
        "contentChars": 1472,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 5453,
        "itemCount": null
      }
    ],
    "messagesTruncated": false,
    "responseFormat": {
      "type": "json_schema",
      "schemaName": "apex_investigator_action",
      "hasSchema": true,
      "strict": true,
      "schemaPropertyCount": 19,
      "requiredFieldCount": 19,
      "additionalProperties": false
    },
    "toolCount": null,
    "tools": [],
    "toolsTruncated": false,
    "toolChoiceKind": "undefined"
  }
}
```


### Model request 8c0b60ae-9c9b-47f6-8170-a58de049d503

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T15:26:47.686Z",
  "requestId": "8c0b60ae-9c9b-47f6-8170-a58de049d503",
  "provider": "groq",
  "role": "groq_investigator",
  "model": "openai/gpt-oss-120b",
  "attempt": 1,
  "jobId": "9884c4a6-203b-43fa-a6cc-45a87e2f9a7c",
  "caseId": 1,
  "requestSummary": {
    "model": "openai/gpt-oss-120b",
    "max_completion_tokens": 1024,
    "reasoning_effort": "medium",
    "include_reasoning": false,
    "messageCount": 2,
    "messages": [
      {
        "role": "system",
        "contentKind": "text",
        "contentChars": 1472,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 5356,
        "itemCount": null
      }
    ],
    "messagesTruncated": false,
    "responseFormat": {
      "type": "json_schema",
      "schemaName": "apex_investigator_action",
      "hasSchema": true,
      "strict": true,
      "schemaPropertyCount": 19,
      "requiredFieldCount": 19,
      "additionalProperties": false
    },
    "toolCount": null,
    "tools": [],
    "toolsTruncated": false,
    "toolChoiceKind": "undefined"
  }
}
```


### Model request ac5ff65f-d702-439d-8da1-497153ab8dbd

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T15:26:50.924Z",
  "requestId": "ac5ff65f-d702-439d-8da1-497153ab8dbd",
  "provider": "groq",
  "role": "groq_right_hand",
  "model": "openai/gpt-oss-120b",
  "attempt": 1,
  "jobId": null,
  "caseId": null,
  "requestSummary": {
    "model": "openai/gpt-oss-120b",
    "max_completion_tokens": 768,
    "temperature": 0.1,
    "stream": false,
    "reasoning_effort": "medium",
    "include_reasoning": false,
    "messageCount": 2,
    "messages": [
      {
        "role": "system",
        "contentKind": "text",
        "contentChars": 1775,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 10589,
        "itemCount": null
      }
    ],
    "messagesTruncated": false,
    "responseFormat": {
      "type": "json_schema",
      "schemaName": "apex_atlas_right_hand",
      "hasSchema": true,
      "strict": true,
      "schemaPropertyCount": 4,
      "requiredFieldCount": 4,
      "additionalProperties": false
    },
    "toolCount": null,
    "tools": [],
    "toolsTruncated": false,
    "toolChoiceKind": "undefined"
  }
}
```


### Model request aecd0ccf-5eb1-412d-a743-6a892c733ca1

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T15:26:52.475Z",
  "requestId": "aecd0ccf-5eb1-412d-a743-6a892c733ca1",
  "provider": "groq",
  "role": "groq_boss",
  "model": "openai/gpt-oss-120b",
  "attempt": 1,
  "jobId": null,
  "caseId": null,
  "requestSummary": {
    "model": "openai/gpt-oss-120b",
    "max_completion_tokens": 1536,
    "reasoning_effort": "medium",
    "include_reasoning": false,
    "temperature": 0.1,
    "stream": false,
    "messageCount": 1,
    "messages": [
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 12976,
        "itemCount": null
      }
    ],
    "messagesTruncated": false,
    "responseFormat": {
      "type": "json_schema",
      "schemaName": "apex_atlas_boss_control",
      "hasSchema": true,
      "strict": true,
      "schemaPropertyCount": 5,
      "requiredFieldCount": 5,
      "additionalProperties": false
    },
    "toolCount": null,
    "tools": [],
    "toolsTruncated": false,
    "toolChoiceKind": "undefined"
  }
}
```


### Model request d76bf567-43c7-41b7-856b-eb3a3725612b

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T15:26:54.868Z",
  "requestId": "d76bf567-43c7-41b7-856b-eb3a3725612b",
  "provider": "groq",
  "role": "groq_investigator",
  "model": "openai/gpt-oss-120b",
  "attempt": 1,
  "jobId": "9884c4a6-203b-43fa-a6cc-45a87e2f9a7c",
  "caseId": 1,
  "requestSummary": {
    "model": "openai/gpt-oss-120b",
    "max_completion_tokens": 1024,
    "reasoning_effort": "medium",
    "include_reasoning": false,
    "messageCount": 2,
    "messages": [
      {
        "role": "system",
        "contentKind": "text",
        "contentChars": 1472,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 5499,
        "itemCount": null
      }
    ],
    "messagesTruncated": false,
    "responseFormat": {
      "type": "json_schema",
      "schemaName": "apex_investigator_action",
      "hasSchema": true,
      "strict": true,
      "schemaPropertyCount": 19,
      "requiredFieldCount": 19,
      "additionalProperties": false
    },
    "toolCount": null,
    "tools": [],
    "toolsTruncated": false,
    "toolChoiceKind": "undefined"
  }
}
```


### Model request c482b7f7-6ada-496d-81bc-d63f3e20ceff

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T15:27:41.734Z",
  "requestId": "c482b7f7-6ada-496d-81bc-d63f3e20ceff",
  "provider": "groq",
  "role": "groq_investigator",
  "model": "openai/gpt-oss-120b",
  "attempt": 2,
  "jobId": "9884c4a6-203b-43fa-a6cc-45a87e2f9a7c",
  "caseId": 1,
  "requestSummary": {
    "model": "openai/gpt-oss-120b",
    "max_completion_tokens": 1024,
    "reasoning_effort": "medium",
    "include_reasoning": false,
    "messageCount": 2,
    "messages": [
      {
        "role": "system",
        "contentKind": "text",
        "contentChars": 1472,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 5499,
        "itemCount": null
      }
    ],
    "messagesTruncated": false,
    "responseFormat": {
      "type": "json_object",
      "schemaName": null,
      "hasSchema": false,
      "strict": null,
      "schemaPropertyCount": null,
      "requiredFieldCount": null,
      "additionalProperties": null
    },
    "toolCount": null,
    "tools": [],
    "toolsTruncated": false,
    "toolChoiceKind": "undefined"
  }
}
```


### Model request df955545-974f-401c-af68-c43dffa75d22

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T15:27:45.919Z",
  "requestId": "df955545-974f-401c-af68-c43dffa75d22",
  "provider": "groq",
  "role": "groq_right_hand",
  "model": "openai/gpt-oss-120b",
  "attempt": 1,
  "jobId": null,
  "caseId": null,
  "requestSummary": {
    "model": "openai/gpt-oss-120b",
    "max_completion_tokens": 768,
    "temperature": 0.1,
    "stream": false,
    "reasoning_effort": "medium",
    "include_reasoning": false,
    "messageCount": 2,
    "messages": [
      {
        "role": "system",
        "contentKind": "text",
        "contentChars": 1775,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 10588,
        "itemCount": null
      }
    ],
    "messagesTruncated": false,
    "responseFormat": {
      "type": "json_schema",
      "schemaName": "apex_atlas_right_hand",
      "hasSchema": true,
      "strict": true,
      "schemaPropertyCount": 4,
      "requiredFieldCount": 4,
      "additionalProperties": false
    },
    "toolCount": null,
    "tools": [],
    "toolsTruncated": false,
    "toolChoiceKind": "undefined"
  }
}
```


### Model request 5492d157-0bfd-4f29-9ef4-3680dfe8bf08

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T15:27:47.601Z",
  "requestId": "5492d157-0bfd-4f29-9ef4-3680dfe8bf08",
  "provider": "groq",
  "role": "groq_boss",
  "model": "openai/gpt-oss-120b",
  "attempt": 1,
  "jobId": null,
  "caseId": null,
  "requestSummary": {
    "model": "openai/gpt-oss-120b",
    "max_completion_tokens": 1536,
    "reasoning_effort": "medium",
    "include_reasoning": false,
    "temperature": 0.1,
    "stream": false,
    "messageCount": 1,
    "messages": [
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 12976,
        "itemCount": null
      }
    ],
    "messagesTruncated": false,
    "responseFormat": {
      "type": "json_schema",
      "schemaName": "apex_atlas_boss_control",
      "hasSchema": true,
      "strict": true,
      "schemaPropertyCount": 5,
      "requiredFieldCount": 5,
      "additionalProperties": false
    },
    "toolCount": null,
    "tools": [],
    "toolsTruncated": false,
    "toolChoiceKind": "undefined"
  }
}
```


### Model request d0d470c7-1a52-4036-9e7d-7961c7105d5d

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T15:27:50.018Z",
  "requestId": "d0d470c7-1a52-4036-9e7d-7961c7105d5d",
  "provider": "groq",
  "role": "groq_investigator",
  "model": "openai/gpt-oss-120b",
  "attempt": 1,
  "jobId": "9884c4a6-203b-43fa-a6cc-45a87e2f9a7c",
  "caseId": 1,
  "requestSummary": {
    "model": "openai/gpt-oss-120b",
    "max_completion_tokens": 1024,
    "reasoning_effort": "medium",
    "include_reasoning": false,
    "messageCount": 2,
    "messages": [
      {
        "role": "system",
        "contentKind": "text",
        "contentChars": 1472,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 5600,
        "itemCount": null
      }
    ],
    "messagesTruncated": false,
    "responseFormat": {
      "type": "json_schema",
      "schemaName": "apex_investigator_action",
      "hasSchema": true,
      "strict": true,
      "schemaPropertyCount": 19,
      "requiredFieldCount": 19,
      "additionalProperties": false
    },
    "toolCount": null,
    "tools": [],
    "toolsTruncated": false,
    "toolChoiceKind": "undefined"
  }
}
```


### Model request 990dce78-2430-4a1c-a733-6fb2054fc16d

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T15:27:52.482Z",
  "requestId": "990dce78-2430-4a1c-a733-6fb2054fc16d",
  "provider": "groq",
  "role": "groq_investigator",
  "model": "openai/gpt-oss-120b",
  "attempt": 1,
  "jobId": "9884c4a6-203b-43fa-a6cc-45a87e2f9a7c",
  "caseId": 1,
  "requestSummary": {
    "model": "openai/gpt-oss-120b",
    "max_completion_tokens": 1024,
    "reasoning_effort": "medium",
    "include_reasoning": false,
    "messageCount": 2,
    "messages": [
      {
        "role": "system",
        "contentKind": "text",
        "contentChars": 1472,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 5529,
        "itemCount": null
      }
    ],
    "messagesTruncated": false,
    "responseFormat": {
      "type": "json_schema",
      "schemaName": "apex_investigator_action",
      "hasSchema": true,
      "strict": true,
      "schemaPropertyCount": 19,
      "requiredFieldCount": 19,
      "additionalProperties": false
    },
    "toolCount": null,
    "tools": [],
    "toolsTruncated": false,
    "toolChoiceKind": "undefined"
  }
}
```


### Model request 495a9cc9-41ee-47ea-83ad-9e6ef0c52dcf

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T15:28:48.511Z",
  "requestId": "495a9cc9-41ee-47ea-83ad-9e6ef0c52dcf",
  "provider": "groq",
  "role": "groq_investigator",
  "model": "openai/gpt-oss-120b",
  "attempt": 1,
  "jobId": "9884c4a6-203b-43fa-a6cc-45a87e2f9a7c",
  "caseId": 1,
  "requestSummary": {
    "model": "openai/gpt-oss-120b",
    "max_completion_tokens": 1024,
    "reasoning_effort": "medium",
    "include_reasoning": false,
    "messageCount": 2,
    "messages": [
      {
        "role": "system",
        "contentKind": "text",
        "contentChars": 1472,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 5544,
        "itemCount": null
      }
    ],
    "messagesTruncated": false,
    "responseFormat": {
      "type": "json_schema",
      "schemaName": "apex_investigator_action",
      "hasSchema": true,
      "strict": true,
      "schemaPropertyCount": 19,
      "requiredFieldCount": 19,
      "additionalProperties": false
    },
    "toolCount": null,
    "tools": [],
    "toolsTruncated": false,
    "toolChoiceKind": "undefined"
  }
}
```


### Model request c2827029-aa09-4579-9754-6549e8f588ac

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T15:28:51.570Z",
  "requestId": "c2827029-aa09-4579-9754-6549e8f588ac",
  "provider": "groq",
  "role": "groq_investigator",
  "model": "openai/gpt-oss-120b",
  "attempt": 1,
  "jobId": "9884c4a6-203b-43fa-a6cc-45a87e2f9a7c",
  "caseId": 1,
  "requestSummary": {
    "model": "openai/gpt-oss-120b",
    "max_completion_tokens": 1024,
    "reasoning_effort": "medium",
    "include_reasoning": false,
    "messageCount": 2,
    "messages": [
      {
        "role": "system",
        "contentKind": "text",
        "contentChars": 1472,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 5436,
        "itemCount": null
      }
    ],
    "messagesTruncated": false,
    "responseFormat": {
      "type": "json_schema",
      "schemaName": "apex_investigator_action",
      "hasSchema": true,
      "strict": true,
      "schemaPropertyCount": 19,
      "requiredFieldCount": 19,
      "additionalProperties": false
    },
    "toolCount": null,
    "tools": [],
    "toolsTruncated": false,
    "toolChoiceKind": "undefined"
  }
}
```


### Model request ce8d8cec-21c4-4afc-a95e-237715bfcfdf

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T15:29:11.958Z",
  "requestId": "ce8d8cec-21c4-4afc-a95e-237715bfcfdf",
  "provider": "groq",
  "role": "groq_investigator",
  "model": "openai/gpt-oss-120b",
  "attempt": 2,
  "jobId": "9884c4a6-203b-43fa-a6cc-45a87e2f9a7c",
  "caseId": 1,
  "requestSummary": {
    "model": "openai/gpt-oss-120b",
    "max_completion_tokens": 1024,
    "reasoning_effort": "medium",
    "include_reasoning": false,
    "messageCount": 2,
    "messages": [
      {
        "role": "system",
        "contentKind": "text",
        "contentChars": 1472,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 5436,
        "itemCount": null
      }
    ],
    "messagesTruncated": false,
    "responseFormat": {
      "type": "json_schema",
      "schemaName": "apex_investigator_action",
      "hasSchema": true,
      "strict": true,
      "schemaPropertyCount": 19,
      "requiredFieldCount": 19,
      "additionalProperties": false
    },
    "toolCount": null,
    "tools": [],
    "toolsTruncated": false,
    "toolChoiceKind": "undefined"
  }
}
```


### Model request 0ebe0d44-b7f6-458e-8921-ced5217fbf30

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T15:35:07.192Z",
  "requestId": "0ebe0d44-b7f6-458e-8921-ced5217fbf30",
  "provider": "groq",
  "role": "groq_right_hand",
  "model": "openai/gpt-oss-120b",
  "attempt": 1,
  "jobId": null,
  "caseId": null,
  "requestSummary": {
    "model": "openai/gpt-oss-120b",
    "max_completion_tokens": 768,
    "temperature": 0.1,
    "stream": false,
    "reasoning_effort": "medium",
    "include_reasoning": false,
    "messageCount": 2,
    "messages": [
      {
        "role": "system",
        "contentKind": "text",
        "contentChars": 1753,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 17947,
        "itemCount": null
      }
    ],
    "messagesTruncated": false,
    "responseFormat": {
      "type": "json_object",
      "schemaName": null,
      "hasSchema": false,
      "strict": null,
      "schemaPropertyCount": null,
      "requiredFieldCount": null,
      "additionalProperties": null
    },
    "toolCount": null,
    "tools": [],
    "toolsTruncated": false,
    "toolChoiceKind": "undefined"
  }
}
```


## Post-run forensic review and repair — Run 08

### Confirmed cause of zero cards

Run 08's canonical Atlas job `9884c4a6-203b-43fa-a6cc-45a87e2f9a7c` ended `failed` at phase 3/4 with `inserted=0`, `skipped=0`, `dedupCount=0`. The durable case had one discovery case and 32 case events, but zero entities, assets, contact-evidence rows, research-evidence rows, research sessions, and research-run-event rows. This is not an observed card persistence failure after admission: no candidate was admitted, and no card-eligible evidence was written.

The recorded Investigator trace is the proximate reason: the early searches were not aligned with the opening Germany/registry direction; later Boss pivots and several scope blocks consumed turns; the final pivot had one successful in-scope Washington State corporate-filings search with six URLs but zero findings and no fetched-page visits before the provider error. Without successful claim-grade page observations, the Investigator cannot legitimately emit an admitted candidate or truthful card. The evidence/terminal admission thresholds are not lowered.

### Two runtime defects that prolonged the no-card failure

1. The scope guard treated `Washington State corporation search aerospace component King County` as out of scope even though the accepted question asked for Washington State corporate filings. The source-class synonym table supported `filing`, `registry`, `register`, and `database`, but not `corporate`/`corporation`. The fix adds those explicit source-class equivalents while retaining the required subject, geography, exclusions, and provenance checks; a regression test verifies this query is accepted and an unrelated county-property query remains blocked.

2. The provider-unavailable circuit breaker counted an episode as unavailable solely because its terminal status was `unavailable/LLM_UNAVAILABLE` and it contained a provider-error record, even if the same episode had already executed a successful research action. Run 08's last productive episode included an in-scope successful search before the `upstream_token_window_wait_exceeded` provider error. The old breaker could treat productive work plus a transient error like a wholly unavailable episode, then park after two such episodes. The fix resets the generic unavailable streak for an episode containing a successful external research action; the token-window failure streak remains separate and consecutive, so existing bounded Boss-authorized capacity recovery rules are unchanged.

The final job message also claimed `no further capacity reassignment is available` even when `capacityReassignmentUsed=false` and the token-window streak was only `1/2`. The message now distinguishes an attempted-but-unsuccessful reassignment from a reassignment that the typed provider state did not yet authorize.

### Validation and limitation

Added regression coverage for corporation-search scope alignment and for productive episodes that end with a provider error. CI validation is pending for this repair commit. This is a runtime liveness improvement, not a guarantee a model will discover a card: Run 08 had no completed page fetch, no `done(findings)`, and no admitted person, so manufacturing a card or weakening identity/provenance rules would be incorrect.


### Event 014 — CI-driven type correction

The first test/build workflows were launched for `e52e00ebba37742479df3722ee0616229bead9a2`. During final source review, the provider episode input type was found not to declare the `execution` field now inspected by the productive-episode breaker. The follow-up adds that optional typed field to the narrow trajectory-record contract. No runtime decision semantics change beyond the already documented repair. Verification follows on the resulting main head.

### Event 015 — scope-parser regression corrected

The first focused test for the new `corporation search` source alias failed because `pivotScopeAnchors` also treated `Secretary`, `corporate`, and the phrase `privately held` as substantive industry anchors. The query was rejected even after the `filing` source-class synonym was added. The follow-up normalizes `privately` to `private` (already a non-subject generic modifier) and excludes legal/source modifiers `corporate`, `corporation`, `secretary`, and `held` from the subject-anchor set. The explicit `filing` requirement remains enforced via the source-class alias, while sector and geographic anchors remain required. The negative test still rejects the unrelated Washington County property-assessor query. CI is being retriggered on the current main head.

### Event 016 — root cause of the remaining pivot-alignment test failure

The follow-up CI run still rejected the corporate-search query. The remaining cause is in geography tokenization: `pivotScopeGeographyOptions` parses the last clause `in King County.` with a token regex that permits periods in place names and preserves the terminal period as part of `County.`. The query-side tokenizer normalizes this to `county`, so valid `King County` queries compare unequal and are blocked before any outbound request. `pivotGeographicAlternatives` now strips trailing sentence punctuation from each extracted place-name token before normalization. Sector/source/geographic matching remains required; this is a normalization fix, not a scope bypass. The existing regression test covers acceptance of the aligned corporation-search query and rejection of the unrelated property-assessor query.