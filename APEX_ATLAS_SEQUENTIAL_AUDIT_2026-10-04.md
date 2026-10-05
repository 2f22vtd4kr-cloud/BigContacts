# ⭐ APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-04.md

## Run record

- Audit started: 2026-10-04 14:22:11 UTC (17:22:11 Europe/Kyiv)
- Project: BigContacts import; app UI title: Apex Atlas
- Repository: `main` at `3842417f4d81eeb87a9287db4462661714d5a687`
- Scope: trace one canonical UI-equivalent Apex Atlas launch from request acceptance through discovery, target research, review, and persisted cards; stop and record the first material break rather than silently retrying.
- Logging rule: record timestamped actions, IDs, counts, status transitions, relevant raw search text/results, public evidence URLs, and observed professional contact details with their source and verification state. Never record credentials, API keys, authorization headers, session tokens, or unrelated personal information.
- Launch state at audit creation: **not started**. No research provider call has been made for this run.

## Setup history and issues

1. The public repository was imported into a fresh project. The source tree was preserved; the local Git metadata was aligned to the repository's `main` commit without pushing.
2. `pnpm install --frozen-lockfile` completed successfully.
3. The fresh development database had no public tables. The repository's explicit `APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh` operation created the schema and verified the required durable tables. Normal boot keeps schema mutation disabled.
4. The imported preflight script expected stale Gemini/Mistral and retired API-auth variables. It was updated to the active 13 provider-secret names and passed presence-only checks. No secret values were read.
5. A temporary generic workflow collided with the existing API workflow; the first root request returned 404. The duplicate workflow was removed, the optional mockup workflow stopped, and the canonical API workflow restarted. The imported UI then rendered; `/` and `/api/healthz` returned 200, Redis reported `ok`.
6. The normal setup/build made no live research calls and launched no Atlas job.

## Prior-run guardrails considered

- A discovery summary or contact fact is not proof of admission. Compare the pre/post durable entity ledger and validate only fresh persisted admissions with qualifying source evidence.
- Configured keys are not proof of live provider capacity. On quota/cooldown or control-plane failure, record the first failure and do not repeatedly relaunch.
- Treat HTTP 413 as a request/context-size boundary, not a quota error; preserve the failure and do not replay unchanged work.
- For any final card/review claim, compare the persisted approved values, source scope, evidence, and card. Reviewer prose or a terminal status alone is not approval.
- Current repository guidance uses role-scoped Groq control and Investigator credentials; do not fall back to historical Gemini/Mistral instructions.

## Sequential event log

### E000 — Audit opened

- Time: 2026-10-04 14:22:11 UTC
- State: application healthy; canonical API workflow running; Atlas launch not yet requested.
- Next: verify the button's exact request body and canonical endpoint; capture durable pre-run baseline; then issue one launch.

### E001 — UI launch path verified

- Time: 2026-10-04 14:22 UTC
- The visible button first performs an advisory `GET /api/healthz`; its launch helper performs a second `GET /api/healthz`, then posts to `POST /api/ingest/atlas-run`.
- Default UI request: `targetCount=3`, `researchDepth=standard`, `targetTimeoutMs=420000`; no single-target override. This is a real discovery-first run, not mock mode.
- The canonical API route claims the durable Atlas lock, creates one job, and runs the canonical discovery/research pipeline. The old route is quarantined; the boot integrity checks confirmed the canonical route is mounted ahead of that quarantine.
- No launch request has been sent. Next: capture pre-run active-job and durable-ledger baselines.

### E002 — Pre-run baseline captured

- Time: 2026-10-04 14:23:34 UTC (17:23:34 Europe/Kyiv)
- Active Atlas job endpoint: HTTP 200; `active=false`; no job ID.
- Development database row counts before launch: `entities=0`, `research_cases=0`, `research_case_events=0`, `research_sessions=0`, `research_run_events=0`, `research_evidence=0`, `contact_evidence=0`.
- Readiness snapshot: `/api/healthz/details` HTTP 200; Redis `ok`; coarse integrity `ok`; three active web-search providers; two configured Groq Investigator slots; Groq Right-hand configured; automatic pipeline `false`.
- `agenticLlmLastOk=null` and no last model were reported, so live model capacity is unknown. Configured-key/readiness counts do not prove provider quota. The health snapshot did not make a research-provider request.
- Source note: the lane snapshot still uses a legacy `geminiRightHand` field/comment internally, but its current count comes from `getGroqRightHandStatus()` and its reason text identifies Groq Right-hand. This is naming drift, not a reason to call a historical Gemini route.
- Decision: proceed with one default UI-equivalent launch only; if provider quota, control, or persistence fails, record the failure and do not relaunch unchanged work.

### E003 — Immediate pre-launch guard

- Time: 2026-10-04 14:24:14 UTC (17:24:14 Europe/Kyiv)
- Re-read the UI's active-job endpoint immediately before launch: HTTP 200, `active=false`, no job ID.
- No other operator's job will be stopped or superseded.
- Next action: reproduce the button's two advisory health reads, then send exactly one canonical launch POST with the UI defaults.

### E004 — Canonical launch accepted

- Time: 2026-10-04 14:24:37 UTC (17:24:37 Europe/Kyiv)
- UI-equivalent advisory health reads: two `GET /api/healthz` requests; both HTTP 200, status `ok`, Redis `ok`, configured-key bit `true`.
- Sent one `POST /api/ingest/atlas-run`; HTTP 202.
- Job ID: `efcdee2d-a6c7-491a-8643-532f5131aa99`.
- Accepted options: target count 3, standard depth, target timeout 420000 ms, no single-target ID.
- Server response: canonical model-owned discovery started. No duplicate request or retry was sent.
- Next: poll this job and append stage transitions; compare every durable admission against E002's zero-row baseline.

### E005 — Discovery control and initial web-search actions

- Time observed: 2026-10-04 14:26:33 UTC (17:26:33 Europe/Kyiv)
- Job remains `running`, phase 1 of 4, progress 1/4; active-job projection still points to this job. No terminal failure or completion yet.
- Durable state: one active discovery case (`case_id=1`, provider `groq`, current action `canonical-investigator-discovery`); 12 case events:
  - Groq Boss assignment: 1 recorded.
  - Right-hand observation: 1 recorded.
  - Head Investigator assignment: 1 recorded.
  - Head Investigator tool observations: 9 successful (4 `parallel_web_search`, 5 `web_search`).
  - Groq Boss control decisions: 1 completed.
- Fresh admission/card check remains zero: `entities=0`, `research_evidence=0`, `research_sessions=0`, `contact_evidence=0`. Search results alone are not admission proof; there are not yet any persisted source-backed candidate cards.
- Provider attempt logs from the first two complete workflow-log batches: 32 Groq attempts — 8 HTTP 200, 18 HTTP 429 (`upstream_rate_limited`), and 6 HTTP 400 (`provider_rejected`). Later tail entries show more mixed 200/429/400 attempts; no 413 observed. Prompt size was 12000 characters in the logged calls.
- Interpretation: same-job bounded fallbacks are still producing successful Investigator/control turns and successful web searches, so this is not yet the terminal break. Do not create another job. Continue monitoring for direct page visits, candidate admissions, target research, or a terminal error.

### E006 — Discovery stopped at the control decision

- Terminal time: 2026-10-04 14:26:52.122 UTC (17:26:52 Europe/Kyiv).
- The last durable case event before termination was at 14:26:51.814 UTC: Groq Boss `control_decision`, status `unavailable`, disposition `stop`.
- Job `efcdee2d-a6c7-491a-8643-532f5131aa99` transitioned to `failed`, progress 3/4. This is the break point; no second launch will be sent.
- Discovery emitted 12 successful search/registry tool observations: 5 `parallel_web_search`, 6 `web_search`, 1 `registry_search`, with 185 observed result URLs in aggregate. There were no direct `visit`/`browser_fetch` source observations.
- Durable post-run state at the terminal poll: 1 discovery case, 17 case events, 0 entities, 0 research sessions, 0 research evidence rows, and 0 contact evidence rows. Therefore no candidate card was admitted, no target-scoped research ran, and no contact card was created.
- Provider logs showed repeated Groq HTTP 429 `upstream_rate_limited` responses and HTTP 400 `provider_rejected` responses, interspersed with successful 200 responses. The run did not reach the research/card stages.
- Next: capture the sanitized terminal job diagnostic and verify the active-job lock was released; then close the audit without retrying.

### E007 — Terminal reconciliation and audit closed

- Closed: 2026-10-04 14:30:00 UTC (17:30:00 Europe/Kyiv).
- Run duration: 2m 14.812s (job start `14:24:37.310Z`; terminal `14:26:52.122Z`).
- Terminal job: `failed`, outcome `incomplete`, progress 3/4. Discovery result: `status=error`, `caseId=1`, `searches=19`, `visits=0`, `findings=0`, `runs=2`.
- Control path: opening Groq Boss assignment completed with `openai/gpt-oss-20b` and selected Groq Investigator; initial Right-hand review completed with `openai/gpt-oss-120b`. At terminal case counter 14, the second control event returned `status=unavailable`, `action=stop`. This was a fail-closed wrapper result, not a Boss-generated stop: the mandatory Right-hand call returned HTTP 400 `json_validate_failed` on `openai/gpt-oss-20b` (`invalid_request`). Earlier 429 attempts occurred, but they were not the terminal diagnostic. Raw response details are omitted.
- Final complete workflow log file: `/tmp/logs/artifactsapi-server_API_Server_20261004_142717_959_c4b32ebd.log`. It contains 36 Groq attempt records: 4 HTTP 200, 25 HTTP 429 `upstream_rate_limited`, 7 HTTP 400 `provider_rejected`; all logged prompts were 12000 characters. No HTTP 413 was observed.
- Correction to E005: its 32-attempt/8-200/18-429/6-400 estimate came from overlapping partial log views. The complete log above is authoritative: 36 total, 4/25/7.
- Final database state: discovery case 1 is in `review` with `current_action=canonical-control-unavailable`, iteration 14; 17 case events; `entities=0`, `research_sessions=0`, `research_evidence=0`, `contact_evidence=0`, `research_run_events=0`.
- Search reconciliation: the job's 19 searches are underlying web queries: 13 queries across 5 `parallel_web_search` actions plus 6 single `web_search` actions. The 12 tool-observation events also include 1 registry search, which is an action but not a web query. The 185 result URLs are search-result URLs; no direct source-page visit occurred.
- The active-job projection is now `active=false` with no job ID, confirming the lock was released. API workflow remains healthy. No retry, relaunch, manual stop, or data cleanup was performed.
- **Final outcome:** the audit stopped at the first terminal control-plane break. Discovery searches ran, but no candidate met the direct-source admission boundary, so target research and card creation did not occur.

### E008 — Detailed read-only trace appended

- Recorded: 2026-10-04 14:31:07 UTC. This appendix was reconstructed from the saved workflow log and durable development database; it made no new provider calls and changed no run state.
- The provider log had no per-attempt timestamps, so rows below retain its emitted line order. All 36 prompts were 12000 characters.

#### Groq provider attempts

| # | Model | HTTP | Outcome | Retry index | Latency ms |
|---:|---|---:|---|---:|---:|
| 01 | `openai/gpt-oss-20b` | 429 | `upstream_rate_limited` | 4 | 327 |
| 02 | `openai/gpt-oss-120b` | 429 | `upstream_rate_limited` | 5 | 98 |
| 03 | `openai/gpt-oss-120b` | 429 | `upstream_rate_limited` | 6 | 809 |
| 04 | `qwen/qwen3.8-27b` | 200 | success | 7 | 1514 |
| 05 | `qwen/qwen3.8-27b` | 429 | `upstream_rate_limited` | 1 | 85 |
| 06 | `qwen/qwen3.8-27b` | 429 | `upstream_rate_limited` | 2 | 141 |
| 07 | `openai/gpt-oss-20b` | 429 | `upstream_rate_limited` | 3 | 194 |
| 08 | `openai/gpt-oss-20b` | 400 | `provider_rejected` | 4 | 1071 |
| 09 | `openai/gpt-oss-120b` | 429 | `upstream_rate_limited` | 5 | 108 |
| 10 | `openai/gpt-oss-120b` | 429 | `upstream_rate_limited` | 6 | 339 |
| 11 | `qwen/qwen3.8-27b` | 429 | `upstream_rate_limited` | 7 | 82 |
| 12 | `qwen/qwen3.8-27b` | 429 | `upstream_rate_limited` | 8 | 133 |
| 13 | `openai/gpt-oss-20b` | 400 | `provider_rejected` | 9 | 1307 |
| 14 | `openai/gpt-oss-120b` | 400 | `provider_rejected` | 10 | 1241 |
| 15 | `openai/gpt-oss-120b` | 200 | success | 1 | 2308 |
| 16 | `openai/gpt-oss-120b` | 429 | `upstream_rate_limited` | 1 | 103 |
| 17 | `openai/gpt-oss-120b` | 429 | `upstream_rate_limited` | 2 | 94 |
| 18 | `qwen/qwen3.8-27b` | 429 | `upstream_rate_limited` | 3 | 242 |
| 19 | `qwen/qwen3.8-27b` | 200 | success | 4 | 3595 |
| 20 | `qwen/qwen3.8-27b` | 429 | `upstream_rate_limited` | 1 | 115 |
| 21 | `qwen/qwen3.8-27b` | 429 | `upstream_rate_limited` | 2 | 182 |
| 22 | `openai/gpt-oss-20b` | 429 | `upstream_rate_limited` | 3 | 151 |
| 23 | `openai/gpt-oss-20b` | 400 | `provider_rejected` | 4 | 694 |
| 24 | `openai/gpt-oss-120b` | 429 | `upstream_rate_limited` | 5 | 194 |
| 25 | `openai/gpt-oss-120b` | 429 | `upstream_rate_limited` | 6 | 128 |
| 26 | `qwen/qwen3.8-27b` | 429 | `upstream_rate_limited` | 7 | 66 |
| 27 | `qwen/qwen3.8-27b` | 200 | success | 8 | 1531 |
| 28 | `qwen/qwen3.8-27b` | 429 | `upstream_rate_limited` | 1 | 66 |
| 29 | `qwen/qwen3.8-27b` | 429 | `upstream_rate_limited` | 2 | 117 |
| 30 | `openai/gpt-oss-20b` | 429 | `upstream_rate_limited` | 3 | 193 |
| 31 | `openai/gpt-oss-20b` | 429 | `upstream_rate_limited` | 4 | 63 |
| 32 | `openai/gpt-oss-120b` | 400 | `provider_rejected` | 5 | 1043 |
| 33 | `qwen/qwen3.8-27b` | 429 | `upstream_rate_limited` | 6 | 72 |
| 34 | `qwen/qwen3.8-27b` | 429 | `upstream_rate_limited` | 7 | 66 |
| 35 | `openai/gpt-oss-20b` | 400 | `provider_rejected` | 8 | 730 |
| 36 | `openai/gpt-oss-120b` | 400 | `provider_rejected` | 9 | 860 |

#### Durable discovery case-event trace

| Event | Investigator iteration | UTC | Role | Event/status | Action or disposition | Result URLs |
|---:|---:|---|---|---|---|---:|
| 1 | 0 | 14:24:40.727 | Groq Boss | assignment / recorded | — | 0 |
| 2 | 0 | 14:24:42.274 | Right-hand | observation / recorded | — | 0 |
| 3 | 0 | 14:24:42.519 | Head Investigator | assignment / recorded | — | 0 |
| 4 | 1 | 14:26:05.601 | Head Investigator | tool observation / success | `parallel_web_search` | 28 |
| 5 | 2 | 14:26:05.601 | Head Investigator | tool observation / success | `web_search` | 10 |
| 6 | 3 | 14:26:05.601 | Head Investigator | tool observation / success | `parallel_web_search` | 20 |
| 7 | 4 | 14:26:05.601 | Head Investigator | tool observation / success | `web_search` | 10 |
| 8 | 5 | 14:26:05.601 | Head Investigator | tool observation / success | `parallel_web_search` | 30 |
| 9 | 6 | 14:26:05.601 | Head Investigator | tool observation / success | `parallel_web_search` | 27 |
| 10 | 7 | 14:26:05.601 | Head Investigator | tool observation / success | `web_search` | 10 |
| 11 | 8 | 14:26:05.601 | Head Investigator | tool observation / success | `web_search` | 10 |
| 12 | 9 | 14:26:05.601 | Head Investigator | tool observation / success | `web_search` | 10 |
| 13 | 1 | 14:26:08.581 | Groq Boss | control decision / completed | `continue_discovery` | 0 |
| 14 | 11 | 14:26:48.357 | Head Investigator | tool observation / success | `registry_search` | 0 |
| 15 | 12 | 14:26:48.357 | Head Investigator | tool observation / success | `parallel_web_search` | 20 |
| 16 | 13 | 14:26:48.357 | Head Investigator | tool observation / success | `web_search` | 10 |
| 17 | 2 | 14:26:51.815 | Groq Boss control wrapper | control decision / unavailable | fail-closed `stop` after Right-hand HTTP 400 `json_validate_failed` | 0 |

- Case-event timestamps are batched: multiple tool observations share one `created_at`; their event IDs and investigator iteration numbers preserve the recorded order.
- Trace coverage note: the persisted Investigator tool-observation sequence contains iterations 1–9 and 11–13; there is no corresponding event at iteration 10. The case's terminal counter is 14, but no Investigator tool observation at 14 is present. This is left as an observed trace gap, not filled by inference.
- Correction to E007 wording: “after 14 Investigator iterations” refers to the terminal case iteration counter, not 14 persisted Investigator actions. The durable trace contains 12 successful tool-observation events.

### E009 — Terminal diagnosis corrected; recovery opened

- Recorded: 2026-10-04 14:34:25 UTC. No provider call or new Atlas job was made during diagnosis.
- Correction to E007/E008: the prior `rate-limited` classification was incorrect; the classifier matched the text `rateLimitHeaders` inside a structured diagnostic. The actual terminal error is Right-hand HTTP 400 `json_validate_failed`, classified as `invalid_request`, on `openai/gpt-oss-20b`. The control wrapper recorded an unavailable fail-closed stop, so Groq Boss did not emit a decision on that turn.
- The 429 responses remain part of the 36-attempt history, but the final control failure was the structured-output HTTP 400. The active-job lock remains released.
- Recovery plan: add a bounded same-role compatibility fallback for this Right-hand structured-output rejection, keep local JSON/schema validation authoritative, and persist explicit Investigator provider-failure turns so a failed turn cannot disappear from the durable case-event sequence. Run regression checks before another launch.

### E010 — Search and missing-turn reconciliation

- Recorded: 2026-10-04 14:35 UTC. Read-only source and event checks only; no provider call or job launch.
- Search-count correction: event arguments reconcile exactly to 19 underlying web queries: parallel batches of 3, 2, 3, 3, and 2, plus six single searches. The remaining tool event is one registry search.
- Iteration-10 gap diagnosis: `llmStep` returned no Investigator response on local turn 10. The core returned `iterations=10` without appending a trajectory record for that turn; durable persistence advanced the case counter to 10, and the next run offset its first action to iteration 11. The earlier gap is explained by this failure path, not a missing tool call.
- Recovery status: the source edits are not yet applied. Next edits will retry `json_validate_failed` once with JSON-object mode under the same role and keep local contract validation, persist a `provider_error` turn on unavailable Investigator responses, and teach event replay to recognize that event type.
### E011 — Right-hand compatibility fix and Investigator failure durability applied

- Recorded: 2026-10-04 14:42 UTC. No Atlas launch and no external research-provider call was made during this code fix.
- The Right-hand compatibility path is now present in `groq-right-hand-reasoning.ts`: a Groq HTTP 400 `json_validate_failed` on a strict JSON-schema request is retried once in JSON-object mode under the same Right-hand role/model. The returned JSON remains subject to the existing local Atlas control-contract validator; provider output is never admitted directly.
- Regression coverage in `groq-right-hand.test.ts` verifies the sequence `json_schema -> json_object` and requires successful local parsing of the fallback response.
- The Investigator failure path was also hardened: an unavailable Groq Investigator turn now produces a trajectory record with `action=investigator_provider_error`, a sanitized `INVESTIGATOR_PROVIDER_ERROR ...` observation, and is persisted by `bureau-agentic-pass.ts` as `research_case_events.eventType=provider_error` before the fail-closed `LLM_UNAVAILABLE` terminal result. This removes the prior silent iteration gap.
- `research-case-replay.ts` accepts `provider_error` as a valid event type and counts it as a failure/action, with regression coverage.
- Changes were applied directly to `main` after the Replit Agent daily free quota was exhausted; no credential values were read or changed.
- Next step remains verification only: CI/static/type/test checks. Do not launch another live Atlas run until separately authorized.

## Run 2 — user-authorized continuation

### E012 — Explicit launch authorization and prior-run handoff

- Opened: 2026-10-04 18:38:28 UTC (21:38:28 Europe/Kyiv).
- The user explicitly authorized one UI-equivalent **Launch Apex Atlas** run and requested a sequential audit from discovery through research and persisted cards, fixing issues and continuing until one full run completes as designed.
- This authorization supersedes E011's "do not launch until separately authorized" stop condition. It authorizes live research-provider calls for this run; it does not authorize fabricated data, bypassing admission rules, or blindly repeating a failed request.
- Prior-run break to avoid repeating: E004–E011 ended before candidate admission because required Groq Right-hand structured output returned HTTP 400 `json_validate_failed`; earlier 429s also occurred. No target research, entity card, or contact evidence was created. E011 records a same-role JSON-object compatibility retry and durable Investigator provider-error events, but this continuation will verify the current source before relying on either repair.
- Setup facts for this workspace: source content came from upstream `main` at `ac431272e8fa413b35099160c295f08f6838588c`; workspace Git HEAD is `747d28c` and clean at audit opening. The previous setup installed the frozen pnpm lockfile, passed typecheck, explicitly initialized the empty development schema, confirmed all 13 active provider-secret names by presence only, and started the canonical API workflow. The first-run setup document was corrected to match the current secret contract. No secret values were read or recorded.
- This continuation is **not yet launched**. No Run 2 provider request or job has been sent. Next: confirm the active UI payload and current Groq failure-recovery code, then capture the fresh health/job/database baseline and record it before posting once.

### E013 — Current launch path, repair tests, and fresh baseline

- Observed: 2026-10-04 18:39:15–18:39:46 UTC (21:39:15–21:39:46 Europe/Kyiv).
- Current UI helper `artifacts/apex-finder/src/lib/launch-atlas.ts` sends `POST /api/ingest/atlas-run` with `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}` when invoked without overrides. The UI first reads `/api/healthz`; the helper makes a second advisory read. No `singleTargetId` is supplied, so this is model-owned discovery-first, not a mock or a direct-target shortcut.
- Current API source checks schema readiness, enables permanent Redis, claims the distributed Atlas lock, persists the running job, then calls `runCanonicalAtlasPipeline`. The active-job endpoint is `GET /api/ingest/job/active/atlas-run`; job polling is `GET /api/ingest/job/:jobId`.
- Prior-break repairs were present in the imported source: Right-hand strict-schema `json_validate_failed` gets one same-role `json_object` retry; Investigator provider errors are persisted as `provider_error` trajectory events. Focused regression tests passed: `groq-right-hand.test.ts` + `research-case-replay.test.ts`, **2 files / 20 tests passed**. No test made a live provider call.
- Presence-only preflight passed again: all 13 active provider-secret names set; values not read. No credentials were changed.
- Read-only health snapshot: `/api/healthz` status `ok`, Redis `ok` (cached); `/api/healthz/details` status `ok`, Redis `ok` (165 ms), `bureauIntegrity=ok`, `registryShallowRisk=false`, three web-search providers active, two Groq Investigator keys listed, Right-hand configured, and `autoPipeline=false`. `agenticLlmSlots=1`, `agenticLlmLastOk=null`, and no last model: capacity is still unproven until the authorized run. The health handler reads local configuration/status and Redis; it did not call a research model.
- Naming drift observed in the diagnostic: `lanesHonesty.geminiRightHand=1` despite no Gemini key; the current health handler derives Right-hand readiness from `getGroqRightHandStatus()`. Treat this as legacy field naming, not Gemini availability.
- Fresh PostgreSQL baseline before this run: `entities=0`, `research_cases=0`, `research_case_events=0`, `research_sessions=0`, `research_run_events=0`, `research_evidence=0`, `contact_evidence=0`.
- Fresh active-job probe: `active=false`, `jobId=null`. No prior job will be stopped or replaced.
- Decision: the known E006/E009 control-format failure has a tested same-role fix; readiness is non-critical; proceed with one default UI payload after recording its two immediate advisory health reads. If this run fails for quota/provider capacity, do not replay unchanged work.

### E014 — Final UI pre-launch guard

- Time: 2026-10-04 18:40:19 UTC (21:40:19 Europe/Kyiv).
- Reproduced the button's first `GET /api/healthz` and the launch helper's second `GET /api/healthz`; both returned HTTP 200, `status=ok`, Redis `ok`, `researchKeysConfigured=true`.
- Immediately re-read `GET /api/ingest/job/active/atlas-run`; HTTP 200, `active=false`, `jobId=null`.
- These were readiness/lock reads only. No research-provider request or launch POST had yet been sent in Run 2.
- Next action: send the exact UI default JSON once to `POST /api/ingest/atlas-run`; do not retry the launch POST.

### E015 — Run 2 launch accepted

- Launch request time: 2026-10-04 18:40:38 UTC (21:40:38 Europe/Kyiv).
- Sent exactly one UI-equivalent `POST /api/ingest/atlas-run` with `targetCount=3`, `researchDepth=standard`, `targetTimeoutMs=420000`, and no `singleTargetId`.
- Response: HTTP 202; canonical model-owned discovery started.
- Run 2 job ID: `9567145d-9809-4748-8bed-399eb52b8505`; poll URL: `/api/ingest/job/9567145d-9809-4748-8bed-399eb52b8505`.
- No duplicate launch, manual stop, or alternate route was used. Next: poll only this job and inspect durable state deltas.

### E016 — Initial discovery case opened

- Observation: first status/database poll immediately after E015; the polling command did not print its own wall-clock stamp, so the exact poll second is unavailable.
- Job `9567145d-9809-4748-8bed-399eb52b8505` was `running`, progress `1/4`, Atlas phase `1/4`; its job-log projection contained 9 entries.
- Durable discovery case `case_id=1` exists. Its first three events are: one Groq Boss assignment, one Head Investigator assignment, and one Right-hand observation.
- At this observation there were still zero entities, research sessions, research evidence rows, and contact evidence rows. No target-scoped research or card admission was yet proven.
- Next: stamp each poll before request; inspect sanitized progress/provider diagnostics and durable event-type counts, avoiding raw search text or contact details.

### E017 — First live control activity; discovery trajectory not yet durable

- Poll time: 2026-10-04 18:42:10 UTC (21:42:10 Europe/Kyiv).
- Job remained `running`, progress `1/4`, phase `1/4`; the job-log projection grew from 9 to 17 entries. The safe classification of those entries contains target/search activity, but raw log text is intentionally omitted.
- `/api/healthz/details` reported `agenticLlmLastOk=true` and last model `qwen/qwen3.8-27b`, the first observed successful agentic model call since the Run 2 baseline. This is live activity evidence, not proof of a persisted discovery action.
- The database remained at one active discovery case, iteration 0, and the same three initial assignment/observation events. `entities=0`, `research_sessions=0`, `research_evidence=0`, and `contact_evidence=0`.
- No quota, control, or persistence error was visible in these projections. Do not relaunch. Next: inspect sanitized server diagnostics and continue bounded polling for durable tool-observation events.

### E018 — Run 2 stopped at discovery control; no admission

- Terminal time: 2026-10-04 18:43:03.888 UTC (21:43:03.888 Europe/Kyiv).
- Job `9567145d-9809-4748-8bed-399eb52b8505` transitioned to `failed`, outcome `incomplete`, progress `3/4`, Atlas phase `3/4`.
- Case 1 is in `review`, `current_action=canonical-control-unavailable`, terminal iteration counter 13. Durable events: 1 Groq Boss assignment, 1 Head Investigator assignment, 1 Right-hand observation, 11 successful Head Investigator tool observations, 1 Head Investigator tool-observation error, and 1 Groq Boss control decision `unavailable`.
- Post-run database counts: `entities=0`, `research_cases=1`, `research_case_events=16`, `research_sessions=0`, `research_run_events=0`, `research_evidence=0`, `contact_evidence=0`. No candidate admission, target-scoped research, or card creation occurred.
- The workflow-log snapshot drained at 18:42:47 contained 70 `apex_agentic_llm_attempt` entries: 11 HTTP 200, 11 HTTP 400 with opaque diagnostic hashes, and 48 HTTP 429 `upstream_rate_limited`; all prompt sizes were 12000 characters and none were HTTP 413. These were provisional counts until the post-terminal log was drained; they do not identify the failing control call by themselves.
- The focused regression tests for the prior Right-hand JSON-schema compatibility fix and durable Investigator errors passed, but live execution still stopped at the control boundary. Do not relaunch unchanged. Next: reconcile the terminal job/case diagnostic with the complete post-terminal workflow log and verify the lock was released.

### E019 — User-authorized audit detail scope

- Recorded immediately after the Run 2 terminal review, approximately 2026-10-04 18:44 UTC (21:44 Europe/Kyiv).
- The user explicitly asked that this audit preserve raw search text, relevant public contact details, and other raw run data so another agent can analyze and improve the process. This replaces the original audit's blanket omission of full contact details for relevant evidence from this run.
- Scope: preserve exact queries and relevant raw tool results, public URLs, and any contact values actually present in search results or public sources; label each as search-result-only, page-verified, or persisted evidence. Preserve provider failure diagnostics when useful.
- Hard boundary remains: never write secret values, API keys, bearer/authorization headers, cookies, session tokens, or unrelated personal data. Never invent, infer, or "complete" missing contact details.

### E020 — Terminal failure root cause and lock reconciliation

- Reconciled: 2026-10-04 18:44 UTC (21:44 Europe/Kyiv), using the terminal job projection, case-event payload, and both incremental workflow-log files.
- The control event confirms the prior Right-hand fix worked in this run: Right-hand completed on `openai/gpt-oss-120b`. Groq Boss was the role that failed at terminal iteration 13.
- Exact sanitized Boss diagnostic: `stage=groq_boss; provider=groq; model=openai/gpt-oss-120b; category=CONTROL_PROVIDER_RATE_LIMIT; httpStatus=none; providerCode=budget_exhausted; failureClass=rate_limited; diagnostic=Groq Boss local provider gate blocked further attempts (budget_exhausted).` This is a local run-scope provider-budget stop, not a new Right-hand JSON-schema rejection and not a provider HTTP response at the stopping point.
- Complete incremental attempt count: 79 Groq attempts — 12 HTTP 200, 13 HTTP 400 (opaque provider-body fingerprints), 53 HTTP 429 `upstream_rate_limited`, and 1 local/non-HTTP error. Every logged prompt was 12000 characters; no HTTP 413. The local gate stopped the role at its scope ceiling; do not raise the ceiling or replay the same request sequence without an evidence-based correction.
- Lock reconciliation: `GET /api/ingest/job/active/atlas-run` returned `active=false`, `jobId=null`; no lock cleanup or job mutation was needed.
- There were no persisted contact details or cards. Correction: the raw search observations did contain 39 email-like strings; they are transcribed with provenance and search-result-only status in E021.

### E021 — Run 2 raw query and contact transcript

- Recorded: 2026-10-05 09:45 UTC. Transcribed from the 12 persisted Run 2 tool-observation payloads. This inline transcript is the current audit record; the strings below are not page-verified and were not persisted as contact evidence.
- Reconciliation: 24 exact web-search queries across 12 tool observations (11 successful actions and 1 failed action), 210 observed result URLs in aggregate, zero `visit`/`browser_fetch` actions, zero findings, zero entity admissions, and zero contact-evidence rows.
- Every contact-like value below is a search-result string only. Do not treat it as a card candidate, attribute it to a target, or use it as verified contact data.

#### Exact raw search queries

```text
Event 4 / iteration 1 / parallel_web_search
[serper] venture capital firm partners public profile email
[tavily] private equity firm senior partners contact information
[exa] technology startup founders public LinkedIn profile

Event 5 / iteration 2 / parallel_web_search
[serper] "founder" OR "CEO" OR "principal" private company website "contact us" OR "reach out" OR "email" boutique firm
[exa] operator founder principal public profile personal website professional bio contact information

Event 6 / iteration 3 / parallel_web_search
[serper] high net worth entrepreneur real estate investments public contact
[tavily] CEO private equity firm executive public profile email
[exa] business leader philanthropic donations contact details

Event 7 / iteration 4 / parallel_web_search
[serper] boutique private equity firm "principal" OR "managing partner" contact email site:.com
[serper] boutique hedge fund "founder" OR "CIO" direct email contact portfolio
[exa] small alternative investment firm named principal managing partner public contact information

Event 8 / iteration 5 / web_search — error
[serper] "speaker" OR "panelist" 2024 2025 site:conferences OR site:summits hospitality OR agtech OR energy operators program

Event 9 / iteration 6 / web_search
[serper] high net worth entrepreneur founder private equity firm

Event 10 / iteration 7 / parallel_web_search
[serper] "managing partner" OR "principal" private credit fund "contact" site:.com -linkedin
[serper] "owner" OR "founder" yacht management OR "private aviation" company "about" OR "team" -linkedin -youtube
[serper] "principal" OR "founder" boutique hotel group OR private club "leadership" OR "team" -linkedin -"about us" -press

Event 11 / iteration 8 / parallel_web_search
[serper] "founder" OR "principal" boutique private equity firm "about" page site:linkedin.com
[exa] family office principal or managing partner publicly listed firm website contact

Event 12 / iteration 9 / parallel_web_search
[serper] site:linkedin.com "Founder" "private equity" "contact"
[tavily] "high net worth individual" "profile" "email"
[exa] "owner" "luxury hotel" "press release" "CEO"

Event 13 / iteration 10 / web_search
[serper] "email" ("managing partner" OR "principal" OR "director") private equity fund site:linkedin.com OR personal website contact

Event 14 / iteration 11 / web_search
[serper] gaming company founder CEO operator named person 2024 2025

Event 15 / iteration 12 / web_search
[serper] public contact page for high net worth individual corporate board member
```

#### Raw email-like strings and source context

These are transcribed exactly as found by the raw-result scan, grouped by persisted tool event. The source URL is the URL present in the search-result text; no page was fetched.

- **Event 4, iteration 1**
  - FundingStack search snippet, `https://fundingstack.com/blog/posts/20-lps-actively-investing-in-venture-capital-funds`: `jarottingen@gmail.com`, `juri.jenkner@partnersgroup.com`, `kduval@ttcp.com`; the same snippet also contains the truncated fragment `russ@nextlegacy.` (not a complete address).
  - Lippes Mathias private-equity result, `https://www.lippes.com/capabilities/private-equity-16`: `jkempf@lippes.com`, `mkobrin@lippes.com`, `jkoeppel@lippes.com`, `ckolber@lippes.com`, `glippes@lippes.com`, `clovelace@lippes.com`, `rluthra@lippes.com`, `mmaizes@lippes.com`, `dmcdonald@lippes.com`, `pmitchell@lippes.com`, `tmitchell@lippes.com`, `jmueller@lippes.com`, `aolek@lippes.com`, `eponterio@lippes.com`, `squreshi@lippes.com`, `brich@lippes.com`, `pschulz@lippes.com`, `eshea@lippes.com`. The snippets label these as attorneys/staff, not as discovered HNWI prospects.
  - Goodwin private-equity result, `https://www.goodwinlaw.com/en/expertise/industries/private-equity`: `inissan@goodwinlaw.com`, `bmcpeake@goodwinlaw.com`, `yrana@goodwinlaw.com`, `cnugent@goodwinlaw.com`, `jleclaire@goodwinlaw.com`. The snippets label them as firm partners.
- **Event 5, iteration 2**
  - Principal Search result, `https://principalsearch.com/home/`: `enquiries@principalandpartners.com`.
  - The raw result text includes `hello@operatorhive.com` in a “Site:” field followed by a description of an unrelated AI desktop product. The retained observation does not unambiguously associate that text with one URL in the result list; do not attribute it to the adjacent LinkedIn profile.
  - A result URL also contained a handle, not a contact address: `https://medium.com/@venturetwins/from-cold-email-to-internship-with-jason-chen-1cff6d560ae3`.
- **Event 6, iteration 3**
  - Raw Selection/PE executive-search snippet: `Alex.Rawlings@Raw-Selection.com` appeared with “Work with us (CEO/CFO/OP/Board searches)” in a YouTube search result (`https://www.youtube.com/watch?v=i4x2cHejmcA`).
  - The result for `https://avnishandanita.com/connect/` names Avnish Goyal and Anita Goyal and prints `avnish@hallmarkcarehomes.co.uk` and `anita@inner-spark.co.uk`; the page was not fetched.
  - Texas Business Hall of Fame donor result, `https://texasbusiness.org/award-donors/`: `mwalker@texasbusiness.org`; the snippet gives phone `713-960-1820` for Meredith Walker.
  - Merrimack Health donor/supporter result, `https://www.mhlawrencehospital.org/philanthropy-at-merrimack-health/corporate-giving/business-council`: `Development@lawrencegeneral.org`, `teve.krekorian@merrimackhealth.org`, and `steve.krekorian@lawrencegeneral.org`; the raw phone text was `978-946-80 (9789468121) 99 (9789468099)` and is not normalized here.
  - The same event includes the masked string `c***@coca-cola.com`; it is not a complete contact value.
- **Event 7, iteration 4**
  - Search result for `https://www.sandeepramesh.com/`: `s@sandeepramesh.com`, shown in “Contact Me” text.
  - Another result contained only the masked/truncated fragment `k***@sparrowspointcapital.`.
- **Event 10, iteration 7**
  - A result URL itself contained `officers-staff-user-details-bob@bobsaxon.net`: `https://iyba.org/officers-staff-user-details-bob@bobsaxon.net`. This is a search-result URL/path string, not an observed or attributed email contact.
- **Event 12, iteration 9**
  - Search-result text for HNWI email-list pages (`https://umbrex.com/resources/private-equity-glossary/high-net-worth-individual` and `https://www.linkedin.com/top-content/real-estate/luxury-real-estate-insights/high-net-worth-buyer-profiling`) yielded `v.ste@pdyna.com` and `r@v.com`. The surrounding excerpt advertises a “6.5K+ Verified High Net Worth Individuals (HNWI) Email List” and contains escaped/obfuscated sample rows and placeholder-style phone text; neither address is verified or attributable.

- Count: 39 regex-matched unique email strings across events 4, 5, 6, 7, 10, and 12, plus the masked/truncated fragments above. All remain search-result-only; none was page-verified, linked to an admitted candidate, or persisted.
- Raw URL strings containing `@` were the Medium handle URL in event 5 and the anomalous IYBA path in event 10. Do not interpret the `@` character in a URL as proof of a contact.
- The dominant result-quality issue is query drift: broad “contact/email” searches returned law-firm directories, general donor contacts, a product builder, an email-list advertisement, and one malformed URL instead of an attributable HNWI candidate. No deterministic admission should be inferred from these results.

### E022 — Latest-main source reconciliation for Run 3

- Recorded: 2026-10-05 09:47 UTC.
- The workspace had no `origin` remote and its local `main` was an imported snapshot plus audit commits, with no common Git ancestor to upstream. The canonical public repository URL is `https://github.com/2f22vtd4kr-cloud/BigContacts`.
- Fresh upstream `main` is `4295799f958b3468bbfad6fca7ecb418e8361a35` (`Merge pull request #487 ...`). Local `main` now tracks `origin/main` at exactly that SHA.
- The user-provided verified repair head `dd53119bc65375c02322155d198928313a0121ed` is real but is the tip of `repair/bug-hunt-provider-choice-2026-10-05`, not an ancestor of current `main`. The two lines diverged from `aab2449d78714eb46cbc55d3bcef3d8a1ecc6a89`; GitHub reports current `main` one commit ahead and the repair line ten commits ahead. Per the user's explicit instruction, Run 3 will use current upstream `main`, not the divergent repair line.
- To protect the Run 2 audit during this sync, the prior local state was preserved at `audit/run2-preserved-2026-10-05`. The separate Run 2 raw JSON export is not in the active `main` worktree; the relevant exact queries, source references, and contact-like strings have been transcribed inline above. Run 3 will keep its raw research observations in this audit file rather than creating another sidecar.
- Next: synchronize dependencies, run the relevant static/test gates, restart the configured API workflow, capture the new health/job/database baseline, then issue one UI-equivalent launch only if the baseline is safe.

### E023 — Latest-main build and test verification

- Recorded: 2026-10-05 09:51 UTC.
- `pnpm install --frozen-lockfile`: lockfile was current; no dependency changes were needed.
- `pnpm run build`: passed root/library and workspace TypeScript checks, project source-boundary guards, API build and provider-role guards, and the apex-finder and mockup-sandbox client builds. The apex-finder build emitted only the existing >500 kB chunk-size warning.
- `pnpm run check:no-force-dig`: passed.
- The first full Vitest run was executed before the API workflow started: 120 files, 635 passing tests, 10 skipped, 24 failed. Twenty-one smoke-test failures were connection refusals to `127.0.0.1:8080` while the workflow was stopped. Three unit assertions failed in two existing test files: Groq Boss timeout clamp expected 5,000 ms but current implementation returned 30,000 ms; Groq Boss fallback summary expectations omit the `[provider_unavailable]` / `[rate_limited]` classification suffixes that the current formatter returns.
- Reran the remaining suite excluding both smoke-test files and those two mismatched assertion files: 116 files and 632 tests passed. No source code or test expectation was changed for this audit.
- The configured API workflow was then restarted on current `main`. After restart, the health and baseline reads below succeeded. The complete smoke suite was not rerun because it includes a provider-facing registry-search request; do not count the initial connection-refused smoke results as a code failure or claim a fully green suite.

### E024 — Run 3 pre-launch baseline

- Captured: 2026-10-05 09:51 UTC, from the API workflow serving current `main`.
- `GET /api/healthz`: HTTP 200, `status=ok`, Redis `ok` (167 ms), `researchKeysConfigured=true`.
- `GET /api/healthz/details`: `bureauIntegrity=ok`; no agentic model call had occurred since restart (`agenticLlmLastOk=null`, model `null`).
- `GET /api/ingest/job/active/atlas-run`: HTTP 200, `active=false`, `jobId=null`.
- Development database baseline: `entities=0`, `research_cases=1`, `research_case_events=16`, `research_sessions=0`, `research_run_events=0`, `research_evidence=0`, `contact_evidence=0`.
- No Run 3 POST has been sent yet. Next: issue exactly one UI-equivalent canonical launch with `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}` and audit only the returned job.

### E025 — Run 3 launch accepted

- Launch time: 2026-10-05 09:52:48.820 UTC (12:52:48.820 Europe/Kyiv).
- Sent exactly one `POST /api/ingest/atlas-run` with `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}` and no `singleTargetId`.
- Response: HTTP 202, `Canonical model-owned discovery started`.
- Run 3 job ID: `95aa0a1f-5387-40c7-a829-ebe304e67837`; poll URL: `/api/ingest/job/95aa0a1f-5387-40c7-a829-ebe304e67837`.
- No duplicate launch, manual stop, alternate route, or deterministic research bypass was used. Next: poll this job and audit its durable case events, candidate admissions, target research, and card state.

### E026 — Run 3 failed closed at Groq Right-hand control

- Terminal time: 2026-10-05 09:53:15.216 UTC (12:53:15.216 Europe/Kyiv).
- Job `95aa0a1f-5387-40c7-a829-ebe304e67837` is `failed`, outcome `incomplete`, progress `3/4`, Atlas phase `3/4`; `inserted=0`, `skipped=0`, `errors=0` in the job projection. Final message: `Groq Right-hand was unavailable; Atlas transition is fail-closed.`
- Discovery case 2 is in `review`, `current_action=canonical-control-unavailable`, iteration 4, with no target entity. Nine new durable events (IDs 17–25) were added to the one existing case.
- Durable sequence: (17) Groq Boss assignment; (18) initial Groq Right-hand review completed with `decision=proceed`; (19) Investigator assignment; (20–21) two successful `parallel_web_search` observations; (22) Investigator `contact_extraction` provider error; (23) Boss `pivot_discovery` decision to use registries and filings; (24) Investigator `identity_resolution` provider error; (25) Boss stop decision because the second Right-hand review was unavailable. Both Investigator errors are recorded as `upstream_rate_limited`.
- Search activity recorded five provider queries and 44 observed result URLs (26 from event 20, 18 from event 21); there were zero page visits and zero admitted findings.
- Post-run database counts: `entities=0`, `research_cases=2`, `research_case_events=25`, `research_sessions=0`, `research_run_events=0`, `research_evidence=0`, `contact_evidence=0`. No target research session or card was created.
- The active-job endpoint returned `active=false`, `jobId=null`; the lock was released without intervention. Health remained `status=ok`, Redis `ok`, `bureauIntegrity=ok`; latest successful agentic model was `qwen/qwen3.8-27b`.

#### Run 3 provider diagnostics

- Workflow telemetry recorded 7 Groq attempts, all with `promptChars=12000`: `openai/gpt-oss-120b` — HTTP 400 ×1, HTTP 200 ×1, HTTP 429 ×2; `qwen/qwen3.8-27b` — HTTP 200 ×1, HTTP 429 ×2. No HTTP 413 was recorded.
- The terminal Right-hand diagnostic was HTTP 429, provider code `rate_limit_exceeded`, model `openai/gpt-oss-120b`; its provider response identified error type `tokens`. Rate headers showed 3,108 of 8,000 tokens remaining, 998 of 1,000 requests remaining, token reset `36.69s`, request reset `2m52.8s`, and `Retry-After: 20`. The same sanitized diagnostic reported `rateLimitKind=unknown`, `retryTokenRateLimit=0`, `retryAfterMs=5000`, and failure class `rate_limited`.
- Source comparison: `groq-right-hand-reasoning.ts` recognizes a token limit from a zero remaining-token header, but not from the observed body type `tokens` when the header is nonzero. Its token-window retry is also capped at 15 seconds; the observed reset was 36.69 seconds. The existing short-reset regression case uses zero remaining tokens and a `0.001s` reset, so it does not cover this response shape. These conditions explain why this run reported an unknown limit and made no token-window retry.
- Do not copy key aliases, fingerprints, or any credential material into this audit. The evidence points to a transient token-rate-limit response, not missing configuration or request-count exhaustion; the live Right-hand error was not recovered before the bounded control flow stopped. Do not launch again unchanged.

#### Exact Run 3 search queries

```text
Event 20 / iteration 1 / parallel_web_search
[serper] venture capital firm partners list
[tavily] private equity firm senior partners public profiles
[exa] angel investor network members

Event 21 / iteration 2 / parallel_web_search
[serper] "managing partner" real estate company site:linkedin.com OR site:companydomain.com email contact
[exa] independent real estate developer founder CEO "contact us" email
```

#### Complete Run 3 observed result URL list

These are search-result URLs from the durable tool observations; none was visited.

```text
Event 20:
https://angelcapitalassociation.org/directory/
https://angelinvestorsnetwork.com/directory
https://angelinvestorsnetwork.com/listing/directory
https://en.wikipedia.org/wiki/List_of_venture_capital_firms
https://firmroom.com/de/blog/top-venture-capital-firms
https://fundingstack.com/blog/posts/20-lps-actively-investing-in-venture-capital-funds
https://republic.com/help/the-complete-list-of-tier-1-and-notable-vcs-and-angel-investors
https://thefundlawyer.cooley.com/primer-planning-for-senior-partner-transitions-in-private-equity-and-venture-capital-firms
https://www.angelinvestmentnetwork.co.uk/
https://www.builtinnyc.com/companies/type/angel-vcfirm-companies
https://www.businessangelseurope.com/bae-club-members
https://www.dechert.com/services/practice-areas/private-equity.html
https://www.eban.org/
https://www.forbes.com/lists/midas/
https://www.kirkland.com/lawyers/s/senior-john-pc
https://www.linkedin.com/company/angelinvestornetwork
https://www.linkedin.com/in/ian-edelson-09abb925
https://www.linkedin.com/in/tony-hill
https://www.mycapital.com/resources/companies/
https://www.openvc.app/country/USA
https://www.openvc.app/investor-lists/angel-investors
https://www.privateequityinternational.com/company-profiles
https://www.stantonchase.com/expertise/functions/private-equity
https://www.swfinstitute.org/profiles/venture-capital-firm/north-america
https://www.vcsheet.com/
https://www.vistaequitypartners.com/about/team

Event 21:
https://impeccabledevelopment.com/agent/robert-tanner
https://jdsdevelopment.com/news/michael-stern
https://moritzdevelopment.com/leadership/
https://prosperaco.com/who-we-are/
https://www.kahendevelopment.com/
https://www.lehmanproperty.com/joseph-lehman-miami
https://www.linkedin.com/in/adambhazlett
https://www.linkedin.com/in/brandon-tarpey-65a6811b
https://www.linkedin.com/in/david-butler-91523b
https://www.linkedin.com/in/davidbramble
https://www.linkedin.com/in/elliot-shainberg
https://www.linkedin.com/in/jenniferakeith
https://www.linkedin.com/in/michael-massimino-5616a4b
https://www.linkedin.com/in/pyeatman
https://www.linkedin.com/in/samuel-goldsmith-97b71924
https://www.linkedin.com/in/stevenlibman
https://www.maebdevelopers.com/contact.html
https://www.velneydevelopment.com/
```

#### Run 3 raw search-result contact details

- Seven complete email strings matched in the two search observations; all are search-result-only and none was persisted:
  - Event 20, Angel Capital Association / EBAN results: `sdickey@angelcapitalassociation.org` (the directory result says to contact the association about membership), `info@eban.org` (EBAN “Get in touch” text).
  - Event 20, Dechert private-equity page snippet: `markus.bolsinger@dechert.com` with `+1 212 698 3628`; `mark.thierfelder@dechert.com` with `+1 212 698 3804`; `ken.young@dechert.com` with `+1 212 698 3854`. These are law-firm contacts, not HNWI prospects.
  - Event 21, Robert Tanner result (`https://impeccabledevelopment.com/agent/robert-tanner`): `info@impeccabledevelopment.com`; the snippet describes him as co-founder, investor, and CEO. This is an organization address, not a verified personal address.
  - Event 21, Joseph Lehman result (`https://www.lehmanproperty.com/joseph-lehman-miami`): `info@lehmanproperty.com` and phone `+1 305-705-2118 (+13057052118)`. This is an organization contact route in a search-result snippet, not a page-verified personal contact.
  - Event 21, Mae B Developers result (`https://www.maebdevelopers.com/contact.html`): the email is masked as `[email protected]`; the phone fragment is `(214) 402-1`. Both are incomplete and unusable.
- Event 20 surfaced broad VC/angel directories, profiles, and a law-firm practice page. Event 21 returned several named real-estate operators and organization pages, but the provider errors prevented the Investigator from returning candidate findings or completing identity resolution. All seven email strings and all four complete phone values remain search-result-only; no identity or contact was admitted.
- No Run 3 raw JSON sidecar was created. The exact queries, all 44 result URLs, contact strings, and sanitized provider diagnostics for this run are kept in this audit file.
