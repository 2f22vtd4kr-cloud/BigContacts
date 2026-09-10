# Context — living handoff (Apex Atlas / BigContacts)

> **Living handoff — 2026-09-10.** This is the current architecture source of truth. Historical documents describe prior states; do not resurrect obsolete control planes.

**Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Branch:** `main`  
**Current GitHub code tip:** `9250b8edcca712e3647c0dd6ef8fd2267d7c9a53`  
**Product:** Apex Atlas research bureau embedded in BigContacts.

## 1. Institutional constitution

Apex is an AI-driven OSINT research bureau, not a deterministic search script.

Hierarchy:

```text
institutional constitution
  -> role purpose
  -> durable case context / memory
  -> operator case contribution
  -> AI reasoning
  -> model-selected action
```

### Roles

| Role | Provider | Responsibility |
|---|---|---|
| Boss / Head Investigator | Gemini | case direction, Investigator assignment, control decisions, final case gate |
| Right Hand / Oversight | DeepSeek via NVIDIA Integrate | advisory/review intelligence; never Investigator |
| Investigator | Groq | free-ReAct web/OSINT research |
| Investigator | Mistral | free-ReAct web/OSINT research / capacity fallback |

Groq/Mistral transport fallback is infrastructure only. Gemini and DeepSeek never silently enter the Investigator lane.

## 2. Autonomy law

AI owns research strategy, query construction, tool selection, pivots, identity reasoning, evidence sufficiency, contact-route discovery, stopping, promotion, and discovery-versus-target continuation.

Deterministic code owns safety/infrastructure only: auth, schemas, transport, SSRF, quotas/budgets, cancellation, persistence, provenance, deduplication, telemetry, lifecycle and impossible-state prevention.

Never reintroduce fixed playbooks, forced first tools, deterministic discovery, hidden search brains, automatic promotion, fabricated contacts/people/URLs, or role leakage.

Discovery and target research are capabilities, not mandatory deterministic phases.

## 3. Canonical ReAct implementation

Primary loop:
`artifacts/api-server/src/src/lib/agentic-web-research-core.ts`

Canonical guarded entrypoint:
`artifacts/api-server/src/src/lib/agentic-web-research.ts`

Bureau wrapper/context mount:
`artifacts/api-server/src/src/lib/bureau-agentic-pass.ts`

Target Investigator:
`artifacts/api-server/src/src/lib/target-contact-agent.ts`

Strict evidence/card boundary:
`artifacts/api-server/src/src/lib/bureau-contact-persist-strict.ts`

SSRF:
`artifacts/api-server/src/src/lib/ssrf-safe-fetch.ts`

Browser escalation:
`artifacts/api-server/src/src/lib/browser-fetch.ts`
`artifacts/api-server/src/src/lib/browser-fetch-core.ts`

Atlas control/discovery:
`artifacts/api-server/src/src/lib/atlas-control-decision.ts`
`artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts`
`artifacts/api-server/src/src/routes/research/canonical-case-discovery.ts`
`artifacts/api-server/src/src/routes/research/canonical-case-continuation.ts`

## 4. ReAct first-decision result

The rewritten canonical core no longer seeds the loop with `Begin. Choose an initial web_search query` or `(none — begin with web_search)`.

Its initial observation is context-only: institutional mission/role, durable case context, capabilities, and an explicit statement that no research action has yet been selected. The model then chooses one permitted action.

The action surface currently includes:

- `web_search` with explicit Investigator-selected Serper/Tavily/Exa provider;
- `visit`;
- `browser_fetch`;
- `footprint_email`;
- `footprint_username`;
- `domain_lookup`;
- `registry_search`;
- `harvest_domain`;
- `done`.

The loop has no deterministic search checklist or mandatory hop order.

## 5. ReAct forensic review — current findings

### PASS — AI-owned first action
`lastObservation` begins with case/institutional context rather than a forced tool. `buildStepPrompt()` explicitly says there is no required first tool or hop order.

### PASS — model-authored evidence boundary
Only `action=done` produces `modelFindings`. Deterministic contact extraction remains observation material. Persistence consumes `modelFindings`, then validates observed provenance and schema.

### PASS — explicit provider selection
`web_search` requires a provider in the action schema. There is no Serper→Tavily→Exa research recipe. Investigator-provider fallback occurs only at the LLM-capacity/transport layer.

### PASS — role separation
The core's LLM adapter pool is Groq/Mistral only. Gemini/DeepSeek are not Investigator adapters.

### PASS — canonical SSRF wrapper
The canonical wrapper installs an Investigator-only fetch boundary. `ssrf-safe-fetch.ts` validates HTTP(S), rejects private/loopback/link-local/metadata/reserved destinations, pins the resolved public address, and disables automatic redirects.

### FIXED — Investigator provider quota bypass
The initial wrapper composed SSRF safety around native fetch but bypassed the provider quota gate. Commit `acf49d2cb42d5cbdbc6b597a94a82f9ee2d07e0e` now composes **provider quota -> SSRF-safe pinned fetch** inside the Investigator execution context, so search/LLM/page/provider traffic is subject to the deterministic infrastructure budget boundary.

### BLOCKER — prompt-injection boundary is incomplete
Fetched pages, search snippets, registry responses, footprint results, and other tool observations are inserted into the Investigator user prompt. The current prompt does not explicitly state, at system-message level, that these observations are untrusted data and may contain instructions that must never override Apex policy or tool-selection rules.

Required fix: add a strong untrusted-observation/prompt-injection rule to the Investigator system orientation and/or a dedicated system-level guard. Web content must remain data, never instructions.

### BLOCKER — hard timeout is not actually hard during an action
The loop checks elapsed time between iterations, while individual LLM/tool calls can run until their own timeout. `hardTimeoutMs` therefore bounds iteration entry rather than guaranteeing that the whole run stops at the requested deadline.

Required fix: propagate a run-scoped AbortSignal through LLM and network tools and make subprocess-capable tools honor cancellation; do not merely race the Promise while leaving the underlying operation alive.

### BLOCKER — iteration budget is not capped to the core safety constant
The core defines `MAX_ITER = 40`, but `maxIter` is currently `Math.max(1, input.maxIterations ?? MAX_ITER)`, which permits a caller to request more than 40 iterations. The canonical live wrapper/callers normally use bounded research-depth values, but the core's own invariant is not fail-closed.

Required fix: cap the effective iteration budget to the hard maximum in the canonical core, and keep the caller-side depth budget as the softer research envelope.

### BLOCKER — direct core fetch contains `redirect: "follow"`
`toolVisit()` asks native fetch to follow redirects. The canonical wrapper's SSRF transport overrides this to manual redirects, so the live canonical path is protected. However, the core itself contains a dangerous transport instruction and becomes unsafe if ever called outside the wrapper.

Required fix: make the core tool transport itself use the canonical SSRF-safe wrapper and remove the misleading direct-follow behavior rather than relying solely on the global shim.

### BLOCKER — provider quota and scope composition needs regression coverage
The new wrapper fix composes `runProviderFetch()` around `safeOutboundFetch()`. This needs an architecture guard proving that Investigator fetches cannot bypass provider quota and that the two wrappers are not accidentally installed in a recursion/double-counting order.

### BLOCKER — web observations lack an explicit system-level trust boundary
The current system message is `apexOrientationCompact("dig_agent") + "Return one JSON action object only."`; the dynamic page/search material is supplied as the user message. The institutional orientation states evidence law but does not explicitly say that observed text is adversarial/untrusted data.

This is separate from identity provenance. Both are required.

### RISK — deterministic provider bundles inside tools
`browser_fetch` has an implementation-level provider chain (Scrapfly → ZenRows → Browserless → Playwright), and `footprint_username` executes Maigret + Sherlock together. These are currently capability implementations rather than research strategy, but they should remain documented as transport/tool internals and must not evolve into model-invisible research decisions.

### RISK — browser fetch budget is process-scoped
`browser-fetch-core.ts` uses a process-wide `browserFetchCount` despite describing it as case-local. Concurrent cases can therefore consume one another's browser escalation budget.

### RISK — durable discovery context is narrower than the full case file
`persistDiscoveryTrajectory()` rewrites `contextDocument` to objective + counters + actual Investigator trajectory. The full `caseFile` still retains other fields, but subsequent continuation currently mounts `contextDocument` rather than a synthesized memory view containing all relevant prior Boss/Right-Hand advice, admitted candidates, open questions, and evidence state.

Required fix: build a durable memory projection for continuation instead of treating the trajectory-only document as the whole case memory.

### RISK — identity collision heuristic can be too permissive
`assessIdentityCollision()` can reach `identityMatch >= 0.65` from evidence-token overlap even when an explicitly model-authored `personName` does not fully match the target. The card boundary should require stronger explicit person-name alignment for candidate/personal promotion; evidence URLs must not substitute for the identity match.

## 6. Evidence/person-admission law

Discovery admission requires:

1. explicit model-authored person identity;
2. candidate/person scope;
3. exact observed HTTP(S) source URL;
4. explicit `promotionDecision="promote"`.

No target-name inheritance, organization inheritance, URL-slug admission, article/listicle admission, or proxy-contact admission.

Canonical target persistence uses source URLs observed in the actual Investigator trajectory. Deterministic extraction does not silently become card evidence.

## 7. Durable Atlas control

Gemini controls the discovery/research transition after DeepSeek oversight. Allowed control actions are `continue_discovery`, `research_candidate`, `revisit_candidate`, `pivot_discovery`, and `stop`.

Control decisions require durable `caseId` and positive `controlTurn`, are persisted as `control_decision`, and fail closed on persistence errors.

## 8. Remaining architectural blockers

- **#125/#126:** deterministic secondary-surface playbook and its old direct-fetch/SSRF lane.
- **#128:** canonical Groq final reviewer in `src/src/lib/ai-extractor.ts`.
- **#129/#132:** duplicate/legacy source-tree reachability and remaining legacy enrichment tree.
- **#133:** institutional mission/bootstrap reconciliation.
- **#136:** target-derived identity attribution inside the ReAct observation bag.
- **#137/#138:** legacy deterministic case execution source remains quarantined/unmounted; public API/OpenAPI retirement reconciliation remains.

#120's forced first-search defect is **fixed in the runtime rewrite**, but the complete ReAct safety review remains open because of the blockers above.

## 9. Verification state

Current main tip: `9250b8edcca712e3647c0dd6ef8fd2267d7c9a53`.

GitHub has not provided CI/runtime evidence for this tip. No Replit deployment, provider availability, DB/Redis durability, card promotion, or end-to-end smoke trajectory is claimed as proven.

The correct final acceptance test remains a real run showing: durable case → Gemini Boss → DeepSeek/NVIDIA Right Hand → selected Groq/Mistral Investigator → genuine model-selected first action → multiple model-selected pivots/tools as appropriate → observed provenance → explicit promotion → evidence-backed card, with the full trajectory visible to subsequent oversight.
