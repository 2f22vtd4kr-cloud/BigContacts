# ⭐ Apex Atlas Sequential Audit — LIVE RUN 05

- **Status:** Recovery in progress; first canonical attempt failed before discovery tools or card creation.
- **Started:** 2026-10-14 08:12:46 UTC (11:12:46 Europe/Kyiv).
- **Scope:** development environment only; trace setup, canonical discovery, Investigator research, oversight/control handoffs, tools and public sources, durable evidence/admission, card creation, retries, and terminal state.
- **Source:** repository `2f22vtd4kr-cloud/BigContacts`, branch `main`, commit `bd2af37fac9d9b58574f425366bec909751e292b`.
- **Launch contract:** UI-equivalent `POST /api/ingest/atlas-run` using the repository's canonical default body, unless a user-selected target overrides it.

## Audit boundary

This is a chronological record of observable system behavior: timestamps, API requests/responses, role/provider/model labels, request-shape metadata, structured decisions and summaries exposed by the application, durable state transitions, exact public search strings, tool names/results, source URLs, evidence/admission/card deltas, errors, and recovery actions.

It does **not** contain hidden chain-of-thought, private model reasoning, secrets, credentials, cookies, or reconstructed prompts. The repository's development prompt-audit hook records request shape only (role/model, safe scalar parameters, message roles and character counts, schema/tool counts); it deliberately excludes message bodies, source text, tool descriptions, and full schemas. No instrumentation or research policy is being changed to bypass that boundary. Any model rationale recorded below is the concise structured output visible from the application, not private reasoning.

Public contact facts may be included only when directly observed in a cited public source and relevant to a business/professional card. Do not include private/home contact details, unverified search-snippet contact strings, or inferred data. Never treat a search lead, model statement, placeholder, or generic company contact as person-attributed evidence.

## Setup and preflight chronology

### Event 000 — audit opened and starred

- **Time:** 2026-10-14 08:12:46Z.
- **Action:** created this visible audit before launching the run; the filename is starred in this heading and linked from `APEX_ATLAS_RUN_AUDIT.md`.
- **Result:** the configured development prompt-audit destination already points to this file. Prompt capture is summary-only as described above.
- **Research activity:** none.

### Event 001 — repository import and build

- **Action:** fetched the public GitHub repository into the existing Replit checkout, preserving its `.git` metadata; checked out `main` at `bd2af37fac9d9b58574f425366bec909751e292b`.
- **Setup issue:** the prior conversation's GitHub integration reconnect flow did not complete. Direct read-only Git access to the provided public repository succeeded, so no GitHub integration was needed for the import.
- **Dependencies:** `pnpm install --frozen-lockfile` completed successfully; the lockfile remained unchanged.
- **Startup issue:** the first running process served the API only, so `/` returned 404. Restarting the managed API workflow picked up the repository's canonical `scripts/replit-boot.sh`, built the frontend and API, and restored the homepage.
- **Verification:** canonical boot checks and both builds completed; no research was launched.

### Event 002 — empty development database initialized

- **Initial fault:** the first rendered dashboard made several data requests that returned HTTP 500 because the development database had no public tables.
- **Safety check:** read-only `information_schema.tables` query returned no public tables. The database was empty before initialization.
- **Recovery:** ran the repository's documented one-time initializer with `APEX_ALLOW_SCHEMA_PUSH=true`: `bash scripts/initialize-apex-schema.sh`. It applied the current Drizzle schema, durable hardening, and compatibility migrations; the registry migration corrected 0 legacy rows, and required durable tables were verified. The override was scoped to this command only.
- **Post-init verification:** `/api/healthz`, `/api/dashboard/stats`, `/api/dashboard/hot-leads`, and `/api/ingest/scoreboard-snapshot` returned HTTP 200. Redis was healthy and `researchKeysConfigured=true`. The 13 requested secret names were present; values were not read or logged. The dashboard shows zero entities and no sample data was seeded.
- **Research activity:** none.

### Event 003 — previous-attempt review

- Reviewed `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-14_LIVE_RUN_04.md` and `APEX_ATLAS_RUN_AUDIT.md` before the new launch.
- Run 04 recorded two standard discovery jobs that both ended `failed/incomplete`, with no entity/evidence/admission/card delta. Both Investigator failures were HTTP 429 token-window capacity errors (`type=tokens`), while request quota remained available; no `upstream_quota_exhausted` event was observed.
- Earlier attempts also recorded a malformed structured action (`json_validate_failed`), an HTTP 413 oversized prompt, broad searches that did not support a candidate, and an apparent control-objective/search mismatch. Those are distinct failure classes; none by itself proves an exhausted credential.
- The current source already has a model-owned, durable alternate-capability path for explicit `upstream_quota_exhausted`. It excludes aliases of the exhausted credential and requires Boss to select a distinct configured capability. Do not rotate on token-window waits, 400/413 format/context errors, or generic failures. Do not add a scripted provider/research ladder or weaken evidence/admission gates.
- **Current authorization:** the user explicitly requested a UI-equivalent canonical launch and one complete run. Use only the canonical launch path. Do not run multiple jobs concurrently or send an unbounded retry loop.

### Event 004 — current readiness snapshot

- **Time:** 2026-10-14 08:13:33Z.
- `GET /api/ingest/job/active/atlas-run` returned `active=false`, `jobId=null`.
- Read-only development baseline: `entities=0`, `research_cases=0`, `research_case_events=0`, `research_evidence=0`, `contact_evidence=0`, `research_sessions=0`, `research_run_events=0`.
- Development health returned `status=ok`, Redis `status=ok`, and `researchKeysConfigured=true`.
- The canonical app is running on `main`; the working tree was clean after import and setup before this audit file was created.
- UI-equivalent launch defaults in the source: discovery-first; `targetCount=3`; `researchLimit=3`; `runResearch=true`; `skipFaa=true`; `targetTimeoutMs=420000`; `researchDepth=standard`.
- The default discovery objective is model-led public-business discovery; no person or organization will be hard-coded by this audit. The Investigator selects each action, while deterministic runtime checks continue to enforce source, identity, contact-scope, safety, and persistence requirements.

### Event 005 — current-commit capability recovery verified

- **Time:** 2026-10-14 08:14:24Z.
- **Source inspection:** confirmed two separate recovery branches in the current `main` source. Explicit `upstream_quota_exhausted` excludes the exhausted Investigator credential and all aliases. Persistent `upstream_token_window_wait_exceeded` is kept distinct from hard request-quota exhaustion and permits at most one Boss-directed reassignment after two consecutive unavailable discovery episodes and bounded same-capability retry.
- The alternate must be a distinct configured Investigator capability; Groq Boss chooses it, and the replacement is persisted on the same case with prior evidence/trajectory retained. If there is no viable distinct alternate or Boss does not select one, the case parks for review. No provider ladder or code change is being added.
- This current implementation is more recent than the prior run-04 policy snapshot. Run 05 will observe the committed behavior rather than reproduce run 04's assumption that token-window failures can never reassign.
- **Launch readiness:** no active Atlas job, empty durable baseline, healthy services, canonical UI request confirmed. No run-05 provider/search activity has yet occurred.

### Event 006 — canonical UI-equivalent launch accepted

- **Time:** request submitted 2026-10-14 08:14:59Z; response received 08:15:00Z.
- **Preflight:** health HTTP 200 (`status=ok`, Redis `ok`, `researchKeysConfigured=true`); active Atlas lane was `false`.
- **Action:** one `POST /api/ingest/atlas-run` with exactly `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`. No target ID, credentials, or private contact data were sent in the body.
- **Result:** HTTP 202; canonical model-owned discovery started. Job `74e6a33d-9429-4335-bd42-f02cd3bd09b2`; poll path `/api/ingest/job/74e6a33d-9429-4335-bd42-f02cd3bd09b2`; `singleTargetId=null`.
- **State:** the run is asynchronous and in progress. No admission, card, or terminal outcome is claimed yet.

### Event 007 — first attempt failed during opening oversight

- **Time:** job started 2026-10-14 08:14:59.928Z and became terminal 08:15:05.401Z; first status read returned the terminal state.
- **Job:** `74e6a33d-9429-4335-bd42-f02cd3bd09b2`; status `failed`, outcome `incomplete`, progress `0/4`, no inserted/skipped/error counters, no job log entries.
- **Failure:** `stage=right_hand_opening_review`, `failureDomain=unexpected_programming_error`, `failureKind=unexpected_exception`; API exposed sanitized error digest `b07ef7aab9a26644`. The application had emitted one Groq Boss request and one Groq Right-hand request (both `openai/gpt-oss-120b`, HTTP outcome not present in the prompt-shape file). No search/tool result or candidate is established by this response.
- **Immediate action:** preserve this terminal job and inspect its durable case/events and server diagnostics before any retry. Do not infer an LLM quota failure from this programming-error classification, and do not rotate an Investigator for it.

### Event 008 — first durable-event inspection

- **Time:** immediately after the terminal status was observed.
- Read-only event query found one durable event for this job: event `1`, case `1`, iteration `0`, actor `groq_boss`, type `assignment`, summary “Groq Boss opened the canonical Atlas discovery case and selected the Investigator.” No Right-hand event, Investigator action, search/tool observation, evidence, or card event was present in that query.
- Schema discovery and a corrected read-only case query confirmed case `1` is `review`, `current_action=canonical-atlas-failed`, iteration `0`, with this job ID. The case file contains only its initial setup keys; no Right-hand result was committed. The active Atlas lane is now clear.
- **Inspection error:** an initial read-only SQL query guessed a nonexistent `investigator_model` column and failed with PostgreSQL `column does not exist`. It performed no write and returned no data. The next query will discover the actual columns before reading the case summary.
- **Interpretation:** current durable trace localizes the break between the Boss assignment and the Right-hand opening-review persistence boundary. Exact cause is not yet known.

### Event 009 — failure digest resolves to invalid Right-hand contract

- **Time:** 2026-10-14 08:15Z, during source-based failure triage.
- The job's digest `b07ef7aab9a26644` matches the SHA-256-truncated digest of the exact error branch present in the running source: `Groq Right-hand returned invalid oversight: Right-hand returned an invalid opening review contract.`
- **Conclusion:** Groq Right-hand did return a response, but the response failed the opening-review schema/contract validation. This was not an Investigator failure, hard quota exhaustion, token-window exhaustion, or evidence/search failure. The selected Investigator was never called.
- **Observed design gap:** `runGroqRightHandFreeJson` returned the first non-empty model response without checking the caller's strict response contract, so the existing same-role catalog fallback was not reached when that response was structurally invalid. The audit cannot reconstruct the rejected response and does not retain its contents.
- **Planned bounded fix:** validate the opening-review response before accepting it; allow the existing Right-hand model chain to try its next catalog-listed model once if the first response is invalid; keep the same credential and role, preserve strict validation, and fail closed if none returns a valid contract. Classify a final invalid contract explicitly rather than as a programming exception. No Investigator rotation or research action will be added.

### Event 010 — focused tests pass; workspace typecheck needs generated declarations

- **Time:** 2026-10-14 08:21:48Z.
- Focused Right-hand and failure-classification tests passed: 25 tests across 2 files, including the new bounded same-role fallback case.
- API-server typecheck did not complete successfully: TypeScript reported 181 missing exports across 62 files, primarily from stale generated `@workspace/db` and `@workspace/api-zod` declaration outputs. The errors point at package exports (for example `entitiesTable`, `researchCasesTable`, and generated API types), not a failed runtime test. No database mutation or run occurred.
- **Next action:** rebuild the imported workspace package outputs using their existing package scripts, then rerun the API typecheck. No package install or lockfile edit is planned.

### Event 011 — bounded Right-hand fallback implemented and checks pass

- **Time:** 2026-10-14 08:21Z onward.
- **Code change:** the opening Right-hand review now validates each response against the existing strict contract before accepting it. If invalid, it advances only to the next model already listed by the live Groq catalog for the same Right-hand role and credential. It does not rotate credentials, relax the schema, or start Investigator/search work on an invalid oversight result. The provider-stage classifier now labels a final invalid review contract as `model_provider / invalid_contract`.
- **Verification:** focused tests passed (25 tests / 2 files), including the new case where an invalid GPT-OSS 120B contract falls through to a valid GPT-OSS 20B response using the same credential. `pnpm run typecheck:libs` refreshed generated library declarations; the API-server typecheck then passed. The initial 181 export errors were stale declaration artifacts, not source errors.
- **State:** API workflow restart and one bounded canonical retry are next. The failed first job remains preserved as incomplete.

### Event 012 — API rebuilt and healthy after restart

- **Time:** 2026-10-14 08:23:28Z.
- Managed API workflow rebuilt the current dirty source into `dist/index.mjs`; canonical startup and source-boundary checks passed, including the model-role and recovery-boundary checks.
- Post-restart health returned HTTP 200, `status=ok`, Redis `ok`, and `researchKeysConfigured=true`. The first job remains failed/incomplete as recorded; the active Atlas lane is `false`.
- **Next action:** one retry through the same canonical UI-equivalent launch body. No other active run is present.

### Event 013 — bounded canonical retry accepted

- **Time:** retry submitted 2026-10-14 08:23:40Z; HTTP 202 response received 08:23:41Z.
- **Preflight:** active Atlas lane was `false`.
- **Action:** one `POST /api/ingest/atlas-run` with the same UI body, `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`. No target ID or credentials were sent.
- **Result:** HTTP 202; job `1c45082e-9fc9-465a-8d46-ad5e1d0ec27b`, poll path `/api/ingest/job/1c45082e-9fc9-465a-8d46-ad5e1d0ec27b`; discovery-first canonical run accepted.
- **State:** no terminal result or card/admission claim yet.

### Event 014 — second attempt failed after bounded Right-hand fallback

- **Time:** job started 2026-10-14 08:23:41.094Z and became terminal 08:23:49.890Z.
- **Job:** `1c45082e-9fc9-465a-8d46-ad5e1d0ec27b`; status `failed`, outcome `incomplete`, progress `0/4`, zero inserted/skipped/error counters, no job log entries.
- **Model trace:** Boss request `ac22a5a8-5cdc-475b-a325-b71e730162b8` used Groq GPT-OSS 120B. The opening review then attempted Groq Right-hand GPT-OSS 120B (`11fe2fce-a514-4f6e-a8d3-723c19cdebc3`), fell through to GPT-OSS 20B (`faec9a4f-af85-4f2d-bf9c-32e2acce49b3`), and made one further bounded same-model request (`55bf0ae8-5089-4084-9324-13be1da3f48e`). Request-shape records and message lengths are preserved in the model-audit entries below; response bodies and hidden reasoning are not.
- **Result:** terminal message reports `stage=right_hand_opening_review`, `failureDomain=model_provider`, `failureKind=invalid_contract`. No Investigator action, search, source visit, candidate admission, evidence, or card was recorded. The fallback executed but did not produce an accepted opening-review contract.
- **Source finding:** the response schema asked for the four fields but omitted all length/count/range bounds enforced by `validateAtlasOpeningRightHandReview` (decision, reason, focus-lane count/length, and confidence range). Thus a model response could satisfy the advertised JSON schema yet still be rejected by the application validator. The exact rejected field is not persisted, so this is a contract mismatch, not proof of which field failed.
- **Next fix:** make the schema and concise output instructions explicitly match the existing validator bounds, retain the same strict validator and bounded model fallback, then rerun once.

### Event 015 — response schema bounds aligned; test assertion needs a typing correction

- **Time:** 2026-10-14 08:25:46Z.
- **Code change:** opening-review JSON schema and concise instructions now explicitly match the existing validator's string lengths, focus-lane count/length, and confidence range. Strict validation remains unchanged.
- The two focused test files passed again (25 tests), including fallback behavior.
- **Typecheck result:** four errors were confined to a test variable assigned inside a mocked callback; TypeScript narrowed that nullable local to `never` at the assertions. The API source itself reported no error. Replacing that test capture with a mutable collection, then rerunning typecheck.

### Event 016 — schema/validator contract verified

- **Time:** 2026-10-14 08:26:21Z.
- The API-server typecheck now passes. The two focused test files pass again: 25 tests / 2 files. The Right-hand fallback test now exercises the actual opening-review schema and asserts all validator bounds survive request-format normalization.
- **Next action:** restart the API workflow to build the changed schema/instructions, verify health, then submit one canonical launch. The two earlier jobs remain failed/incomplete and unmodified.

### Event 017 — schema-aligned build is live

- **Time:** 2026-10-14 08:26:48Z.
- API workflow rebuilt and started successfully. Canonical startup guards passed, including recovery, provider-role, evidence/admission, and model-output persistence boundaries.
- Post-restart health returned HTTP 200 with Redis `ok` and `researchKeysConfigured=true`; active Atlas lane is `false`.
- **Next action:** submit the third and final bounded canonical attempt using the same UI body and observe whether the exact schema bounds resolve the Right-hand contract failure.

### Event 018 — third canonical attempt accepted

- **Time:** submitted 2026-10-14 08:27:06Z; HTTP 202 response received 08:27:07Z.
- **Preflight:** active Atlas lane was `false`.
- **Action:** one canonical `POST /api/ingest/atlas-run` with `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`; no target ID or credentials in the body.
- **Result:** job `f6f0e1e8-9c52-4c25-a1cd-7503772073d7`; canonical discovery accepted.
- **State:** awaiting durable job/case events. No success claim yet.

## Live trace

Append each material event promptly. Distinguish observed facts from interpretation; preserve failures and incomplete outcomes. Do not declare success unless the terminal run and fresh durable card/admission IDs are verified.


### Model request 985860cf-c8ca-4857-885e-9f992568820a

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:15:01.120Z",
  "requestId": "985860cf-c8ca-4857-885e-9f992568820a",
  "provider": "groq",
  "role": "groq_boss",
  "model": "openai/gpt-oss-120b",
  "attempt": 1,
  "jobId": null,
  "caseId": null,
  "requestSummary": {
    "model": "openai/gpt-oss-120b",
    "max_completion_tokens": 2048,
    "reasoning_effort": "medium",
    "include_reasoning": false,
    "temperature": 0.1,
    "stream": false,
    "messageCount": 1,
    "messages": [
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 9418,
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


### Model request f4eeba92-8aec-461e-9a32-6a30c2926359

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:15:03.401Z",
  "requestId": "f4eeba92-8aec-461e-9a32-6a30c2926359",
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
        "contentChars": 2247,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 3035,
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


### Model request 6d5f9aec-650e-48d2-a706-6851e654072d

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:21:50.076Z",
  "requestId": "6d5f9aec-650e-48d2-a706-6851e654072d",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 14844bda-cc7d-4948-8cb6-6f1b6e7144b0

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:21:50.081Z",
  "requestId": "14844bda-cc7d-4948-8cb6-6f1b6e7144b0",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 6999af8c-74cc-4568-8348-bade51cf9216

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:21:50.084Z",
  "requestId": "6999af8c-74cc-4568-8348-bade51cf9216",
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
        "contentChars": 1669,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 12286,
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


### Model request 0675acd8-3eed-42b8-8749-62bbc5822a4b

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:21:50.088Z",
  "requestId": "0675acd8-3eed-42b8-8749-62bbc5822a4b",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 71863aa1-2022-46ac-b76f-32898a9c3b9a

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:21:50.093Z",
  "requestId": "71863aa1-2022-46ac-b76f-32898a9c3b9a",
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
        "contentChars": 1644,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request c8b0ec51-7770-4aa9-95f4-109de0434670

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:21:50.098Z",
  "requestId": "c8b0ec51-7770-4aa9-95f4-109de0434670",
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
        "contentChars": 1644,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request ff9ed45a-485a-4975-9002-c26b85fe37b1

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:21:50.347Z",
  "requestId": "ff9ed45a-485a-4975-9002-c26b85fe37b1",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 5a1f6ba7-1441-42e6-97f3-9191321da5d1

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:21:50.349Z",
  "requestId": "5a1f6ba7-1441-42e6-97f3-9191321da5d1",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request e73edaa9-6f6c-42ee-b677-019dc70bbcf7

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:21:50.628Z",
  "requestId": "e73edaa9-6f6c-42ee-b677-019dc70bbcf7",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request dc09fe69-f41e-4f75-a3f9-dd495cb814d7

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:21:50.632Z",
  "requestId": "dc09fe69-f41e-4f75-a3f9-dd495cb814d7",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 3b92f7c5-11a6-42f2-bd8b-6df9601a8925

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:21:50.632Z",
  "requestId": "3b92f7c5-11a6-42f2-bd8b-6df9601a8925",
  "provider": "groq",
  "role": "groq_right_hand",
  "model": "openai/gpt-oss-20b",
  "attempt": 2,
  "jobId": null,
  "caseId": null,
  "requestSummary": {
    "model": "openai/gpt-oss-20b",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request a9580c7c-cb1f-48be-b2d9-02c2dd13116e

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:21:50.639Z",
  "requestId": "a9580c7c-cb1f-48be-b2d9-02c2dd13116e",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 26,
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


### Model request 67c1e00d-2453-4e84-bc86-0837b72ad45b

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:21:50.640Z",
  "requestId": "67c1e00d-2453-4e84-bc86-0837b72ad45b",
  "provider": "groq",
  "role": "groq_right_hand",
  "model": "openai/gpt-oss-20b",
  "attempt": 2,
  "jobId": null,
  "caseId": null,
  "requestSummary": {
    "model": "openai/gpt-oss-20b",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 26,
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


### Model request 6758d833-3be2-494c-873f-fac0cc28e5af

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:21:50.893Z",
  "requestId": "6758d833-3be2-494c-873f-fac0cc28e5af",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request b52c2235-8caf-47c6-98b5-5d5c5d96f7ef

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:21:50.895Z",
  "requestId": "b52c2235-8caf-47c6-98b5-5d5c5d96f7ef",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 99cc0513-e488-4356-b14c-315aefd9339b

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:21:51.149Z",
  "requestId": "99cc0513-e488-4356-b14c-315aefd9339b",
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
        "contentChars": 1635,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
        "itemCount": null
      }
    ],
    "messagesTruncated": false,
    "responseFormat": {
      "type": "json_schema",
      "schemaName": "apex_atlas_right_hand",
      "hasSchema": true,
      "strict": true,
      "schemaPropertyCount": 1,
      "requiredFieldCount": 1,
      "additionalProperties": false
    },
    "toolCount": null,
    "tools": [],
    "toolsTruncated": false,
    "toolChoiceKind": "undefined"
  }
}
```


### Model request 5ac200cf-faff-4db4-9afa-ac927d4491a1

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:21:51.150Z",
  "requestId": "5ac200cf-faff-4db4-9afa-ac927d4491a1",
  "provider": "groq",
  "role": "groq_right_hand",
  "model": "openai/gpt-oss-120b",
  "attempt": 2,
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
        "contentChars": 1635,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 3caf8864-8422-4719-b0af-e3c4f6d30f8a

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:21:51.403Z",
  "requestId": "3caf8864-8422-4719-b0af-e3c4f6d30f8a",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 55664ad0-b465-46ef-9219-bbe487956e65

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:21:51.404Z",
  "requestId": "55664ad0-b465-46ef-9219-bbe487956e65",
  "provider": "groq",
  "role": "groq_right_hand",
  "model": "openai/gpt-oss-20b",
  "attempt": 1,
  "jobId": null,
  "caseId": null,
  "requestSummary": {
    "model": "openai/gpt-oss-20b",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request ac22a5a8-5cdc-475b-a325-b71e730162b8

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:23:42.298Z",
  "requestId": "ac22a5a8-5cdc-475b-a325-b71e730162b8",
  "provider": "groq",
  "role": "groq_boss",
  "model": "openai/gpt-oss-120b",
  "attempt": 1,
  "jobId": null,
  "caseId": null,
  "requestSummary": {
    "model": "openai/gpt-oss-120b",
    "max_completion_tokens": 2048,
    "reasoning_effort": "medium",
    "include_reasoning": false,
    "temperature": 0.1,
    "stream": false,
    "messageCount": 1,
    "messages": [
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 9418,
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


### Model request 11fe2fce-a514-4f6e-a8d3-723c19cdebc3

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:23:45.076Z",
  "requestId": "11fe2fce-a514-4f6e-a8d3-723c19cdebc3",
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
        "contentChars": 2247,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 2997,
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


### Model request faec9a4f-af85-4f2d-bf9c-32e2acce49b3

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:23:46.993Z",
  "requestId": "faec9a4f-af85-4f2d-bf9c-32e2acce49b3",
  "provider": "groq",
  "role": "groq_right_hand",
  "model": "openai/gpt-oss-20b",
  "attempt": 2,
  "jobId": null,
  "caseId": null,
  "requestSummary": {
    "model": "openai/gpt-oss-20b",
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
        "contentChars": 2247,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 2997,
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


### Model request 55bf0ae8-5089-4084-9324-13be1da3f48e

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:23:48.091Z",
  "requestId": "55bf0ae8-5089-4084-9324-13be1da3f48e",
  "provider": "groq",
  "role": "groq_right_hand",
  "model": "openai/gpt-oss-20b",
  "attempt": 3,
  "jobId": null,
  "caseId": null,
  "requestSummary": {
    "model": "openai/gpt-oss-20b",
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
        "contentChars": 2247,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 2997,
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


### Model request d081e406-043c-4ad3-b151-d1cd1b4b3fe9

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:25:48.717Z",
  "requestId": "d081e406-043c-4ad3-b151-d1cd1b4b3fe9",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 7fb6e24c-3e13-482b-a96b-9a7fc1d933af

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:25:48.722Z",
  "requestId": "7fb6e24c-3e13-482b-a96b-9a7fc1d933af",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 166b44cc-faae-4ff3-8bdd-009ed47c83b5

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:25:48.726Z",
  "requestId": "166b44cc-faae-4ff3-8bdd-009ed47c83b5",
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
        "contentChars": 1669,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 12286,
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


### Model request 8c6e843a-a1da-43e8-b5da-2ec18e3c2c51

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:25:48.728Z",
  "requestId": "8c6e843a-a1da-43e8-b5da-2ec18e3c2c51",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 0cbae3c8-5fd7-44e5-a230-5b2529687c20

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:25:48.733Z",
  "requestId": "0cbae3c8-5fd7-44e5-a230-5b2529687c20",
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
        "contentChars": 1644,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 72333588-c59d-430e-9090-676b73720e54

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:25:48.735Z",
  "requestId": "72333588-c59d-430e-9090-676b73720e54",
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
        "contentChars": 1644,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 59a40196-a1e9-46c2-92a5-c256db5b6829

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:25:48.987Z",
  "requestId": "59a40196-a1e9-46c2-92a5-c256db5b6829",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 83c680b1-048e-4274-8685-4dbeeaf4aba3

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:25:48.990Z",
  "requestId": "83c680b1-048e-4274-8685-4dbeeaf4aba3",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request cb344920-9efb-4437-bbd4-68e88769849a

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:25:49.241Z",
  "requestId": "cb344920-9efb-4437-bbd4-68e88769849a",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 89d978f9-2f8a-4887-a4cd-8fca698d774a

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:25:49.243Z",
  "requestId": "89d978f9-2f8a-4887-a4cd-8fca698d774a",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request ca4ab1be-fa3a-437d-b40d-1dcfe0150889

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:25:49.243Z",
  "requestId": "ca4ab1be-fa3a-437d-b40d-1dcfe0150889",
  "provider": "groq",
  "role": "groq_right_hand",
  "model": "openai/gpt-oss-20b",
  "attempt": 2,
  "jobId": null,
  "caseId": null,
  "requestSummary": {
    "model": "openai/gpt-oss-20b",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request f82dbc8d-8fe7-40ec-8e8b-2b85d30f2031

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:25:49.247Z",
  "requestId": "f82dbc8d-8fe7-40ec-8e8b-2b85d30f2031",
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
        "contentChars": 1663,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 26,
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


### Model request 6b06527f-c58d-47e6-920e-350d520ec93a

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:25:49.248Z",
  "requestId": "6b06527f-c58d-47e6-920e-350d520ec93a",
  "provider": "groq",
  "role": "groq_right_hand",
  "model": "openai/gpt-oss-20b",
  "attempt": 2,
  "jobId": null,
  "caseId": null,
  "requestSummary": {
    "model": "openai/gpt-oss-20b",
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
        "contentChars": 1663,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 26,
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


### Model request 0b241dda-0204-452a-a0e4-cc103bec2d4e

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:25:49.501Z",
  "requestId": "0b241dda-0204-452a-a0e4-cc103bec2d4e",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 9044cf0b-df71-4c6a-a063-1ac92a0533e8

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:25:49.503Z",
  "requestId": "9044cf0b-df71-4c6a-a063-1ac92a0533e8",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 49bd9c59-a635-4ebb-ae26-0ab065e62201

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:25:49.754Z",
  "requestId": "49bd9c59-a635-4ebb-ae26-0ab065e62201",
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
        "contentChars": 1635,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
        "itemCount": null
      }
    ],
    "messagesTruncated": false,
    "responseFormat": {
      "type": "json_schema",
      "schemaName": "apex_atlas_right_hand",
      "hasSchema": true,
      "strict": true,
      "schemaPropertyCount": 1,
      "requiredFieldCount": 1,
      "additionalProperties": false
    },
    "toolCount": null,
    "tools": [],
    "toolsTruncated": false,
    "toolChoiceKind": "undefined"
  }
}
```


### Model request d034303b-729f-4633-b5a6-614d046ac9b8

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:25:49.755Z",
  "requestId": "d034303b-729f-4633-b5a6-614d046ac9b8",
  "provider": "groq",
  "role": "groq_right_hand",
  "model": "openai/gpt-oss-120b",
  "attempt": 2,
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
        "contentChars": 1635,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 45dc2547-9853-4b64-891a-b3eeb69ad66f

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:25:50.007Z",
  "requestId": "45dc2547-9853-4b64-891a-b3eeb69ad66f",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request aa3828a9-05d7-4af4-8e35-43bee0ddc19f

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:25:50.008Z",
  "requestId": "aa3828a9-05d7-4af4-8e35-43bee0ddc19f",
  "provider": "groq",
  "role": "groq_right_hand",
  "model": "openai/gpt-oss-20b",
  "attempt": 1,
  "jobId": null,
  "caseId": null,
  "requestSummary": {
    "model": "openai/gpt-oss-20b",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 22555f87-b39c-4101-9950-8a878cd93485

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:26:22.978Z",
  "requestId": "22555f87-b39c-4101-9950-8a878cd93485",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request ab410ea4-e675-41dd-86f5-7aac75686708

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:26:22.983Z",
  "requestId": "ab410ea4-e675-41dd-86f5-7aac75686708",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 78b0789d-9da7-4948-9d8d-61a7ee896d65

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:26:22.987Z",
  "requestId": "78b0789d-9da7-4948-9d8d-61a7ee896d65",
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
        "contentChars": 1669,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 12286,
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


### Model request 1962a854-7a77-4a9c-8539-66118cc2e429

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:26:22.990Z",
  "requestId": "1962a854-7a77-4a9c-8539-66118cc2e429",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 369b603b-1b20-4419-9adb-c3e18954cd28

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:26:22.995Z",
  "requestId": "369b603b-1b20-4419-9adb-c3e18954cd28",
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
        "contentChars": 1644,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 327604b6-ec37-4850-b731-c9294767c7eb

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:26:22.998Z",
  "requestId": "327604b6-ec37-4850-b731-c9294767c7eb",
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
        "contentChars": 1644,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request dd254929-dac3-4197-a151-828f8d6dd3f6

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:26:23.250Z",
  "requestId": "dd254929-dac3-4197-a151-828f8d6dd3f6",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 95816ed3-70bb-4e86-8b31-218a616bc2e6

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:26:23.252Z",
  "requestId": "95816ed3-70bb-4e86-8b31-218a616bc2e6",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 42f087e1-3229-44a2-a344-55c6796516b9

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:26:23.505Z",
  "requestId": "42f087e1-3229-44a2-a344-55c6796516b9",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request dcd736c8-c9f8-4604-9f00-832b884a6121

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:26:23.507Z",
  "requestId": "dcd736c8-c9f8-4604-9f00-832b884a6121",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 362bf0d1-401c-4dd1-96d2-d1e1aa64564c

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:26:23.507Z",
  "requestId": "362bf0d1-401c-4dd1-96d2-d1e1aa64564c",
  "provider": "groq",
  "role": "groq_right_hand",
  "model": "openai/gpt-oss-20b",
  "attempt": 2,
  "jobId": null,
  "caseId": null,
  "requestSummary": {
    "model": "openai/gpt-oss-20b",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 048b492a-6ae6-4be8-b9dc-e91e24e383f5

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:26:23.512Z",
  "requestId": "048b492a-6ae6-4be8-b9dc-e91e24e383f5",
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
        "contentChars": 1663,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 26,
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


### Model request 9d46d530-2412-4e02-8aad-36377e85ac49

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:26:23.513Z",
  "requestId": "9d46d530-2412-4e02-8aad-36377e85ac49",
  "provider": "groq",
  "role": "groq_right_hand",
  "model": "openai/gpt-oss-20b",
  "attempt": 2,
  "jobId": null,
  "caseId": null,
  "requestSummary": {
    "model": "openai/gpt-oss-20b",
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
        "contentChars": 1663,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 26,
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


### Model request c06c35d0-3492-4213-84d1-302141f5c7b3

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:26:23.768Z",
  "requestId": "c06c35d0-3492-4213-84d1-302141f5c7b3",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 19390c18-fb2d-4989-acd0-af14369661ae

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:26:23.770Z",
  "requestId": "19390c18-fb2d-4989-acd0-af14369661ae",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 2c6515d4-4c18-46e6-9d86-2f11bc6e2692

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:26:24.022Z",
  "requestId": "2c6515d4-4c18-46e6-9d86-2f11bc6e2692",
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
        "contentChars": 1635,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
        "itemCount": null
      }
    ],
    "messagesTruncated": false,
    "responseFormat": {
      "type": "json_schema",
      "schemaName": "apex_atlas_right_hand",
      "hasSchema": true,
      "strict": true,
      "schemaPropertyCount": 1,
      "requiredFieldCount": 1,
      "additionalProperties": false
    },
    "toolCount": null,
    "tools": [],
    "toolsTruncated": false,
    "toolChoiceKind": "undefined"
  }
}
```


### Model request 322ffe5a-4388-4e14-89cb-1b0e8d85c29f

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:26:24.023Z",
  "requestId": "322ffe5a-4388-4e14-89cb-1b0e8d85c29f",
  "provider": "groq",
  "role": "groq_right_hand",
  "model": "openai/gpt-oss-120b",
  "attempt": 2,
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
        "contentChars": 1635,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request 52059fe7-2484-40df-944c-f910b183a835

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:26:24.275Z",
  "requestId": "52059fe7-2484-40df-944c-f910b183a835",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request c026f41d-6d54-44cd-b32d-3d3d442a5641

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:26:24.278Z",
  "requestId": "c026f41d-6d54-44cd-b32d-3d3d442a5641",
  "provider": "groq",
  "role": "groq_right_hand",
  "model": "openai/gpt-oss-20b",
  "attempt": 1,
  "jobId": null,
  "caseId": null,
  "requestSummary": {
    "model": "openai/gpt-oss-20b",
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
        "contentChars": 1684,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 29,
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


### Model request d75c2a6c-ad8f-4cbc-899b-b010908a22b9

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:27:07.802Z",
  "requestId": "d75c2a6c-ad8f-4cbc-899b-b010908a22b9",
  "provider": "groq",
  "role": "groq_boss",
  "model": "openai/gpt-oss-120b",
  "attempt": 1,
  "jobId": null,
  "caseId": null,
  "requestSummary": {
    "model": "openai/gpt-oss-120b",
    "max_completion_tokens": 2048,
    "reasoning_effort": "medium",
    "include_reasoning": false,
    "temperature": 0.1,
    "stream": false,
    "messageCount": 1,
    "messages": [
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 9418,
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


### Model request 23269d65-38f2-4038-ba30-be7255737e6e

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:27:10.212Z",
  "requestId": "23269d65-38f2-4038-ba30-be7255737e6e",
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
        "contentChars": 2247,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 3371,
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


### Model request 2fcc279a-f3ab-4bae-9cb5-2141a73e67be

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:27:12.400Z",
  "requestId": "2fcc279a-f3ab-4bae-9cb5-2141a73e67be",
  "provider": "groq",
  "role": "groq_right_hand",
  "model": "openai/gpt-oss-120b",
  "attempt": 2,
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
        "contentChars": 2247,
        "itemCount": null
      },
      {
        "role": "user",
        "contentKind": "text",
        "contentChars": 3371,
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


### Model request b8706c5d-3791-414f-961d-f886f03777f1

```json
{
  "event": "atlas_model_request",
  "recordedAt": "2026-10-14T08:27:15.249Z",
  "requestId": "b8706c5d-3791-414f-961d-f886f03777f1",
  "provider": "groq",
  "role": "groq_investigator",
  "model": "openai/gpt-oss-120b",
  "attempt": 1,
  "jobId": "f6f0e1e8-9c52-4c25-a1cd-7503772073d7",
  "caseId": 3,
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
