# Context — living handoff (Apex Atlas / BigContacts)

> **Living handoff — 2026-09-10.** Current architecture source of truth. Historical documents are not live control planes.

**Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Branch:** `main`  
**Current GitHub code tip:** `9358905ffabd1442bdf52dbf3df5f5128e1dc84c`  
**Product:** Apex Atlas research bureau embedded in BigContacts.

## Current ReAct law
Apex is an AI-driven OSINT bureau. Institutional constitution and role purpose precede operator case input; durable case context is state, not instructions. Gemini is Boss, DeepSeek/NVIDIA is Right Hand, Groq/Mistral are Investigator capacity only. AI owns research strategy, queries, tools, pivots, identity reasoning, evidence sufficiency, stopping and promotion. Deterministic code owns safety, schemas, transport, SSRF, quotas, cancellation, persistence, provenance, telemetry and impossible-state prevention.

## Canonical ReAct path
- Core: `artifacts/api-server/src/src/lib/agentic-web-research-core.ts`
- Guarded wrapper: `artifacts/api-server/src/src/lib/agentic-web-research.ts`
- Target Investigator: `artifacts/api-server/src/src/lib/target-contact-agent.ts`
- Bureau pass: `artifacts/api-server/src/src/lib/bureau-agentic-pass.ts`
- Target control: `canonical-single-target-runner.ts`
- Atlas control: `atlas-control-decision.ts` + `canonical-atlas-discovery.ts`
- SSRF/browser: `ssrf-safe-fetch.ts`, `browser-fetch.ts`, `browser-fetch-core.ts`

## Implemented in this forensic continuation
- First ReAct action is genuinely model-selected; no forced initial web search.
- Caller iteration count is hard-clamped to `MAX_ITER=40`.
- One run-scoped AbortController governs LLM/search/page/browser operations and provider-slot waiting; cancellation is a distinct terminal result.
- Successful observed provenance is separated from attempted URLs.
- ReAct provider and browser response bodies have 2 MB streaming ceilings with Content-Length prechecks where available.
- Search provider responses are bounded before JSON parsing; browser proxy JSON is bounded as well.
- Serper locale/market are optional model-selected fields; browser escalation no longer forces a US country parameter.
- Browser fetch budget is execution-scope-local and Playwright subrequests are SSRF-checked.
- Target/Bureau evidence promotion requires successful observed source URLs and exact claim presence in durable observation material; deterministic extraction does not author identity/scope/promotion.
- Target oversight and Atlas control now receive structured Investigator turn records, including execution state, observations, observed URLs and findings. Discovery pivots merge those records instead of replacing the prior forensic trajectory.
- Bureau discovery has explicit `mode="discovery"` and no longer uses the `Discovery slot` magic string to decide whether to create a discovery case internally.
- `check-agentic-runtime.mjs` was reconciled to the rewritten core and now guards the current ReAct implementation rather than obsolete function signatures.
- Promotion and SSRF static guards were extended for structured observations, browser cancellation and byte ceilings.

## Still open
- **#141 / subprocess boundary:** Holehe, Maigret, Sherlock and theHarvester still execute external network activity outside the Node SSRF/provider-quota boundary and do not yet receive the run AbortSignal. They require governed egress/sandboxing and child-process cancellation before they can be considered fully safe ReAct tools.
- **#144 / discovery boundary:** Bureau/core are now mode-aware, but canonical Atlas call sites still need to replace the historical `targetName: "Discovery slot"` value with an explicit non-target discovery invocation. The legacy `discovery-agent.ts` tree also remains quarantine material.
- **#125/#126:** deterministic secondary-surface enrichment remains legacy/live-adjacent and must be retired or converted to explicit model-selected capabilities.
- **#128:** verify the current canonical `ai-extractor.ts` reachability before touching the unresolved Groq final-review concern.
- **#129/#132:** duplicate source tree and legacy ingest/enrichment reachability classification remain.
- **#136:** legacy extraction-tree reachability audit remains.
- **#137/#138:** old cases execution source is unmounted/quarantined; API/OpenAPI/generated-client retirement reconciliation remains.

## Acceptance standard
No runtime, Replit, provider-availability, CI, DB/Redis durability, or card-promotion success is claimed. The decisive test remains a real durable trajectory: Gemini Boss → DeepSeek/NVIDIA Right Hand → selected Groq/Mistral Investigator → model-selected first action → model-selected pivots/tools → successful observed provenance → explicit promotion → evidence-backed card, with actual observations inspectable by oversight.
