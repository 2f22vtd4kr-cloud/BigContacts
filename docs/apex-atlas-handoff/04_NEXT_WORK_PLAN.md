# Apex Atlas — Next Work Plan

## Priority 0

Do not launch again until source analysis and focused tests address the three latest findings.

## A. Gemini Right-hand recovery

Read:
- gemini-model-pool.ts
- gemini-right-hand-reasoning.ts
- provider-error-diagnostics.ts
- gemini-transient-retry.ts
- Right-hand tests
- model-boundary guard

Reconstruct the exact live candidate chain, cooldown state, provider error code, retry count, key/project scope, and terminal path.

Verify transient 429, too_many_requests, rate_limit_exceeded, and quota_exceeded separately.

Verify 429->200 returns success.

Verify model rotation is same-role only.

Verify no project-quota bypass assumption.

## B. Investigator context explosion

Trace:
durable observations
 -> trajectory history
 -> working context
 -> provider request
 -> provider response

Establish a deterministic bounded model-facing context while retaining complete durable history.

Preserve:
objective, hypotheses/discriminators, contradictions, negative findings, open questions, source-family coverage, recent actions, high-value evidence, provenance.

Add tests for huge history, duplicates, contradictions, long snippets/URLs, prompt injection, and bounded provider request size.

Do not hard-code the next research action.

## C. Trace vs case-event discrepancy

Trace:
- write path
- Redis key
- job/run/case correlation
- TTL
- cleanup
- read route
- UI use

Durable:
- event append
- replay
- projection
- state transitions

Define durable case events as research-history authority unless source inspection proves another contract.

Add an integration/regression check for trace/event correlation.

## D. Verification

Before runtime:
- frozen install
- typecheck
- check:bureau
- full build
- Gemini focused tests
- model-pool tests
- Investigator/context tests
- relevant API tests
- static boundary guards

Do not weaken a guard to get green.

## E. Provider research

Re-check current official Google docs:
https://ai.google.dev/gemini-api/docs/models
https://ai.google.dev/gemini-api/docs/rate-limits
https://ai.google.dev/gemini-api/docs/api-errors
https://ai.google.dev/gemini-api/docs/troubleshooting
https://ai.google.dev/gemini-api/docs/thinking
https://ai.google.dev/gemini-api/docs/api-key

Record the verification date.

## F. Fresh runtime

Only after A-E:
1. current main SHA
2. secret presence
3. schema state
4. canonical boot
5. health 200
6. active job false
7. exactly one authorized UI-equivalent launch
8. targetCount=3, standard, 420000
9. audit all Boss/Right-hand/Investigator/tool/evidence/entity/card/durable events
10. prove sequential targets
11. preserve audit if failure

## Anti-regression

Never:
- script research;
- seed evidence/candidates/cards;
- replace Gemini roles with another provider;
- use Live/TTS/image Gemini models as text control;
- parallelize canonical target execution;
- disable fail-closed behavior;
- delete durable history merely to fit provider context;
- manufacture provider responses;
- call partial success GREEN.
