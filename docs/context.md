# Context — living handoff (Apex Atlas / BigContacts)

> **Living handoff — 2026-09-09.** This document is the product/architecture source of truth for Apex Atlas. Historical implementation batches remain in Git history; do not resurrect obsolete architecture because an old document mentions it.

**Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Branch:** `main`  
**Verified GitHub tip:** `0bc1bb1f6851ddb59453df7b2745af28bc215091`  
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

The Investigator model owns:
- what information is missing;
- query construction;
- whether to search;
- which permitted research capability to invoke;
- whether to fetch a page;
- whether to pivot;
- whether evidence is sufficient;
- when to stop;
- remaining uncertainty;
- explicit evidence/promotion judgment.

Deterministic code owns:
- authorization;
- schema validation;
- tool safety;
- timeout and budgets;
- persistence;
- provenance;
- lifecycle/cancellation;
- evidence validation;
- promotion integrity.

## 3. Canonical implementation locations

Primary ReAct loop:
`artifacts/api-server/src/src/lib/agentic-web-research.ts`

Bureau wrapper/context mount:
`artifacts/api-server/src/src/lib/bureau-agentic-pass.ts`

Discovery:
`artifacts/api-server/src/src/lib/discovery-agent.ts`

Case Bureau:
`artifacts/api-server/src/src/lib/case-bureau.ts`

Canonical case discovery/continuation:
- `artifacts/api-server/src/src/routes/research/canonical-case-discovery.ts`
- `artifacts/api-server/src/src/routes/research/canonical-case-continuation.ts`

Canonical Atlas:
- `artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts`
- `artifacts/api-server/src/src/lib/canonical-single-target-runner.ts`
- `artifacts/api-server/src/routes/atlas.ts`

Target Investigator:
`artifacts/api-server/src/src/lib/target-contact-agent.ts`

Strict evidence/card boundary:
`artifacts/api-server/src/src/lib/bureau-contact-persist-strict.ts`

Final review:
`artifacts/api-server/src/src/lib/final-target-review.ts`
`artifacts/api-server/src/lib/ai-extractor.ts`

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

Gemini and DeepSeek receive the evolving context before their oversight decisions. The Investigator receives it as mounted context before acting. The context records the target, phase, operating law, latest Right-hand state, latest Boss state, Investigator result, trajectory/finding summaries, uncertainties and investigation timeline.

The Investigator must never silently continue context-free when a case scope is supplied. `bureau-agentic-pass.ts` now fails closed when the case ID is invalid, the case file is missing/unreadable, or the durable `contextDocument` is missing/empty.

The context document is a memory/state surface for orchestration, not a deterministic script. It must never be used to prescribe a search sequence or teach a trained model how to research.

## 7. Recent architectural work already merged

The repository has undergone extensive iterative construction/hardening. Important completed work includes:

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

Current `main` is `0bc1bb1f6851ddb59453df7b2745af28bc215091`.

### PR #102 — canonical discovery admission scope
Merged before the context work. Strengthened the canonical discovery boundary so person-scoped identity is explicit.

### PR #103 — per-investigation context
Merged as `8314a48050807494d62ec96fd514da21d4b26668`. Made per-target/per-case investigation context a first-class Bureau artifact and exposed Investigator trajectory/state to shared context.

### PR #104 — case continuation
Merged as `d6cf7d4cb8c307a390687a736bae2928a0ad2d72`. Intercepted the reachable `/research/bureau/cases/:caseId/run-next-pass` path with a canonical Gemini/DeepSeek/selected-Investigator continuation. The old fixed-lane handler remains only for controlled retirement.

### PR #105 — exact Atlas discovery admission
Merged as `61bf0ecc1e7e6466b24a31b96988508e93c2cb8e`.

Bug found: the live canonical Atlas discovery path accepted any Investigator `promotionDecision="promote"` + `personName` as a target admission. It did not require candidate/person scope or an observed HTTP(S) source, and an exact-name lookup could bind a person admission to an organization entity.

Fix:
- require `scope === "candidate"`;
- require an observed HTTP(S) source;
- only reuse HNWI/Gatekeeper entities for person admissions;
- only target-research person-shaped entities;
- preserve review-only persistence as separate from contact promotion.

### PR #106 — required context mount
Merged as `0bc1bb1f6851ddb59453df7b2745af28bc215091`.

Bug found: `runBureauAgenticWebPass` silently continued without case context if the case lookup failed or `contextDocument` was absent.

Fix:
- invalid case ID fails closed;
- missing case file fails closed;
- malformed case file fails closed;
- missing/empty durable context fails closed;
- case-scoped Investigator research can no longer silently lose the shared Boss/Right-hand investigation state.

## 9. Actual public Atlas launch path

The live route is now:

`POST /api/ingest/atlas-run`
→ `routes/atlas.ts`
→ `canonical-atlas-discovery.ts` or `canonical-single-target-runner.ts`
→ Gemini Boss + DeepSeek Right-hand
→ selected Groq/Mistral Investigator
→ model-selected research capabilities
→ evidence validation/persistence
→ explicit promotion boundary.

`routes/atlas.ts` no longer imports the retired legacy Atlas orchestrator.

For an explicit single target, the canonical single-target runner creates/loads a target research case, creates the context document before model oversight, gives the same context to DeepSeek and Gemini, mounts it for the Investigator, then refreshes the durable context for post-investigation Right-hand review.

## 10. Current remaining audit work

The audit is not finished. Continue leaf-by-leaf; do not declare the repository clean merely because the architecture guard passes.

Immediate next leaves:

1. **Context progression/live tracking.** Verify whether the durable context is refreshed during Investigator activity, not only before/after the ReAct pass. Gemini and DeepSeek must be able to track the investigation state/progression, while the context remains state rather than a scripted research plan.
2. **Target Contact Agent.** Audit identity boundary, provider binding, tool autonomy, source provenance, contact fabrication, inherited target identity, cancellation and explicit promotion.
3. **Agentic Web Research.** Audit the complete ReAct loop: action selection, observation, retries, provider transport fallback, malformed output, prompt-injection handling, stopping, evidence creation, telemetry and explicit promotion.
4. **Final review.** Confirm Gemini/NVIDIA only in decision/review roles; no Groq/Mistral reviewer fallback; fail-closed ambiguity; historical evidence never silently promoted.
5. **Persistence callers.** Trace every caller of strict and legacy persistence, including rehydration and old projectors.
6. **Legacy target research / MCTS / bulk.** Trace reachability before retirement; tests and documentation must not depend on live access.
7. **`agent-orchestrator.ts`.** Trace `/search/intelligent`; determine whether it is a separate search surface or violates the unified Investigator law. Do not delete without reachability proof.
8. **CI/security.** Audit every workflow for write permissions, self-modification, untrusted checkout, secret exposure and dangerous triggers.
9. **Telemetry/frontend/mobile.** Confirm live UI represents actual activity only and historical events cannot masquerade as active research.
10. **Replit runtime gate.** Only after static blockers are exhausted: real import/build/typecheck/database/Redis/API health/provider availability, then one bounded live discovery smoke and forensic trajectory review.

## 11. Replit / runtime proof contract

Static repository correctness is not runtime proof. No Replit runtime claim may be made without an actual successful runtime observation.

Canonical provider secret names are:

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

The latest work closed two concrete runtime correctness gaps:
- canonical Atlas admission could over-admit person identities;
- case-scoped Investigator passes could silently lose their durable context.

The next objective is not another architecture rewrite. Continue the forensic leaf hunt, with particular attention to live context progression and the actual target Investigator path.

The final proof remains:

**repair → verify → merge → restart hunt → boot → bounded real trajectory → forensic review → blind comparison → deploy.**
