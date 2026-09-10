# Context — living handoff (Apex Atlas / BigContacts)

> **Living handoff — 2026-09-10.** Current architecture source of truth. Historical documents are not live control planes.

**Repo:** `2f22vtd4kr-cloud/BigContacts` · **Branch:** `main` · **Current reviewed tip:** `051a296974886373aa22c97c45a870161c33aa4a`

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
10. Each Agentic run now gets a unique execution scope, preventing concurrent runs with the same target/job from sharing browser-budget state.
11. Serper locale/market are optional model-selected fields; no forced US/English defaults.
12. Target/Bureau evidence gates require source URLs to be successful observed material and require exact contact values to occur in that material.
13. Candidate identity remains model-authored and promotion remains explicit.
14. Discovery is exposed as explicit `mode="discovery"` rather than requiring a person target at the canonical ReAct boundary.

## Confirmed/open forensic defects
- **#128:** canonical `src/src/lib/ai-extractor.ts` still exposes a Groq final-card-review fallback after Gemini Boss and DeepSeek/NVIDIA. Required remediation is Gemini -> DeepSeek -> deterministic fail-closed adjudication; Groq must not act as reviewer.
- **#139:** `target-contact-agent.ts` collapses canonical ReAct `cancelled` into its legacy `error` result state. Cancellation must remain distinct through callers/telemetry. Python OSINT subprocesses also still lack run-scoped cancellation and governed egress.
- **#147:** compound OSINT actions remain deterministic: `footprint_username` runs both Maigret and Sherlock, `footprint_email` invokes Holehe, and `harvest_domain` invokes theHarvester. These need individual model-selectable actions plus cancellation/egress controls.
- **#149:** canonical evidence validation can satisfy a single finding by concatenating observations from multiple cited successful sources. A contact value in source A and candidate identity in source B can therefore pass one claim check. Validation should require the claim value and candidate identity to co-occur in one bounded successful observation/source when the finding is candidate-scoped.
- Exact claim validation therefore remains incomplete despite the existing successful-source and exact-value gates.
- Canonical discovery has been converted to first-class `mode="discovery"`; remaining `Discovery slot` material is legacy/quarantine and must not leak back into live control.
- Deterministic secondary-surface enrichment, duplicate source trees, legacy ingest/enrichment, and old API/OpenAPI execution surfaces remain under forensic cleanup.

## Evidence law
A person candidate requires explicit model-authored identity, candidate scope, successful observed HTTP(S) source, and explicit `promotionDecision="promote"`. No target-name inheritance, organization inheritance, URL-slug admission, listicle admission, proxy-contact admission, or fabricated URL. Claim-source validation must not stitch independent observations together as though they were one source.

## Verification state
**No Replit/runtime/provider/CI/end-to-end success is claimed.** Repository mutations and static source review are not runtime proof. The current tip has no reported combined GitHub commit status. Final acceptance requires a real durable trajectory showing Gemini Boss -> DeepSeek/NVIDIA Right Hand -> selected Groq/Mistral Investigator -> genuine model-selected first action -> model pivots -> successful observed provenance -> explicit promotion -> evidence-backed card, with actual observations inspectable by oversight.