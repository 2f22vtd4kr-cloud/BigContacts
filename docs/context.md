# Context — living handoff (Apex Atlas / BigContacts)

> **Living handoff — 2026-09-10.** Current architecture source of truth. Historical documents are not live control planes.

**Repo:** `2f22vtd4kr-cloud/BigContacts` · **Branch:** `main` · **Current reviewed tip:** `e2b6592fa811d300c7143e809ef3d917faeb39b8`

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

## Implemented/static hardening in this continuation
1. First Investigator action remains genuinely model-selected; no seeded mandatory research action.
2. Effective ReAct iterations remain hard-clamped to 40.
3. One run-scoped AbortController covers canonical LLM/provider/search/page/browser paths.
4. Python OSINT subprocesses have detached POSIX process groups, SIGTERM/SIGKILL cancellation, bounded output, and distinct cancellation state. **Formal subprocess network-egress governance remains unresolved.**
5. `domain-surface.ts` accepts caller cancellation and uses it for RDAP/WhoisJSON. The canonical ReAct domain action is now wired to pass `runController.signal` through the build hardening path.
6. Registry search now has an AbortSignal contract and canonical ReAct registry execution passes the run signal through the registry transport layer.
7. Username footprinting is split into individually model-selectable Maigret and Sherlock capabilities; the old compound username action is rejected by guards.
8. Final card review is hardening toward the required role law: Gemini Boss -> DeepSeek/NVIDIA -> deterministic fail-closed adjudication; a build hardener removes the Groq reviewer fallback and a dedicated guard rejects it in both source trees.
9. Deterministic secondary-surface calls from canonical `entities.ts` and `atlas-orchestrator.ts` are retired at build time to a neutral empty surface; the retirement guard rejects live callers and independent fetch transport.
10. Deterministic target-name identity inheritance in the canonical Investigator observation layer is removed by build-time hardening (`personName: targetName/name` -> neutral identity); model-authored `done` findings remain the only promotion source.
11. Structured ReAct trajectory records exist and canonical discovery/target continuation persists bounded trajectory records/context projections. Full operator-grade replay/event-ledger durability remains a target.
12. Discovery is an explicit `mode="discovery"`, not a fake person target.
13. Evidence binding is single-observation: exact contact value and candidate identity must co-occur in one successful bounded observation for candidate-scoped claims.
14. Attempted URLs do not become provenance; only successful observed URLs do.
15. Browser escalation and canonical HTTP paths use SSRF-safe transport and bounded responses.

## Build/test guard chain
`artifacts/api-server/package.json` now runs the relevant hardening scripts before the architecture guards/build, including:

- domain signal hardening + guard;
- username capability split + guard;
- final-review role hardening + guard;
- secondary-surface retirement + retired-route guard;
- Investigator identity-observation hardening;
- registry cancellation hardening + guard;
- unified Investigator architecture;
- free-ReAct boundary;
- source parity;
- timeout/abort safety;
- promotion boundary;
- canonical Atlas entrypoint;
- runtime hardening;
- discovery boundary.

These are static repository/build gates. **No CI/runtime/provider success is inferred merely because the scripts are wired.**

## Open blockers / next engineering targets
- **#139 / #141:** subprocess OSINT still needs a real network-egress boundary. Cancellation is materially hardened, but child processes can still make their own network requests outside Node's SSRF/quota transport. The world-class target is a real sandbox/egress broker or governed service, not proxy environment variables.
- **#140:** trajectory records exist and are persisted in canonical case/discovery projections, but an operator-grade immutable event ledger/replay path still needs completion and runtime proof.
- **#129:** duplicate top-level `src/lib` and `src/routes` legacy trees still require final reachability/deletion/quarantine reconciliation.
- **#132:** legacy ingest/enrichment source remains under cleanup; mounted canonical research routes have been quarantined, but duplicate legacy material must be reconciled.
- **#136:** deterministic identity attribution is now actively neutralized by hardening; runtime/source-level verification still needs to confirm no other observation path authors identity before Investigator promotion.
- **#137/#138:** legacy canonical case execution/discovery sources remain on disk and must stay unmounted from live research until final retirement is proven.
- **#125/#126:** automatic secondary-surface research is retired from the key canonical callers; remaining legacy source should be removed/reconciled and no independent fetch transport should remain reachable.
- **#128:** Groq final-review fallback is now blocked by build-time hardening and a dedicated role guard; the next step is direct source cleanup plus runtime proof, not merely guard green status.
- **#147:** username compound capability is split; remaining capability-surface work includes individual email/theHarvester contracts and exact per-capability provenance where appropriate.

## World-class architecture north star
See `docs/APEX_WORLD_CLASS_OSINT_ARCHITECTURE.md`.

The finished Apex should be evidence-native: immutable/bounded observations -> explicit model claims -> deterministic evidence gateway -> provenance graph -> continuous Gemini/DeepSeek oversight -> operator-ready dossier. Leads, hypotheses, evidence, claims, contradictions and historical/freshness state must remain distinct.

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
  -> inspectable trajectory / oversight context
```

The user will manually launch Replit for the live runtime phase. Do not infer runtime/provider availability before that evidence exists.

## Working rule
Move toward a complete usable Apex, but never trade evidence integrity or role/safety boundaries for speed. Every static fix gets a second-order reachability review; every runtime claim requires actual runtime evidence.
