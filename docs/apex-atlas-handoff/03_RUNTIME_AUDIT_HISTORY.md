# Apex Atlas — Runtime Audit History

## Latest authoritative live run

Main SHA: f11371d95337c1bd8a7c2b49d7c383903a08bfb5
Job: 391bbe22-0414-4ed4-965d-5714181af242
Exactly one UI-equivalent launch.
Parameters: targetCount=3, researchDepth=standard, targetTimeoutMs=420000.
Terminal: 2026-10-01T04:08:00.295Z
Result: failed
Terminal message: Gemini Right Hand was unavailable; Atlas transition is fail-closed.

## Preflight

Frozen install: PASS.
Typecheck: PASS.
check:bureau: PASS (selected 34-test set).
Initial full build: FAIL at scripts/check-gemini-boss-model-boundary.mjs because the guard conflicted with the intended daily-quota path.
Narrow source correction: PASS.
Affected Gemini fallback test: 11/11 PASS.
Typecheck after correction: PASS.
check:bureau after correction: PASS.
Full build after correction: PASS.
API health: HTTP 200.
Active Atlas job: false before launch.

No second launch was sent.

## Live progression

Boss selected gemini-3.6-flash.
Right-hand opening completed on gemini-3.5-flash-lite.
Investigator selected: Groq.
Discovery began.

Serper searches:
1. 0 URLs
2. 10 URLs
3. 10 URLs
4. 9 URLs
5. 9 URLs
Total returned URL entries: 38, not deduplicated.

Visits: 0.
Findings: 0.
Candidate entities/cards: 0.
Evidence rows: 0.

## Durable case

Case 1 ended in review.
12 durable case events.
Important sequence:
1 Boss assignment
2 Right-hand opening
3 Investigator assignment
4 first search error
5 Boss pivot_discovery
6-7 successful search observations
8 Boss continue_discovery
9-10 successful search observations
11 Boss continue_discovery
12 Boss stop/unavailable because Right-hand unavailable

The durable case ledger proves activity even though Redis trace returned zero slots.

## Trace discrepancy

GET /api/ingest/atlas-trace/:jobId returned 0 trace slots while durable case events existed.

Do not assume Redis trace is authoritative.

Investigate:
- trace write path;
- Redis key naming;
- job/run/case correlation;
- TTL;
- cleanup;
- read route;
- UI consumption;
- fallback to durable case events.

## Investigator provider evidence

Groq was selected.

Observed models included:
- qwen/qwen3.8-27b
- openai/gpt-oss-120b
- openai/gpt-oss-20b

Observed:
- HTTP 200;
- HTTP 413 request-size;
- HTTP 429 rate limits;
- internal cooldown blocks.

Prompt/model-facing sizes grew approximately:
21,774 -> 39,482 -> 45,804 -> 53,766 -> 116,133 -> 121,241 -> 126,240 -> 214,957 characters.

The later 413s are a distinct bug from the Gemini Right-hand failure.

## Historical fixes already merged

- PR #418 canonical control recovery: 89398c16a036488a82cd9bcc8a896f3e9b6a55be
- PR #420 Right-hand fallback: 51e651321371778952f40d526c858c786a8d534c
- PR #421 Boss fallback: 4cf04304663ef9dce9019ab955d7cb2c13fc2aad
- PR #422 retry comment/log cleanup: 007cfc592509112c9e0010d40bbef17a2d5a1890
- PR #423: f697fd1140a1159992221f3e4ff1b8f4fc03fabf
- PR #424: cf32e7ac77688639420c3a7441096eb02be6b9d4
- PR #425: e8b28f0eb188faa6eacda10d8a3be5d063d76ef3
- PR #426: 5d06898706412f43dc3c36d6d56432309a5dc2ff
- PR #427 thinking contracts/429 diagnostics: 89a717f6798c4ab3c3a44d22640ca6809fd60e8b
- PR #428 structured-output 3.8 compatibility: dec0f767d5f1ad660a5f069f5eb6523d30f5c25c
- PR #429 Mistral catalog cache: f1fd98457899ec0cbe5689c50463a8cfd54e0282
- PR #431 daily-quota classifier: 44efa532cb87349b81905d757743606d12ca6645
- PR #432 provider resilience: 86ea581df942d984418e396ca603ef1cc952f0c0
- PR #433 retry-loop correction: 7d4add9c3e3d51444bbc1dd606688b3fccaee7ae
- PR #434 free-tier Gemini model pool: current main lineage f11371d95337c1bd8a7c2b49d7c383903a08bfb5

Do not revert blindly. Inspect current source and tests.

## Green criteria

Only call GREEN when a fresh current-main audit proves:
- install/build/type/bureau checks;
- real Gemini Boss;
- real Gemini Right-hand;
- real Investigator;
- real tools;
- sequential three-target execution;
- actual evidence;
- expected entity/card projections;
- durable state;
- no fake/manual data;
- successful terminal state.

A partial run is not GREEN.

## Fresh audit rule

Every new runtime attempt gets a new:
audits/apex-atlas-sequential-audit-<YYYY-MM-DD-HHMMSS>.md

Record exact SHA, secret presence only, every significant action, provider/model, retry/fallback, durable IDs/state, and last-success/first-failure. Preserve the audit on failure.

## Current-main note

The live job documented above ran on the pre-PR-439 baseline `f11371d95337c1bd8a7c2b49d7c383903a08bfb5`. Main subsequently advanced through PR #439 to `8274f85c51417baec01567ce082a6d2f4673e813`. Do not treat the old runtime result as a direct test of the multi-project Right-hand resilience added by PR #439.