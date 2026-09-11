# Apex Atlas / BigContacts — Living Context

> **Updated:** 2026-09-11. Repository source and runtime evidence are authoritative over this document.

**Repository:** `2f22vtd4kr-cloud/BigContacts`  
**Branch:** `main`  
**Current reviewed tip:** `3e5d77c8048b2b162b9e88cd333cd2526cac8853`

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

The Investigator action surface is model-selectable. Current individual OSINT actions include `web_search`, `visit`, `browser_fetch`, `footprint_email`, `footprint_username_maigret`, `footprint_username_sherlock`, `domain_lookup`, `harvest_domain`, `registry_search`, `reverse_whois`, and `done` where the corresponding capability is available. Maigret and Sherlock are separate model actions; the old compound username action is retired in the canonical source/runtime transformation.

Hardening includes maximum effective ReAct iterations = 40; run-scoped cancellation through canonical LLM/provider/search/page/browser paths; SSRF-safe HTTP/browser transport and redirect/subresource egress checks; bounded network/browser reads; model-selectable search locale; provider quota composition without duplicate counting; explicit successful-observation states; structured trajectory records; explicit model promotion and strict source-backed persistence; and candidate admission safety caps that fail closed rather than silently selecting the first N candidates.

The forced initial `web_search` migration has now been removed from API build/test and deleted after direct source verification; issue #120 is closed. Permanent Free-ReAct guards remain.

## 3. Python OSINT boundary

Holehe, Maigret, Sherlock and theHarvester use independent child-process network stacks. Process cancellation/output bounds exist, but environment variables or proxy hints are not an enforceable network-egress boundary.

Canonical Python network capabilities therefore remain **fail-closed**. Do not re-enable them until an actual sandbox/egress-controlled execution service or equivalent OS/deployment boundary exists and is verified. This remains under #139/#141.

## 4. Discovery/control architecture

Canonical discovery is `mode="discovery"`, not a fake person such as `Discovery slot`.

Gemini owns discovery/continuation control actions: `continue_discovery`, `research_candidate`, `revisit_candidate`, `pivot_discovery`, and `stop`.

Invalid Boss decisions fail closed. Candidate safety validation may reject invalid/over-cap state but must not substitute a research strategy.

The canonical Atlas launch boundary is `research/canonical-atlas-launch.ts`, which dispatches to the canonical model-owned discovery or single-target runner. The historical Atlas router/orchestrator remains retirement material and is not the canonical launch plane.

The legacy mixed `research/cases.ts` executor is deliberately unmounted from the live research router.

A remaining source-level issue is the legacy `case-bureau.ts` discovery `initialAction` shape, which is still transformed by `apply-discovery-case-initial-action-state.mjs`; this must be migrated directly before that hardener can be removed.

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

Issue #148 is closed after regression coverage for same-observation identity/claim binding, failed-observation rejection, and split-source rejection.

## 6. Durable event ledger

`research_case_events` is append-only case history. Immutable database `id` is the canonical per-case event sequence. `iteration` and `createdAt` are metadata, not ordering authorities.

Canonical discovery trajectory persistence now records each structured Investigator turn as its own durable case event inside the same DB transaction as the case snapshot update. Tool turns are `tool_observation`; an explicit `done` turn is a `decision`. Event payloads retain model/action/args/execution/observation/observedUrls/findings/provider-fallback/stop metadata.

The event schema/replay layer explicitly accepts the canonical `control_decision` and `tool_observation` event types and the deterministic `bureau` actor used by the single-target context projector. Regression coverage exercises these live event forms.

This improves causal reconstruction but is not yet the final claim-to-event graph: persisted findings still need first-class immutable claim/source references and idempotent run correlation. That remains part of #151/#152.

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

The dossier/card must be a projection of evidence, never the source of truth. The strict card boundary now additionally refuses candidate-person promotion unless the destination entity itself is an HNWI/Gatekeeper whose name exactly matches the model-authored person identity, preventing organization-card contamination. Promoted card values retain exact claim source URLs and run/job provenance in `metadata.agenticContactProvenance`.

Remaining work is to classify all readers/writers of `research_evidence`, `contact_evidence`, entity fields, relationships and identity candidates and retire/migrate proven legacy consumers.

## 8. Duplicate source trees

API server has canonical `artifacts/api-server/src/src/*` and legacy/compatibility `artifacts/api-server/src/*` trees. `tsconfig.json` includes only `src/src/**/*.ts`, and `build.mjs` bundles `src/src/index.ts`; a guard also prevents canonical production source from importing the legacy top-level `src/lib/*` tree.

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

Completed in this audit: `apply-free-react-opening-repair.mjs` has been deleted and removed from API build/test. The launch gate was also corrected so it no longer tries to execute the deleted hardener.

Still requiring direct source migration before deletion include the final-review role boundary, discovery initial-state boundary, secondary-surface retirement, registry cancellation, Python egress quarantine, and other explicitly tracked hardeners.

## 10. Legacy deterministic research

The historical deterministic secondary-surface expansion remains a source-level legacy playbook. Its canonical callers are guarded/transformed out of the canonical execution path, but direct source cleanup is still required before its migration hardener can be deleted.

The historical Atlas POST launch route is explicitly quarantined to HTTP 410. The historical Atlas orchestrator remains on disk for controlled retirement/reachability analysis.

Legacy `/api/enrich/*` and old case execution routes are retired/unmounted where guards establish the boundary. The deterministic `/entities/rehydrate-contacts` route is now also retired through the legacy mutation guard because replaying evidence into cards is an implicit promotion bypass. Issues #125/#126, #132, and #137/#138 remain relevant for final source/API-contract cleanup.

Issue #147 is closed: the model-facing username footprint capability is represented as individual Maigret and Sherlock actions after the canonical username capability split.

## 11. Role boundary

Groq must never become Boss or final reviewer. Gemini is Boss. DeepSeek/NVIDIA is Right Hand. Groq/Mistral are Investigators.

The canonical final-review boundary is intended to be Gemini Boss → DeepSeek/NVIDIA Right Hand → deterministic fail-closed adjudication. **The canonical `ai-extractor.ts` source still contains the Groq tertiary reviewer implementation and its migration hardener remains active. Issue #128 is therefore still an open source-level blocker.**

## 12. Persistence and provenance

Canonical strict persistence (`bureau-contact-persist-strict.ts`) persists source-backed candidate evidence and only applies a card field when the Investigator explicitly promoted exactly one candidate-scoped value with valid run-scoped observed provenance and acceptable identity-collision validation.

Candidate-person card promotion additionally requires the destination entity to be an HNWI/Gatekeeper and its name to exactly match the model-authored person identity. This prevents a discovery/organization entity from receiving a person's contact vector through a caller-supplied entity ID.

Promoted values retain exact claim source URLs, observed URLs and job/run correlation under `agenticContactProvenance`. This is provenance preservation, not proof that the complete immutable claim/event graph is finished.

## 13. Identity review boundary

The mounted `/identity/resolve` route deterministically builds identity bundles/candidates and writes `identityCandidatesTable`. It is currently review-only and was not found to directly mutate a card, but it can manufacture identity candidates without an Investigator finding. This is tracked as **#154** and must be explicitly classified as a non-autonomous review utility or converted/retired before final acceptance.

## 14. Runtime verification state

**No runtime/CI/provider/Replit success is currently claimed.** The user will manually launch Replit for the live phase. Static source changes, guards and GitHub commits are not runtime proof.

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

## 15. Current priorities

1. Direct source cleanup of #128 and the remaining migration hardeners, beginning with the canonical Groq reviewer.
2. Directly migrate `case-bureau.ts` discovery initial state, then delete its hardener.
3. Remove deterministic secondary-surface source callers, then delete that migration hardener.
4. Complete the immutable claim → observation/event → promotion → projection graph and run correlation (#151/#152).
5. Finish real subprocess sandbox/egress architecture for Python OSINT; keep fail-closed until enforceable.
6. Resolve #154's live deterministic identity-review boundary.
7. Finish duplicate-tree and legacy writer reachability proof.
8. Audit all entity/contact/relationship writers and generated/API compatibility surfaces.
9. Only then perform the user's live Replit acceptance experiment.

**Working rule:** after every fix, trace callers, transitive callers, error paths, persistence, cancellation, provenance and legacy duplicates. Never convert “I found no caller” into “there is no caller.” Never claim runtime success without runtime evidence.
