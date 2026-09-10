# Context — living handoff (Apex Atlas / BigContacts)

> **Living handoff — 2026-09-10.** Current architecture source of truth. Historical documents are not live control planes.

**Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Branch:** `main`  
**Current GitHub code tip:** `8281119be080d5c2fa917786257a49edcd40e8b0`  
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

The rewritten core no longer seeds a mandatory `web_search`. The first observation is context-only and the Investigator can choose any permitted first action.

Current action surface:

- `web_search` — explicit Serper/Tavily/Exa choice, with optional model-selected locale/market;
- `visit`;
- `browser_fetch`;
- `footprint_email`;
- `footprint_username`;
- `domain_lookup`;
- `registry_search`;
- `harvest_domain`;
- `done`.

## 5. Forensic hardening status

### FIXED — Agentic provider quota wrapper contract
The canonical Agentic SSRF wrapper now uses the actual `runProviderCall` API when no process-wide quota shim exists, instead of calling the incompatible internal `runProviderFetch` signature. With the outer quota guard present, Agentic fetch uses only SSRF pinning and avoids double quota accounting.

### FIXED — run iteration ceiling
The core hard-caps caller-supplied iterations at `MAX_ITER=40`.

### FIXED — run-level cancellation for LLM/HTTP
The core creates one run-scoped `AbortController`, aborts it at the hard deadline, propagates it into Investigator LLM requests and page/search HTTP, and makes provider-slot waiting cancellable. Cancellation is now represented as a distinct terminal status rather than successful completion.

### FIXED — attempted URL is not provenance
ReAct trajectory entries now record execution state and an explicit `observed=` URL. Contact-source validation accepts only successful observed page/browser URLs; failed/blocked/timed-out attempts cannot become evidence merely because the model attempted them.

### FIXED — network response memory ceiling
The SSRF-pinned transport enforces a 2,000,000-byte response ceiling with Content-Length precheck and streaming byte counting. Browser/provider escalation also has a 2,000,000-byte response ceiling where applicable.

### FIXED — browser budget isolation
Browser escalation budget is now keyed by Agentic execution scope through AsyncLocalStorage instead of one process-wide counter. Browser Playwright requests are individually checked against the SSRF destination guard, including redirects/subresources.

### FIXED — search locale neutrality
Serper no longer silently supplies `gl=us` / `hl=en`; optional locale/market fields are model-selectable.

### FIXED — exact claim-to-observation binding
Target and Bureau source-backed finding gates now use durable structured ReAct observations. Contact values must occur in the observed material, and candidate person-name tokens must occur in the same observed material. Identity/promotion remain model-authored; deterministic code only validates the claim-to-source binding.

### IMPLEMENTED — structured forensic trajectory
The ReAct result now includes bounded `trajectoryRecords` containing turn/model/action/args, optional product-visible thought, execution state, observation, observed URLs, findings, provider fallback, and stop reason. Canonical discovery persistence stores those records and builds a durable continuation memory projection from case state.

### OPEN — full run cancellation across browser/subprocess (#139/#141)
Browser adapters now accept cancellation internally, but the canonical core still needs to pass its run signal into the browser call; subprocess OSINT adapters (Holehe/Maigret/Sherlock/theHarvester) still need true child-process cancellation and governed egress. Do not claim the entire run is hard-cancellable until those paths are wired.

### OPEN — subprocess network boundary (#141)
Python OSINT tools make network calls outside the Node SSRF/provider boundary. They require sandboxed/egress-governed execution or a formal safe-transport design.

### OPEN — discovery first-class mode (#144)
The core exposes `mode="discovery"`, and the Bureau wrapper uses it, but the legacy discovery-agent tree still contains `Discovery slot` magic strings and older prescriptive prompts. Canonical Atlas should stop representing discovery as a fake target at all public/internal boundaries.

### OPEN — legacy deterministic secondary surface (#125/#126)
`expandSecondaryPublicSurface()` remains a deterministic enrichment playbook in legacy/live-adjacent paths. It should be retired or converted into explicit model-selectable capabilities; direct fetch must remain under the canonical safety boundary.

### OPEN — canonical Groq final reviewer (#128)
`src/src/lib/ai-extractor.ts` still contains the Groq final-review path and must be removed/fail-closed without weakening the role contract.

### OPEN — duplicate source trees (#129) and legacy ingest tree (#132)
Reachability/classification and quarantine cleanup remain incomplete.

### OPEN — observation-only semantic scope (#136)
The old deterministic contact-fact-to-`AgenticFinding` helper has been removed from the canonical ReAct core. The broader legacy observation/extraction tree still needs reachability audit before #136 can be closed globally.

### OPEN — API/OpenAPI legacy retirement (#137/#138)
The old `cases.ts` execution source is unmounted/quarantined; API/OpenAPI/generated-client retirement reconciliation remains.

## 6. Evidence/person admission law

A discovery person candidate requires:

1. explicit model-authored person identity;
2. candidate/person scope;
3. exact successful observed HTTP(S) source;
4. explicit `promotionDecision="promote"`.

No target-name inheritance, organization inheritance, URL-slug admission, article/listicle admission, proxy-contact admission, or source-URL-as-identity substitution.

## 7. Durable Atlas control

Gemini controls discovery/research transitions after DeepSeek oversight with AI-owned actions: `continue_discovery`, `research_candidate`, `revisit_candidate`, `pivot_discovery`, `stop`.

Control decisions require durable `caseId` and positive `controlTurn`, are persisted as `control_decision`, and fail closed on persistence errors.

Target investigations refuse context-free calls. Canonical target context includes prior case state, Right-Hand state, Boss state, actual Investigator trajectory, and finding summaries.

## 8. Verification state

**No runtime, Replit, provider-availability, DB/Redis durability, CI, or end-to-end card-promotion success is claimed.** GitHub connector writes confirm repository mutations only. The next acceptance gate remains a real durable trajectory showing Gemini Boss → DeepSeek/NVIDIA Right Hand → selected Groq/Mistral Investigator → genuine model-selected first action → model-selected pivots/tools → successful observed provenance → explicit promotion → evidence-backed card, with actual observations inspectable by oversight.

Legacy `discovery-agent.ts` remains quarantine material and must not be treated as current ReAct architecture.
