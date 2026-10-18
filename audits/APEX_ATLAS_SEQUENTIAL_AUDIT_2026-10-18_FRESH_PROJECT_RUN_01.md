# ★ STARRED — Apex Atlas Sequential Audit — Fresh Project Run 01 — 2026-10-18

**Audit file:** `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-18_FRESH_PROJECT_RUN_01.md`  
**Source repository:** `https://github.com/2f22vtd4kr-cloud/BigContacts`  
**Source revision:** `main` / `65a7c47` (`Make discovery use valid leads before more broad searches`)  
**Run status:** Preflight complete; live launch not yet sent.  
**Purpose:** Record one UI-default discovery run from launch through the durable evidence/admission/card outcome, then reconcile it against the empty pre-run database baseline.

## Audit scope and disclosure boundary

- This tracked audit records verified timestamps, setup issues, job/case identifiers, provider role/model/status metadata, safe summaries of prompts and visible decisions, model-selected actions, sanitized search descriptions, source references, guard outcomes, errors, and durable count deltas.
- It does not contain API key values, credentials, hidden chain-of-thought, provider-private reasoning fields, raw email/phone values, or unredacted personal contact details. The provider API does not expose private reasoning as a normal completion; the audit logger explicitly excludes private-reasoning fields.
- The repository's raw model request/response logger remains configured for its protected `private-audits/` path with contact capture disabled. That raw logger is not copied into this tracked file. The tracked audit path was checked and is not ignored by Git; no ignore rule was changed.
- Search descriptions and prompt summaries here will be redacted where they identify a private person or expose contact data. Operational details and non-sensitive public-source provenance will be preserved.
- An HTTP 202 or successful model call is not a successful run. Success requires a terminal job plus at least one new, provenance-backed admission/card in the durable database, verified against the pre-run baseline. No search result, model claim, or dashboard count alone proves that.
- No records or evidence will be fabricated. A failed or incomplete run will remain recorded as failed or incomplete.

## Setup and previous-attempt context

1. The repository is imported on `main` at source revision `65a7c47`; the Replit Git metadata is preserved. The app source is unchanged from that commit.
2. The app is running through the repository's single API workflow on port `8080`; the existing desk is served at `/`.
3. The approved one-time development schema initialization completed. The schema initializer verified the required tables. It is not part of ordinary app startup.
4. All 13 requested secret names are present. Secret values were not read or printed. Provider authentication, remaining request quotas, and future capacity are not inferred from key presence.
5. The API health endpoint reports `ok`, Redis `ok`, and `researchKeysConfigured=true`. These are readiness signals only, not proof of provider capacity or research quality.
6. Before this launch, the canonical Atlas active-job endpoint returned `active=false`, `jobId=null`. The current development database baseline is: `entities=0`, `assets=0`, `relationships=0`, `research_cases=0`, `research_case_events=0`, `research_evidence=0`, `contact_evidence=0`.
7. Prior imported audits document two materially different failures:
   - `audits/APEX_ATLAS_NEW_PROJECT_IMPORT_POSTRUN_ANALYSIS_2026-10-18.md`: the opening Right-hand call failed before Investigator startup due to output-token exhaustion. The source change added bounded task-scoped output-budget recovery; a launch receipt was not research success.
   - `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-18_REPLIT_LIVE.md`: the prior live attempt reached Investigator research but ended incomplete with no findings/admissions/cards. Observed Groq 429s were token-window limits with request capacity still available, not hard request-quota exhaustion.
8. Other prior attempts in those reports had no admitted card. Do not treat their jobless test telemetry as live research, do not assume this new project's empty database represents another project's state, and do not infer a card-rendering defect when admission never occurred.
9. Capacity rule for this run: distinguish token-window limits from explicit hard quota exhaustion using provider diagnostics. Do not manually rotate credentials or force a different Investigator on a token-window error. Any reassignment must be the existing bounded Boss-directed path, and must be recorded as such. Do not launch a concurrent job or repeatedly restart into a known capacity failure.

## Pre-launch gate

- UI-equivalent request defaults, from `launchAtlasPipeline()`: `targetCount=3`, `researchDepth="standard"`, `targetTimeoutMs=420000`; no synthetic target or hand-written search query.
- Request to send: `POST /api/ingest/atlas-run` with `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`.
- Active lock is idle and all current development entity/evidence counts are zero.
- The model audit logger is configured to capture model-visible requests/responses in its protected local destination, with direct contact capture disabled. The tracked file remains a sanitized, chronological report.
- No live research request has been sent for this run as of this section.

## Live chronology

_Append verified observations as the job progresses. At each checkpoint distinguish proposed action, authorized action, outbound request, returned source, accepted evidence, admission, and durable card._

### 1. Canonical UI-default launch

- **2026-10-18 14:52:23 UTC / 17:52:23 Europe/Kyiv:** Rechecked the canonical active-job endpoint immediately before launch; it was idle.
- Sent one `POST /api/ingest/atlas-run` using the UI helper's exact defaults: `targetCount=3`, `researchDepth=standard`, `targetTimeoutMs=420000`. No target, company, person, or search query was supplied by the operator.
- **HTTP 202**; job `26b31975-4c0c-41fd-a56f-9ad944782064` was accepted for asynchronous canonical model-owned discovery. This is a launch receipt only, not evidence of discovery, research, admission, or card creation.
- Next observation: inspect durable job state and live bureau telemetry without copying raw prompt/contact payloads into this file.

### 2. First terminal observation — failure, not success

- Job `26b31975-4c0c-41fd-a56f-9ad944782064` reached terminal `status=failed`, `outcome=incomplete` by **2026-10-18 14:52:34.531 UTC** (17:52:34.531 Europe/Kyiv), about ten seconds after acceptance.
- Reported progress: phase 3 of 4; `inserted=0`, `skipped=0`, `dedupCount=0`. The canonical active-job endpoint returned idle after termination.
- The protected model audit contains five request/response pairs before termination: Boss → Right-hand → Investigator → Right-hand → Boss. All five provider responses were HTTP 200; no provider 429 or hard-quota exhaustion was observed in this attempt. This does not explain the failure by itself.
- This run has not produced a qualifying admission or card. Do not launch a second run yet. Inspect the sanitized job failure, trace spans, bureau events, and durable case record first; determine whether a code/configuration defect has a bounded architecture-safe fix.
- **Failure evidence (14:53:15 UTC inspection):** the job's safe terminal message says the canonical control stopped without an evidence-backed terminal state and preserved the case for review. Its two retained bureau log entries are (1) Investigator wait for the Boss-selected `identity_resolution` decision, and (2) `parse_failure_terminal`: repeated invalid action contracts; stop without inventing a research action. The recorded investigator capability alias was `groq-investigator-1`; the API model response itself was HTTP 200.
- The source parser's fail-closed branch states that an unusable action object produces no outbound request. Thus this attempt stopped at model-action parsing, before any search or page visit; it is not an exhausted-key failure and does not justify switching Investigator credentials.
- **Model/action boundary (17:52:32 UTC):** the Investigator selected `parallel_web_search` and proposed two Serper search actions. The model-visible action had a non-string `hypothesis`; the runtime requires a non-empty string hypothesis and purpose plus a bounded information-gain value. Validation rejected the contract before any search ran. Raw query text is intentionally not copied here.
- **Durable sequence:** case 1 received the Boss assignment, Right-hand review observation, and Investigator assignment; then a `tool_observation` error at 14:52:32.205 UTC; the Boss recorded `stop` at 14:52:33.837 UTC. The current database now contains one preserved review case and five case events, with zero entities, assets, relationships, evidence, or contact evidence. The active-job lock is idle.
- **Root cause in the active wrapper:** each model-owned act intentionally calls the core with a one-action budget so the bureau can assess each action. The core correctly reports a one-turn `PARSE_FAILURE`; however, the wrapper currently returns immediately for every result other than `completed/ITERATION_BUDGET`. That bypasses its configured two-consecutive-failure limit and prevents the intended one bounded corrective Investigator turn. The Boss then made a model-owned stop decision with no evidence.
- **Correction boundary:** change only the wrapper so that one `PARSE_FAILURE` can continue to a fresh Investigator turn when the existing failure limit and job action budget allow it. Keep the invalid action rejected, require a newly valid model-selected action before any tool runs, preserve the case/event trail, and stop on a second consecutive invalid contract. This is not a credential rotation or a forced search.

### 3. Bounded recovery fix and unit verification

- **2026-10-18 15:01 UTC:** Updated the active Investigator wrapper, not the unused duplicate/core logic. The wrapper now continues after a first `PARSE_FAILURE` only when the existing consecutive-failure limit and outer action budget leave room. The rejected contract remains in the durable trajectory and mounted continuation context; no rejected query/tool is replayed. A second consecutive parse failure, exhausted action budget, provider error, or other failure still stops.
- Added focused tests for first-failure recovery, second-failure stop, exhausted-budget stop, and non-parse provider failure.
- **Verification:** the new wrapper tests plus existing Groq Investigator runtime-contract tests passed: 2 test files, 24 tests. Full build and runtime restart are pending. No second live job has been submitted.
- **2026-10-18 15:02:26 UTC:** The full API build completed successfully, including the repository's architecture/integrity guards, Vitest suite, and bundle generation. `git diff --check` passed. The worktree contains only the intended wrapper fix, its regression test, and this tracked audit; no build script rewrote source. The API bundle includes the new recovery helper. Runtime restart is pending.
- **2026-10-18 15:03 UTC:** Restarted the single configured API workflow. Boot reran the full build successfully and started `dist/index.mjs`; its bundle contains the recovery branch. Post-restart `/api/healthz` is `ok`, Redis is `ok`, research keys are configured, and the active Atlas lock is idle. The first job remains terminal and its review case is preserved.

### 4. Second canonical UI-default launch — after the recovery fix

- **Run-2 baseline at 15:03:31 UTC:** health and Redis remained `ok`, research keys were configured, and the canonical active-job endpoint returned idle. Durable counts: `entities=0`, `assets=0`, `relationships=0`, `research_cases=1`, `case_events=5`, `research_evidence=0`, `contact_evidence=0`. The existing case is only the preserved failed Run 1.
- **2026-10-18 15:03:37 UTC / 18:03:37 Europe/Kyiv:** submitted one new canonical UI-default request with the unchanged body `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`. No target or query was supplied.
- **HTTP 202**; job `9376b339-fac1-447d-8bd6-8166692dacf3` was accepted. Run 1 remains terminal, and only this one Run-2 job is active. This receipt is not a success claim.
- Monitor this job's model-role transitions, approved tool actions, source-backed findings, admissions, and terminal card projection. Do not start another job while it is active.
- **2026-10-18 15:04:32 UTC checkpoint:** Run 2 is still `running`, phase 1/4, with the active lock held by this job. Boss and Right-hand each returned HTTP 200; the Investigator returned HTTP 200 for its first action, and one model-selected `web_search` through Serper completed with span status `ok` at 15:03:47.239 UTC. The next Investigator request received HTTP 400 `json_validate_failed` / `invalid_request_error`. This is a structured-request validation error, not a key-exhaustion or 429 signal. No search text is copied here. Durable case 2 currently has the three control assignments/review events plus one successful tool-observation event; no admission or card has yet been verified.
- **2026-10-18 15:05:04 UTC checkpoint:** The same Investigator capability then completed its bounded recovery sequence: attempt 1 returned HTTP 400 `json_validate_failed`; attempt 2 returned the same classification, with a provider failed-generation payload present but not classified as completion-budget exhaustion; attempt 3 returned HTTP 200. A subsequent Investigator request also returned HTTP 200. No credential rotation occurred, and no 429/hard-quota error was recorded. The job remains active in phase 1/4; the successful Serper action is the only confirmed external research action so far. Admission and card creation remain unverified.
- **2026-10-18 15:06:32 UTC checkpoint:** Run 2 remains active in phase 1/4. The in-memory action trace now shows three successful `web_search` spans and three `visit` spans (one `ok`, two `error`); search text, URLs, and page contents remain redacted here. This is tool activity only, not proof of usable evidence or admission.
- **2026-10-18 15:07:10 UTC provider checkpoint:** After two more Investigator decisions (HTTP 200), the Investigator received three HTTP 429 responses classified `rate_limit_exceeded`, `type=tokens`. The Right-hand also hit two token-type 429s, then its configured `openai/gpt-oss-20b` fallback succeeded with HTTP 200; the Groq Boss call succeeded with HTTP 200. The Atlas lock still belongs to Run 2. These are token-window capacity errors, not hard request-quota exhaustion; no manual Investigator credential switch was made. Continue observing for the existing bounded Boss-directed token-capacity reassignment path, not an operator-forced one.
- **Observer note:** a local background poller failed to start because its Node script mixed CommonJS `require()` with top-level `await` under the ESM runtime; a separate status-summary command also had a jq field-reference typo. Neither touched the app or job. Direct sanitized API polling resumed and confirmed the job/lock state.

