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

**Regression:** `check-canonical-target-per-act-control.mjs` asserts the retirement.

### A2 — Canonical Atlas boolean launch input was vulnerable to JavaScript truthiness coercion
**Severity:** Medium/High

`atlas.ts` used `Boolean(body.<field>)` for operator-controlled booleans. A form/client sending the string `"false"` becomes truthy, so launch behavior could invert. `runResearch` similarly uses a strict comparison against boolean `false`, which also makes string `"false"` behave incorrectly.

**Fix:** added narrow `normalizeAtlasLaunchBody` middleware. It converts only exact strings `"true"`/`"false"` for the canonical Atlas launch boolean fields before the launcher reads them. Unknown values remain untouched rather than guessed.

**Regression:** `check-atlas-launch-input-normalization.mjs` added and included in `check:bureau` and the API typecheck workflow.

### A3 — CI did not execute the new Atlas launch-input invariant
**Severity:** Medium

The API typecheck workflow ran several architectural checks but did not run the new launch-input contract check.

**Fix:** workflow now executes `check-atlas-launch-input-normalization.mjs` before build/typecheck.

### A4 — Target execution reused another execution's durable case and could overwrite its job identity
**Severity:** P0
**Status:** Fixed on audit branch `audit/apex-control-plane-repair-2026-09-11`.

The canonical runner previously selected the first target case by `targetEntityId + caseType="target"` and then overwrote `atlasJobId`. This allowed concurrent/replayed executions of the same target to share durable case state. Oversight also had a newest-case/target-name fallback.

**Fix:** canonical case reuse is now bound to the current `atlasJobId`; a different execution creates its own case. Oversight loads the exact `caseId` propagated from the canonical runner and verifies the target name against that case's entity. No target-name/newest-case fallback remains.

**Regression:** `check-canonical-target-per-act-control.mjs` and `check-apex-target-control-boundary.mjs` assert current case identity semantics.

### A5 — First target act could consume stale prior continuation state
**Severity:** P1
**Status:** Fixed on audit branch.

The canonical runner initialized `lastOversight` from `readContinuationControl(caseState) ?? readOversight(caseState)`, allowing an earlier `targetControlDecisions` entry to affect a later execution's first act.

**Fix:** the first act starts with no prior continuation decision. Only the newly persisted per-act oversight is consumed after an Investigator act.

**Regression:** the canonical target guard now explicitly rejects `readContinuationControl()` in the runner rather than treating it as a proof of correctness.

### A6 — Target Investigator contact-card derived fields bypassed strict promotion
**Severity:** P1
**Status:** Fixed on audit branch.

`target-contact-agent.ts` directly updated `contactOutcome`, `contactConfidence`, and `contactMethod` after strict persistence. That was an independent entity mutation path outside the provenance-aware promotion projector.

**Fix:** the direct `entitiesTable` update was removed. The target agent now only reads the projected entity state after strict persistence to compute its returned outcome.

### A7 — Target Investigator did not hand strict promotion the same case/run provenance as oversight
**Severity:** P1
**Status:** Fixed on audit branch.

Strict promotion requires `{caseId, runId}` and validates immutable observation/claim support in that same case/run, but the target agent previously called strict persistence without provenance.

**Fix:** canonical `caseId` is propagated into the target agent and agentic wrapper. The target agent resolves the latest persisted run identity from the case event chain and passes `{caseId, runId}` into strict promotion. Missing provenance remains fail-closed.

### A8 — Generic Apex entity creation/import could establish contact-card state outside Investigator promotion
**Severity:** P1
**Status:** Fixed on audit branch.

The generic `/entities` creation route and `/entities/import/batch` could insert Apex HNWI/Gatekeeper rows containing contact fields without the strict promotion provenance boundary. The prior legacy mutation guard did not cover these creation paths.

**Fix:** the mutation guard now permits empty/manual Apex identity creation but rejects trusted contact fields on Apex `/entities` creation and rejects Apex batch drafts carrying contact fields. This preserves manual identity creation while closing the trusted contact-card bypass.

### A9 — Canonical target static guard asserted the stale continuation mechanism as proof
**Severity:** P2
**Status:** Fixed on audit branch.

`check-canonical-target-per-act-control.mjs` required `readContinuationControl(caseState)`, which was exactly the stale-state mechanism identified in A5.

**Fix:** the guard now proves absence of stale continuation consumption, current job/case binding, exact case propagation, exact oversight context, and no target-name fallback.

## Important audit observations — not yet declared defects

### Registry cancellation
`registry-client.ts` accepts an `AbortSignal`, composes it with per-request timeouts, and passes the composed signal into the inspected registry fetches. However, several adapter implementations catch broadly and return empty/partial results. Cancellation-specific propagation must be distinguished from ordinary provider failure so a cancelled Investigator act cannot continue as if the registry simply had no results.

### Investigator provider fallback
**Confirmed P1, unresolved.** `agentic-web-research-core.ts` still constructs an ordered provider list containing the Boss-selected Investigator followed by the other Investigator provider. A Groq failure can therefore silently invoke Mistral (or vice versa). This violates explicit Investigator assignment. The next repair must restrict execution to the selected provider while preserving same-provider model/key retries if desired.

### Registry signal at ReAct caller
**Confirmed P1, unresolved.** The ReAct `registry_search` action still calls `searchRegistry()` without passing the active `runController.signal`, despite the registry client supporting caller cancellation. This must be repaired at the caller.

### Secondary public surface
`bureau-contact-persist.ts` still contains the historical `expandSecondaryPublicSurface()` implementation and several deterministic web lookups, but the direct code-search check found no checked-in caller for that function. Its rehydration function is already a hard-disabled no-op. This is currently a dead compatibility surface rather than a proven live canonical bypass. It should be removed only after the entire compatibility tree is caller-traced.

### Identity resolution
`POST /identity/resolve` writes identity bundles/candidates and is review-oriented; the inspected code does not mutate contact-card fields. Continue audit of any downstream review/apply endpoint before treating the identity surface as closed.

### API authentication
The canonical app mounts `apiAuth` before routes; only health/auth bootstrap paths are public. Browser sessions require same-origin state-changing requests; bearer tokens use constant-time comparison. No authentication bypass was identified in the inspected path.

### Canonical launch duplication
The old `atlas.ts` still contains a legacy `/ingest/atlas-run` handler but is mounted after `canonical-atlas-launch.ts`, whose handler terminates the request. This is a compatibility/deletion candidate, not currently a reachable duplicate launch path. It requires route-order and status-route regression coverage before removal.

### Public registry-search documentation mismatch
`ingest.ts` describes `/registry-search` as public, while `app.ts` places all non-health/auth API routes behind `apiAuth`. The endpoint is therefore authenticated in the actual application. This is primarily a documentation/contract mismatch and should be corrected rather than weakening authentication.

## Next high-risk audit passes
1. Remove selected-Investigator provider fallback in the canonical ReAct core.
2. Propagate `runController.signal` into `searchRegistry` and preserve cancellation through every adapter.
3. Trace every `entitiesTable` writer, especially compatibility routes and non-route libraries.
4. Trace target event-ledger source migration and remaining hardener dependencies.
5. Audit canonical discovery admission and promotion provenance end-to-end.
6. Audit all job-queue concurrency/lock release paths for stale ownership and duplicate execution.
7. Inspect schema/migrations for constraints matching application-level provenance/identity assumptions.
8. Audit all remaining route-level destructive/manual/review actions.
9. Audit frontend writes and operator claims against backend durable state.
10. Repeat adversarial bypass searches after each fix.

## Runtime status
No live runtime acceptance is claimed in this document. No build/test/CI result has been observed for the repair branch yet. The operator remains responsible for the real Replit/provider execution experiment.
