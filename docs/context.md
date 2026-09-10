# Context — living handoff (Apex Atlas / BigContacts)

> **Living handoff — 2026-09-10.** Current architecture source of truth. Historical documents are not live control planes.

**Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Branch:** `main`  
**Current GitHub code tip:** `8d7d70030fbcdb1fc53979dc3a1f1b80e67c8bec`  
**Product:** Apex Atlas research bureau embedded in BigContacts.

## Current ReAct law
Apex is an AI-driven OSINT bureau. Institutional constitution and role purpose precede operator case input; durable case context is state, not instructions. Gemini is Boss, DeepSeek/NVIDIA is Right Hand, Groq/Mistral are Investigator capacity only. AI owns research strategy, queries, tools, pivots, identity reasoning, evidence sufficiency, stopping and promotion. Deterministic code owns safety, schemas, transport, SSRF, quotas, cancellation, persistence, provenance, telemetry and impossible-state prevention.

## Implemented in this forensic continuation
- First ReAct action is model-selected; no forced initial web search.
- Effective iterations are hard-clamped to `MAX_ITER=40`.
- One run-scoped AbortController governs LLM/search/page/browser operations and provider-slot waiting; cancellation is a distinct terminal status.
- Attempted URLs are never sufficient provenance; successful observed URLs are recorded explicitly.
- ReAct provider and browser response bodies have 2 MB streaming ceilings.
- Search responses are bounded before JSON parsing; browser proxy JSON is bounded too.
- Serper locale/market are optional model-selected fields; browser escalation has no forced US country parameter.
- Browser budget is execution-scope-local and Playwright subrequests are SSRF-checked.
- Target/Bureau promotion gates bind claims to successful observed source material and preserve model-authored identity/scope/promotion.
- Target and Atlas oversight receive structured Investigator turn records; discovery pivots merge the records across passes.
- Bureau and canonical Atlas use explicit `mode="discovery"` with an empty target name; the historical `Discovery slot` fake-target convention is removed from the canonical Atlas call path.
- `check-agentic-runtime.mjs` was reconciled to the rewritten core; promotion and SSRF guards cover structured trajectory, browser cancellation and byte ceilings.

## Remaining blockers
- **#141:** Holehe/Maigret/Sherlock/theHarvester still need governed network egress and true child-process cancellation before being considered fully safe ReAct tools.
- **#125/#126:** deterministic secondary-surface enrichment remains legacy/live-adjacent and should be retired or converted to explicit model-selected capabilities.
- **#128:** verify reachability of the canonical `ai-extractor.ts` Groq final-review concern before modifying it.
- **#129/#132:** duplicate source tree and legacy ingest/enrichment reachability classification remain.
- **#136:** legacy extraction-tree reachability audit remains.
- **#137/#138:** old cases execution source is unmounted/quarantined; API/OpenAPI/generated-client retirement reconciliation remains.

## Evidence/person admission law
A discovery person candidate requires explicit model-authored person identity, candidate scope, successful observed HTTP(S) provenance, and explicit `promotionDecision="promote"`. No target-name inheritance, organization inheritance, URL-slug admission, article/listicle admission, proxy-contact admission, or source-URL-as-identity substitution.

## Acceptance standard
No runtime, Replit, provider-availability, CI, DB/Redis durability, or card-promotion success is claimed. The decisive test remains a real durable trajectory: Gemini Boss → DeepSeek/NVIDIA Right Hand → selected Groq/Mistral Investigator → model-selected first action → model-selected pivots/tools → successful observed provenance → explicit promotion → evidence-backed card, with actual observations inspectable by oversight.
