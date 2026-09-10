# Context — living handoff (Apex Atlas / BigContacts)

> **Living handoff — 2026-09-10.** Current architecture source of truth. Historical documents are not live control planes.

**Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Branch:** `main`  
**Current GitHub code tip:** `d22606b56dabc897cd6cd2db867969bb429ad634`

## Institutional constitution
Apex is an AI-driven OSINT bureau, not a deterministic search script.

```text
institutional constitution -> role purpose -> durable case context -> operator case input -> AI reasoning -> model-selected action
```

Gemini = Boss only. DeepSeek/NVIDIA = Right Hand / oversight only. Groq and Mistral = Investigator capacity only. AI owns research strategy, queries, tool choice, pivots, identity reasoning, evidence sufficiency, contact discovery, stopping, promotion, and discovery-versus-target continuation. Deterministic code owns safety, auth, schemas, transport, SSRF, quotas, cancellation, persistence, provenance, deduplication, telemetry, lifecycle, and impossible-state prevention.

## Canonical ReAct path
- `artifacts/api-server/src/src/lib/agentic-web-research-core.ts`
- `artifacts/api-server/src/src/lib/agentic-web-research.ts`
- `artifacts/api-server/src/src/lib/bureau-agentic-pass.ts`
- `artifacts/api-server/src/src/lib/target-contact-agent.ts`
- `artifacts/api-server/src/src/lib/ssrf-safe-fetch.ts`
- `artifacts/api-server/src/src/lib/browser-fetch.ts` / `browser-fetch-core.ts`
- `artifacts/api-server/src/src/lib/atlas-control-decision.ts`
- canonical discovery/continuation routes

## Implemented hardening
- No forced first web search; Investigator chooses the first action.
- Hard `MAX_ITER=40` ceiling.
- Run-scoped cancellation across Investigator LLM/HTTP and browser escalation.
- Attempted URLs are not provenance; only successful observed HTTP(S) observations qualify.
- Structured ReAct trajectory records retain bounded action, args, execution state, observation, observed URLs, findings, fallback and stop information.
- Contact claims are validated against the actual observed material, not merely cited URLs.
- SSRF DNS resolution is pinned to the checked address; redirects are manual; response bytes are capped at 2 MB.
- SSRF request abort listeners are cleaned up on terminal completion/error.
- Browser budget is execution-scoped and browser request destinations are checked, including Playwright redirects/subresources.
- Serper locale/market are optional model-selected fields; no forced US/English market.
- Provider quota composition avoids nested double accounting.
- Discovery is now a first-class `mode="discovery"`; canonical Atlas and canonical continuation pass an empty target identity into the ReAct core. The Bureau wrapper explicitly strips target identity in discovery mode.
- `check-discovery-mode-boundary.mjs` is wired into `check:bureau`.

## Evidence/person admission law
Discovery admission requires explicit model-authored person identity, candidate scope, successful observed HTTP(S) source, and explicit `promotionDecision="promote"`. No target-name inheritance, organization inheritance, URL-slug identity, article/listicle admission, proxy-contact admission, or source-URL-as-person substitution.

## Durable Atlas control
Gemini controls transitions after DeepSeek advice with AI-owned actions `continue_discovery`, `research_candidate`, `revisit_candidate`, `pivot_discovery`, and `stop`. Decisions require durable case identity and control turn and fail closed on persistence errors. Target investigations refuse context-free execution.

## Remaining blockers
- Subprocess OSINT tools (Holehe/Maigret/Sherlock/theHarvester) still need governed egress and true child-process cancellation.
- Proxy/browser service providers can follow target-side redirects outside Node; formal egress-safe design remains required.
- Deterministic secondary-surface enrichment remains legacy/live-adjacent and should be retired or exposed only as explicit model-selectable capabilities.
- Canonical `src/src/lib/ai-extractor.ts` still has the legacy Groq final-review path.
- Duplicate source trees, legacy ingest/extraction reachability, and old API/OpenAPI execution contracts still need classification/quarantine cleanup.

## Verification state
**No runtime, Replit, provider-availability, DB/Redis durability, CI, or end-to-end card-promotion success is claimed.** Repository changes are implemented and static guards are wired, but the decisive acceptance test remains a real durable trajectory: Gemini Boss → DeepSeek Right Hand → selected Groq/Mistral Investigator → genuinely model-selected first action → model-selected pivots/tools → successful observed provenance → explicit promotion → evidence-backed card, with actual observations inspectable by oversight.
