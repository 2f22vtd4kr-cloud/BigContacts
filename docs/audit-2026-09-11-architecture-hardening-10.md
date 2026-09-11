# Apex Atlas forensic continuation — architecture hardening 10

## Entity-writer classification

The canonical API tree currently has two deliberate direct `entitiesTable` insertion sites:

1. `routes/entities.ts` — explicit manual/human CRUD surface. This is not Investigator research and is therefore outside the research promotion boundary.
2. `lib/canonical-atlas-discovery.ts` — review-only candidate admission after an Investigator explicitly emits `promotionDecision=promote`, with observed HTTP provenance and HNWI/Gatekeeper identity constraints.

The legacy top-level `src/lib/enrichment/broad-discovery.ts` still contains an entity writer, but the canonical tree is now guarded against importing it. It remains a legacy artifact to delete only after broader compatibility reachability is proven unnecessary.

The existing `legacy-apex-mutation-guard` already retires `/entities/rehydrate-contacts`, so durable evidence replay cannot silently become a card-promotion path.

## Duplicate/legacy reachability

`check-no-canonical-legacy-tree-imports.mjs` now checks actual source reachability rather than asserting that already-deleted `research/cases.ts` is absent. It also explicitly rejects future canonical imports of `broad-discovery`.

This is intentionally a reachability fence, not a wholesale legacy-tree deletion. Compatibility files are deleted only after import, route, test, script, and generated-source reachability has been accounted for.

## Discovery context

Canonical target investigations use the deterministic high-signal `compactInvestigationContext` projection while preserving raw event history separately. Discovery cases currently bound trajectory arrays and structured turns for durable state; the remaining source migration is to route the discovery case's model-facing context through the same compaction policy while retaining the complete `research_case_events` ledger untouched.

## Registry cancellation remains open

The canonical `registry-client.ts` still contains the real provider fetches with per-request timeout signals. The remaining migration is deliberately not being approximated by `Promise.race`, a global fetch monkey-patch, or another build-time source mutator. The run-scoped `AbortSignal` must reach the actual registry fetches through source-native interfaces before the registry hardeners are retired.

## Runtime boundary

No Replit run, provider smoke test, deployment test, or end-to-end runtime claim is made by this audit.
