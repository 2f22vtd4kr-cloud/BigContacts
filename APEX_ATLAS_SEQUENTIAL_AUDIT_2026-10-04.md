# ⭐ APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-04.md

## Run record

- Audit started: 2026-10-04 14:22:11 UTC (17:22:11 Europe/Kyiv)
- Project: BigContacts import; app UI title: Apex Atlas
- Repository: `main` at `3842417f4d81eeb87a9287db4462661714d5a687`
- Scope: trace one canonical UI-equivalent Apex Atlas launch from request acceptance through discovery, target research, review, and persisted cards; stop and record the first material break rather than silently retrying.
- Logging rule: record timestamped actions, IDs, counts, status transitions, source references, and redacted error summaries. Do not record credentials or full personal contact details.
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