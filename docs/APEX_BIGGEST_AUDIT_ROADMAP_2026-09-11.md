# Apex Atlas — Comprehensive Code Audit Roadmap

**Audit start:** 2026-09-11  
**Scope:** entire `main` tree, with canonical production source, compatibility source, build-time mutators, routes, persistence, database/schema, frontend, workflows, scripts, tests, docs/config and deployment boundaries all included.  
**Mode:** pre-run source audit. Runtime success is explicitly out of scope until the operator runs the acceptance environment.

## Audit law

1. Repository source is authoritative; docs describe intent but do not override code.
2. Inspect complete files in bounded pieces rather than relying on summaries or snippets.
3. Trace every important write backwards from the database/card boundary to its callers.
4. Trace every model/tool call forwards to authorization, observation, provenance, persistence, cancellation and lifecycle completion.
5. Treat build-time source mutators as temporary migration scaffolding, never as proof that source is correct.
6. Fail closed on ambiguity around identity, provenance, scope, authorization, cancellation and model-role separation.
7. No cosmetic refactors while correctness/security/control-plane defects remain.
8. Never weaken a regression gate simply to make it pass.
9. Every fix must be followed by a source-level reinspection of the changed path and its callers.
10. Runtime/provider availability will be reported separately from source correctness.

## Phase map

### 0 — Repository census and trust model
- Enumerate every tracked file and classify canonical production, compatibility, generated/build output, migration scaffolding, tests, workflows and documentation.
- Identify package/workspace boundaries, compilation roots, generated artifacts and duplicated source trees.
- Establish current `main` SHA and compare recent migration commits.
- Search for secrets, credentials, unsafe defaults, hidden network access and accidental production writes.

**Exit:** complete inventory and explicit trust/compile boundaries.

### 1 — API and route attack surface
- Read every route registration and middleware ordering.
- Enumerate every GET/POST/PATCH/PUT/DELETE endpoint.
- Trace request validation, authentication/authorization, body parsing, error handling and route reachability.
- Find legacy routes that are unmounted, guarded, or still reachable through compatibility routers.
- Trace all entity/contact-card mutation routes, including unusual repair/reject/manual/review endpoints.

**Exit:** route matrix with every mutating path classified as canonical, compatibility, retired, or defect.

### 2 — Canonical Atlas control plane
- Audit launch -> case creation -> Boss assignment -> Right Hand oversight -> Investigator act -> observation -> continuation -> stop -> persistence.
- Verify Gemini remains Boss, DeepSeek/NVIDIA remains advisory Right Hand, Groq/Mistral remain Investigators.
- Verify the Investigator owns tool/action trajectory and deterministic code does not silently prescribe research hops.
- Audit malformed-model fail-closed behavior and continuation decision freshness/idempotence.
- Check concurrent/replayed runs, stale control state, job ownership and case ownership.

**Exit:** one unambiguous control graph with no stale-control or alternate-control-plane bypass.

### 3 — Agent/tool execution and network boundary
- Read the complete canonical ReAct stack and every capability implementation.
- Audit action schemas, provider selection, model-selected arguments, SSRF/egress controls, redirect handling, URL normalization, response-size limits and content-type handling.
- Trace AbortSignal from run controller to the actual network operation for every network capability.
- Audit quotas, timeouts, cancellation, retries and provider fallback so they cannot change research strategy unexpectedly.
- Verify Python OSINT remains quarantined until enforceable sandbox/egress isolation exists.

**Exit:** every external operation has an explicit authorization, budget, cancellation and egress boundary.

### 4 — Evidence, provenance and identity
- Audit observations vs claims vs evidence graphs vs promotion decisions.
- Trace immutable event IDs through model claims and card persistence.
- Verify multi-source claims can cite multiple independent observations without weakening identity checks.
- Audit source URL validation, observed URL validation, search-result URL rejection, redirects and provenance metadata.
- Audit candidate scope, destination type, exact identity matching, collision/impersonation risks and organization/person separation.

**Exit:** no card mutation can occur without explicit model promotion plus deterministic, source-backed identity/provenance validation.

### 5 — Database/schema/persistence integrity
- Read schema definitions and migrations relevant to entities, cases, events, jobs, evidence and provenance.
- Audit transaction boundaries, uniqueness constraints, nullability, enum drift and JSON payload assumptions.
- Find direct table writes that bypass strict projectors or event logging.
- Check idempotence under retries/replays and partial failure.
- Check ordering and causality of append-only event records.

**Exit:** database is a durable source of truth, not an accidentally mutable projection with bypass writers.

### 6 — Legacy/compatibility retirement
- Trace every compatibility route and legacy top-level source-tree caller before deleting anything.
- Finish registry cancellation source migration; only then remove its hardeners.
- Finish secondary-surface source retirement; only then remove its hardener.
- Finish target investigation event-ledger source migration; only then remove its hardener.
- Audit identity review utilities and old registry/ingest surfaces.

**Exit:** each remaining compatibility surface has an explicit reason to exist and cannot silently re-enter canonical research.

### 7 — Build, test and CI integrity
- Read package scripts, tsconfigs, lockfiles and workflows.
- Determine what CI actually compiles/tests and what it merely checks textually.
- Audit source-mutating scripts for ordering, partial transforms and false-green behavior.
- Ensure permanent gates test the source architecture rather than generated/transformed artifacts.
- Inspect recent CI runs/statuses where available; do not equate absent runtime execution with passing acceptance.

**Exit:** CI gives truthful architectural signal and cannot mask source defects.

### 8 — Frontend/operator integrity
- Audit launch UI, job lifecycle display, case state, activity/trajectory rendering and contact-card projections.
- Check that UI labels do not claim evidence, success, completion or provenance stronger than backend state.
- Audit API error handling, cancellation and stale polling behavior.
- Check dangerous operator actions and whether frontend-only restrictions are duplicated server-side.

**Exit:** operator surface accurately reflects durable backend truth.

### 9 — Adversarial cross-cutting review
Perform explicit attack scenarios:
- stale continuation decision;
- replayed act;
- concurrent runs against one target;
- direct entity mutation;
- alternate legacy endpoint;
- malformed promotion payload;
- search URL disguised as evidence;
- source redirect to a different origin;
- cancellation during each network stage;
- provider timeout/fallback;
- partial persistence failure;
- duplicate observation/event;
- person/company identity collision;
- unmounted-but-reachable compatibility path;
- generated/build transform divergence.

**Exit:** every scenario has a deterministic fail-closed result or an explicitly documented safe outcome.

### 10 — Fix, regression, and final audit loop
For every defect:
1. inspect full surrounding file;
2. trace callers/callees;
3. patch root source;
4. add or strengthen a focused regression gate;
5. re-read changed source;
6. inspect adjacent bypasses;
7. only then move to the next defect.

After all fixes, repeat the high-risk searches from Phases 1–9 and produce a final defect ledger.

## Current first-pass findings / immediate work

### Confirmed priorities from the living context
- Registry cancellation still needs direct source migration in `registry-client.ts` and its canonical call chain; build mutators are not completion evidence.
- Target investigation event-ledger source migration still has a build hardener dependency.
- Secondary-surface deterministic callers still need direct source retirement.
- Multi-source evidence graph primitives need integration into canonical finding admission without weakening existing identity/provenance requirements.
- Identity/manual entity writers and compatibility routes remain a bypass-review surface.

### Newly audited surface during kickoff
- `registry-client.ts` does now accept a run signal and composes it with per-request timeouts in the inspected canonical source. This is progress, but the audit will continue through every registry implementation and caller before declaring migration complete.
- SEC/Companies House/BRREG/ARES/BODACC and other registry normalizers need individual semantic review for classification, provenance, contact-field contamination and query behavior; normalization correctness is distinct from cancellation correctness.

## Audit output contract

The final audit should contain:
- exact scope/inventory;
- severity-ranked defect ledger;
- architecture/control-plane findings;
- security/egress findings;
- provenance/identity findings;
- persistence/event findings;
- legacy reachability findings;
- build/CI findings;
- frontend/operator findings;
- fixes made with commit SHAs;
- unresolved issues and why they remain unresolved;
- runtime tests that still need operator execution;
- final acceptance checklist.

This roadmap is deliberately large. It is not a promise that one model turn can physically inspect arbitrary binary/generated bytes; for source files the audit uses complete-file, bounded-chunk inspection and targeted reinspection of every high-risk path.
