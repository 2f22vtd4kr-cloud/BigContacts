# Context — living handoff (Apex Atlas / BigContacts)

> **Living handoff — 2026-09-10.** Current architecture source of truth. Historical documents are not live control planes.

**Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Branch:** `main`  
**Current GitHub code tip:** `5df4cf74df0d8db4b717bdb8815c218ab8ef79d4`  
**Product:** Apex Atlas research bureau embedded in BigContacts.

## Institutional constitution
Apex is an AI-driven OSINT bureau, not a deterministic search script.

```text
institutional constitution -> role purpose -> durable case context -> operator case input -> AI reasoning -> model-selected action
```

### Roles
- Gemini = Boss / Head Investigator only.
- DeepSeek via NVIDIA Integrate = Right Hand / Oversight only.
- Groq and Mistral = interchangeable Investigator capacity only.
- No silent role substitution.

## Autonomy law
AI owns research strategy, queries, tool choice, pivots, identity reasoning, evidence sufficiency, contact-route discovery, stopping, promotion, and discovery-versus-target continuation. Deterministic code owns safety/infrastructure: auth, schemas, transport, SSRF, quotas/budgets, cancellation, persistence, provenance, deduplication, telemetry, lifecycle and impossible-state prevention.

## Canonical ReAct path
- Core: `artifacts/api-server/src/src/lib/agentic-web-research-core.ts`
- Guarded wrapper: `artifacts/api-server/src/src/lib/agentic-web-research.ts`
- Shared execution scope: `artifacts/api-server/src/src/lib/agentic-execution-context.ts`
- Target Investigator: `artifacts/api-server/src/src/lib/target-contact-agent.ts`
- Bureau pass: `artifacts/api-server/src/src/lib/bureau-agentic-pass.ts`
- SSRF transport: `artifacts/api-server/src/src/lib/ssrf-safe-fetch.ts`
- Browser escalation: `browser-fetch.ts` + `browser-fetch-core.ts`
- Atlas control: `atlas-control-decision.ts` + canonical discovery/continuation routes.

## ReAct hardening implemented in this continuation
1. **No forced first tool.** The first Investigator action is model-selected.
2. **Hard iteration ceiling.** Effective iterations are clamped to `MAX_ITER=40`.
3. **Run-scoped abort.** LLM/search/page HTTP calls and provider-slot waits receive one run-level abort signal; cancellation has a distinct terminal status.
4. **Attempted URL != observed URL.** Only successful page/browser executions with explicit `observed=` provenance can back a claim.
5. **Exact claim-to-observation binding.** Target and Bureau evidence gates require contact values (and candidate identity tokens) to appear in the durable observed material.
6. **Structured trajectory.** Each ReAct turn can retain model/action/args, product-visible thought when supplied, execution status, bounded observation, observed URLs, findings, fallback information, and stop reason. Discovery persistence stores these records and a durable case-memory projection.
7. **SSRF response ceiling.** Pinned transport has a 2 MB streaming byte ceiling and Content-Length precheck; browser/provider escalation has bounded reads.
8. **Browser budget isolation.** Browser escalation counts are keyed by Agentic AsyncLocalStorage execution scope rather than shared process-wide consumption.
9. **Browser egress defense.** Playwright request URLs are checked against the SSRF safety boundary, including redirects/subresources.
10. **Search locale neutrality.** Serper locale/market are optional model-selected action fields; no forced US/English defaults.
11. **Provider quota composition.** The Agentic wrapper now uses the actual `runProviderCall` contract for isolated contexts and avoids double quota accounting when the outer provider guard is installed.
12. **Observation extraction boundary.** Deterministic contact extraction is observation-only and does not author person identity, candidate scope, or promotion.

## Remaining blockers — deliberately not papered over
- **#139/#141:** browser cancellation is implemented inside the browser adapter but the canonical core still needs to pass its run signal into the browser call; Holehe/Maigret/Sherlock/theHarvester still need true child-process cancellation and governed egress.
- **#144:** canonical discovery now exposes `mode="discovery"`, but canonical Atlas still carries the legacy `Discovery slot` label at some boundaries and the legacy discovery-agent tree remains quarantine material. Remove the fake-target convention completely.
- **#125/#126:** deterministic secondary-surface enrichment remains legacy/live-adjacent and should become model-selectable capabilities or be retired.
- **#128:** canonical `src/src/lib/ai-extractor.ts` still contains a Groq final reviewer path.
- **#129/#132:** duplicate source tree and legacy ingest/enrichment reachability cleanup remain.
- **#136:** broader legacy extraction tree still needs reachability audit even though canonical ReAct extraction no longer creates semantic scope findings.
- **#137/#138:** legacy cases execution source is quarantined/unmounted; API/OpenAPI/generated-client retirement reconciliation remains.

## Evidence/person admission law
A discovery person candidate requires explicit model-authored person identity, candidate scope, a successful observed HTTP(S) source, and explicit `promotionDecision="promote"`. No target-name inheritance, organization inheritance, URL-slug admission, article/listicle admission, proxy-contact admission, or source-URL-as-identity substitution.

## Durable Atlas control
Gemini controls discovery/research transitions after DeepSeek oversight with AI-owned actions `continue_discovery`, `research_candidate`, `revisit_candidate`, `pivot_discovery`, `stop`. Control decisions require durable `caseId` and positive `controlTurn` and fail closed on persistence errors.

## Verification state
**No runtime, Replit, provider-availability, DB/Redis durability, CI, or end-to-end card-promotion success is claimed.** The repository has been mutated and static guards were aligned, but the current tip has no completed CI status evidence. Final acceptance remains a real durable trajectory showing Gemini Boss → DeepSeek/NVIDIA Right Hand → selected Groq/Mistral Investigator → genuine model-selected first action → model-selected pivots/tools → successful observed provenance → explicit promotion → evidence-backed card, with actual observations inspectable by oversight.
