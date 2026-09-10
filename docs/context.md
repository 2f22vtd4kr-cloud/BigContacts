# Context — living handoff (Apex Atlas / BigContacts)

> **Living handoff — 2026-09-10.** This document is the current product/architecture source of truth for Apex Atlas. Historical implementation batches remain in Git history; do not resurrect obsolete architecture because an old document mentions it.

**Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Branch:** `main`  
**Current GitHub code tip:** `50c6ffa6cee2bdb228b835399cc401675e2d278a`  
**Product:** Apex Atlas research bureau embedded in BigContacts. Bureau is the OSINT/research architecture, not a separate product.

## 1. Institutional identity and mission

Apex is a model-directed OSINT research bureau. Its institutional identity, evidence law, safety boundary, autonomy law, and AI-role separation exist before any operator supplies case-specific input.

The hierarchy is:

```text
institutional constitution
        ↓
role purpose
        ↓
durable case context / memory
        ↓
operator case contribution
        ↓
AI reasoning and decision
        ↓
model-selected research action
```

Operator input supplies case direction and parameters. It does not teach Apex what Apex is, define the evidence law, or define the role boundaries.

### Canonical roles

| Role | Provider | Responsibility |
|---|---|---|
| Boss / Primary Orchestrator | **Gemini** | case direction, Investigator assignment, control decisions, final case gate |
| Right Hand / Oversight Advisor | **DeepSeek / NVIDIA** | advisory and review intelligence; never Investigator |
| Investigator | **Groq** | model-directed free-ReAct research |
| Investigator | **Mistral** | model-directed free-ReAct research / transport-capacity fallback |
| Research capabilities | configured tools/adapters | execute Investigator-selected actions |

Groq/Mistral fallback is infrastructure/capacity behavior only. It must never become a research sequence. DeepSeek is never inserted into the Investigator pool. Gemini is never an Investigator.

## 2. Non-negotiable autonomy law

LLMs own:

- research strategy;
- missing-information judgment;
- query construction;
- tool selection;
- pivots and revisits;
- identity reasoning;
- evidence sufficiency;
- contact-route discovery;
- stopping;
- promotion decisions;
- discovery-versus-target continuation decisions.

Deterministic code owns only safety and infrastructure: authorization, schemas, transport, SSRF protection, budgets, cancellation, persistence, provenance validation, deduplication, telemetry, lifecycle and impossible-state prevention.

Never reintroduce:

- fixed research playbooks;
- forced first tools/hops;
- fixed provider order as research strategy;
- EXA → Tavily → Serper recipes;
- deterministic candidate discovery from arbitrary text;
- automatic promotion from scores, fields, URLs, source counts, extraction or existing cards;
- hidden search/router brains;
- fabricated contacts, people or URLs;
- role leakage between Gemini, DeepSeek and Investigator adapters.

Discovery and target research are capabilities, not mandatory deterministic phases.

## 3. Canonical implementation locations

Primary ReAct loop:
`artifacts/api-server/src/src/lib/agentic-web-research-core.ts`

Canonical SSRF wrapper/entrypoint:
`artifacts/api-server/src/src/lib/agentic-web-research.ts`

Bureau context mount:
`artifacts/api-server/src/src/lib/bureau-agentic-pass.ts`

Discovery:
`artifacts/api-server/src/src/lib/discovery-agent.ts`

Atlas control:
`artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts`
`artifacts/api-server/src/src/lib/atlas-control-decision.ts`
`artifacts/api-server/src/src/lib/canonical-single-target-runner.ts`

Target Investigator:
`artifacts/api-server/src/src/lib/target-contact-agent.ts`

Strict evidence/card boundary:
`artifacts/api-server/src/src/lib/bureau-contact-persist-strict.ts`

Final review:
`artifacts/api-server/src/src/lib/final-target-review.ts`
`artifacts/api-server/src/src/lib/ai-extractor.ts`

Public Atlas launch:
`POST /api/ingest/atlas-run`
→ `routes/atlas.ts`
→ canonical Atlas discovery or canonical single-target runner
→ Gemini Boss + DeepSeek Right Hand
→ selected Groq/Mistral Investigator
→ model-selected tools
→ evidence validation/persistence
→ explicit promotion/final gate.

## 4. First-decision contract

Before the first Investigator action, the runtime must mount:

1. Apex institutional mission;
2. Investigator role purpose;
3. durable case context;
4. operator case objective;
5. currently available capabilities;
6. model reasoning;
7. the model's first action of its own choice.

There must be no deterministic first-tool selection. In particular, `web_search` must not be forced merely because a ReAct loop has started.

**Open blocker #120:** the canonical ReAct core still initializes `lastObservation` with:
`Begin. Choose an initial web_search query — do not wait for instructions.`

The prompt also still contains an empty-observation fallback equivalent to:
`(none — begin with web_search)`.

The required fix is to remove both forced seeds and let the already-oriented Investigator choose any valid capability. Do not replace the forced search with another deterministic first tool. Provider selection for `web_search` remains explicit.

## 5. Durable case memory and AI-owned Atlas control

Every target/discovery investigation uses a durable case file and `contextDocument`. It is memory/state, not a research script.

The Investigator trajectory is persisted into durable context so subsequent Right Hand and Boss review see what actually happened, not just aggregate counters. Target continuation preserves prior context rather than resetting the investigation.

Atlas transition control is now AI-owned. Gemini, after DeepSeek/Right-Hand oversight, can choose:

- `continue_discovery`;
- `research_candidate`;
- `revisit_candidate`;
- `pivot_discovery`;
- `stop`.

Candidate selection is validated against the explicit admitted set. Invalid model decisions fail closed. The execution turn budget is a safety envelope, not a research recipe.

Each Atlas control decision is now durable case memory (`control_decision`) with action, candidate, direction, rationale, confidence, Boss state, Right-Hand state and control turn. Persistence is fail-closed. The control API now also requires a valid positive durable `caseId` and positive `controlTurn`; missing or invalid context throws before any model decision can be accepted. This prevents a context-free control decision from becoming process-only state.

## 6. Evidence and person-admission law

Evidence is not a card. Only an explicit model decision may cross the evidence → card boundary. Deterministic code validates source/provenance/schema and prevents impossible or unsafe mutations; it must not manufacture promotion.

A discovery person candidate requires:

1. explicit person identity emitted by the Investigator;
2. candidate/person scope;
3. an exact observed HTTP(S) source URL;
4. explicit Investigator `promotionDecision="promote"`.

Never inherit person identity from a target name, company name, URL slug, article title, document author, organization record or proxy contact. Organizations and unknown-scope findings remain evidence, not person admissions.

Canonical target and bureau persistence consume `modelFindings`, not the deterministic observation `findings` bag. This preserves the #110 boundary: extraction may help the model observe, but deterministic observations cannot silently become persisted Investigator evidence.

## 7. New forensic finding — #136

The current ReAct core still performs deterministic identity attribution while building its in-memory observation/finding bag. Examples include deterministic page/proxy extraction assigning `personName: targetName` and candidate scope, and footprint tool branches assigning the target name to candidate findings.

This is not currently equivalent to automatic card promotion because canonical persistence is modelFindings-only. Nevertheless, it weakens the stronger autonomy law by injecting target-inherited identity into `FINDINGS SO FAR`, where the model can later use that claim when deciding what to promote.

**Issue #136:** separate raw/tool/page observations from model-authored identity claims. Deterministic extraction may surface facts and observed URLs, but person attribution must be made explicitly by the Investigator. Preserve the existing modelFindings-only persistence boundary.

## 8. Secondary-surface blockers

**#125 — deterministic secondary surface:**
`expandSecondaryPublicSurface()` in `bureau-contact-persist.ts` remains a fixed research playbook and still has callers in canonical/legacy source. Its sequence includes deterministic OSINT/enrichment and contact-surface expansion. Automatic canonical invocation must be retired, or useful capabilities must be exposed as explicit Investigator-selectable tools.

**#126 — secondary-surface SSRF:**
the same legacy lane performs direct outbound fetching of discovered URLs and historically follows redirects outside the canonical pinned-IP SSRF boundary. If retained, it must use the shared SSRF-safe transport with DNS pinning and no automatic redirect following. Prefer retirement of the deterministic lane.

The canonical Investigator web path already uses an AsyncLocalStorage guard around the core and `ssrf-safe-fetch.ts`. The SSRF boundary validates HTTP(S), blocks private/loopback/link-local/metadata destinations, resolves safely and pins the resolved public address, while redirects are manual.

## 9. Final-review role boundary

**#128 — canonical Groq final-review fallback:**
`artifacts/api-server/src/src/lib/ai-extractor.ts` still contains the tertiary Groq final-review loop. The required architecture is Gemini Boss → DeepSeek/NVIDIA Right Hand only for final review, with fail-closed adjudication when oversight is unavailable.

Do not weaken the architecture guard. The correct repair is removal of the entire canonical Groq final-review loop and failure through `adjudicateFinalTargetReview(input, {}, "unavailable-final-review")` when required oversight is unavailable.

The legacy `src/lib/ai-extractor.ts` was already corrected by earlier work; the canonical `src/src/lib` copy is the active blocker.

## 10. Duplicate/legacy reachability

**#129:** `artifacts/api-server/src/lib/*` and `artifacts/api-server/src/src/lib/*` are parallel source trees. Reachability must be classified before deletion. Some legacy/status compatibility surfaces may still be live. Do not delete blindly.

**#132:** canonical `src/src/routes/ingest-enrichment.ts` is already an explicit HTTP 410 retirement router with a regression guard. The parallel legacy `src/routes/ingest-enrichment.ts` still requires reachability classification under #129. Remaining `ingest.ts` maintenance operations must be separated from research launch.

Legacy `atlas-orchestrator.ts` still contains old multi-phase machinery, but the public Atlas route is canonical and guarded against importing the legacy orchestrator. Do not delete it until all compatibility/reachability callers are classified.

Retired legacy MCTS/bulk research routes and the old startup scheduler are not part of the live canonical research control plane. The canonical startup recovery is lifecycle-only.

## 11. Browser/API authorization

The single-port browser deployment now has a browser-safe operator session design:

- `APEX_OPERATOR_PASSWORD` and `APEX_SESSION_SECRET` remain server-side;
- `/api/auth/login`, `/api/auth/session`, `/api/auth/logout` exist;
- successful login creates an 8-hour HttpOnly, SameSite=Strict session cookie;
- browser code does not receive the server bearer token;
- state-changing cookie-authenticated requests require same-origin `Origin` checks.

The frontend has an `OperatorGate` that checks the session and uses credentialed same-origin login. `scripts/check-frontend-api-auth-contract.mjs` is the static contract guard.

Issue #131 still has an open GitHub state even though the source-level repair is now present. Keep it open until the issue is formally reconciled/closed with the appropriate static/runtime evidence; do not claim runtime success merely from the implementation.

## 12. Concurrency and infrastructure safety

Canonical Atlas launch locking uses permanent Redis with a distributed SET-NX claim so concurrent API instances cannot both launch the same active run. Redis unavailability is fail-closed for the canonical launch lock.

Do not add heartbeat storms, recursive log mirroring, GET-after-SET verification loops, per-progress TTL refreshes or other activity that only creates the appearance of work.

Self-mutating CI was retired. Workflows should retain least-privilege read permissions and must not mutate repository code as part of verification.

## 13. Architecture guards

Important guards include:

- `scripts/check-unified-investigator-architecture.mjs`
- `scripts/check-no-force-dig.sh`
- `scripts/check-bureau-free-react.mjs`
- `scripts/check-apex-mission-bootstrap.mjs`
- `scripts/check-atlas-control-durability.mjs`
- `scripts/check-target-agent-context-boundary.mjs`
- `scripts/check-canonical-promotion-boundary.mjs`
- `scripts/check-agentic-ssrf-boundary.mjs`
- `scripts/check-frontend-api-auth-contract.mjs`
- `scripts/check-legacy-apex-mutation-boundary.mjs`
- `scripts/check-retired-research-routes.mjs`

The guards are regression barriers, not proof of runtime behavior. A field named `investigatorLlm` is not proof of propagation; a function named `agentic` is not proof of autonomy; a green static check is not proof of a real investigation.

## 14. Verification truth

GitHub currently shows the latest main tip as:
`50c6ffa6cee2bdb228b835399cc401675e2d278a` (`Fail closed when Atlas control context is omitted`, 2026-09-10).

No runtime/Replit success is claimed.

The repository remains **PRE-DEPLOYMENT / STATIC AUDIT CONTINUING**.

## 15. Open audit queue

1. **#120 — highest priority:** exact source repair of the forced first `web_search` observation in the canonical ReAct core. Remove both forced opening seeds without introducing another deterministic first action.
2. **#128:** remove canonical Groq final-review fallback; retain Gemini + DeepSeek/NVIDIA review roles and fail closed.
3. **#125/#126:** retire deterministic secondary-surface invocation and eliminate its SSRF bypass, or rebuild surviving capabilities as Investigator-selected tools behind the canonical SSRF boundary.
4. **#136:** remove deterministic target-name identity attribution from Investigator observation state while preserving raw observation and modelFindings-only persistence.
5. **#129/#132:** complete duplicate-tree and legacy ingest/enrichment reachability classification/quarantine.
6. **#133:** formally close the institutional mission/bootstrap issue once its acceptance criteria are reconciled with the current source and guards.
7. Re-audit target Investigator cancellation, provider binding, malformed output, prompt-injection handling, source provenance and explicit promotion after the above blockers.
8. Re-audit final-review callers and historical evidence handling.
9. Only after static blockers are exhausted: perform real Replit build/typecheck/database/Redis/API health/provider checks and one bounded discovery-first smoke. Inspect the actual Investigator trajectory and evidence chain before any deployment claim.

## 16. Engineering safety

Never blindly replace large files. Inspect exact source, trace reachability, make the smallest safe patch, inspect the diff immediately, run targeted verification, open a focused PR, verify available checks, and restart the hunt.

Do not use scripts to teach trained models or impose deterministic research sequences. Scripts verify contracts; models choose research.

Do not relabel historical failures as successes. Do not claim runtime proof from static source inspection.

**Final proof contract:**

`repair → verify → merge → restart hunt → boot → bounded real trajectory → forensic review → blind comparison → deploy.`