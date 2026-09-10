# Context — living handoff (Apex Atlas / BigContacts)

> **Living handoff — 2026-09-10.** Current architecture source of truth. Historical documents are not live control planes.

**Repo:** `2f22vtd4kr-cloud/BigContacts` · **Branch:** `main` · **Current reviewed tip:** `3faf0a6e087676c7b9db145a0a1aad19940d4891`

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
- Canonical target runner: `artifacts/api-server/src/src/lib/canonical-single-target-runner.ts`
- Target control: `artifacts/api-server/src/src/lib/target-control-decision.ts`
- SSRF: `artifacts/api-server/src/src/lib/ssrf-safe-fetch.ts`
- Browser: `browser-fetch.ts` + `browser-fetch-core.ts`
- Atlas control: `atlas-control-decision.ts` + canonical discovery/continuation routes.

## Implemented hardening
1. First Investigator action is genuinely model-selected; no seeded `web_search`.
2. Effective ReAct iterations are hard-clamped to 40.
3. One run-scoped AbortController covers canonical LLM/provider/search/page/browser paths; subprocess OSINT remains an open boundary.
4. Attempted URLs do not become provenance; successful observations explicitly carry observed URLs.
5. Structured trajectory records retain action/args/model/execution/observation/observed URLs/findings/fallback/stop state.
6. Discovery persistence retains structured trajectory plus durable case-memory projection.
7. SSRF/provider transport response bodies are byte-capped; browser provider responses are bounded too.
8. Browser escalation is SSRF-checked, including redirected/subresource requests.
9. Browser budgets use AsyncLocalStorage execution scope rather than a global process counter.
10. Each Agentic run gets a unique execution scope, preventing concurrent runs with the same target/job from sharing browser-budget state.
11. Serper locale/market are optional model-selected fields; no forced US/English defaults.
12. Target/Bureau evidence gates require source URLs to be successful observed material and exact contact values to occur in that material.
13. Claim-to-source binding is single-observation: candidate identity tokens and the exact contact value must co-occur in one successful bounded trajectory observation; independent observations are never concatenated to satisfy one claim.
14. Target/Bureau wrappers preserve canonical `cancelled` as a distinct result state.
15. Discovery admissions pass their validated successful source URL into the strict persistence boundary.
16. Discovery is exposed as explicit `mode="discovery"` rather than requiring a person target at the canonical ReAct boundary.
17. `scripts/check-canonical-promotion-boundary.mjs` guards single-observation claim binding and cancellation-state preservation.
18. Canonical target continuation is model-owned: after each Investigator pass, DeepSeek provides oversight and Gemini chooses `continue_target`, `revisit_target`, `pivot_target`, or `stop`; the decision is durably persisted and subsequent passes remount accumulated case context.
19. The canonical target runner gates final Gemini review on an explicit Gemini `stop` decision rather than finalizing immediately after one Investigator pass.
20. `scripts/audit-target-continuation-intrinsic.mjs` checks the target runner's direct control wiring, Investigator-before-control ordering, explicit pass loop, stop-gated final review, and durable control persistence.
21. `domain-surface.ts` now accepts a caller `AbortSignal` and passes it into both RDAP and WhoisJSON transport calls, with fail-closed cancellation checks around the parallel lookup. **The canonical ReAct core currently does not yet propagate its run signal into `lookupDomainSurface`; this remains an identified #139 second-order gap.**
22. `python-tools.ts` now gives Holehe/Maigret/Sherlock/theHarvester real child-process cancellation primitives: detached POSIX process groups, SIGTERM plus SIGKILL backstop, bounded output, and distinct cancellation exit state. **Formal network-egress governance for those subprocesses remains unresolved.**
23. `scripts/check-agentic-runtime.mjs` now guards the Python subprocess cancellation contract and the canonical ReAct signal propagation expected for the individual OSINT adapters.

## Confirmed/open forensic defects
- **#128:** canonical `src/src/lib/ai-extractor.ts` still exposes a Groq final-card-review path according to source/issue review. Required remediation remains Gemini -> DeepSeek -> deterministic fail-closed adjudication; Groq must not act as reviewer. Historical `mcts.ts` material is not mounted by the live research route but remains source that must be retired/reconciled.
- **#139:** Python OSINT subprocesses now have cooperative child-process cancellation, but they still lack formally governed network egress. Additionally, canonical `domain_lookup` currently calls `lookupDomainSurface` without passing the run-scoped signal, so RDAP/WhoisJSON can outlive run cancellation. This is not runtime-proven.
- **#147:** canonical ReAct still exposes compound `footprint_username`, `footprint_email`, and `harvest_domain` actions. `footprint_username` deterministically fans out to Maigret + Sherlock; the other actions bind a model action to a specific compound capability. Required remediation remains individually model-selectable capabilities plus cancellation/egress controls, with exact tool-level trajectory/provenance.
- **#125/#126:** deterministic secondary-surface enrichment remains in legacy/live-adjacent routes and requires continued reachability analysis/retirement.
- Duplicate source trees, legacy ingest/enrichment, old API/OpenAPI execution surfaces, legacy extraction semantics, and other research material remain under forensic cleanup.

## Resolved in this continuation
- **#150:** closed after integrating Gemini-owned target continuation directly into the canonical single-target runner. Static verification only; no runtime success claimed.
- **#149:** closed after changing target/Bureau evidence validation from cross-source concatenation to per-observation claim binding. Static verification only.

## Evidence law
A person candidate requires explicit model-authored identity, candidate scope, successful observed HTTP(S) source, and explicit `promotionDecision="promote"`. No target-name inheritance, organization inheritance, URL-slug admission, listicle admission, proxy-contact admission, or fabricated URL. Claim-source validation must bind the claim to a single successful bounded observation; it must not stitch independent observations together as though they were one source.

## Verification state
**No Replit/runtime/provider/CI/end-to-end success is claimed.** Repository mutations and static source review are not runtime proof. The latest main tip is `3faf0a6e087676c7b9db145a0a1aad19940d4891`. Final acceptance requires a real durable trajectory showing Gemini Boss -> DeepSeek/NVIDIA Right Hand -> selected Groq/Mistral Investigator -> genuine model-selected first action -> model pivots -> successful observed provenance -> explicit promotion -> evidence-backed card, with actual observations inspectable by oversight.

## Immediate forensic priority
Continue from the current main tip by tracing #139/#147 together: canonical ReAct action execution -> `python-tools.ts` -> child processes -> network egress -> cancellation -> trajectory status/provenance, while fixing the currently identified missing `runController.signal` propagation into `lookupDomainSurface`. Then audit #128, duplicate source trees, deterministic secondary-surface reachability, legacy extraction semantics, and every caller that can turn model output into persisted contact/entity state. Static fixes must be followed by second-order reachability review; runtime/provider availability remains unproven.
