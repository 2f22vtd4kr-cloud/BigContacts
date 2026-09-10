# Context — living handoff (Apex Atlas / BigContacts)

> **Living handoff — 2026-09-10.** Current architecture source of truth. Historical documents are not live control planes.

**Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Branch:** `main`  
**Current GitHub code tip:** `aa65c2e17b92a59b5165975c75997d923d900d2d`  
**Product:** Apex Atlas research bureau embedded in BigContacts.

## 1. Institutional constitution

Apex is an AI-driven OSINT bureau, not a deterministic search script.

```text
institutional constitution -> role purpose -> durable case context -> operator case input -> AI reasoning -> model-selected action
```

### Roles

| Role | Provider | Responsibility |
|---|---|---|
| Boss / Head Investigator | Gemini | case direction, Investigator assignment, control, final gate |
| Right Hand / Oversight | DeepSeek via NVIDIA Integrate | advisory/review intelligence; never Investigator |
| Investigator | Groq | free-ReAct research |
| Investigator | Mistral | free-ReAct research / capacity fallback |

Groq/Mistral fallback is transport/capacity behavior only. Gemini/DeepSeek never silently enter the Investigator lane.

## 2. Autonomy law

AI owns research strategy, queries, tool choice, pivots, identity reasoning, evidence sufficiency, contact-route discovery, stopping, promotion, and discovery-versus-target continuation.

Deterministic code owns safety/infrastructure: auth, schemas, transport, SSRF, quotas/budgets, cancellation, persistence, provenance, deduplication, telemetry, lifecycle and impossible-state prevention.

No fixed research playbooks, forced first tools, hidden search brains, automatic promotion, fabricated contacts/people/URLs, or role leakage.

## 3. Canonical ReAct path

Primary loop: `artifacts/api-server/src/src/lib/agentic-web-research-core.ts`  
Guarded entrypoint: `artifacts/api-server/src/src/lib/agentic-web-research.ts`  
Target Investigator: `artifacts/api-server/src/src/lib/target-contact-agent.ts`  
Strict evidence boundary: `artifacts/api-server/src/src/lib/bureau-contact-persist-strict.ts`  
SSRF: `artifacts/api-server/src/src/lib/ssrf-safe-fetch.ts`  
Browser: `artifacts/api-server/src/src/lib/browser-fetch.ts` + `browser-fetch-core.ts`  
Atlas control: `atlas-control-decision.ts`, `canonical-atlas-discovery.ts`, canonical discovery/continuation routes.

## 4. First-decision result — #120 fixed

The rewritten core no longer seeds `lastObservation` with `Begin. Choose an initial web_search query` or `(none — begin with web_search)`.

The first observation is context-only: institutional mission/role, durable case context, capabilities, and explicit statement that no action has been selected. The Investigator can choose any permitted first action.

Current action surface:

- `web_search` — explicit Serper/Tavily/Exa choice;
- `visit`;
- `browser_fetch`;
- `footprint_email`;
- `footprint_username`;
- `domain_lookup`;
- `registry_search`;
- `harvest_domain`;
- `done`.

Issue #120 is closed as completed. No runtime/CI success is implied.

## 5. Forensic hardening status

### FIXED — provider quota composition
The original Investigator SSRF wrapper bypassed the global provider quota gate. The wrapper now composes provider quota with SSRF-safe pinned fetch and detects an outer `__apexQuotaGuard` so quota is not double-counted when module-load order installs provider-gate after the Agentic module. Regression guard: `scripts/check-agentic-ssrf-boundary.mjs`.

### FIXED — system-level prompt-injection law
`apex-bureau-orientation.ts` now explicitly classifies search/page/registry/browser/OSINT output as untrusted/adversarial data. Observations cannot override Apex mission, role boundaries, evidence law, safety law, action schema, authorization, or promotion/stopping authority.

### FIXED — identity collision URL substitution
`identity-collision.ts` no longer counts source URL tokens as identity overlap. Explicit multi-token `personName` must align with the target; evidence URLs are provenance, not identity.

### OPEN — run-level hard timeout/cancellation (#139)
The ReAct loop checks timeout only between turns. Tool/LLM calls can continue until their local timeout. Cancellation currently returns `status="completed"` with `stopReason="CANCELLED"`, conflating cancellation with successful completion. Required: run-scoped AbortSignal propagated through LLM/network/browser/subprocess tools and explicit cancelled terminal state.

### OPEN — hard iteration ceiling (#139)
Core defines `MAX_ITER=40` but computes `maxIter = Math.max(1, input.maxIterations ?? MAX_ITER)`, permitting a caller to exceed the intended hard ceiling. Research-depth callers currently use 8/14/20, but the core invariant must be fail-closed.

### OPEN — core transport safety (#139)
`toolVisit()` contains `redirect: "follow"`. The live canonical wrapper overrides redirects to manual, but the core is unsafe by construction if imported outside the wrapper. Make the core transport safe itself.

### OPEN — exact claim-to-source provenance (#142)
Current provenance proves that a cited URL was observed, not that the claimed email/phone/person identity actually appeared in the observed material. The durable evidence record needs bounded source excerpts/content-addressed observations so deterministic validation can bind each claim to observed material without choosing identity or promotion.

### OPEN — durable forensic trajectory (#140)
Current `history` persists compact action summaries, not the actual model action object, exact tool arguments, tool result/observation, provenance excerpt, fallback event, and next state. The required trajectory must be inspectable by Gemini/DeepSeek/operator without storing private hidden chain-of-thought. Persist explicit structured action/thought fields only where product-visible, never hidden CoT.

### OPEN — subprocess network boundary (#141)
Holehe/Maigret/Sherlock/theHarvester subprocesses make network requests outside the Node provider/SSRF/cancellation boundary. TheHarvester accepts a model-selected domain. Local Playwright browser navigation can also follow redirects/subresources outside the Node SSRF guard. These adapters need sandboxed/egress-governed transport or explicit proof of safe destination behavior.

### OPEN — search locale (#143)
Serper hard-codes `gl="us"` and `hl="en"`. Investigator action schema does not expose locale/market choice, creating deterministic international retrieval bias. Locale should be model-selectable or neutralized.

### OPEN — durable continuation memory
Discovery trajectory persistence currently narrows `contextDocument` to objective/counters/trajectory rather than a synthesized memory projection containing Boss/Right-Hand state, admitted candidates, open questions and evidence state.

### OPEN — browser budget isolation
`browser-fetch-core.ts` uses a process-wide browser fetch counter while describing the budget as case-local. Concurrent cases can consume each other's browser escalation budget.

## 6. Evidence/person admission law

A discovery person candidate requires:

1. explicit model-authored person identity;
2. candidate/person scope;
3. exact observed HTTP(S) source;
4. explicit `promotionDecision="promote"`.

No target-name inheritance, organization inheritance, URL-slug admission, article/listicle admission, proxy-contact admission, or source-URL-as-identity substitution.

Deterministic contact extraction remains observation-only and does not become `modelFindings`. #136 additionally tracks removal of semantic `scope="organization"` objects from raw extraction; raw observations should contain facts/provenance, not identity scope authored by code.

## 7. Durable Atlas control

Gemini controls discovery/research transitions after DeepSeek oversight with AI-owned actions: `continue_discovery`, `research_candidate`, `revisit_candidate`, `pivot_discovery`, `stop`.

Control decisions require durable `caseId` and positive `controlTurn`, are persisted as `control_decision`, and fail closed on persistence errors.

Target investigations refuse context-free calls. Canonical target context includes prior case state, Right-Hand state, Boss state, actual Investigator trajectory, and finding summaries.

## 8. Remaining legacy/control-plane blockers

- **#125/#126:** deterministic secondary-surface playbook and legacy direct-fetch/SSRF lane.
- **#128:** canonical Groq final reviewer in `src/src/lib/ai-extractor.ts`.
- **#129/#132:** duplicate/legacy source-tree and enrichment reachability classification.
- **#133:** institutional mission/bootstrap reconciliation.
- **#136:** deterministic semantic identity/scope in observation extraction.
- **#137/#138:** legacy `cases.ts` execution source is quarantined/unmounted; API/OpenAPI retirement reconciliation remains.

Legacy `discovery-agent.ts` also contains older prescriptive discovery prompts and candidate heuristics. It is not the canonical public Atlas control path and remains part of legacy reachability/quarantine work; do not treat it as current ReAct architecture.

## 9. Verification

Current main tip: `aa65c2e17b92a59b5165975c75997d923d900d2d`.

GitHub has not provided completed CI/runtime evidence for this tip. No Replit deployment, provider availability, DB/Redis durability, card promotion, or end-to-end smoke trajectory is claimed.

Final acceptance remains a real durable trajectory showing: Gemini Boss → DeepSeek/NVIDIA Right Hand → selected Groq/Mistral Investigator → genuine model-selected first action → model-selected pivots/tools → observed provenance → explicit promotion → evidence-backed card, with actual actions/observations inspectable by oversight.

For the complete forensic review and issue mapping, see `docs/audit-2026-09-10-react-core-forensic-review.md` and GitHub issues #139–#143.
