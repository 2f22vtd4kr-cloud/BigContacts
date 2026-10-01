# Apex Atlas — Next Engineering Work Plan

## Goal

Continue from the latest real failures without weakening Apex's OSINT architecture.

Goal:
Boss -> Right-hand -> Investigator -> evidence -> targets -> durable state -> UI projection.

## Phase 0 — Establish exact current truth

1. Fetch main and record exact HEAD.
2. Inspect worktree.
3. Read all canonical docs plus this package.
4. Inventory the full repository.
5. Compare docs against source.
6. Verify current Gemini model-pool source/tests.
7. Verify Investigator context construction/compaction.
8. Verify trace/event persistence.

Never assume a historical SHA is current.

## Phase 1 — Gemini forensic analysis

Trace one complete Right-hand request path.

Inspect:
- model selection;
- credential/project scope;
- cooldown keys;
- model eligibility;
- transient 429 classifier;
- daily quota classifier;
- same-model retries;
- model rotation;
- timeout and role budget;
- Retry-After handling;
- terminal fail-closed event.

Concrete questions:
- Why was gemini-3.1-flash-lite selected at control turn 4?
- Which models were eligible?
- Which were cooling down and why?
- Were cooldowns scoped by credential/project/model?
- Was the 429 transient or daily quota?
- Was retry budget fully consumed?
- Did rotation happen at the correct point?

Do not run separate Gemini preflight calls. Test Gemini in its canonical role.

## Phase 2 — Investigator request-size analysis

The live run showed prompt growth to 214,957 characters and repeated Groq 413 errors.

Trace exactly what enters the model prompt each turn.

Inspect:
- durable history;
- observation serialization;
- tool output;
- evidence graph context;
- compaction;
- token/character accounting;
- provider request construction;
- retry/fallback transformations.

Determine whether growth comes from:
- failed compaction;
- duplicated observations;
- repeated tool output;
- event replay;
- unbounded accumulator.

Fix root cause.

Do not blindly truncate. Preserve objective, hypotheses, contradictions, source coverage, negative findings, recent actions and evidence references in bounded model-facing context while retaining complete durable history.

## Phase 3 — Trace/event consistency

Compare:
- case events;
- job log;
- run events;
- Redis trace;
- Reactor source.

Explain why durable events existed while trace returned zero slots.

Do not manufacture trace events.

## Phase 4 — Static verification

Run:
- targeted Gemini tests;
- model-pool tests;
- retry/quota tests;
- Investigator context/compaction tests;
- trace/event tests;
- canonical control regression tests;
- typecheck;
- build;
- bureau/static guards;
- relevant full API tests.

Classify each failure before fixing.

## Phase 5 — Live verification

Only after static gates are green:
1. create a fresh timestamped audit;
2. check secret presence only;
3. initialize schema only if required/authorized;
4. boot normally with schema mutation disabled;
5. verify health/Redis/lock;
6. use the real canonical UI-equivalent launch;
7. audit every Gemini interaction;
8. audit every Investigator action;
9. audit every persistence transition.

No separate Gemini smoke request.

## Phase 6 — Sequential three-target proof

Use:
targetCount=3
researchDepth=standard
targetTimeoutMs=420000

Verify runtime order from durable state/telemetry.

A partial target run is not GREEN.

## Phase 7 — Evidence/card proof

Require actual visits/findings and source-backed durable evidence before candidate/entity/card admission.

No manual seeding.

## Phase 8 — Final deep dive

After a successful run or genuine terminal failure, inspect:
- Gemini retries/model pool/quota/timeouts;
- request-size/context compaction;
- provider budgets;
- Mistral catalog caching;
- target sequencing;
- event ordering;
- Redis trace;
- evidence promotion;
- card projection;
- UI launch/stop;
- cancellation;
- locks/stale jobs;
- audit persistence.

## GREEN definition

Only GREEN if:
- exact current main verified;
- frozen install/build/tests pass;
- canonical app boots;
- health/Redis pass;
- real Boss executes;
- real Right-hand executes;
- real Groq/Mistral Investigator executes;
- real tools execute;
- evidence persists;
- targets 1/2/3 execute sequentially;
- cards/entities come from real evidence;
- durable state and UI agree;
- no mocks/fakes/bypass/substitution remain.

## Provider reference facts

Current Google documentation states:
- 429 rate_limit_exceeded and too_many_requests are retryable transient limit errors;
- quota_exceeded is daily quota;
- RPM/TPM/RPD are distinct;
- limits are per project, not per API key;
- RPD resets at midnight Pacific time;
- stable text models are distinct from Live/audio/TTS/image models.

Verify current official docs before modifying provider logic.

## Philosophy

When a provider is unreliable, make Apex more truthful and resilient, not less rigorous.

When context grows, compact model-facing state correctly while preserving durable history.

When telemetry disagrees with durable state, investigate the discrepancy.

When a run fails, preserve the exact failure and improve the next run.
