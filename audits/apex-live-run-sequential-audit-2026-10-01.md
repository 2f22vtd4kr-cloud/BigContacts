# Apex Atlas Live Run — Sequential Audit — 2026-10-01

## Scope and audit rules

- Audit file: `audits/apex-live-run-sequential-audit-2026-10-01.md`
- Goal: record the original Apex Atlas UI-equivalent run from launch through discovery, research, and any new entity/contact-card admission, stopping at the first genuine failure boundary.
- No credentials, credential-like strings, or raw contact values are recorded. Durable row IDs, event order, statuses, sanitized errors, and source provenance are sufficient to reconcile the run.
- Exactly one canonical UI-equivalent launch is authorized for this audit. Do not retry, use a test/development bypass, start a continuation, or issue standalone provider probes. If the job fails, preserve its terminal response and ledger state, then stop.
- A job status of `done` is not by itself proof that a person/card was admitted. Verify new entity IDs and evidence/admission deltas against the pre-launch baseline.

## Previous attempts reviewed before this launch

- `audits/apex-atlas-sequential-audit-2026-09-26.md`: one pre-initialization launch failed on schema drift; after the documented schema initialization, another run reached discovery but failed after a Serper HTTP 400 and Gemini Right-hand cooldown; a later canonical attempt failed at Gemini Boss after a timeout. None reached target research or card creation.
- `audits/apex-atlas-development-control-plane-audit-2026-09-29.md`: canonical runs failed at Gemini Boss with HTTP 429 and later HTTP 403. Development-harness attempts exposed HTTP 413 prompt-size failures and invalid Right-hand control contracts; the last completed harness reported zero admissions, materialized targets, evidence rows, visits, or cards. Harness completion was not proof of discovery success.
- Do not repeat the earlier retries, harness/bypass route, evidence query that assumed `research_evidence.case_id`, or any claim of success based only on job completion or summary counters.

## Sequential record

### 000 — Audit opened

- **UTC timestamp:** `2026-10-01T06:51:53Z`
- **Status:** `started`
- This durable audit file was created before any live Apex launch.
- Repository: `main`, commit `15eca3ac70d03ce6c77c6f112cd273fe28f29d3c`.

### 001 — Current UI launch contract identified

- **Timestamp:** Before the launch request.
- The dashboard's original `LaunchAtlasButton` calls `launchAtlasPipeline`; its default request is `POST /api/ingest/atlas-run` with `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`.
- The separate `scripts/run-bureau.sh` sends additional fields and omits the UI's explicit `researchDepth`. To honor the request to launch as the UI does, use the body from the actual frontend handler, not the helper script.
- **Next action:** Capture a read-only database baseline, then send this one exact UI-equivalent request.

### 002 — Runtime readiness and active-lane check

- **Timestamp:** Before the launch request.
- `GET /api/healthz`: HTTP 200; API status `ok`, Redis `ok`, research-key configuration present.
- `GET /api/system/status`: HTTP 200; `bureauIntegrity=ok`, no integrity reasons, Postgres `ok`, Redis `ready`.
- `GET /api/ingest/job/active/atlas-run`: HTTP 200; `active=false`, `jobId=null`.
- No provider connectivity probes were made.

### 003 — Durable schema and pre-launch ledger baseline

- **Timestamp:** Before the launch request.
- Read-only schema inspection confirmed the required durable tables and their columns. In particular, `research_evidence` has `session_id` and `entity_id`; it does **not** have `case_id`.
- Pre-launch row counts:

  | Table | Rows |
  |---|---:|
  | `research_cases` | 0 |
  | `research_case_events` | 0 |
  | `research_sessions` | 0 |
  | `research_run_events` | 0 |
  | `research_evidence` | 0 |
  | `contact_evidence` | 0 |
  | `entities` | 0 |

- Pre-launch entity IDs: none.
- This is the baseline for proving any new discovery, research evidence, contact evidence, or card/entity creation.

### 004 — UI surface and operator-session check

- **Timestamp:** Before the launch request.
- The app preview screenshot showed the original Apex Atlas dashboard and its `Launch Apex Atlas` button with `Depth · Standard` selected. The visible entities, priority, assets, and links counters were all `0`.
- The dashboard also displayed a `9 LIVE` badge while the authoritative active-job endpoint reported `active=false`; the badge was not treated as evidence of an active Atlas job.
- `GET /api/auth/session` returned HTTP `200` with `authenticated=false`. The running development boot explicitly enables its non-production auth bypass; the original dashboard and launch control were accessible. No auth secret value was read or used directly.
- The screenshot had no browser errors; only the standard React DevTools informational message.
- **Next action:** Send the exact default UI request once.

### 005 — Canonical UI-equivalent launch

- **UTC timestamp:** `2026-10-01T06:54:30Z`
- **Request:** `POST /api/ingest/atlas-run`
- **Body:** `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`
- **Response:** HTTP `202 Accepted`; message: `Canonical model-owned discovery started`.
- **Job ID:** `77c7fb64-8c85-4d23-b1f2-0e048b9e8012`
- **Poll URL:** `/api/ingest/job/77c7fb64-8c85-4d23-b1f2-0e048b9e8012`
- **Accepted options:** target count `3`, depth `standard`, target timeout `420000 ms`.
- **Interpretation:** The application accepted one normal UI-equivalent discovery-first run. Acceptance is not evidence of discovery or card creation.
- **Next action:** Poll only this returned job until terminal and record phase/status transitions. Do not launch another job.

### 006 — First durable job-state observation

- **UTC timestamp:** `2026-10-01T06:55:09Z`
- **Read-only requests:** `GET /api/ingest/job/77c7fb64-8c85-4d23-b1f2-0e048b9e8012`; `GET /api/ingest/job/active/atlas-run`.
- **Observed result:** Both returned HTTP `200`. The job is `running`, progress `0/4`, `atlasPhase=0`; active lane points to this same job. The server message identifies the opening sequence as Gemini Boss opening → Gemini Right-hand review → model-owned Investigator discovery.
- **Interpretation:** The canonical run is inside its opening/control sequence. No discovery admission, target-scoped research, or card/entity creation is proven at this stage.
- **Next action:** Continue polling this job only and preserve the first terminal boundary.

### 007 — Opening-stage polling snapshots

- **UTC timestamps:** `2026-10-01T06:55:50Z`, `06:56:00Z`, `06:56:10Z`, `06:56:21Z`, `06:56:31Z`, `06:56:42Z`.
- **Read-only request:** Six `GET /api/ingest/job/77c7fb64-8c85-4d23-b1f2-0e048b9e8012` polls; each returned HTTP `200`.
- **Observed result:** All six snapshots remained `running`, `progress=0/4`, `atlasPhase=0`, with the same Boss → Right-hand → Investigator opening message. No phase transition or terminal error was reported.
- **Interpretation:** The job is still waiting in its opening/control sequence. No target discovery, target research, or card/entity admission has been observed.
- **Next action:** Continue polling this job only. If a provider or job failure is returned, preserve it and stop without retry.

### 008 — Terminal failure boundary and post-run reconciliation

- **Job terminal timestamps:** started `2026-10-01T06:54:30.223Z`; finished `2026-10-01T06:56:47.611Z` (about 2m 17s).
- **Terminal observation:** At `2026-10-01T06:57:34Z`, `GET /api/ingest/job/77c7fb64-8c85-4d23-b1f2-0e048b9e8012` returned HTTP `200`: status `failed`, progress `1/4`, `atlasPhase=1`, outcome `incomplete`.
- **Exact terminal message:** `Gemini Boss was unavailable after bounded same-role model fallback; no Groq/Mistral Investigator fallback is permitted.`
- **Structured failure detail:** the aggregate Boss result was `status=unavailable`, `model=gemini-3.8-flash`; its error reports `Gemini Boss gemini-3.5-flash Interactions API provider_unavailable HTTP 503`. This records the observed error without inferring the state of credentials or provider quota.
- **Break point:** Gemini Boss opening, before Right-hand review, Investigator selection, discovery search/visits, target-scoped research, evidence admission, or card/entity creation.
- **Post-run active lane:** `GET /api/ingest/job/active/atlas-run` returned HTTP `200`, `active=false`, `jobId=null`.
- **Post-run ledger snapshot:** captured at `2026-10-01T06:57:34.721Z`; all seven durable-table counts remained `0` (`research_cases`, `research_case_events`, `research_sessions`, `research_run_events`, `research_evidence`, `contact_evidence`, `entities`). No case, event, evidence row, entity, or contact card was created.
- **Workflow logs:** the API workflow remained running; the post-failure log refresh had no new application output. The durable job response and database snapshot are the evidence for this boundary.
- **Decision:** Stop here. No retry, harness, continuation, or standalone provider probe was run.

## Run outcome

**Stopped at the first live failure boundary.** The one UI-equivalent launch was accepted but failed at Gemini Boss opening on a reported provider-unavailable HTTP 503 after bounded same-role fallback. Discovery/research/card creation was not reached, and the post-run ledger remained empty. No retry was made.