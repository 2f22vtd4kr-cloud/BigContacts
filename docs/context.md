# Context — living handoff (Apex Atlas / BigContacts)

> **Living handoff — 2026-09-10.** Current architecture source of truth. Historical documents are not live control planes.

**Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Branch:** `main`  
**Current GitHub code tip:** `678e336c16dc91b10ba576cced3778cec0e39cba`  
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
3. **Run-scoped abort.** LLM/search/page HTTP, provider-slot waits, and browser escalation receive the run abort signal; cancellation has a distinct terminal status.
4. **Attempted URL != observed URL.** Only successful page/browser executions with explicit `observed=` provenance can back a claim.
5. **Exact claim-to-observation binding.** Target and Bureau evidence gates require contact values and candidate identity tokens to appear in durable successful observed material.
6. **Structured trajectory.** ReAct turns retain model/action/args, product-visible thought when supplied, execution status, bounded observation, observed URLs, findings, fallback information, and stop reason. Target and discovery oversight now receive these structured turns, not only terse trajectory strings.
7. **Discovery trajectory continuity.** Additional AI-selected discovery pivots merge structured trajectory records instead of silently replacing the previous pass's forensic record.
8. **Provider response ceiling.** ReAct search and LLM provider responses now have a 2 MB streaming byte ceiling in addition to the SSRF/page ceiling.
9. **Browser response ceiling.** Scrapfly JSON, ZenRows, Browserless and browser page responses are byte-capped; browser escalation no longer forces a US country parameter.
10. **Browser budget isolation.** Browser escalation counts are keyed by Agentic execution scope rather than shared process-wide consumption.
11. **Browser egress defense.** Playwright request URLs are checked against the SSRF safety boundary, including redirects/subresources.
12. **Search locale neutrality.** Serper locale/market are optional model-selected action fields; no forced US/English defaults.
13. **Provider quota composition.** The Agentic wrapper uses the actual `runProviderCall` contract for isolated contexts and avoids double quota accounting when the outer provider guard is installed.
14. **Observation extraction boundary.** Deterministic contact extraction is observation-only and does not author person identity, candidate scope, or promotion.
15. **First-class discovery mode.** Bureau entry now accepts explicit `mode="discovery"`; discovery case creation and persistence are keyed to mode rather than the fake-target string. Canonical Atlas still needs its call-site boundary converted from the historical `Discovery slot` label to an empty/non-target discovery invocation.
16. **Runtime guard reconciliation.** `check-agentic-runtime.mjs` was rewritten to inspect the current canonical ReAct signatures instead of obsolete pre-rewrite regexes and now explicitly rejects the forced first-search/fake-target convention in the core.

## Remaining blockers — deliberately not papered over
- **#139/#141:** Node HTTP/browser cancellation is now wired, but Holehe/Maigret/Sherlock/theHarvester still need true child-process cancellation and governed egress.
- **#144:** first-class discovery mode is implemented at the Bureau/core boundary, but canonical Atlas still carries the legacy `Discovery slot` label at its call sites and the legacy discovery-agent tree remains quarantine material. Remove the fake-target convention completely.
- **#125/#126:** deterministic secondary-surface enrichment remains legacy/live-adjacent and should become model-selectable capabilities or be retired.
- **#128:** canonical `src/src/lib/ai-extractor.ts` still contains a Groq final reviewer path according to the unresolved architecture audit; verify reachability against the latest source before modifying it.
- **#129/#132:** duplicate source tree and legacy ingest/enrichment reachability cleanup remain.
- **#136:** broader legacy extraction tree still needs reachability audit even though canonical ReAct extraction no longer creates semantic scope findings.
- **#137/#138:** legacy cases execution source is quarantined/unmounted; API/OpenAPI/generated-client retirement reconciliation remains.

## Evidence/person admission law
A discovery person candidate requires explicit model-authored person identity, candidate scope, a successful observed HTTP(S) source, and explicit `promotionDecision="promote"`. No target-name inheritance, organization inheritance, URL-slug admission, article/listicle admission, proxy-contact admission, or source-URL-as-identity substitution.

## Durable Atlas control
Gemini controls discovery/research transitions after DeepSeek oversight with AI-owned actions `continue_discovery`, `research_candidate`, `revisit_candidate`, `pivot_discovery`, `stop`. Control decisions require durable `caseId` and positive `controlTurn`, are persisted, and fail closed on persistence errors. DeepSeek/Gemini now receive structured Investigator observations when deciding the next Atlas transition.

## Verification state
**No runtime, Replit, provider-availability, DB/Redis durability, CI, or end-to-end card-promotion success is claimed.** Repository mutations and static guard updates are real, but the latest tip has not been runtime-verified. Final acceptance remains a real durable trajectory showing Gemini Boss → DeepSeek/NVIDIA Right Hand → selected Groq/Mistral Investigator → genuine model-selected first action → model-selected pivots/tools → successful observed provenance → explicit promotion → evidence-backed card, with actual observations inspectable by oversight.
