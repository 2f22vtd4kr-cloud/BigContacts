# Apex Atlas — Live Run 03 Critical Review and Bounded Recovery Fix

**Date:** 2026-10-14  
**Repository:** `2f22vtd4kr-cloud/BigContacts`  
**Base revision imported for Live Run 03:** `06e4918237308a8f59eadb1562d66894c18deda9`  
**Source audit:** [APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-14_LIVE_RUN_03.md](APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-14_LIVE_RUN_03.md)  
**Previous incident:** [APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-14_LIVE_RUN_02.md](APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-14_LIVE_RUN_02.md)

## Executive assessment

Live Run 03 is not a successful end-to-end validation. The first two recorded jobs ended failed/incomplete without a finding or card. The third job's prompt/event tail contains repeated Investigator token-window provider failures and Right-hand advice to stop, but the supplied audit ends before the terminal job state and final durable ledger reconciliation. The third job's final state is therefore **unknown**, not successful and not confirmed failed.

Two bounded contract defects are now addressed on the accompanying engineering branch:

1. Token-window failures explicitly labelled `upstream_token_window_wait_exceeded` were excluded from the canonical consecutive-episode provider-unavailable breaker, even after the bounded same-capability retry had already failed. This permitted further Boss/Right-hand control turns to continue invoking an unavailable Investigator.
2. The Boss-direction validator caught known concrete provider/tool names but missed a generic instruction to “switch to an alternative OSINT provider” or a self-hosted scraper. The audit's persisted final pivot contains that formulation even though the Investigator contract exposes only the configured capabilities. Such a direction is an operational tool/provider instruction, not a research question, and should be rejected before it becomes active scope.

The changes do **not** improve Groq's capacity, force a research trajectory, change Investigator credentials, lower evidence standards, or create a card. They prevent avoidable control churn and reject a direction that prescribes an unavailable tool/provider.

## Run-by-run evidence

### Job `2f7f0bc8-f354-450e-bf91-9a23d277f28f` — discovery case 1

- The UI-equivalent default launch was accepted with `targetCount=3`, standard research depth, and a 420,000 ms target timeout.
- Search and fetch actions actually executed; one Scrapfly browser fetch failed while a separate visit of the same URL had succeeded. This is an external retrieval failure, not itself a research finding.
- The run ended at `2026-10-14T05:10:32.380Z` as `failed/incomplete`. The audit records seven searches, one visit, zero findings, zero admissions/cards, and no insertion.
- The terminal Investigator failure was Groq HTTP 400 `json_validate_failed` on strict JSON-schema output and the bounded JSON-object compatibility retry. This differs from token-window rate limiting; it is not evidence of hard request-quota exhaustion.

### Job `4217f92e-827e-46f0-944e-865db923dbab` — discovery case 2

- A Serper search returned six URLs.
- The selected Investigator then received a token-type HTTP 429. A bounded same-capability wait/retry was attempted; the next response was again a token 429 with remaining request capacity and no reset hint.
- The application recorded `upstream_token_window_wait_exceeded` and stopped this run at `2026-10-14T05:15:55.324Z` as `failed/incomplete`.
- The audit reports one search, zero visits, zero findings, and no card/admission. The available telemetry does **not** prove hard request-quota exhaustion, so not rotating the selected Investigator capability was the correct behavior.

### Job `682056e3-e74f-4964-b2f4-9fb8008f2947` — discovery case 3

- The audit records repeated HTTP 429 token-window errors, with no evidence that the request-count quota was exhausted. The durable trajectory snapshot includes eight provider-error turns and one blocked search attempt by its end; the exact per-request list is retained in the source audit.
- A Right-hand control request reports a `stop` recommendation because the Investigator remained unavailable. The audit ends with a subsequent Boss control request body but not its response, a terminal job-status poll, or final database/event/high-water reconciliation.
- **Unresolved:** terminal status, active-lane release, final event ID/high-water, final durable counts, and any possible post-prompt work. Do not infer these facts. Before any further launch, inspect/poll this exact job and append the read-only terminal reconciliation to the audit. Do not relaunch it or start a duplicate merely to complete the report.

## Source-level root cause 1 — token-window failures bypassed the breaker

Before the fix, `canonical-atlas-discovery.ts` classified an episode as provider-unavailable only if it ended with `status=unavailable`, `stopReason=LLM_UNAVAILABLE`, and a durable `investigator_provider_error` record **and** `isTransientInvestigatorCapacityError(result)` was false. That last condition excludes `upstream_token_window_wait_exceeded`.

The provider adapter had already bounded the same-capability wait/retry. Once that retry ended with `upstream_token_window_wait_exceeded`, the episode was no longer actionable. Excluding it from the existing two-consecutive-episode breaker treated repeated terminal capacity failures as if they should not count toward the breaker; Boss could continue making control decisions and consume more provider capacity without an executable Investigator pass.

### Fix

- Extract the breaker predicate and consecutive-streak transition into a small pure policy module.
- Count durable terminal Investigator provider errors, including token-window wait failures after the bounded retry.
- Reset the streak only when an episode does not end in that provider-unavailable condition.
- Preserve the existing two-consecutive-episode ceiling and review-state behavior.
- Keep credential reassignment gated exclusively on the explicit `upstream_quota_exhausted` path. A token-window 429 is not silently reclassified as hard request quota, and the breaker itself never selects or rotates a capability.

## Source-level root cause 2 — generic unavailable-provider instruction passed the pivot validator

The canonical objective validator previously rejected directives naming configured provider/tool tokens (e.g. “switch to Serper”) but did not reject generic operational wording such as “switch to an alternative OSINT provider … or a self-hosted scraper.” Live Run 03's last captured active pivot includes that exact pattern, although the current structured Investigator schema exposes a fixed available-capability set and does not offer SerpAPI or a self-hosted scraper as selectable providers.

### Fix

- Reject generic imperative instructions to switch to a different/alternative provider, tool, scraper, or search engine.
- Keep mentions of alternative providers as a research subject valid when not phrased as an instruction (regression covered).
- This is contract validation, not a prescribed replacement route: the existing Boss/Right-hand control loop must produce a valid research objective or stop.

## Additional critical observations

- **Research drift must be evaluated against accepted durable pivots, not Right-hand opening advice alone.** The Right-hand is advisory and does not own tool/target selection. A first query that differs from its opening suggestion is not automatically a defect; a query blocked by the active Boss pivot, or a continuation that executes after provider unavailability without new work, is more actionable evidence.
- **An executed search is not claim-grade evidence.** The first two runs returned URLs, but the audit reports no source-backed admitted person or card. Zero admissions is appropriate where identity/role, independent observations, wealth/materiality basis, falsification, and a plausible person-level approach route are not established.
- **The run file's header is stale.** It still says the run is prepared and no launch submitted, while later sections record three accepted launches. The narrative evidence takes precedence for those launch events, but the header should be reconciled in a follow-up append without deleting chronology.
- **Prompt-capture exposure deserves a review.** The tracked audit is approximately 764 KB and contains allow-listed outbound prompt bodies, not provider responses or hidden reasoning. The audit says email/phone values are redacted; that alone does not prove every possible personal identifier, username, or sensitive prompt field is redacted. Because `audits/` is tracked in a public repository, audit capture should be kept scoped and the committed text should be checked for unexpected secrets/contact values before further prompt logging. No full secret/PII scan is claimed here.
- **The API authentication boundary remains intentionally disabled in this Replit configuration.** Do not publish the deployment to an untrusted audience without a separate access-control decision and implementation.

## Verification and limits

- The uploaded audit itself verifies the first two jobs' terminal status and described their zero-finding/card outcome.
- The uploaded audit does not verify terminal status or final durable reconciliation for job `682056e3-e74f-4964-b2f4-9fb8008f2947`.
- The accompanying branch adds regression tests for consecutive token-window failures and generic provider-directive rejection. CI results on that branch must be checked before merge; this report does not claim they have passed.
- No new Replit research launch, synthetic run, candidate, evidence row, or card was created as part of this review.
- A later user-operated run is still required to empirically establish whether the app progresses through valid Investigator actions, observed source retrieval, durable provenance, admission, and correct terminal reconciliation.
