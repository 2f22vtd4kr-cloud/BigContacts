# Apex Atlas / BigContacts — Living Context

> **Updated:** 2026-09-10. This file is the current engineering handoff. Repository source and runtime evidence remain authoritative over prose.

**Repository:** `2f22vtd4kr-cloud/BigContacts`  
**Branch:** `main`  
**Current reviewed tip:** `689e60d0972ae620c661f7928d3cc510bcf46469`

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
- **Groq / Mistral:** Investigator capacity. They execute the free-ReAct research loop.
- Deterministic code owns safety, authorization, schemas, SSRF, quotas, cancellation, persistence, provenance validation, deduplication, telemetry and lifecycle.
- Deterministic code must never silently choose the research strategy.

## 2. Canonical ReAct

Canonical files:

- `artifacts/api-server/src/src/lib/agentic-web-research-core.ts`
- `artifacts/api-server/src/src/lib/agentic-web-research.ts`
- `artifacts/api-server/src/src/lib/target-contact-agent.ts`
- `artifacts/api-server/src/src/lib/bureau-agentic-pass.ts`
- `artifacts/api-server/src/src/lib/canonical-single-target-runner.ts`
- `artifacts/api-server/src/src/lib/atlas-control-decision.ts`
- `artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts`

The Investigator action surface is model-selectable. Safety/resource ceilings are not research strategy.

Current hardening includes:

- maximum effective ReAct iterations = 40;
- run-scoped cancellation propagated through canonical LLM/provider/search/page/browser paths;
- SSRF-safe HTTP/browser transport;
- bounded network/browser reads;
- browser egress checks including redirects/subresources;
- model-selectable search locale rather than hidden US/English forcing;
- provider quota composition without duplicate counting;
- explicit successful-observation states so attempted/failed URLs cannot become evidence;
- structured trajectory records rather than only compact action strings;
- explicit model promotion and strict source-backed persistence.

## 3. Python OSINT boundary

Holehe, Maigret, Sherlock and theHarvester can own independent network stacks when executed as child processes. Process cancellation is hardened with bounded output and process-group termination, but that is **not** network-egress governance.

Therefore canonical Python network capabilities are currently **fail-closed**.

Do not re-enable them using environment variables, proxy hints, or claims of governance. The required final architecture is an actual deployment/OS-level sandbox or governed execution service with enforced egress policy and real cancellation.

This remains open under **#139 / #141**.

## 4. Discovery architecture

Canonical discovery is `mode="discovery"`, not a fake person such as `Discovery slot`.

Gemini controls the discovery/target continuation actions:

- `continue_discovery`
- `research_candidate`
- `revisit_candidate`
- `pivot_discovery`
- `stop`

Invalid Boss decisions fail closed. Deterministic code may enforce safety and admitted-candidate validity but must not silently substitute a different research action.

The canonical Atlas path now treats candidate admission as model-authored. A safety cap may reject an over-cap admission set; it must not silently choose the first N candidates as a research strategy.

Historical `discovery-agent.ts` and `atlas-orchestrator.ts` remain quarantine/retirement material until reachability and compatibility references are fully reconciled.

## 5. Evidence law

An observation is not automatically evidence.

The intended boundary is:

```text
raw observation
  -> model-authored finding
  -> explicit promotion/rejection
  -> deterministic provenance/schema validation
  -> persistence
```

A person cannot be admitted merely from a target-name URL slug, organization inheritance, article/listicle authorship, or deterministic extraction.

For canonical promotion, the system requires:

- explicit model-authored finding;
- appropriate candidate/person scope;
- successful observed HTTP(S) provenance;
- explicit model promotion;
- strict source-backed contact validation;
- no fabricated identity/contact/source.

The strict persistence boundary is `bureau-contact-persist-strict.ts`.

Deterministic identity-collision checks are safety validation; they must never be used to choose between competing research leads or manufacture a finding.

## 6. Durable case/event ledger

`research_case_events` is append-only case history. The immutable database `id` is the canonical per-case event sequence. `iteration` and `createdAt` are metadata, not ordering authorities.

Recent hardening:

- actor roles are explicitly enumerated;
- event types are explicitly enumerated, including compatibility `tool_observation`;
- status and summary lengths are bounded;
- event payloads must be JSON objects through the insert schema;
- replay validates IDs, case IDs, iteration monotonicity, actor roles, event types, status, summaries, timestamps and payload JSON;
- replay fails closed on violations rather than producing false-valid state;
- target/Bureau Investigator event callbacks are serialized and drained before completion;
- replay orders by immutable event ID;
- regression tests cover sequence-vs-wall-clock ordering and malformed/cross-case/unknown-role/type events.

Issue **#140 remains open** because runtime proof and full turn-level forensic completeness are still required. The ledger must ultimately let oversight reconstruct actual model-selected actions, arguments, bounded observations, successful provenance, findings, promotions, fallback/capacity events and stop reasons without relying on mutable case-file projections.

## 7. Evidence graph direction

The repository currently contains both the older `research_evidence` session model and the newer case/event model. Do not merge or delete them blindly.

Required eventual architecture:

```text
case
  -> immutable event / turn
  -> observation
  -> source/provenance
  -> model claim
  -> claim relationship / contradiction / scope
  -> promotion decision
  -> entity/contact projection
```

The dossier/card must be a projection of evidence, never the source of truth.

The remaining evidence-graph task is to trace every writer/reader of `research_evidence`, `contact_evidence`, entity fields, relationships and identity candidates; then migrate legitimate canonical consumers or retire proven legacy consumers.

## 8. Duplicate source trees

There are two API source trees:

- canonical: `artifacts/api-server/src/src/*`
- legacy/compatibility: `artifacts/api-server/src/*`

The canonical runtime entry is under `src/src`. The top-level tree remains legacy/quarantine material and must not be assumed dead merely because the canonical entry does not import it.

A new build/test guard now scans canonical production source and fails if it imports the legacy top-level `src/lib/*` tree. Tests that intentionally inspect legacy files are excluded from that reachability invariant.

Issue **#129 remains open** until remaining compatibility/build/test references are reconciled and deletion/quarantine can be proven safe.

## 9. Migration hardeners

The build currently executes a collection of `apply-*` migration scripts before compilation. They are migration scaffolding, not the desired final architecture.

Final direction:

```text
transformed source
  -> inspect exact result
  -> commit canonical source directly
  -> guard the invariant
  -> remove corresponding apply script
  -> repeat
```

Do not delete a hardener until its transformed result has been committed directly and the guard still protects the invariant. Do not use hardeners as an excuse to stop source cleanup.

## 10. Legacy deterministic research

The historical deterministic secondary-surface enrichment/control-plane behavior is being retired. Known canonical callers are guarded/quarantined.

The old Atlas POST launch path is explicitly retired to HTTP 410; the historical Atlas orchestrator remains on disk only as controlled retirement material.

Legacy `/api/enrich/*` research routes are retired/unmounted. Existing legacy source files require reachability reconciliation before deletion.

Issues **#125/#126, #132, #137/#138** remain relevant until the remaining source/build/API-contract references are reconciled.

## 11. Role boundary

Groq must never become a final reviewer or Boss. Gemini remains Boss. DeepSeek remains Right Hand. Groq/Mistral remain Investigators.

The older Groq final-review path is blocked by the current hardening/guards, but direct source cleanup and runtime proof remain outstanding under **#128**.

## 12. World-class target

Apex should behave like a strong human OSINT bureau:

- react to evidence rather than execute a fixed playbook;
- formulate its own queries;
- choose tools based on information value;
- pivot across people, companies, domains, filings, registries and public professional surfaces;
- revisit earlier leads when new evidence changes the hypothesis;
- distinguish hypotheses, claims, evidence, contradictions and uncertainty;
- stop when the evidence is sufficient, not because a fixed sequence ended;
- preserve an auditable evidence graph;
- expose trajectory/provenance to operators without exposing hidden chain-of-thought.

The deterministic layer is the **safety envelope, not the research brain**.

## 13. Runtime verification state

**No runtime/CI/provider/Replit success is currently claimed.** GitHub reports no combined status checks for the current reviewed tip. Static source mutations and guards are not runtime proof.

The user will manually launch Replit for the live phase.

The final acceptance test must demonstrate a real run resembling:

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

## 14. Current open priorities

1. Real subprocess sandbox/egress architecture for Python OSINT; keep fail-closed until enforceable.
2. Convert build-time migration hardeners into direct canonical source, one invariant at a time.
3. Finish duplicate-tree reachability and retirement.
4. Audit every model-output -> evidence -> entity/contact persistence path.
5. Finish production-grade event-ledger integrity and full turn-level forensic reconstruction.
6. Unify the evidence graph without deleting legitimate legacy consumers prematurely.
7. Complete live Replit acceptance testing only after the static architecture is sufficiently clean.

**Working rule:** after every fix, trace its callers, transitive callers, error paths, persistence, cancellation, provenance and legacy duplicates. Never convert “I found no caller” into “there is no caller.” Never claim runtime success without runtime evidence.