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

## 2026-10-01 Gemini Boss hardening completed on PR #440

The read-only diagnosis of the canonical 2026-10-01 run found and patched three concrete Boss control-plane defects:

1. Terminal failure attribution could report the initially resolved model while the nested error described a later fallback model. Boss now tracks the actual last attempted model and emits a sanitized ordered attempt summary.
2. Boss model catalogs/cooldown selection is now resolved per configured Gemini credential/project rather than reusing the first credential's catalog for every credential.
3. HTTP 429 quota_exceeded is project/credential-scoped: Boss marks the exhausted credential's model cooldown and stops using that credential, then permits a separately configured credential/project to be attempted. It never treats multiple keys in one project as extra quota.

Added regression coverage for deterministic, sanitized Boss attempt attribution and updated scripts/check-gemini-boss-model-boundary.mjs to encode the new legitimate project-failover contract.

Implementation branch: apex-boss-fallback-hardening-2026-10-01
Pull request: #440
Base SHA: 15eca3ac70d03ce6c77c6f112cd273fe28f29d3c
Latest branch SHA at this update: a4fbb5fb5db2d8329af6efcc0cd3b4107a6ca322

No live Atlas launch, provider probe, or runtime retry was performed during this hardening pass.

### Remaining verification before another canonical run

- Run the full API-server typecheck/build/test/static-boundary suite on PR #440.
- If CI remains unavailable, perform equivalent repository checks through an environment with the locked dependencies; do not infer green from static source inspection.
- Re-review the Investigator context, Redis trace/event discrepancy, and provider-role boundaries.
- Only after these checks should a fresh canonical UI-equivalent runtime be authorized.

## FINAL STATE — 2026-10-01

This file's earlier Priority 0-5 list is historical and is superseded by the current-main plan below.

Current main: 369887858c9d73f6eb6dd6aa37e668277b99eb28.

Architecture vNext is complete. The next work is empirical runtime validation, not another broad rewrite.

1. Synchronize the Replit workspace to current GitHub main.
2. Verify the stale canonical-case-continuation.ts syntax defect is absent after synchronization.
3. Boot the canonical API and verify health, system status, and idle active-job state.
4. Establish durable baseline counts.
5. Perform exactly one UI-equivalent launch with targetCount=3, researchDepth=standard, targetTimeoutMs=420000.
6. Audit Boss, Right-hand, Investigator, tools, evidence, entities/cards, durable events, and sequential target progression.
7. Stop at the first genuine failure; no retries or provider probes.

Then measure:
- useful evidence per search/visit;
- information gain per action;
- source-family diversity;
- provider disagreement and resolution;
- contradiction resolution;
- identity discrimination;
- Evidence Probe marginal value;
- episode-checkpoint value;
- contact attribution precision;
- action yield by cognitive task/model/provider.

Do not introduce RL prematurely. Use the existing empirical action-yield and durable trajectory data before considering cross-run policy learning.

Deep Research remains disabled by default and must not become a paid dependency of the free-tier baseline.

Never call partial live success GREEN.


## DOCUMENTATION FINALIZATION — 2026-10-01

Current main: 64a4f20c25d8888112a4dc025f19e576d52fb774.

PR #447 merged the final successor documentation. It did not change production code. The next engineering action remains the synchronized live Replit runtime audit described above.
