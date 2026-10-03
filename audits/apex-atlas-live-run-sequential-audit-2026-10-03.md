# Apex Atlas Live Run — Sequential Audit — 2026-10-03

## Scope and audit rules

- Audit file: `audits/apex-atlas-live-run-sequential-audit-2026-10-03.md`
- Goal: trace one normal UI-equivalent Apex Atlas launch from discovery through investigation and any new card creation, stopping at the first genuine failure boundary.
- The launch request must match the dashboard defaults: `POST /api/ingest/atlas-run` with `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`.
- Exactly one launch is authorized for this audit. Do not retry a failed run, use a test/harness bypass, start a continuation, or issue standalone provider readiness probes.
- A completed job or a summary count is not proof of a card. Compare the pre-launch entity IDs/counts to newly persisted entities, cases, and evidence.
- Star only entities created by this run, promptly after each new entity is confirmed. Do not change existing cards.
- Do not record secrets, credential-like values, raw emails/phone numbers, or unnecessary personal data. Record timestamps, job/event/entity IDs, status transitions, sanitized errors, action types, and public evidence provenance.
- Keep a sequential record as the run proceeds. On a genuine failure, preserve the terminal state and post-run ledger, then stop.

## Previous attempts reviewed

- `audits/apex-live-run-sequential-audit-2026-10-01.md`: the one UI-equivalent launch was accepted but failed at Gemini Boss opening with provider HTTP 503, before Right-hand review, Investigator selection, web discovery, target research, evidence admission, or card creation. The audit correctly stopped without retry.
- The 2026-10-01 audit also summarized 2026-09-26/29 failures: schema drift, Serper HTTP 400, Gemini provider 429/403/503, prompt-size HTTP 413, invalid test-harness contracts, and Redis lock initialization failures. Do not repeat the bypass/harness attempts or assume a configured key proves provider capacity.
- Current source differs from that earlier run: discovery now enters through the canonical UI launch and uses the current Groq Boss / Mistral Right-hand control path. Use the current source contract and current system status; do not issue provider connectivity probes.
- Prior audit warning: `research_evidence` has `session_id` and `entity_id`, not `case_id`. Reconcile evidence through its actual schema.
- Prior admission lesson: compare ledger deltas and provenance; a contact/finding summary alone is not evidence that a new card was admitted.

## Setup issues in this imported workspace

During the 2026-10-02 import and first boot, the API build encountered and resolved these blockers before any Atlas launch:

1. The event-schema guard rejected the canonical writer role `groq_boss`; the declared event-role schema, replay role list, and guard were aligned.
2. The recovery boundary guard expected an older Gemini-only set although current code also supports the durable Mistral Right-hand failure state; the guard was aligned with the implementation.
3. The Mistral Right-hand readiness function was missing a closing brace; the source syntax was repaired.
4. The Right-hand credential guard expected a literal suffix string, while current code constructs role-scoped environment-variable names; the check was updated to validate the existing construction.
5. After the API first served, dashboard requests returned HTTP 500 because the new development database had no application tables. Read-only inspection confirmed it had no public tables. The repository's explicit schema initializer was run against that empty development database; it created the required tables and inserted no sample rows.

After setup, the API build guards passed, the app served `/`, `/api/healthz` and the dashboard data routes returned HTTP 200, and the preview showed an empty ledger. These setup fixes did not launch research.

## Sequential record

### 000 — Audit opened before launch

- **Local timestamp:** `2026-10-03 05:18:59 EEST` (`2026-10-03T02:18:59Z`)
- **Action:** Created this audit file before restarting or launching Atlas.
- **Status:** `preflight`
- **Prior audit review:** Completed; no previous job is being resumed or retried.
- **Next action:** Restart the existing API workflow, inspect non-probing readiness and active-job state, and capture a read-only database baseline.

### 001 — API workflow and non-probing readiness

- **UTC timestamp:** `2026-10-03T02:19:57Z` (`05:19:57 EEST`)
- **Action:** Restarted the existing `artifacts/api-server: API Server` workflow. Its build guards passed and the server reached its start command.
- `GET /api/healthz`: HTTP `200`; API `ok`, Redis `ok`, research-key configuration present.
- `GET /api/system/status`: HTTP `200`; `bureauIntegrity=ok`, no integrity reasons, Postgres `ok`, local Redis `ready`, configured Upstash slot `ready`. The status snapshot reports configured Groq/Mistral/Boss/Right-hand and web-search lanes, but this is configuration status, not provider-capacity proof.
- `agenticLlmLastOk=null` because the restarted process has no recorded LLM step yet. No provider connectivity/readiness probes were made.
- `GET /api/ingest/job/active/atlas-run`: HTTP `200`; `active=false`, `jobId=null`.
- **Interpretation:** No job is in flight. Redis reports ready, but the earlier audit warns that this does not prove remaining monthly command quota. Proceed with only the one requested launch; do not retry if it fails.

### 002 — Pre-launch database baseline

- **UTC timestamp:** `2026-10-03T02:19:58Z` (read-only development-database query)
- **Action:** Counted the durable ledger tables and captured existing entity IDs, creation times, and star flags.
- **Baseline:** `entities=0`; `research_cases=0`; `research_case_events=0`; `research_sessions=0`; `research_run_events=0`; `research_evidence=0`; `contact_evidence=0`.
- **Pre-launch entity IDs:** none. No pre-existing cards will be starred or modified.
- **Interpretation:** The database is empty after schema initialization. All later row counts and entity IDs are attributable to this run.

### 003 — UI launch contract and star behavior

- **UTC timestamp:** `2026-10-03T02:20:00Z`
- **Action:** Rechecked the existing dashboard launch handler and entity-star endpoint.
- **Launch defaults:** `targetCount=3`, `researchDepth=standard`, `targetTimeoutMs=420000`; the dashboard calls `POST /api/ingest/atlas-run`.
- **Star action:** For each newly persisted entity, set `isStarred=true` through the existing `PATCH /api/entities/:id/star` endpoint. Only baseline-new entity IDs qualify.
- **Next action:** Submit the exact default dashboard request once; record its response before polling.

### 004 — Canonical UI-equivalent launch accepted

- **UTC timestamp:** `2026-10-03T02:20:17Z` (`05:20:17 EEST`)
- **Request:** One `POST /api/ingest/atlas-run` with `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`.
- **Response:** HTTP `202 Accepted`; `singleTargetId=null`; the canonical model-owned discovery job was accepted.
- **Job ID:** `7fa7235a-569f-4767-8fcf-87facd923af1`
- **Poll URL:** `/api/ingest/job/7fa7235a-569f-4767-8fcf-87facd923af1`
- **Interpretation:** Acceptance proves only that the launch boundary accepted the job. Discovery, research, evidence admission, and card creation remain unproven.
- **Next action:** Observe only this job and its durable event/ledger deltas. Do not submit another launch.

### 005 — Opening control action persisted

- **UTC timestamps:** Discovery case created `2026-10-03T02:20:20.541123Z`; opening event recorded `2026-10-03T02:20:20.707851Z`.
- **Durable case:** `caseId=1`, `caseType=discovery`, status `review`, iteration `0`, current action `mistral-right-hand-unavailable`.
- **Durable event:** `eventId=1`, `actorRole=groq_boss`, `eventType=assignment`, status `recorded`, model `openai/gpt-oss-120b`, correlation key `7fa7235a-569f-4767-8fcf-87facd923af1:boss-opening`.
- **Interpretation:** The Groq Boss opening assignment was the only recorded control action. No Mistral Right-hand approval event, Investigator selection, search, visit, or discovery admission was recorded.

### 006 — Terminal failure boundary and post-run reconciliation

- **Job terminal timestamps:** started `2026-10-03T02:20:17.957Z`; finished `2026-10-03T02:20:21.686Z` (3.7 seconds).
- **Terminal observation:** At `2026-10-03T02:20:53Z`, `GET /api/ingest/job/7fa7235a-569f-4767-8fcf-87facd923af1` returned HTTP `200`: status `failed`, progress `0/4`, `atlasPhase=0/4`, outcome `incomplete`.
- **Exact terminal message:** `Mistral Right-hand unavailable; failing closed: Mistral Right-hand mistral-small-2603 rate_limited: [object Object]`
- **Failure classification:** The durable job message classifies the Mistral Right-hand call as `rate_limited`. The message stringifies its structured detail as `[object Object]`, so no more specific HTTP status or provider error body is available in the persisted response. This does not establish whether the cause was a quota, rate window, or another provider-side limit.
- **Break point:** Required Mistral Right-hand review immediately after the Groq Boss opening assignment. The job stopped before Investigator selection, web discovery, visits, candidate admissions, target-scoped research, evidence admission, or card/entity creation.
- **Post-run active lane:** `GET /api/ingest/job/active/atlas-run` returned `active=false`, `jobId=null`.
- **Final durable counts:** `research_cases=1`; `research_case_events=1`; `research_sessions=0`; `research_run_events=0`; `research_evidence=0`; `contact_evidence=0`; `entities=0`.
- **New cards and stars:** No entity/card was created, so there was nothing to star. No pre-existing card was changed.
- **Workflow logs:** The managed API workflow remained running. Log refreshes after the launch had no new application log output; the durable job response and PostgreSQL case/event rows are the evidence for the failure boundary.
- **Decision:** Stop here. No retry, recovery/continuation, harness, provider readiness probe, or second launch was issued.

## Run outcome

**Stopped at the first live failure boundary.** The one default UI-equivalent launch was accepted, persisted a Groq Boss opening assignment, then failed closed when the Mistral Right-hand returned a `rate_limited` classification. Discovery, research, evidence, and card creation were not reached. The final ledger contains one discovery case and one opening event, but no entities or evidence. No card was available to star, and no retry was made.
## 014 — Post-run source reconciliation and committed remediation

- **UTC timestamp:** 2026-10-03T11:45Z onward.
- **Action:** Reconciled the live-audit diagnosis against the actual GitHub `main` source rather than relying on the imported Replit workspace state.
- **Confirmed source defect:** the canonical Groq Right-hand adapter on `main` still sent the unsupported GPT-OSS request field `reasoning_format:"hidden"`. The earlier claimed fix was not present on `main`.
- **Confirmed source defect:** the canonical discovery compactor clipped individual fields but did not enforce a total serialized discovery-context budget. The Right-hand's existing 20,000-character guard could therefore fail closed before reaching Groq.
- **Implementation committed and merged:** PR #460, merge commit `cdf7a08e9b1d8ff56f1e9331ef31763769d58a9b`.
  - Right-hand now sends `reasoning_effort:"medium"` with `include_reasoning:false`, never `reasoning_format`.
  - Discovery context now uses progressively smaller deterministic profiles, bounds source URLs and organization-footprint notes, preserves the newest investigator report, and enforces a hard 20,000-character user-prompt budget with a 1,024-character reserve.
  - Offline regression coverage was added for both the request shape and oversized discovery context.
- **Additional committed reconciliation:** the health route no longer reports a fake Gemini Right-hand lane; README and living context now describe the canonical Groq-only control plane and retired operator authentication.
- **Verification:** the PR's Netlify deploy-preview status for commit `8428cf1a27ed8ffba79e3c47589df3a6e3599ae0` reached `success`. No live provider request was made as part of the source remediation.
- **Live-run status limitation:** the audit's last recorded job remains `78d032e0-6878-4276-aeb5-5ac5371b11e9` at the accepted-launch boundary. The GitHub repository does not contain the Replit runtime job state, and the Replit App connector did not expose the imported application by searchable app ID in this session, so no terminal state is invented and no second launch is issued.