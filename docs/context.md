# Apex Atlas / BigContacts — Living Context

> **Updated:** 2026-09-11. Repository source and runtime evidence are authoritative over this document.

**Repository:** `2f22vtd4kr-cloud/BigContacts`  
**Branch:** `main`  
**Current reviewed source tip:** `831c00dd6740f43b435b01be765ca756ddf824df`

## 1. Institutional architecture

Apex is an autonomous AI OSINT research bureau, not a deterministic enrichment workflow.

```text
institutional constitution
  -> role purpose
  -> durable case context
  -> operator case objective
  -> AI reasoning
  -> model-selected research objective/action
  -> deterministic safety / authorization / budget envelope
  -> observation
  -> evidence graph / provenance
  -> AI interpretation / attribution / pivot
  -> ...
  -> explicit finding / promotion / stop
  -> deterministic validation
  -> persistence / review
```

- **Gemini:** Boss / Head Investigator. Owns case direction, Investigator assignment, continuation disposition and final high-level review.
- **DeepSeek V4 Flash via NVIDIA Integrate:** Right Hand / oversight. Advises and challenges Gemini; it does not browse or investigate.
- **Groq / Mistral:** Investigator capacity. They execute the free-ReAct research loop selected by the Boss.
- Search providers and OSINT capabilities are research tools, not LLM roles.
- Deterministic code owns safety, authorization, schemas, SSRF/egress controls, quotas, cancellation, persistence, provenance, deduplication, telemetry and lifecycle.
- Deterministic code must not silently choose research strategy.

Professional architecture checks continue to support this separation. Anthropic's managed-agent work explicitly separates brain, harness, session and sandbox so implementations can change without corrupting durable state; OpenAI's 2026 Agents SDK work similarly emphasizes separating harness from compute and durable external state. OWASP's 2026 Agent Control Standard emphasizes inspectability, traceability, instrumentation and runtime control. These principles match Apex's intended model/harness/evidence separation.

## 2. Canonical ReAct

Canonical Investigator machinery is under `artifacts/api-server/src/src/lib/`, especially:
- `agentic-web-research-core.ts`
- `agentic-web-research.ts`
- `bureau-agentic-pass.ts`
- `target-contact-agent.ts`
- `canonical-single-target-runner.ts`
- `canonical-atlas-discovery.ts`
- `atlas-control-decision.ts`
- `target-control-decision.ts`

The Investigator chooses its own permitted action trajectory. Current capabilities include web search, visit/browser fetch, domain/registry investigation and individual Maigret/Sherlock username actions where configured. There is no canonical fixed provider sequence and no intended fixed first research action.

Hardening includes effective ReAct iteration limits, run-scoped cancellation, SSRF-safe HTTP/browser transport, bounded reads, model-selectable search locale, provider quota accounting, successful-observation state, structured trajectory records, explicit promotion, strict source-backed persistence and fail-closed candidate admission.

### 2026-09-11 source migrations
- PR **#170** merged: canonical target-runner cancellation is source-native.
- PR **#172** merged: typed multi-source evidence-graph primitives and focused tests were added to canonical source corroboration.
- PR **#173** merged: Gemini target continuation now uses only `research | stop`; `direction` is the next research objective. The Boss no longer has `continue_target`, `revisit_target`, and `pivot_target` pseudo-phase vocabulary. The Investigator owns how to answer that objective.
- PR **#174** merged: Bureau investigation event callbacks are source-native, serialized and drained before trajectory persistence/pass completion. The obsolete event-ordering source mutator was deleted.
- The stale PR #171 was closed because #174 re-applied the migration on the current main tip.

Anthropic's context-engineering research reinforces the current durable-context direction: long-running agents need iterative context curation, structured notes/state and selective just-in-time retrieval rather than dumping an ever-growing raw trace into every prompt. citeturn2search0turn2search8

## 3. Durable context and event ledger

Every canonical investigation must have durable case context. Gemini and DeepSeek receive the accumulated investigation state, and Investigator passes mount the same durable context.

`research_case_events` is append-only case history. Immutable database event IDs are the canonical per-case ordering authority. Trajectory records include model/action/arguments/execution/observation/observed URLs/findings/provider fallback/stop metadata.

The Bureau event-ordering migration now guarantees that Investigator action callbacks are serialized through `investigationEventChain` and drained before discovery trajectory persistence/pass completion. This prevents fire-and-forget persistence from diverging from the actual Investigator trajectory.

The event/replay layer already represents assignment, control decisions, tool observations, claims, promotions and related causal references. It is still not a mature semantic graph: many relationships remain encoded inside event payloads rather than independent typed relational edges.

## 4. Evidence law and multi-source graph

An observation is not automatically evidence.

```text
raw observation
  -> model-authored claim
  -> explicit attribution / promotion decision
  -> deterministic provenance / identity / scope validation
  -> persistence / projection
```

Canonical person/contact promotion requires explicit model authorship, candidate scope, explicit person identity, successful observed HTTP(S) provenance, explicit promotion and strict destination identity checks. HNWI/Gatekeeper destination constraints prevent organization-card contamination.

### New graph foundation — PR #172
The canonical `source-corroboration.ts` module now contains typed primitives:
- `EvidenceObservation`
- `EvidenceClaim`
- `EvidenceEdge`
- `EvidenceGraph`
- `observationsFromSourceUrls()`
- `buildClaimSupportGraph()`
- `graphHasIndependentCorroboration()`

These primitives allow multiple independently observed sources to support one model-authored claim without turning corroboration into automatic promotion. Tests cover the two-source rule and multi-observation claim support.

This is intentionally a foundation, not a claim that full multi-source attribution is finished. The remaining quality problem is the existing upstream `claimAppearsInObservedMaterial()` rule in Bureau/target Investigator paths: the claim's value and candidate identity still generally need to co-occur in one successful observation before the finding enters the strict persistence path. **Do not weaken that rule casually.** The next integration should instead connect immutable observation events to a model-authored attribution claim:

```text
Observation A -> John Smith is CFO of Company X
Observation B -> john.smith@company-x.com is published
        -> claim references both observations
        -> model attribution reasoning
        -> deterministic identity/scope/provenance validation
        -> explicit promotion
```

EviGraph (Aug. 2026) supports this architectural direction by treating typed evidence graphs as operational state and validating claim/evidence dependencies rather than merely storing a post-hoc trace. Explicit provenance research likewise argues that agent actions and conclusions need traceable causal provenance. citeturn0academia12turn0academia13

## 5. Python OSINT boundary

`python-tools.ts` now enforces the Python OSINT quarantine directly in canonical source:

- Holehe: unavailable
- Maigret: unavailable
- Sherlock: unavailable
- theHarvester: unavailable
- Python-backed deep research: unavailable

The source uses a hard `PYTHON_OSINT_EGRESS_GOVERNED = false` boundary. Cancellation/output hygiene remains useful but is not treated as a network-egress sandbox.

Do **not** re-enable Python network capabilities until an actual sandbox/container/VM or equivalent deployment-level egress boundary is implemented and verified. OWASP and NIST guidance independently emphasize sandboxing, least privilege, server-side tool controls and explicit egress/authorization controls for agentic execution. citeturn1search0turn1search24

## 6. Registry cancellation — still in progress

The canonical Investigator registry action already has a run-scoped cancellation design, but the current repository still uses build-time hardening around `registry-client.ts` and registry signal propagation.

Remaining hardeners include:
- `apply-registry-cancellation-boundary.mjs`
- `apply-agentic-registry-signal-wiring.mjs`

The desired final source contract is:

```text
Investigator runController.signal
  -> registry action
  -> searchRegistry(..., signal)
  -> registry-specific fetch
  -> cancellation reaches actual network operation
```

The migration is **not complete** merely because a guard or build transform produces this shape. Direct source migration must be made in `registry-client.ts` and the canonical ReAct call site, then the two mutators can be deleted. This remains a priority.

## 7. Deterministic secondary-surface retirement — still in progress

`expandSecondaryPublicSurface()` remains legacy deterministic research machinery. Its historical behavior chooses fixed secondary-surface research/fetch steps and therefore does not belong in the canonical model-owned research plane.

The active hardener is:
- `apply-retire-secondary-surface-calls.mjs`

It currently strips live callers from canonical `entities.ts` and legacy Atlas orchestration source before build. The underlying callers still need direct source retirement or replacement by explicit model-selected capability execution.

Do not delete the hardener until source reachability is rechecked. Do not turn the secondary surface into another hidden deterministic Investigator lane.

## 8. Gemini control-plane redesign

The target continuation control was previously:

`continue_target | revisit_target | pivot_target | stop`

That vocabulary was a pseudo-phase seam. It has now been simplified to:

`research | stop`

When `research` is selected, Gemini supplies a **research objective**, not a tool, provider, query or scripted sequence. The Investigator may revisit, pivot, verify, broaden, narrow or abandon hypotheses as needed.

This better follows the intended division:

```text
Gemini: what question should be pursued next, and why?
        ↓
Investigator: how should that question be investigated?
        ↓
harness: is the requested action authorized/safe/budgeted?
        ↓
observation
        ↓
context/evidence graph
        ↓
Gemini reassesses
```

The harness still validates the minimal `research|stop` disposition and fail-closes malformed model output. It does not infer continuation from pass count, finding count, score or elapsed time.

## 9. Duplicate source trees

The API contains canonical `artifacts/api-server/src/src/*` and legacy/compatibility `artifacts/api-server/src/*` trees. Canonical `tsconfig`/build compilation uses the nested `src/src` tree.

The permanent guard `check-no-canonical-legacy-tree-imports.mjs` prevents canonical production source from importing the legacy top-level `src/lib` tree and checks retired research route removal. The old `research/cases.ts` source is no longer present on main.

However, several noncanonical compatibility routes intentionally still use the legacy top-level tree. Do not delete that tree wholesale. Continue auditing route reachability and writers before moving individual files. Issue #129 remains a cleanup/retirement program rather than permission to perform a blind deletion.

## 10. Role boundaries

- Gemini remains Boss.
- DeepSeek V4 Flash/NVIDIA remains Right Hand.
- Groq/Mistral remain Investigators.
- Groq must not become Boss or final reviewer.
- Final review remains Gemini Boss → DeepSeek/Right Hand → deterministic fail-closed adjudication.

The canonical DeepSeek path is advisory and non-blocking when the external NVIDIA service is unavailable. The known NVIDIA Integrate DeepSeek V4 Flash outage/hang behavior is an external provider problem; do not redesign Apex around it or falsely claim successful Right-hand calls.

## 11. Persistence / provenance / identity

`bureau-contact-persist-strict.ts` is the strict card boundary. It:
- requires source-backed HTTP(S) provenance;
- rejects search-query URLs as claim provenance;
- requires explicit model promotion for card mutation;
- requires candidate scope and explicit person identity for personal promotion;
- requires destination entity name to exactly match the model-authored person identity;
- restricts person-card promotion to HNWI/Gatekeeper entities;
- preserves source URLs, observed URLs and run/job correlation in provenance metadata.

The dossier/card is a projection, not the source of truth.

## 12. Legacy deterministic research / API cleanup

Historical deterministic MCTS/target-research and fixed discovery/case lanes have been removed or quarantined from canonical execution. The old Atlas POST launch is retired. Legacy research routes are unmounted or guarded where proven safe.

The remaining legacy areas requiring continued reachability analysis include:
- deterministic secondary-surface callers;
- compatibility entity/manual endpoints;
- identity review utilities (`/identity/resolve`, tracked as #154);
- old registry/ingest surfaces;
- duplicate-tree writers and readers.

Never equate “unmounted” with “dead”; trace transitive callers before deletion.

## 13. Migration hardeners — current state

Build-time source-mutating hardeners are scaffolding and should disappear one by one only after direct source migration.

### Retired this session
- `apply-target-runner-cancellation-boundary.mjs` — deleted; target runner cancellation is source-native.
- `apply-bureau-investigation-event-ordering.mjs` — deleted; Bureau event ordering is source-native.
- The stale PR #171 carrying the first event-ordering implementation was closed and superseded by PR #174 on the current main tip.

### Still active and requiring direct source migration
- `apply-retire-secondary-surface-calls.mjs`
- `apply-registry-cancellation-boundary.mjs`
- `apply-agentic-registry-signal-wiring.mjs`
- `apply-target-investigation-event-ledger.mjs`
- `apply-canonical-discovery-cancellation-boundary.mjs`
- other explicitly tracked compatibility migrations

A hardener must not be deleted merely because a permanent guard exists. First put the invariant in canonical source, inspect the exact diff, trace callers/error paths/persistence/cancellation, then remove the mutator and keep the permanent guard.

## 14. Professional architecture basis

Current work has been cross-checked against current professional/primary guidance:

- Anthropic: managed agents should separate durable session state, harness and execution environments; this supports Apex's durable case/event architecture. citeturn0search1turn0search7
- Anthropic: effective context engineering favors compact, high-signal context, structured notes and just-in-time retrieval over indiscriminate context accumulation. citeturn2search0turn2search8
- OpenAI: the 2026 Agents SDK work emphasizes sandbox-aware orchestration, durable state and separation of harness from compute. citeturn0search0
- OWASP: agent tool execution needs server-side validation, least privilege, sandboxing and explicit runtime controls rather than relying on model instructions alone. citeturn1search0turn1search3turn1search11
- NIST: agent identity/authorization and auditability are explicit emerging control concerns. citeturn1search6turn1search7
- EviGraph and provenance research support explicit typed claim/evidence relationships rather than post-hoc trace reconstruction. citeturn0academia12turn0academia14

These sources are used to validate architectural principles, not to dictate a vendor-specific Apex implementation.

## 15. Current priorities

1. **Finish registry cancellation source migration.** Move AbortSignal through the actual registry client and every relevant network fetch; then delete both registry mutators.
2. **Finish target investigation event-ledger source migration.** `target-contact-agent.ts` already has source-native cancellation; the remaining target-runner event callback wiring still depends on `apply-target-investigation-event-ledger.mjs` and must be migrated directly.
3. **Finish secondary-surface retirement.** Remove live deterministic callers from source, then delete the retirement hardener.
4. **Integrate the new multi-source evidence graph into canonical finding admission.** Claims must reference several immutable observations where attribution requires it. Do not weaken identity/provenance validation.
5. **Finish Python sandbox/egress architecture.** Keep fail-closed until enforceable isolation exists.
6. **Continue duplicate-tree and legacy-writer reachability cleanup.** Move or retire compatibility surfaces only after caller tracing.
7. **Audit identity review and remaining manual entity writers.** Resolve #154 and related projection bypass risks.
8. **Finish context/trajectory compaction strategy.** Keep the durable case document high-signal; mount detailed event IDs/trajectory references instead of endlessly expanding raw prompts.
9. **Only after source architecture is complete, perform the user's Replit acceptance experiment.** No Replit/runtime/provider success is claimed in this phase.

## 16. Pre-run acceptance contract

The first live acceptance run must be real, not staged:

```text
Gemini Boss
  -> DeepSeek/NVIDIA Right Hand (if provider available; unavailable must remain honest)
  -> Gemini-selected Groq/Mistral Investigator
  -> genuinely model-selected first action
  -> model-selected pivots/tool/provider choices
  -> successful observations with immutable provenance
  -> multi-source attribution where necessary
  -> explicit model finding/promotion decision
  -> deterministic evidence/identity validation
  -> durable append-only case events
  -> inspectable shared context for Gemini/Right Hand/Investigator
  -> clean cancellation
  -> replayable trajectory/state
```

Do not seed a known URL, force a search provider, manufacture provenance, bypass strict persistence, or use legacy enrichment to make the smoke test pass.

**Working rule:** after every fix, trace callers, transitive callers, error paths, persistence, cancellation, provenance and legacy duplicates. Never turn “I found no caller” into “there is no caller.” Never claim runtime success without runtime evidence.