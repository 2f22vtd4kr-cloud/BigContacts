# Apex Atlas / BigContacts — Living Context

> **Updated:** 2026-09-11. Repository source and runtime evidence are authoritative over this document.

**Repository:** `2f22vtd4kr-cloud/BigContacts`  
**Branch:** `main`  
**Current reviewed tip:** `e8c16e41981efa96a26e12c0c2af5df0b24daef6`

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

The forced initial `web_search` migration has been removed from API build/test and its source-mutator has been deleted after direct source verification. Permanent Free-ReAct guards remain.

## 3. Python OSINT boundary

Holehe, Maigret, Sherlock and theHarvester use independent child-process network stacks. Process cancellation/output bounds exist, but environment variables or proxy hints are not an enforceable network-egress boundary.

Canonical Python network capabilities therefore remain **fail-closed**. Do not re-enable them until an actual sandbox/egress-controlled execution service or equivalent OS/deployment boundary exists and is verified. This remains under #139/#141.

## 4. Discovery/control architecture

Canonical discovery is `mode="discovery"`, not a fake person such as `Discovery slot`.

Gemini currently owns a bounded transition vocabulary: `continue_discovery`, `research_candidate`, `revisit_candidate`, `pivot_discovery`, and `stop`. These are AI-returned control decisions; the harness validates them and does not infer the action from candidate count or scores. This remains an architectural seam to revisit: the long-term target is for the Boss to express the next research objective without a deterministic phase/playbook vocabulary constraining legitimate hypotheses.

Invalid Boss decisions fail closed. Candidate safety validation may reject invalid/over-cap state but must not substitute a research strategy.

The canonical Atlas launch boundary is `research/canonical-atlas-launch.ts`, which dispatches to the canonical model-owned discovery or single-target runner. The historical Atlas router/orchestrator remains retirement material and is not the canonical launch plane.

The legacy mixed `research/cases.ts` executor is deliberately unmounted from the live research router.

The legacy `case-bureau.ts` discovery `initialAction` type still contains historical `broad-web-discovery` vocabulary in source, although the live build/test hardener that rewrote it has now been retired. New canonical discovery case creation itself uses Boss-controlled state. Direct source cleanup of the legacy type is still desirable, but it is no longer an active build mutation.

## 5. Evidence law

An observation is not automatically evidence.

```text
raw observation
  -> model-authored finding
  -> explicit promotion/rejection
  -> deterministic provenance/schema validation
  -> persistence
```

Canonical person/contact promotion requires explicit model authorship, appropriate candidate/person scope, successful observed HTTP(S) provenance, explicit promotion, and strict claim-to-observation validation.

**Important research-quality limitation:** the current canonical contact boundary still requires the claimed contact value and model-authored person identity to co-occur in one successful bounded observation. This is deliberately conservative, but it creates false negatives for legitimate multi-source attribution. Do not weaken the boundary. The intended next architecture is a typed evidence graph in which identity, role, organization and contact-value observations can support separate claims that are then joined by explicit model reasoning and deterministic attribution/collision checks.

Example target state:

```text
Observation A -> John Smith is CFO of Company X
Observation B -> john.smith@company-x.com is published
             -> separate claims with immutable observation references
             -> model attribution reasoning
             -> deterministic identity/scope/provenance validation
             -> explicit promotion
```

Issue #148 is closed for the original same-observation regression boundary. The multi-source evidence-graph extension is a separate quality improvement and remains strategically important even though #152 is marked completed.

## 6. Durable event ledger

`research_case_events` is append-only case history. Immutable database `id` is the canonical per-case event sequence. `iteration` and `createdAt` are metadata, not ordering authorities.

Canonical discovery trajectory persistence records each structured Investigator turn as its own durable case event inside the same DB transaction as the case snapshot update. Tool turns are `tool_observation`; an explicit `done` turn is a `decision`. Event payloads retain model/action/args/execution/observation/observedUrls/findings/provider-fallback/stop metadata.

The event schema/replay layer accepts canonical `control_decision` and `tool_observation` event types and validates claim → observation, promotion → claim, validation → claim, and projection → validation/promotion causal references. Correlation keys make autonomous trajectory events idempotent across retries.

The graph is therefore substantially implemented, but it is not yet the mature semantic evidence graph: observations and claims are stored as event payloads rather than as a fully typed relational graph with independent contradiction, temporal, scope and derivation edges. The remaining work is to make those relationships first-class without turning the graph into a deterministic research planner.

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

The dossier/card must be a projection of evidence, never the source of truth. The strict card boundary refuses candidate-person promotion unless the destination entity itself is an HNWI/Gatekeeper whose name exactly matches the model-authored person identity, preventing organization-card contamination. Promoted card values retain exact claim source URLs, observed URLs and job/run correlation in `metadata.agenticContactProvenance`.

The strategic next step is **multi-source claim attribution**, not weaker validation: the graph should allow a claim to depend on several independently observed facts while keeping every edge and uncertainty explicit.

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

Completed during this session: the obsolete discovery initial-state mutator was removed from API build/test and deleted because the relevant canonical case state was already in place. Its migration-parity inventory entry was removed at the same time.

Still requiring direct source migration before deletion include registry cancellation, deterministic secondary-surface retirement, several cancellation/event hardeners, Python egress quarantine, and other explicitly tracked source migrations. A hardener must not be deleted merely because a guard exists; the underlying source must first contain the invariant itself.

## 10. Legacy deterministic research

The historical deterministic secondary-surface expansion remains a source-level legacy playbook. Its build-time retirement hardener is still active because live source callers remain in legacy/manual entity surfaces; those callers must be removed or converted to explicit model-selected capability execution before the hardener can be deleted.

The historical Atlas POST launch route is explicitly quarantined to HTTP 410. The historical Atlas orchestrator remains on disk for controlled retirement/reachability analysis.

Legacy `/api/enrich/*` and old case execution routes are retired/unmounted where guards establish the boundary. The deterministic `/entities/rehydrate-contacts` route is also retired through the legacy mutation guard because replaying evidence into cards is an implicit promotion bypass. Issues #125/#126, #132, and #137/#138 remain relevant for final source/API-contract cleanup.

Issue #147 is closed: the model-facing username footprint capability is represented as individual Maigret and Sherlock actions after the canonical username capability split.

## 11. Role boundary

Groq must never become Boss or final reviewer. Gemini is Boss. DeepSeek/NVIDIA is Right Hand. Groq/Mistral are Investigators.

The canonical final-review boundary is now **Gemini Boss → DeepSeek/NVIDIA Right Hand → deterministic fail-closed adjudication**. The canonical `ai-extractor.ts` source no longer contains the former Groq tertiary reviewer loop; the role-boundary guard remains active. Issue #128's source-level blocker has been repaired.

## 12. Persistence and provenance

Canonical strict persistence (`bureau-contact-persist-strict.ts`) persists source-backed candidate evidence and only applies a card field when the Investigator explicitly promoted exactly one candidate-scoped value with valid run-scoped observed provenance and acceptable identity-collision validation.

Candidate-person card promotion additionally requires the destination entity to be an HNWI/Gatekeeper and its name to exactly match the model-authored person identity. This prevents a discovery/organization entity from receiving a person's contact vector through a caller-supplied entity ID.

Promoted values retain exact claim source URLs, observed URLs and job/run correlation under `agenticContactProvenance`. This is provenance preservation, not proof that the complete semantic claim/event graph is finished.

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

1. Complete the direct-source migration of the remaining build-time hardeners; do not let build scripts remain the source of runtime behavior.
2. Replace the remaining deterministic secondary-surface callers with explicit model-selected capability execution or retire those manual endpoints if they are not part of the Bureau product.
3. Mature the immutable claim → observation/event → promotion → projection graph into a true multi-source evidence graph with explicit attribution, contradiction, temporal and scope edges (#151/#152 direction).
4. Revisit the Gemini control vocabulary so the Boss selects the next research objective rather than being constrained by a pseudo-phase taxonomy; keep deterministic validation of safety and candidate identity.
5. Finish real subprocess sandbox/egress architecture for Python OSINT; keep fail-closed until enforceable.
6. Resolve #154's live deterministic identity-review boundary.
7. Finish duplicate-tree and legacy writer reachability proof.
8. Audit all entity/contact/relationship writers and generated/API compatibility surfaces.
9. Only then perform the user's live Replit acceptance experiment.

**Working rule:** after every fix, trace callers, transitive callers, error paths, persistence, cancellation, provenance and legacy duplicates. Never convert “I found no caller” into “there is no caller.” Never claim runtime success without runtime evidence.
