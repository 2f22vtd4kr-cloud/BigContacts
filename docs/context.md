# Context — living handoff (Apex Atlas / BigContacts)

> **Living handoff — 2026-09-09.** This document is the product/architecture source of truth for Apex Atlas. Historical implementation batches remain in Git history; do not resurrect obsolete architecture because an old document mentions it.

**Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Branch:** `main`  
**Current GitHub code tip:** `99510166bbdca2486749fa30fb239e7fbd468a7c`  
**Product:** Apex Atlas research bureau embedded in BigContacts. Bureau is the OSINT/research architecture, not a separate product.

## 1. What Apex is

Apex is a model-directed research bureau.

```text
GEMINI
BOSS / PRIMARY ORCHESTRATOR
        |
        v
FREE-ReACT INVESTIGATION RUNTIME
        |
        +-- Investigator LLM capability
        |      Groq
        |      Mistral
        |      other legitimate configured Investigator adapters
        |
        +-- Research capabilities
               EXA / Tavily / Serper / SerpAPI / browser/fetch /
               scraping / registries / WHOIS/RDAP / identity tools /
               other actual repository capabilities
```

LLMs own judgment and research trajectory. Search/browser/registry/scraping are capabilities exposed to the Investigator environment. Deterministic code owns safety, authorization, schemas, budgets, timeouts, persistence, provenance, lifecycle, telemetry and promotion integrity.

### Canonical roles

| Role | Provider | Responsibility |
|---|---|---|
| Boss / Primary Orchestrator | **Gemini** | case direction, Investigator assignment, final case gate |
| Right Hand Advisor | **DeepSeek V4 Flash** | advisory/oversight intelligence only |
| Investigator LLM | **Groq** | model-directed free-ReAct research |
| Investigator LLM | **Mistral** | model-directed free-ReAct research / transport fallback |
| Research tools | actual configured adapters | execute Investigator-selected actions |

DeepSeek MUST NOT enter the generic Investigator pool. Groq/Mistral fallback is transport/capacity fallback only, never a research sequence.

## 2. Non-negotiable architecture law

NEVER reintroduce:

- Groq → Mistral as a research sequence;
- fixed search-provider ordering;
- EXA → Tavily → Serper playbooks;
- ranked provider preference lists that determine research intent;
- `force_*` research hops;
- scripted research trajectories;
- hidden AI/search-router layers deciding what to research;
- deterministic candidate discovery from arbitrary page text;
- fabricated evidence, URLs, contacts or synthetic observations;
- deterministic promotion because a score, field count, filing or old card exists.

The Investigator model owns what information is missing, query construction, tool choice, pivots, evidence sufficiency, stopping, uncertainty and explicit evidence/promotion judgment.

Deterministic code owns authorization, schema validation, tool safety, timeout/budgets, persistence, provenance, lifecycle/cancellation, evidence validation and promotion integrity.

## 3. Canonical implementation locations

Primary ReAct loop: `artifacts/api-server/src/src/lib/agentic-web-research.ts`

Bureau wrapper/context mount: `artifacts/api-server/src/src/lib/bureau-agentic-pass.ts`

Discovery: `artifacts/api-server/src/src/lib/discovery-agent.ts`

Case Bureau: `artifacts/api-server/src/src/lib/case-bureau.ts`

Canonical case discovery/continuation:
- `artifacts/api-server/src/src/routes/research/canonical-case-discovery.ts`
- `artifacts/api-server/src/src/routes/research/canonical-case-continuation.ts`

Canonical Atlas:
- `artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts`
- `artifacts/api-server/src/src/lib/atlas-control-decision.ts`
- `artifacts/api-server/src/src/lib/canonical-single-target-runner.ts`
- `artifacts/api-server/src/routes/atlas.ts`

Target Investigator: `artifacts/api-server/src/src/lib/target-contact-agent.ts`

Strict evidence/card boundary: `artifacts/api-server/src/src/lib/bureau-contact-persist-strict.ts`

Final review: `artifacts/api-server/src/src/lib/final-target-review.ts`, `artifacts/api-server/src/lib/ai-extractor.ts`

Architecture guards:
- `scripts/check-unified-investigator-architecture.mjs`
- `scripts/check-no-force-dig.sh`
- `scripts/check-bureau-free-react.mjs`
- `scripts/check-discovery-quality.mjs`
- `scripts/check-agentic-runtime.mjs`
- `scripts/check-no-synthetic-data.sh`
- Reactor/live-integrity guards
- Redis budget/hardening audit

## 4. Evidence/card boundary

Evidence is not a card.

Only an explicit model decision may cross the evidence → card boundary. Deterministic code validates provenance, schema, source validity and identity; it must not manufacture promotion.

Historical stored evidence, evidence re-observed during this run, and newly discovered evidence must remain distinguishable.

The strict persistence layer may persist source-backed candidate evidence. Card mutation requires an explicit Investigator-selected value and provenance validation. Review-only discovery entities are not contact cards and do not constitute contact promotion.

## 5. Discovery admission boundary

A person candidate requires:

1. explicit person identity from the Investigator;
2. `scope === "candidate"` / person scope;
3. a real observed HTTP(S) source URL;
4. explicit Investigator `promotionDecision === "promote"` for the admission boundary.

Organization/unknown-scope findings remain evidence and do not become person candidates. A target name, article title, company name, URL slug, document author, proxy contact, deterministic extraction or same-name organization must never supply missing person identity.

## 6. Investigation context document — first-class architecture

Every target-scoped investigation has a durable `contextDocument` stored in the research case file. It is shared case state, not public-source instructions.

Gemini and DeepSeek receive the evolving context before their oversight decisions. The Investigator receives it as mounted context before acting. The context records the target, phase, operating law, latest Right-hand state, latest Boss state, Investigator result, actual recent Investigator trajectory/finding summaries, uncertainties and investigation timeline.

Case-scoped Investigator work fails closed when the case ID is invalid, the case file is missing/unreadable, or the durable `contextDocument` is missing/empty.

The canonical single-target runner persists the actual bounded Investigator trajectory into the durable context after the ReAct pass, so DeepSeek post-review and Gemini final review see what actually happened rather than only counters.

When a target case is resumed, the prior durable context is preserved and carried into the new run instead of being reset. Case iteration numbers continue from the existing case state.

The context document is a memory/state surface for orchestration, not a deterministic script. It must never be used to prescribe a search sequence or teach a trained model how to research.

## 7. Recent architectural work already merged

Important completed work includes:

- Gemini preserved as Boss.
- DeepSeek preserved as Right Hand.
- Groq/Mistral established as Investigator capability.
- Boss-selected Investigator propagation into active ReAct execution.
- Free-ReAct tool/action surface.
- Removal/quarantine of forced research hops and deterministic EXA/Tavily/Serper strategy.
- Model-selected discovery admission.
- Identity-boundary hardening against target inheritance and title-shaped identities.
- Exact HTTP(S) provenance requirements.
- Truthful Reactor/live telemetry rather than synthetic numbered research steps.
- Evidence/card promotion hardening.
- Legacy deterministic MCTS/bulk/Phase-J paths removed from live mounting or quarantined pending retirement.
- Self-mutating CI workflow retired.
- Public Atlas launch route moved onto the canonical model-owned control plane.
- Case discovery and case continuation moved ahead of legacy fixed-lane handlers.
- Durable per-investigation context introduced and mounted through Bureau ReAct passes.

Static guards passing is not proof of research quality or runtime truth.

## 8. Latest verified GitHub changes — 2026-09-09

The older 2026-09-09 tip was `aabdf6f1c3eac8700f49e916583889d324ef830f`; subsequent 2026-09-10 continuation commits are recorded below.

### PR #102 — canonical discovery admission scope
Strengthened the canonical discovery boundary so person-scoped identity is explicit.

### PR #103 — per-investigation context
Merged as `8314a48050807494d62ec96fd514da21d4b26668`. Made per-target/per-case investigation context a first-class Bureau artifact and exposed Investigator trajectory/state to shared context.

### PR #104 — case continuation
Merged as `d6cf7d4cb8c307a390687a736bae2928a0ad2d72`. Intercepted the reachable `/research/bureau/cases/:caseId/run-next-pass` path with a canonical Gemini/DeepSeek/selected-Investigator continuation. The old fixed-lane handler remains only for controlled retirement.

### PR #105 — exact Atlas discovery admission
Merged as `61bf0ecc1e7e6466b24a31b96988508e93c2cb8e`.

Bug: canonical Atlas discovery accepted any Investigator `promotionDecision="promote"` + `personName` as a target admission without requiring candidate scope or observed HTTP(S) provenance, and exact-name lookup could bind a person admission to an organization entity.

Fix: require candidate scope and observed HTTP(S) source; only reuse HNWI/Gatekeeper entities for person admissions; only target-research person-shaped entities; keep review-only persistence separate from contact promotion.

### PR #106 — required context mount
Merged as `0bc1bb1f6851ddb59453df7b2745af28bc215091`.

Bug: `runBureauAgenticWebPass` silently continued without case context if lookup failed or `contextDocument` was absent.

Fix: invalid case ID, missing/malformed case file and missing/empty durable context now fail closed.

### PR #107 — persist Investigator trajectory in context
Merged as `24843279165d94be3f3987824aef1545577a6866`.

Bug: the canonical single-target runner created the durable context and mounted it into the Investigator, but after the ReAct pass persisted only aggregate counters/five summary strings. The actual Investigator trajectory was absent from the context supplied to the post-investigation Right-hand and Gemini final review.

Fix: persist the bounded recent Investigator trajectory at the post-Investigator context checkpoint and carry it through Right-hand and Gemini final-review context snapshots. No research strategy or model-routing logic changed.

### PR #108 — preserve prior target investigation context
Merged as `aabdf6f1c3eac8700f49e916583889d324ef830f`.

Bug: rerunning an existing target case rebuilt the context from scratch at iteration 0. The timeline survived, but the actual durable `contextDocument` was replaced, so Gemini/DeepSeek/Investigator could lose prior target-investigation state.

Fix: load prior durable context, carry it into the next context snapshot, and continue the case iteration counter instead of resetting it. The context remains state rather than a deterministic research script.

## 9. Actual public Atlas launch path

The live route is:

`POST /api/ingest/atlas-run`
→ `routes/atlas.ts`
→ `canonical-atlas-discovery.ts` or `canonical-single-target-runner.ts`
→ Gemini Boss + DeepSeek Right-hand
→ selected Groq/Mistral Investigator
→ model-selected research capabilities
→ evidence validation/persistence
→ explicit promotion boundary.

`routes/atlas.ts` no longer imports the retired legacy Atlas orchestrator.

For an explicit single target, the canonical single-target runner creates/loads a target research case, creates/loads the durable context before model oversight, gives the same context to DeepSeek and Gemini, mounts it for the Investigator, then refreshes the durable context for post-investigation Right-hand and Gemini review.

## 10. Current remaining audit work

The audit is not finished. Continue leaf-by-leaf; do not declare the repository clean merely because the architecture guard passes.

Immediate next leaves:

1. **Target Contact Agent.** Audit identity boundary, provider binding, tool autonomy, source provenance, contact fabrication, inherited target identity, cancellation and explicit promotion. Also determine whether any non-canonical caller can invoke it without durable context.
2. **Agentic Web Research.** Audit the complete ReAct loop: action selection, observation, retries, provider transport fallback, malformed output, prompt-injection handling, stopping, evidence creation, telemetry and explicit promotion. Pay special attention to provider transport fallback versus research strategy.
3. **Final review.** Confirm Gemini/NVIDIA only in decision/review roles; no Groq/Mistral reviewer fallback; fail-closed ambiguity; historical evidence never silently promoted.
4. **Persistence callers.** Trace every caller of strict and legacy persistence, including rehydration and old projectors.
5. **Legacy target research / MCTS / bulk.** Trace reachability before retirement; tests and documentation must not depend on live access.
6. **`agent-orchestrator.ts`.** `/search/intelligent` is currently an active deterministic search surface with no LLM and no direct Apex investigation/card-promotion path. Verify its separation is intentional and documented; do not delete without reachability proof.
7. **CI/security.** Audit every workflow for write permissions, self-modification, untrusted checkout, secret exposure and dangerous triggers.
8. **Telemetry/frontend/mobile.** Confirm live UI represents actual activity only and historical events cannot masquerade as active research.
9. **Replit runtime gate.** Only after static blockers are exhausted: real import/build/typecheck/database/Redis/API health/provider availability, then one bounded live discovery smoke and forensic trajectory review.

## 11. Replit / runtime proof contract

Static repository correctness is not runtime proof. No Replit runtime claim may be made without an actual successful runtime observation.

Canonical provider secret names:

```text
REDIS_URL_1
GROQ_API_KEY
GEMINI_API_KEY
DEEPSEEK_API_KEY
MISTRAL_API_KEY
HF_TOKEN
SERPER_API_KEY
TAVILY_API_KEY
SERPAPI_KEY
EXA_API_KEY
SCRAPFLY_API_KEY
ZENROWS_API_KEY
COMPANIES_HOUSE_API_KEY
WHOISJSON_API_KEY
```

Never expose credential values. Do not introduce unapproved provider credentials. `DATABASE_URL` is supplied by Replit Postgres and is not a manually requested secret.

Required runtime gates:

1. serial API builds and idempotence;
2. typecheck;
3. frontend build;
4. database/schema;
5. Redis runtime and Redis hardening audit;
6. all architecture/no-fabrication/provenance guards;
7. API on port 8080;
8. `/api/healthz`;
9. truthful provider availability;
10. one bounded discovery-first smoke;
11. real named-person, observed-source admission;
12. real free-ReAct Investigator trajectory;
13. honest evidence/card outcome.

Bounded smoke is an exploration budget, not a requirement to fill slots. No fabricated target/person/evidence. Do not scale to a 10-target comparison until the bounded proof passes.

## 12. Engineering safety

Never blindly replace large files. Inspect exact source, make the smallest safe patch, inspect the diff immediately, run targeted verification, open a focused PR, verify, merge, then restart the hunt.

Never use scripts to teach trained models or impose a deterministic research sequence. Scripts/guards should verify contracts, not substitute for model judgment.

Do not add Redis heartbeat storms, GET-after-SET verification, repeated lock verification, per-progress TTL refresh or recursive Bureau log mirroring merely to create activity.

Do not relabel historical failures as successes. Prior failed runs remain regression evidence.

## 13. Verification philosophy

For every bug:

1. inspect source;
2. trace the caller/reachability;
3. identify the exact violated invariant;
4. make the smallest safe patch;
5. inspect the diff;
6. run targeted verification/guard;
7. open a focused PR;
8. verify PR state/checks where available;
9. merge;
10. immediately restart the leaf hunt.

A guard is not proof of runtime semantics. A field named `investigatorLlm` is not proof of propagation. A function called `agentic` is not proof of autonomy. Always trace the actual launch route and actual value flow.

## 14. Status

**STATUS: PRE-DEPLOYMENT / STATIC AUDIT CONTINUING / LIVE RESEARCH PROOF STILL REQUIRED**

Latest closed gaps:
- canonical Atlas admission could over-admit person identities;
- case-scoped Investigator passes could silently lose durable context;
- post-Investigator oversight context omitted the actual Investigator trajectory;
- repeated target runs could discard prior durable investigation context.

Next objective: continue the forensic leaf hunt through the actual target Investigator path and ReAct runtime, then persistence/final-review/legacy/telemetry/CI surfaces. No architecture rewrite unless a real source defect requires it.

Final proof remains:

**repair → verify → merge → restart hunt → boot → bounded real trajectory → forensic review → blind comparison → deploy.**

## 15. Continuation — 2026-09-10

### AI-owned Atlas transition control

Merged as `c46d707707a3c77321a8c3c5df5b6721867f368b`: `atlas-control-decision.ts` introduces an explicit Gemini Boss control decision after DeepSeek Right-hand review. The decision is allowed to choose `continue_discovery`, `research_candidate`, `revisit_candidate`, `pivot_discovery`, or `stop`. Candidate selection is validated against the explicit source-backed admission set; invalid model choices fail closed.

`canonical-atlas-discovery.ts` no longer unconditionally loops through every admitted candidate into target research. Its bounded execution loop asks the AI control plane for the next action. A model-directed continuation/pivot can launch another Investigator pass against the same durable discovery case; a model-selected candidate can enter the canonical single-target control plane. The loop budget is an execution safety envelope, not a research recipe.

The architecture guard was strengthened in `8a6a8f420688d55ed892919f6624902f7e374124` to require the Atlas control decision contract and Gemini+DeepSeek oversight, while retaining the no-forced-first-search guard and legacy route guards.

The public Atlas route was then clarified in `99510166bbdca2486749fa30fb239e7fbd468a7c`: its response now describes discovery/target/revisit/pivot/continuation/stop as model decisions inside a model-directed research envelope rather than presenting target research as a mandatory deterministic phase.

### Remaining blockers still intentionally open

- **#120:** canonical `agentic-web-research-core.ts` still contains the forced initial `web_search` opening observation; source repair is still required. Provider ordering itself is explicit and transport fallback remains distinct from research strategy.
- **#125/#126:** `expandSecondaryPublicSurface()` remains a deterministic legacy playbook with live callers and direct outbound fetching; it is not yet retired from all canonical callers.
- **#128:** canonical `src/src/lib/ai-extractor.ts` still has the Groq final-review path; role-boundary repair remains required.
- **#129/#132:** duplicate source-tree and legacy ingest/enrichment reachability classification remains unfinished.

### #135 — durable control-memory follow-up

An audit defect was found immediately after #134: the new Gemini/DeepSeek Atlas control decision is currently retained in `phaseSummary`/process-local variables, while the durable discovery case already stores Investigator trajectory/events. That means a crash/resume boundary does not yet expose the same control-decision history to the next oversight pass.

Documented in `docs/issues/135-atlas-control-decisions-durable-memory.md` and opened as GitHub issue **#135**. Required repair: persist each Boss/Right-hand control decision as durable case state without turning it into a deterministic instruction script.

No runtime/CI success claim is made by this continuation. Main remains pre-deployment until the remaining static blockers are repaired and runtime proof is actually observed.
