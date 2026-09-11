# Apex Atlas forensic continuation — architecture hardening 9

## Main-state delta after hardening 8

- **Target event ledger:** source-native; the target build-time mutator is deleted.
- **Multi-source attribution:** target and Bureau Investigator paths now allow identity and contact values to be grounded in separate successful cited observations. Bureau claims already resolve to immutable trajectory observation-event IDs; target runs additionally persist typed evidence graphs.
- **Context compaction:** canonical target context now passes through deterministic high-signal compaction before re-mounting into model oversight/investigation.
- **Python:** network-capable Python remains unavailable until a trusted sandbox/egress attestation exists. No environment variable is accepted as proof of isolation.
- **Secondary surface:** no canonical callers remain according to `check-retired-research-routes.mjs`; the obsolete `apply-retire-secondary-surface-calls.mjs` mutator and its build/test hooks are now removed. The dormant `expandSecondaryPublicSurface` helper remains only for a later helper-reachability/deletion pass; it is not part of the live canonical research graph.

## Next hard blockers

### Registry cancellation
The remaining build-time registry hardeners must be replaced by direct source propagation. The final design should pass the run-scoped `AbortSignal` into every actual registry fetch and combine it with each request's own timeout rather than replacing the timeout with the run signal.

### Duplicate/legacy tree reachability
The top-level compatibility tree still contains old entity/import/enrichment surfaces. Continue route-by-route reachability tracing; do not delete the tree wholesale. A source file is not safe merely because its route is currently unmounted — trace imports, tests, scripts, and generated/build reachability first.

### Manual identity/entity writers
Classify remaining direct entity writes into manual CRUD, source-backed enrichment, model-authored review admission, and legacy/unreachable mutation. The canonical evidence/card boundary must remain explicit promotion + exact provenance + identity scope.

### Context trajectory quality
The deterministic compactor is now wired, but discovery-case context should receive the same high-signal treatment instead of retaining large raw trajectory arrays indefinitely. Preserve immutable raw event history separately; only the model-facing context should compact.

## No runtime claims

This continuation was performed against the repository only. No Replit runtime, provider smoke test, deployment test, or end-to-end execution is claimed here.
