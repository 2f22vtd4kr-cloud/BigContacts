# Apex Atlas — Replit Fresh Run 02 Post-Run Analysis

**Date:** 17 October 2026  
**Repository HEAD reviewed:** `ef91b31267567c88c44496f125771d128ede598d` (audit/config commit; application source includes the prior scope remediation)  
**Sequential audit:** [APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-17_REPLIT_FRESH_RUN_02.md](./APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-17_REPLIT_FRESH_RUN_02.md)

This report supplements, and does not rewrite, the chronological audit.

## Executive verdict

**Attempt 1 is terminally failed with zero admitted people. Attempt 2 is not terminally reconciled in the checked-in audit snapshot.** Its last captured model response at 2026-10-17 03:13:33 UTC selected a single-registry action using `oregon_sos`, which is not in the supported registry catalog. Do not infer the current runtime state or a final count for Attempt 2 from the last captured provider response.

There is no evidence of a card-rendering failure: the audit records no source-backed person finding, no admitted candidate, and no persisted card for Attempt 1; the captured portion of Attempt 2 contains no admitted person or card.

## Attempt 1 — job `b350d50b-24ab-4f8b-892f-1b52fe32d563`

The audit's read-only terminal reconciliation records job status `failed`, with `inserted=0`, `skipped=0`, and `errors=0`. The zero generic error counter does not change the explicit failure state.

- 8 searches and 2 visits across 4 discovery slots; 0 model findings and 0 parsed candidates.
- The Ohio Secretary of State official business-search page returned HTTP 403. A failed fetch is not source evidence.
- An Indiana search-result snippet mentioned EarthWay Products, but the source was not fetched and no person attribution was established. It remains a lead only.
- Three later actions were blocked before outbound execution because they omitted either the agricultural-equipment subject or the Ohio registry source class. This is consistent with the current scope policy.
- A Right-hand TPM 429 recovered without key rotation. Two Investigator JSON-validation failures also recovered on bounded retries.
- The model-directed stop without evidence did not meet the evidence-backed terminal gate, so the job was correctly marked failed/incomplete.

## Attempt 2 — job `84d92f22-2481-434a-9c6c-c68c787d8737`

The checked-in capture starts at 03:07:21 UTC and ends after the 03:13:33 UTC Investigator response. It contains no later terminal poll, database reconciliation, or card projection verification. This is an audit completeness gap: finish the chronology with terminal status and durable counts before describing the run as complete.

The captured trajectory shows several distinct problems:

1. **Emergency scope compaction corrupted the opening direction.** The first approved direction targeted Washington State business filings for artisan-food manufacturers, but the Investigator's compact prompt stated a scope resembling “Washington State Secretary of State business entity; geographies: pacific nort; source classes: filings”. That omitted the actual industry anchor and introduced a malformed geographic phrase. The subsequent queries repeatedly failed scope validation. This is an orchestration/prompt-compaction defect in addition to the model's failure to follow the full scope.
2. **The model repeated low-value portal discovery and queries.** The Oregon registry portal URL `https://sos.oregon.gov/business/pages/find.aspx` appeared as a search-result lead. Instead of fetching that observed URL and examining whether it could surface relevant entity leads, the Investigator repeated searches for the portal and tried source-class variants that were blocked. Source-class guard enforcement itself should remain enabled.
3. **Single-registry validation is inconsistent.** The parallel registry action validator checks normalization and availability against the configured registry catalog, but the single `registry_search` validator only checked that the registry field was non-empty. The captured response used unsupported `oregon_sos`; a previous captured response used `or_sos_business_entity`. Both should be rejected deterministically before dispatch rather than relying on a later guard/tool failure.
4. **Provider structured-output errors remain a secondary source of lost turns.** The audit shows multiple Groq `json_validate_failed` responses, with bounded retry responses recovering. This is not evidence of invalid credentials or daily quota exhaustion. Continue to distinguish transient TPM throttling, invalid structured output, and hard quota signals.

## Fixes included in this remediation

- Scope compaction now extracts the substantive phrase following “for” in source-first directions and derives compacted geography from the primary scope clause rather than letting later examples/rationale overwrite the active geography.
- The single `registry_search` action now validates the canonical registry ID and current configured availability, matching the safety contract already applied to `parallel_registry_search`.
- Regression tests cover the source-first compaction failure and reject the unsupported Oregon registry IDs observed in the audit.
- No target, provider, query, or tool sequence has been hardcoded. Evidence/admission gates remain unchanged.

## What remains unproven

- Attempt 2's terminal job status and final database counts are absent from the checked-in audit snapshot.
- No claim is made that the deployed Replit workspace has loaded this new code. The audit records the prior source revision, and a checked-in repository revision is not proof of what its running process has imported.
- A passing build/test workflow is not evidence that a live run will produce a defensible person candidate.

Do not launch a third run as part of this remediation. First complete the read-only terminal and ledger reconciliation for job `84d92f22-2481-434a-9c6c-c68c787d8737`, then verify the actual Replit source revision. A future operator-run should be judged by successful source fetches, person/role/ownership co-binding, explicit promotion, durable admission, and exact card/evidence reconciliation—not by HTTP 202, green static checks, or search counts.
