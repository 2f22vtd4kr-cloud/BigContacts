# Apex Atlas — Audit Findings Ledger

## Session
2026-09-11 comprehensive pre-run audit.

## Scope inspected so far
- Repository census and `main` tree metadata.
- Living architecture context and README.
- API app/auth boundary and route registration order.
- Canonical Atlas launch route and legacy Atlas route.
- Canonical target runner.
- Canonical ReAct target wrapper / oversight references.
- Evidence/persistence boundary and contact-evidence materialization.
- Entity route mutation/import/review surface.
- Identity-resolution route.
- Improvement/remediation routes.
- Registry client and multiple registry adapters.
- Build/test scripts and source-migration parity gate.
- API typecheck GitHub Actions workflow.
- Existing canonical static/regression gates.

## Confirmed defects fixed during this audit

### A1 — Global deterministic safe-remediation bypassed the Apex card boundary
**Severity:** High

`POST /improve/apply-safe` directly updated entity contact fields (`email`, `phone`, `phoneSource`, `contactOutcome`, `contactConfidence`, `isHot`, and quarantine state) for the whole entity table. The existing mutation guard only covered legacy enrichment and `/entities/*` contact routes, so this route was an alternate contact-card mutation plane.

**Fix:** retire `/improve/apply-safe` at the API mutation boundary with HTTP 410. The implementation remains in source as controlled legacy code but is unreachable through the guarded router.

**Regression:** `check-canonical-target-per-act-control.mjs` now asserts the retirement.

### A2 — Canonical Atlas boolean launch input was vulnerable to JavaScript truthiness coercion
**Severity:** Medium/High

`atlas.ts` used `Boolean(body.<field>)` for operator-controlled booleans. A form/client sending the string `"false"` becomes truthy, so launch behavior could invert. `runResearch` similarly uses a strict comparison against boolean `false`, which also makes string `"false"` behave incorrectly.

**Fix:** added narrow `normalizeAtlasLaunchBody` middleware. It converts only exact strings `"true"`/`"false"` for the canonical Atlas launch boolean fields before the launcher reads them. Unknown values remain untouched rather than guessed.

**Regression:** `check-atlas-launch-input-normalization.mjs` added and included in `check:bureau` and the API typecheck workflow.

### A3 — CI did not execute the new Atlas launch-input invariant
**Severity:** Medium

The API typecheck workflow ran several architectural checks but did not run the new launch-input contract check.

**Fix:** workflow now executes `check-atlas-launch-input-normalization.mjs` before build/typecheck.

## Important audit observations — not yet declared defects

### Registry cancellation
`registry-client.ts` currently accepts an `AbortSignal`, composes it with per-request timeouts, and passes the composed signal into the inspected registry fetches. The previous living-context note claiming that the registry source migration was still pending is stale. The remaining audit task is to inspect every adapter and every canonical call site for signal loss, especially adapters that catch errors and continue.

### Secondary public surface
`bureau-contact-persist.ts` still contains the historical `expandSecondaryPublicSurface()` implementation and several deterministic web lookups, but the direct code-search check found no checked-in caller for that function. Its rehydration function is already a hard-disabled no-op. This is currently a dead compatibility surface rather than a proven live canonical bypass. It should be removed only after the entire compatibility tree is caller-traced.

### Manual import
`POST /entities/import/batch` can populate entity contact columns with operator-supplied candidate data and also create `contact_evidence`. This is explicitly labeled review-only/candidate and does not mark data verified/personal. It remains under review because it is an intentional operator import surface, not model-selected research promotion.

### Identity resolution
`POST /identity/resolve` writes identity bundles/candidates and is review-oriented; the inspected code does not mutate contact-card fields. Continue audit of any downstream review/apply endpoint before treating the identity surface as closed.

### API authentication
The canonical app mounts `apiAuth` before routes; only health/auth bootstrap paths are public. Browser sessions require same-origin state-changing requests; bearer tokens use constant-time comparison. No authentication bypass was identified in the inspected path.

### Canonical launch duplication
The old `atlas.ts` still contains a legacy `/ingest/atlas-run` handler but is mounted after `canonical-atlas-launch.ts`, whose handler terminates the request. This is a compatibility/deletion candidate, not currently a reachable duplicate launch path. It requires route-order and status-route regression coverage before removal.

### Public registry-search documentation mismatch
`ingest.ts` describes `/registry-search` as public, while `app.ts` places all non-health/auth API routes behind `apiAuth`. The endpoint is therefore authenticated in the actual application. This is primarily a documentation/contract mismatch and should be corrected rather than weakening authentication.

## Next high-risk audit passes
1. Trace every `entitiesTable` writer, especially compatibility routes and non-route libraries.
2. Complete every registry adapter's cancellation/error semantics, including swallowed AbortError paths.
3. Trace target event-ledger source migration and remaining hardener dependencies.
4. Audit canonical discovery admission and promotion provenance end-to-end.
5. Audit all job-queue concurrency/lock release paths for stale ownership and duplicate execution.
6. Inspect schema/migrations for constraints matching application-level provenance/identity assumptions.
7. Audit all remaining route-level destructive/manual/review actions.
8. Audit frontend writes and operator claims against backend durable state.
9. Repeat adversarial bypass searches after each fix.

## Runtime status
No live runtime acceptance is claimed in this document. The operator remains responsible for the real Replit/provider execution experiment.
