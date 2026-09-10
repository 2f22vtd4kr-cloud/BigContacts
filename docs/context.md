# Context — living handoff (Apex Atlas / BigContacts)

> **Living handoff — 2026-09-10.** Current architecture source of truth. Historical documents are not live control planes.

**Repo:** `2f22vtd4kr-cloud/BigContacts` · **Branch:** `main` · **Current reviewed tip:** `9a4f041954e062cc8cdaf07a4f93214b2385d864`

## Institutional contract
Apex is an AI-driven OSINT bureau, not a deterministic search script.

```text
institutional constitution -> role purpose -> durable case context -> operator case input -> AI reasoning -> model-selected action
```

- Gemini = Boss / Head Investigator only.
- DeepSeek via NVIDIA Integrate = Right Hand / Oversight only.
- Groq + Mistral = Investigator capacity only.
- AI owns research strategy, query formulation, tool choice, pivots, identity reasoning, evidence sufficiency, promotion, stopping, and discovery-vs-target continuation.
- Deterministic code owns safety, auth, schemas, SSRF, quotas, cancellation, persistence, provenance validation, deduplication, telemetry and lifecycle.

## Canonical ReAct path
- Core: `artifacts/api-server/src/src/lib/agentic-web-research-core.ts`
- Wrapper: `artifacts/api-server/src/src/lib/agentic-web-research.ts`
- Execution scope: `artifacts/api-server/src/src/lib/agentic-execution-context.ts`
- Target Investigator: `artifacts/api-server/src/src/lib/target-contact-agent.ts`
- Bureau wrapper: `artifacts/api-server/src/src/lib/bureau-agentic-pass.ts`
- Canonical target runner: `artifacts/api-server/src/src/lib/canonical-single-target-runner.ts`
- Target control: `artifacts/api-server/src/src/lib/target-control-decision.ts`
- SSRF: `artifacts/api-server/src/src/lib/ssrf-safe-fetch.ts`
- Browser: `browser-fetch.ts` + `browser-fetch-core.ts`
- Registry: `artifacts/api-server/src/src/lib/registry-client.ts`
- Atlas control: `atlas-control-decision.ts` + canonical discovery/continuation routes.

## Static hardening completed in this continuation
1. First Investigator action remains genuinely model-selected; no seeded mandatory research action.
2. Effective ReAct iterations remain hard-clamped to 40.
3. One run-scoped AbortController covers canonical LLM/provider/search/page/browser paths.
4. Python OSINT subprocesses have detached POSIX process groups, SIGTERM/SIGKILL cancellation, bounded output, and distinct cancellation state. **Formal subprocess network-egress governance remains unresolved.**
5. `domain-surface.ts` accepts caller cancellation and uses it for RDAP/WhoisJSON. Canonical ReAct domain execution is wired to the run signal through build hardening.
6. Registry search has an AbortSignal contract; canonical ReAct registry execution and GLEIF pass the run signal through the registry transport layer.
7. Username footprinting is split into individually model-selectable Maigret and Sherlock capabilities; the old compound username action is rejected by guards.
8. Final card review is constrained to Gemini Boss -> DeepSeek/NVIDIA -> deterministic fail-closed adjudication; Groq final-review fallback is removed by build hardening and rejected by a dedicated guard.
9. Deterministic secondary-surface calls from canonical `entities.ts` and `atlas-orchestrator.ts` are retired at build time to a neutral empty surface; the retirement guard rejects live callers and independent fetch transport.
10. Deterministic target-name identity inheritance in the canonical Investigator observation layer is neutralized by build hardening; model-authored `done` findings remain the promotion source.
11. Deterministic Atlas Maigret/Holehe fan-out is retired; these are Investigator-selectable capabilities, not scripted enrichment stages.
12. **Direct deterministic `/api/enrich/*` extended-OSINT execution is no longer mounted in either API route index.** The large extended-OSINT route files remain on disk as migration/deletion targets, but they are not live API entry points.
13. The ApexFinder data-source catalogue is build-hardened so direct `/api/enrich/*` research triggers are not exposed to operators; source entries may describe capabilities but cannot launch them outside the Investigator control plane.
14. Target Investigator cancellation is now propagated from the Atlas job state into canonical ReAct. Stopping an Atlas job therefore reaches the actual Investigator loop rather than merely preventing the next target/pass.
15. Canonical discovery Investigator launches are also wired to poll durable Atlas job state for cancellation.
16. Target Investigator action callbacks are persisted into `research_case_events` as append-only observation/decision events. `done` is recorded as a decision event; tool/search/page actions are observation events. This is an important step toward operator-grade replay.
17. Structured ReAct trajectory records exist and canonical discovery/target continuation persists bounded trajectory records/context projections.
18. Discovery is an explicit `mode="discovery"`, not a fake person target.
19. Evidence binding is single-observation: exact contact value and candidate identity must co-occur in one successful bounded observation for candidate-scoped claims.
20. Attempted URLs do not become provenance; only successful observed URLs do.
21. Browser escalation and canonical HTTP paths use SSRF-safe transport and bounded responses.

## Build/test guard chain
`artifacts/api-server/package.json` runs the relevant hardening scripts before architecture guards/build/test, including domain signal, username capability split, final-review role boundary, secondary-surface retirement, identity hardening, registry cancellation, Atlas scripted-OSINT retirement, target cancellation, target action event ledger, canonical discovery cancellation, unified Investigator architecture, free-ReAct boundary, source parity, timeout/abort safety, promotion boundary, canonical Atlas entrypoint, runtime hardening, and discovery boundary.

`artifacts/apex-finder/package.json` now gates the source catalogue against direct `/api/enrich/*` research triggers.

These are static repository/build gates. **No CI/runtime/provider success is inferred merely because the scripts are wired.**

## Open blockers / next engineering targets
- **#139 / #141:** subprocess OSINT still needs a real network-egress boundary. Cancellation is materially hardened, but child processes can still make their own network requests outside Node's SSRF/quota transport. The world-class target is a real sandbox/egress broker or governed service, not proxy environment variables.
- **#140:** target action events now enter `research_case_events`, while discovery trajectory records are projected into case state. The remaining work is a coherent immutable event model/replay API, stable sequencing/integrity semantics, and runtime proof that a full run can be reconstructed from events without relying on mutable case-file projections.
- **#129:** duplicate top-level `src/lib` and `src/routes` legacy trees still require final reachability/deletion/quarantine reconciliation.
- **#132:** legacy ingest/enrichment source remains under cleanup; `ingest-enrichment` is already an explicit 410 quarantine, while remaining duplicate legacy material must be reconciled.
- **#136:** deterministic identity attribution is actively neutralized by hardening; runtime/source-level verification still needs to confirm no other observation path authors identity before Investigator promotion.
- **#137/#138:** legacy canonical case execution/discovery sources remain on disk and must stay unmounted from live research until final retirement is proven.
- **#125/#126:** automatic secondary-surface research is retired from key canonical callers; remaining legacy source should be removed/reconciled and no independent fetch transport should remain reachable.
- **#128:** Groq final-review fallback is blocked by build-time hardening and a dedicated role guard; next step is direct source cleanup plus runtime proof.
- **#147:** username compound capability is split; remaining capability-surface work is exact tool-level provenance/cancellation/egress and proving no other canonical orchestrator directly launches OSINT tools.
- **Legacy Atlas mode:** `discoveryFirst=false` without `singleTargetId` still reaches the older multi-phase orchestrator path. The canonical default is discovery-first, and single-target is model-owned, but the long-term architecture should retire the legacy batch path rather than preserve a second research brain.

## World-class architecture north star
See `docs/APEX_WORLD_CLASS_OSINT_ARCHITECTURE.md`.

The finished Apex should be evidence-native: immutable/bounded observations -> explicit model claims -> deterministic evidence gateway -> provenance graph -> continuous Gemini/DeepSeek oversight -> operator-ready dossier. Leads, hypotheses, evidence, claims, contradictions and historical/freshness state must remain distinct.

The graph should be the durable investigation model, not a report cache. Every material edge should be traceable to an observation, collector/method, timestamp, scope and source. A dossier is a projection of the evidence graph, never the source of truth.

The operator surface should expose trajectory, evidence, provenance, contradictions, promoted/rejected claims, model-selected actions and what remains unknown — but never hidden chain-of-thought.

## Verification state
**No Replit/runtime/provider/CI/end-to-end success is claimed.** Repository mutations and static source review are not runtime proof.

The eventual acceptance test must demonstrate a real durable trajectory containing, at minimum:

```text
Gemini Boss
  -> DeepSeek/NVIDIA Right Hand
  -> selected Groq/Mistral Investigator
  -> genuinely model-selected first action
  -> model-selected pivots / tool choices
  -> successful observed provenance
  -> explicit promotion
  -> evidence-backed persisted result
  -> append-only action events
  -> inspectable trajectory / oversight context
  -> clean cancellation when operator stops the run
```

The user will manually launch Replit for the live runtime phase. Do not infer runtime/provider availability before that evidence exists.

## Working rule
Move toward a complete usable Apex, but never trade evidence integrity or role/safety boundaries for speed. Every static fix gets a second-order reachability review; every runtime claim requires actual runtime evidence. Build-time hardeners are migration scaffolding, not the desired final source architecture; once runtime proves the transformed source, commit the resulting source directly and retire the hardener where practical.
