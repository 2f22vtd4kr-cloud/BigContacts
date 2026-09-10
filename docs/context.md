# Context — living handoff (Apex Atlas / BigContacts)

> **Living handoff — 2026-09-10.** Current architecture source of truth. Historical documents are not live control planes.

**Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Branch:** `main`  
**Current GitHub code tip:** `28fdb2c11c9ace835dc5eb796b85b25adbd12aee`  
**Product:** Apex Atlas research bureau embedded in BigContacts.

## ReAct architecture
Apex is an AI-driven OSINT bureau. Gemini is Boss, DeepSeek/NVIDIA is Right Hand, Groq/Mistral are Investigator capacity only. Institutional constitution and role purpose precede operator case input; durable case context is state, not instructions. AI owns research strategy, queries, tools, pivots, identity reasoning, evidence sufficiency, stopping and promotion. Deterministic code owns safety, schemas, transport, SSRF, quotas, cancellation, persistence, provenance, telemetry and impossible-state prevention.

## Hardened this continuation
- Model-selected first ReAct action; no forced initial search.
- Hard `MAX_ITER=40` clamp.
- Run-scoped cancellation through LLM/search/page/browser and provider-slot waiting; distinct cancelled terminal state.
- Attempted URLs separated from successful observed provenance.
- 2 MB streaming ceilings for ReAct provider/browser responses, including browser proxy JSON.
- Model-selectable Serper locale/market; no forced US browser country.
- Scope-local browser budgets and SSRF checks on Playwright subrequests.
- Exact claim-to-observation binding before strict card mutation.
- Structured Investigator turn records propagated into target and Atlas oversight and merged across discovery pivots.
- Explicit `mode="discovery"` with empty target name at canonical Atlas/Bureau boundary; historical `Discovery slot` fake target removed from canonical Atlas.
- Runtime/promotion/SSRF guards reconciled to the rewritten core.

## Remaining blockers
- **#141:** subprocess OSINT tools still need governed network egress and child-process cancellation.
- **#125/#126:** deterministic secondary-surface enrichment remains legacy/live-adjacent and should be retired or converted into explicit model-selectable capabilities.
- **#128:** verify current canonical `ai-extractor.ts` reachability before changing the unresolved Groq final-review concern.
- **#129/#132:** duplicate source tree and legacy ingest/enrichment reachability classification remain.
- **#136:** legacy extraction-tree reachability audit remains.
- **#137/#138:** old cases execution source is unmounted/quarantined; API/OpenAPI/generated-client retirement reconciliation remains.

## Evidence/person admission law
A discovery person requires explicit model-authored identity, candidate scope, successful observed HTTP(S) provenance, and explicit `promotionDecision="promote"`. No target-name inheritance, organization inheritance, URL-slug admission, article/listicle admission, proxy-contact admission, or source-URL-as-identity substitution.

## Acceptance
No runtime, Replit, provider-availability, CI, DB/Redis durability, or card-promotion success is claimed. Final acceptance remains a real durable trajectory: Gemini Boss → DeepSeek/NVIDIA Right Hand → selected Groq/Mistral Investigator → model-selected first action → model-selected pivots/tools → successful observed provenance → explicit promotion → evidence-backed card, with actual observations inspectable by oversight.
