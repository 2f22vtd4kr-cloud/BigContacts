# Forensic continuation 7 — 2026-09-10

## Current main

Verified `refs/heads/main` at `7eb2bb3977c4eda017732908c4449bd2db4fcbd6` during this pass. No runtime or CI success is claimed.

## Structural remediation

The canonical research router no longer imports or mounts `research/cases.ts`.

The former mixed route has been split into:

- `research/case-data.ts`: durable discovery-case creation plus latest/case/event reads;
- `research/canonical-case-discovery.ts`: model-directed discovery execution;
- `research/canonical-case-continuation.ts`: model-directed continuation;
- `research/legacy-case-execution-retirement.ts`: explicit HTTP 410 quarantine for legacy `initial-research`, `admit-candidate`, `promote-target`, and `run-boss-review` operations.

This removes the old cases executor from the live route graph without silently dropping the core case-data API. The legacy `cases.ts` file remains only as quarantine material until duplicate-tree/reachability cleanup is complete.

## Guarding

The unified Investigator architecture guard now verifies:

- canonical discovery and continuation are mounted;
- case data is isolated from research execution;
- legacy execution retirement is mounted;
- `cases.ts` is not imported or mounted;
- the case-data router cannot contain research executors.

The retired-research guard likewise verifies that the live route graph does not import/mount the legacy cases executor.

## Contract follow-up

The OpenAPI/generated client contract still contains historical operations for the retired endpoints. That is a documentation/client-contract cleanup item and should be reconciled before claiming the public API surface is fully clean. It does not restore reachability of the retired server endpoints.

## Remaining priority

The next substantive runtime architecture repair is still #120/#136 in the canonical ReAct core. `fetch_blob` can retrieve the complete current core, but the standard file update API requires a complete replacement payload; do not perform a blind rewrite. The desired edit remains surgical: eliminate the forced initial web-search seed and remove target-derived identity attribution from deterministic observations while preserving the model-owned `action=done` evidence boundary.
