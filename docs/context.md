# Apex Atlas / BigContacts — Living Context

> **Updated:** 2026-09-10. Repository source and runtime evidence are authoritative over this document.

**Repository:** `2f22vtd4kr-cloud/BigContacts`  
**Branch:** `main`  
**Current reviewed tip:** `f9e96c718e65e0e55cc2f8dfa6d03e449a245181`

## 1. Institutional architecture

Apex is intended to be an autonomous AI OSINT research bureau, not a deterministic enrichment workflow.

```text
institutional constitution
  -> role purpose
  -> durable case context
  -> operator case objective
  -> AI reasoning
  -> model-selected action
  -> deterministic safety envelope
  -> observation
  -> AI interpretation / pivot
  -> ...
  -> explicit finding / promotion / stop
  -> deterministic evidence validation
  -> persistence
```

- **Gemini:** Boss / Head Investigator. Owns case direction, assignment, continuation and final high-level decisions.
- **DeepSeek via NVIDIA Integrate:** Right Hand / oversight. Advises and challenges; does not investigate.
- **Groq / Mistral:** Investigator capacity. They execute free-ReAct research.
- Deterministic code owns safety, authorization, schemas, SSRF, quotas, cancellation, persistence, provenance validation, deduplication, telemetry and lifecycle.
- Deterministic code must never silently choose research strategy.

## 2. Canonical ReAct

Canonical files include `agentic-web-research-core.ts`, `agentic-web-research.ts`, `target-contact-agent.ts`, `bureau-agentic-pass.ts`, `canonical-single-target-runner.ts`, `atlas-control-decision.ts`, and `canonical-atlas-discovery.ts` under `artifacts/api-server/src/src/lib/`.

The Investigator action surface is model-selectable. Current individual OSINT actions include `web_search`, `visit`, `browser_fetch`, `footprint_email`, `footprint_username_maigret`, `footprint_username_sherlock`, `domain_lookup`, `harvest_domain`, `registry_search`, `reverse_whois`, and `done` where the corresponding capability is available. Maigret and Sherlock are separate model actions; the old compound username action is retired.

Hardening includes:

- maximum effective ReAct iterations = 40;
- run-scoped cancellation through canonical LLM/provider/search/page/browser paths;
- SSRF-safe HTTP/browser transport and redirect/subresource egress checks;
- bounded network/browser reads;
- model-selectable search locale rather than hidden US/English forcing;
- provider quota composition without duplicate counting;
- explicit successful-observation states so attempted/failed URLs cannot become evidence;
- structured trajectory records;
- explicit model promotion and strict source-backed persistence;
- candidate admission safety caps fail closed instead of silently selecting the first N candidates.

## 3. Python OSINT boundary

Holehe, Maigret, Sherlock and theHarvester use independent child-process network stacks. Process cancellation/output bounds exist, but environment variables or proxy hints are not an enforceable network-egress boundary.

Canonical Python network capabilities therefore remain **fail-closed**. Do not re-enable them until an actual sandbox/egress-controlled execution service or equivalent OS/deployment boundary exists and is verified. This remains under #139/#141.

## 4. Discovery/control architecture

Canonical discovery is `mode="discovery"`, not a fake person such as `Discovery slot`.

Gemini owns discovery/continuation control actions:

- `continue_discovery`
- `research_candidate`
- `revisit_candidate`
- `pivot_discovery`
- `stop`

Invalid Boss decisions fail closed. Candidate safety validation may reject invalid/over-cap state but must not substitute a research strategy.

The canonical Atlas launch boundary is `research/canonical-atlas-launch.ts`, which dispatches to the canonical model-owned discovery or single-target runner. The historical Atlas router/orchestrator remains retirement material and is not the canonical launch plane.

The legacy mixed `research/cases.ts` executor is deliberately unmounted from the live research router. It must not be treated as canonical merely because it remains on disk.

## 5. Evidence law

An observation is not automatically evidence.

```text
raw observation
  -> model-authored finding
  -> explicit promotion/rejection
  -> deterministic provenance/schema validation
  -> persistence
```

Canonical person/contact promotion requires explicit model authorship, appropriate candidate/person scope, successful observed HTTP(S) provenance, explicit promotion, and strict claim-to-observation validation. For candidate contact claims, the claimed value and model-authored person identity must co-occur in the same successful bounded observation; independent pages cannot be silently combined into one source claim.

Deterministic code may sanitize/validate/collision-check. It must not invent identities, inherit target names, fabricate URLs, or select among competing research findings.

Issue #148 is closed after regression coverage was added for same-observation identity/claim binding, failed-observation rejection, and split-source rejection.

## 6. Durable event ledger

`research_case_events` is append-only case history. Immutable database `id` is the canonical per-case event sequence. `iteration` and `createdAt` are metadata, not ordering authorities.

Recent hardening includes explicit actor/event enums, bounded fields, JSON-object payload validation, fail-closed replay validation, serialized/drained Investigator action callbacks, replay ordered by event ID, and regression tests for timestamp-vs-sequence ordering and malformed/cross-case events.

Issue #140 remains open for full runtime proof and stronger turn-level reconstruction. The eventual ledger must allow oversight to reconstruct model-selected actions, arguments, observations, successful provenance, findings, promotions, capacity/fallback events and stop reasons without relying on mutable projections.

## 7. Evidence graph

The repository still contains the older `research_evidence` session model alongside the newer case/event architecture. Current verified consumers include the session read route and legacy `target-research.ts`/MCTS surfaces. Do not delete or merge blindly.

Target architecture:

```text
case
  -> immutable event / turn
  -> observation
  -> source/provenance
  -> model claim
  -> relationship / contradiction / scope
  -> promotion decision
  -> entity/contact projection
```

The dossier/card must be a projection of evidence, never the source of truth. Remaining work is to classify all readers/writers of `research_evidence`, `contact_evidence`, entity fields, relationships and identity candidates and retire/migrate proven legacy consumers.

## 8. Duplicate source trees

API server has canonical `artifacts/api-server/src/src/*` and legacy/compatibility `artifacts/api-server/src/*` trees. `tsconfig.json` includes only `src/src/**/*.ts`, and `build.mjs` bundles `src/src/index.ts`; this establishes a strong static exclusion of the top-level source tree from TypeScript compilation/bundling. A new guard also prevents canonical production source from importing the legacy top-level `src/lib/*` tree.

Issue #129 remains open until remaining compatibility/build/test references are reconciled and deletion/quarantine is proven safe.

## 9. Migration hardeners

The build still executes a collection of `apply-*` migration scripts before compilation. They are scaffolding, not the desired final architecture.

Safe retirement sequence:

```text
transformed source
  -> inspect exact result
  -> commit canonical source directly
  -> guard invariant
  -> remove corresponding apply script
  -> repeat
```

Do not delete hardeners blindly or replace complete files with approximations.

## 10. Legacy deterministic research

The historical deterministic secondary-surface expansion is being retired. Its canonical callers are guarded/unmounted; direct discovered-URL fetching in that legacy implementation must not be reintroduced into the canonical research path.

The historical Atlas POST launch route is explicitly quarantined to HTTP 410. The historical Atlas orchestrator remains on disk for controlled retirement/reachability analysis.

Legacy `/api/enrich/*` and old case execution routes are retired/unmounted where guards establish the boundary. Issues #125/#126, #132, and #137/#138 remain relevant for final source/API-contract cleanup.

Issue #147 is closed: the model-facing username footprint capability is now split into individual Maigret and Sherlock actions. The trajectory evaluator was updated to recognize those canonical actions.

## 11. Role boundary

Groq must never become Boss or final reviewer. Gemini is Boss. DeepSeek/NVIDIA is Right Hand. Groq/Mistral are Investigators.

The canonical final-review boundary now fails closed to the deterministic adjudicator when Gemini/DeepSeek oversight is unavailable; Groq is not a final reviewer. Issue #128 remains open until final direct-source cleanup and runtime verification are complete.

## 12. Persistence and provenance

Canonical strict persistence (`bureau-contact-persist-strict.ts`) persists source-backed candidate evidence and only applies a card field when the Investigator explicitly promoted exactly one candidate-scoped value with valid run-scoped observed provenance and acceptable identity-collision validation.

Card/contact outcome recomputation after persistence is deterministic projection metadata; it must not choose a missing contact or invent evidence.

Current provenance regression tests cover successful observation requirements, same-observation identity/value binding, failed/attempted observation rejection, synthetic search URL rejection, and organization-vs-person scope.

## 13. Runtime verification state

**No runtime/CI/provider/Replit success is currently claimed.** GitHub currently reports no combined status checks for the reviewed tip. Static source changes and guards are not runtime proof.

The user will manually launch Replit for the live phase.

Final acceptance must demonstrate a real run resembling:

```text
Gemini Boss
  -> DeepSeek/NVIDIA Right Hand
  -> Groq/Mistral Investigator selected by the Boss
  -> genuinely model-selected first action
  -> model-selected pivots/tool choices
  -> successful observations
  -> explicit finding/promotion
  -> evidence-backed persistence
  -> durable append-only events
  -> replayable trajectory/state
  -> inspectable oversight context
  -> clean operator cancellation
```

Do not seed the first action, inject a known URL, force a provider, fabricate provenance, or use legacy enrichment to make the smoke test pass.

## 14. Current priorities

1. Real subprocess sandbox/egress architecture for Python OSINT; keep fail-closed until enforceable.
2. Convert build-time migration hardeners into direct canonical source, one invariant at a time.
3. Finish duplicate-tree reachability and retirement.
4. Audit every model-output -> evidence -> entity/contact/relationship persistence path.
5. Finish production-grade event-ledger integrity and full turn-level forensic reconstruction.
6. Unify the evidence graph without deleting legitimate legacy consumers prematurely.
7. Optimize coordinated Boss/Right-Hand/Investigator token use without reducing autonomy.
8. Complete live Replit acceptance testing only after the static architecture is sufficiently clean.

**Working rule:** after every fix, trace callers, transitive callers, error paths, persistence, cancellation, provenance and legacy duplicates. Never convert “I found no caller” into “there is no caller.” Never claim runtime success without runtime evidence.
