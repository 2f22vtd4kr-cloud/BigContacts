# Context — living handoff (Apex Atlas / BigContacts)

> **Living handoff — 2026-09-10.** Current architecture source of truth. Historical documents are not live control planes.

**Repo:** `2f22vtd4kr-cloud/BigContacts` · **Branch:** `main` · **Current reviewed tip:** `fb1b331f3e6030ca4c27c0c89bead35226517821`

## Institutional contract
Apex is an AI-driven OSINT bureau, not a deterministic search script.

```text
institutional constitution -> role purpose -> durable case context -> operator case input -> AI reasoning -> model-selected action
```

- Gemini = Boss / Head Investigator only.
- DeepSeek via NVIDIA Integrate = Right Hand / Oversight only.
- Groq + Mistral = Investigator capacity only; provider fallback is infrastructure/capacity behavior.
- AI owns research strategy, query formulation, tool choice, pivots, identity reasoning, evidence sufficiency, promotion, stopping, and discovery-vs-target continuation.
- Deterministic code owns safety, auth, schemas, SSRF, quotas, cancellation, persistence, provenance validation, deduplication, telemetry and lifecycle.

## Canonical ReAct path
- Core: `artifacts/api-server/src/src/lib/agentic-web-research-core.ts`
- Guarded wrapper: `artifacts/api-server/src/src/lib/agentic-web-research.ts`
- Execution scope: `artifacts/api-server/src/src/lib/agentic-execution-context.ts`
- Target Investigator: `artifacts/api-server/src/src/lib/target-contact-agent.ts`
- Bureau wrapper: `artifacts/api-server/src/src/lib/bureau-agentic-pass.ts`
- SSRF: `artifacts/api-server/src/src/lib/ssrf-safe-fetch.ts`
- Browser: `browser-fetch.ts` + `browser-fetch-core.ts`
- Atlas control: `atlas-control-decision.ts` + canonical discovery/continuation routes.

## Implemented hardening
1. First Investigator action is genuinely model-selected; no seeded `web_search`.
2. Effective ReAct iterations are hard-clamped to 40.
3. One run-scoped AbortController covers LLM, provider-slot wait, search/page HTTP and browser escalation.
4. Attempted URLs do not become provenance; successful observations explicitly carry observed URLs.
5. Structured trajectory records retain action/args/model/execution/observation/observed URLs/findings/fallback/stop state.
6. Discovery persistence retains structured trajectory plus a durable case-memory projection.
7. SSRF/provider transport response bodies are byte-capped; browser provider responses are bounded too.
8. Browser escalation is SSRF-checked, including redirected/subresource requests.
9. Browser budgets use AsyncLocalStorage execution scope rather than a global process counter.
10. Each Agentic run gets a unique execution scope, preventing concurrent runs with the same target/job from sharing browser-budget state.
11. Serper locale/market are optional model-selected fields; no forced US/English defaults.
12. Target/Bureau evidence gates require source URLs to be successful observed material and require exact contact values to occur in that material.
13. **Claim-to-source binding is now single-observation:** candidate identity tokens and the exact contact value must co-occur in one successful bounded trajectory observation; independent observations are never concatenated to satisfy one claim.
14. Target and Bureau wrappers preserve canonical `cancelled` as a distinct result state instead of collapsing it into `error`.
15. Discovery admissions now pass their already validated successful source URL into the strict persistence boundary, so review-only admission evidence is not silently dropped.
16. Discovery is exposed as explicit `mode="discovery"` rather than requiring a person target at the canonical ReAct boundary.
17. `scripts/check-canonical-promotion-boundary.mjs` now guards single-observation claim binding and cancellation-state preservation.

## Confirmed/open forensic defects
- **#128:** canonical `src/src/lib/ai-extractor.ts` still exposes a Groq final-card-review fallback after Gemini Boss and DeepSeek/NVIDIA. Required remediation is Gemini -> DeepSeek -> deterministic fail-closed adjudication; Groq must not act as reviewer.
- **#139:** cancellation propagation through target/Bureau wrappers is fixed, but Python OSINT subprocesses (Holehe/Maigret/Sherlock/theHarvester) still require real child-process cancellation tied to the run-scoped AbortSignal and formally governed network egress.
- **#147:** compound OSINT actions remain deterministic: `footprint_username` runs both Maigret and Sherlock, `footprint_email` invokes Holehe, and `harvest_domain` invokes theHarvester. These need individual model-selectable actions plus cancellation/egress controls.
- **#125/#126:** deterministic secondary-surface enrichment remains in legacy/live-adjacent routes and requires continued reachability analysis/retirement; canonical Atlas launch itself enters `canonical-atlas-launch.ts` and routes into the model-owned control plane rather than the historical orchestrator.
- Duplicate source trees, legacy ingest/enrichment, old API/OpenAPI execution surfaces, and other legacy research material remain under forensic cleanup.

## Resolved in this continuation
- **#149:** closed after changing target/Bureau evidence validation from cross-source concatenation to per-observation claim binding. Static verification only.

## Evidence law
A person candidate requires explicit model-authored identity, candidate scope, successful observed HTTP(S) source, and explicit `promotionDecision="promote"`. No target-name inheritance, organization inheritance, URL-slug admission, listicle admission, proxy-contact admission, or fabricated URL. Claim-source validation must bind the claim to a single successful bounded observation; it must not stitch independent observations together as though they were one source.

## Verification state
**No Replit/runtime/provider/CI/end-to-end success is claimed.** Repository mutations and static source review are not runtime proof. The current tip has no reported combined GitHub commit status. Final acceptance requires a real durable trajectory showing Gemini Boss -> DeepSeek/NVIDIA Right Hand -> selected Groq/Mistral Investigator -> genuine model-selected first action -> model pivots -> successful observed provenance -> explicit promotion -> evidence-backed card, with actual observations inspectable by oversight.