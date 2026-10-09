# Apex Atlas — Successor Master Handoff

> **HISTORICAL HANDOFF — superseded role law and SHA (2026-10-09).** The body below preserves incident history only where it does not conflict with current source. Its October 1 SHA and Gemini/Mistral role law are stale. Current authority: `docs/context.md`, current executable code on `main`, and the current override at the top of `docs/apex-atlas-handoff/19_MASTER_SUCCESSOR_HANDOFF_CURRENT_2026-10-02.md`. Never restore retired providers from this document. Static CI does not establish live runtime or empirical research acceptance.

## Historical continuation package — 2026-10-01

**Repository:** `2f22vtd4kr-cloud/BigContacts`  
**Canonical branch:** `main`  
**Current main at final reconciliation:** `9f7faaaf1ce23ef8e9c33aaeb1019f305ce5ca3a`  
**Current status:** **NOT GREEN / NOT production-certified**  
**Purpose:** This is the continuation package for a new ChatGPT/coding/research agent. It is intentionally explicit. It tells the successor how to acquire the real knowledge of Apex Atlas from the repository, what the architecture means, what has been implemented, what has actually been tested, what live evidence exists, what remains unknown, and how to proceed without destroying the research architecture.

> **Critical rule:** this document is a map, not the source of truth. The successor MUST verify `main` again before doing anything. If the SHA differs, the repository wins.

---

# 1. FIRST INSTRUCTION TO THE SUCCESSOR

You are continuing **Apex Atlas**, the OSINT research operating system in this repository.

Do not begin by proposing code changes.

Do not begin by trusting this handoff.

Do not begin by trusting prior ChatGPT conversation memory.

Begin by studying the current repository.

Your mandatory first sequence is:

1. Verify GitHub repository `2f22vtd4kr-cloud/BigContacts`.
2. Verify current `main` HEAD.
3. Inspect the worktree/branch state available to you.
4. Read `docs/AGENT_REPOSITORY_STUDY_PROTOCOL.md`.
5. Read `README.md`.
6. Read `docs/context.md`.
7. Read all files under `docs/apex-atlas-handoff/`, especially:
   - `00_INDEX.md`
   - `01_SYSTEM_INTRODUCTION.md`
   - `02_GEMINI_CONTROL_PLANE.md`
   - `03_RUNTIME_AUDIT_HISTORY.md`
   - `04_NEXT_WORK_PLAN.md`
   - `05_SUCCESSOR_PROMPT.md`
   - `06_RESEARCH_ARCHITECTURE_REVIEW_2026-10-01.md`
   - `07_RESEARCH_ARCHITECTURE_VNEXT_COMPLETION_2026-10-01.md`
   - `08_EPISTEMIC_OPTIMIZATION_VNEXT_IMPLEMENTED_2026-10-01.md`
   - `09_MASTER_SUCCESSOR_HANDOFF_2026-10-01.md`
   - this file.
8. Then inventory the entire repository.
9. Trace the actual runtime from process entry to terminal result.
10. Trace the frontend launch/event/evidence path.
11. Trace the database/schema/init path.
12. Trace the Investigator/tool/evidence/promotion path.
13. Inspect all tests and CI workflows relevant to the research/control-plane/runtime claims.
14. Compare documentation with executable source.
15. Only after that formulate fixes.
16. After changes, run the appropriate static/test gates.
17. Only after synchronized runtime infrastructure is available should you perform a real canonical Atlas run.

Apex is specifically designed so that a plausible model-generated explanation can be wrong while sounding excellent. The successor must therefore privilege executable evidence over narrative continuity.

---

# 2. SOURCE-OF-TRUTH ORDER

When two pieces of information conflict, use this hierarchy:

1. **Current repository source at the verified current SHA**
2. **Current durable database/runtime evidence**
3. **Current official provider documentation**
4. **Fresh runtime audit artifacts**
5. **Handoff documents**
6. **Old chat summaries / model memory**

The SHA in this document is a timestamped observation, not a permanent truth.

If `main` moves, update your understanding.

If a handoff says a test is green but current CI is red, current CI wins.

If a handoff says runtime is healthy but the actual service returns 502, runtime wins.

If a model says it found evidence but the evidence was not actually observed and durably recorded, it is not evidence.

---

# 3. WHAT APEX ATLAS IS

Apex Atlas is an **OSINT research operating system / research bureau**.

It is designed around a fundamental separation:

> **Models own research strategy. Deterministic Apex owns safety, evidence admissibility, provenance, identity/scope boundaries, persistence, budgets, authorization, admission, and terminal authority.**

Apex is not:

- a deterministic enrichment script;
- a fixed identity → company → contact recipe;
- a chatbot with search tools bolted on;
- a model-voting system;
- a scripted search funnel;
- a UI animation pretending research occurred;
- a database populated with manually seeded candidates;
- a paid Deep Research wrapper;
- a system where model confidence itself creates evidence.

The system should be capable of genuine research trajectories where the Investigator decides what to search next, what to verify, when to pivot, what hypothesis to test, and when to stop.

The deterministic substrate exists precisely to prevent that freedom from becoming epistemic or security chaos.

---

# 4. CORE ROLE LAW — NEVER BREAK THIS

The canonical architecture is:

```
HUMAN OBJECTIVE
      ↓
GEMINI BOSS
case understanding / control / assignment / continuation
      ↓
RESEARCH EPISODE
bounded trajectory segment
      ↓
GROQ OR MISTRAL INVESTIGATOR
autonomous research strategy
      ↓
validated Apex capabilities
search / visit / registry / browser / OSINT
      ↓
immutable observations + provenance
      ↓
RESEARCH INTELLIGENCE
claims / evidence / hypotheses / contradictions /
negative findings / source lineage / open questions
      ↓
GEMINI EVIDENCE PROBE when justified
      ↓
GEMINI RIGHT-HAND
independent oversight / critique / blind-spot detection
      ↓
GEMINI BOSS
continue / redirect / reframe / stop
      ↓
deterministic terminal gate
```

## Gemini Boss

Boss is the control plane.

Boss may:
- understand the objective;
- select the Investigator;
- review research state;
- decide whether to continue;
- redirect/reframe;
- allocate bounded reasoning effort;
- participate in terminal adjudication.

Boss must NOT become the OSINT Investigator.

## Gemini Right-hand

Right-hand is independent oversight.

Right-hand should challenge:
- unsupported inference;
- identity collisions;
- contradictions;
- missing discriminators;
- premature stopping;
- weak source independence;
- unsafe contact attribution;
- failure to falsify important hypotheses.

Right-hand must not silently become a second autonomous Investigator or invent evidence.

## Groq/Mistral Investigator

The Investigator is the actual researcher.

Active Investigator providers:

```
groq
mistral
```

The Investigator owns:
- trajectory;
- query formulation;
- capability selection;
- source selection;
- pivots;
- verification;
- disproof;
- narrowing/broadening;
- stopping proposals.

The system must not turn Investigator behavior into a rigid search recipe merely because a particular run failed.

## Deterministic Apex substrate

The deterministic layer owns:
- actual capability availability;
- tool execution;
- SSRF/security;
- timeouts;
- cancellation;
- provider/resource budgets;
- observations;
- provenance;
- evidence admission;
- source independence;
- person/identity scope;
- persistence;
- terminal gating;
- auditability.

---

# 5. WHAT HAS ALREADY BEEN IMPLEMENTED

The repository contains several substantial architecture generations. Do not accidentally reimplement them.

## A. Episode-level Gemini supervision

Gemini oversight is no longer required after every ordinary Investigator action.

Normal research can proceed in bounded episodes, with immediate escalation for important events such as:
- contradiction;
- identity changes;
- high-value person-scoped contact evidence;
- failed actions;
- terminal/done proposals;
- stagnation / low information gain.

Relevant files include:
- `research-episode-policy.ts`
- `agentic-web-research.ts`

## B. Gemini Evidence Probe

Implemented as a bounded verification specialist.

It can use Gemini Search grounding and URL Context around narrowly scoped unresolved/high-value claims.

Important:
- it is not the Investigator;
- it is not general-purpose research replacement;
- its prose is not automatically evidence;
- returned URLs/citations are observations/material for deterministic adjudication.

Relevant:
- `gemini-evidence-probe.ts`
- its tests.

## C. Atomic evidence binding

Apex now supports statement-level evidence binding involving:
- claim;
- claim ID;
- source URL/host;
- source class;
- exact observed passage;
- attribution;
- source family;
- offsets where available.

This exists to prevent the classic failure mode:

`model says source X proves claim Y`

when source X was never actually observed or does not actually support Y.

## D. Source lineage / independence

Apex distinguishes source families and publication lineage.

Different hostnames are not automatically independent sources.

Copied press releases, syndicated profiles, scraped directories, and identical passages should not be counted as independent corroboration merely because they appear on separate domains.

## E. Explicit research frontier

The system represents unresolved:
- questions;
- discriminators;
- contradictions;
- identity ambiguity;
- source-family saturation;
- negative findings;
- open research directions.

Research is intended to reduce important uncertainty, not maximize search count.

## F. Hypothesis state and falsification

Competing identity hypotheses can be represented.

The implementation uses an auditable bounded log-odds-style score, not a claimed calibrated Bayesian posterior.

Contradictions reduce support.

A leading hypothesis can expose:
- missing discriminator;
- contradiction pressure;
- unresolved pressure;
- need for falsification;
- candidate discriminator.

Do not replace this with an arbitrary universal probability threshold.

## G. Action economics

Deterministic policy combines signals such as:
- expected information gain;
- identity discrimination;
- evidence quality;
- falsification value;
- success probability;
- source diversity;
- latency;
- token cost;
- provider cost.

Predicted information gain can be compared with realized information gain.

This is an advisory/control signal. It must not override evidence truth.

## H. Empirical action learning

Apex records weak contextual action-yield statistics:
- attempts;
- useful outcomes;
- failures;
- mean information gain;
- bounded success estimates.

This is explicitly **not RL** and should not be described as a trained opaque model.

## I. Cognitive-task routing

Investigator model selection can take into account whether the current task is:
- discovery;
- identity resolution;
- contact extraction;
- contradiction resolution;
- final adjudication.

This remains within the Investigator role and does not replace Groq/Mistral with Gemini.

## J. Adaptive Gemini thinking

Thinking effort is now epistemic-risk driven.

Routine work should remain inexpensive.

Greater effort is justified for:
- identity ambiguity;
- contradiction pressure;
- falsification;
- terminal adjudication.

The current registry and thinking policy in source are authoritative. Do not revive stale tests merely because an older handoff says a model used a different level.

## K. Dependency-aware parallelism

Apex can execute genuinely independent web-search actions concurrently.

This is bounded and deterministic.

Dependent actions remain sequential.

**This does not mean the canonical three-target runtime proof should be parallelized.**

## L. Stateful Gemini specialist episodes

Bounded Gemini Interactions support exists for specialist multi-turn episodes.

Apex durable DB remains authoritative; provider-side interaction state is not the source of truth.

## M. Optional Deep Research

A Deep Research adapter exists, but it is disabled by default.

The free-tier/default architecture must not silently turn on paid/background capabilities.

When explicitly enabled, output remains research material until Apex adjudicates it.

---

# 6. EPISTEMIC vNEXT — CURRENT RESEARCH MODEL

Read:

`docs/apex-atlas-handoff/08_EPISTEMIC_OPTIMIZATION_VNEXT_IMPLEMENTED_2026-10-01.md`

The implemented conceptual loop is:

```
objective
→ unresolved question
→ discriminator
→ candidate actions
→ utility/cost
→ Investigator execution
→ observation
→ exact span + attribution + lineage
→ hypothesis/frontier update
→ verification/adversarial review
→ deterministic terminal gate
```

The important design shift is:

**from search-centric research → question/discriminator-centric research.**

The Investigator should be thinking:

> What important uncertainty remains? What observation would discriminate the live hypotheses? Which action is worth its cost?

Not:

> What is the next search in a predefined pipeline?

---

# 7. EVIDENCE LAW

The evidence graph is the epistemic backbone.

For important claims, preserve as much as possible:

```
SOURCE
 → lineage/origin
 → observed passage/span
 → attribution
 → CLAIM
 → HYPOTHESIS
```

A model-generated statement is not proof.

A search result is a lead.

A URL alone is not proof.

A copied snippet is not automatically proof.

A source can be real and still not support the claim.

A source can support a claim and still refer to the wrong person.

A contact can be real and still belong to an organization rather than the individual.

When debugging evidence behavior, ask:

1. What exact observation exists?
2. Was it actually fetched/observed?
3. What passage supports the claim?
4. What entity/person does the passage identify?
5. What is the source lineage?
6. Is it independent from other supporting sources?
7. Is it temporally relevant?
8. Is there contradictory evidence?
9. What deterministic admission rule promoted it?
10. Can the claim be replayed/audited?

If those answers are missing, preserve uncertainty rather than manufacturing certainty.

---

# 8. IDENTITY LAW

Identity resolution is not “find a plausible name.”

The system should maintain competing hypotheses when ambiguity exists:

```
H1 = candidate A is the target
H2 = candidate B is the target
H3 = same-name collision / unresolved
...
```

Useful discriminators include:
- geography;
- employer;
- company;
- role;
- education;
- chronology;
- relationships;
- unique identifiers;
- contact attribution;
- source lineage.

Do not let fluent model language collapse identity ambiguity.

A deterministic terminal gate should reject premature completion when important identity uncertainty remains.

---

# 9. CONTACT LAW

Contact evidence is especially high-risk.

The system deliberately scopes contact evidence by:
- vector;
- person;
- normalized value.

Do not assume:
- company phone = personal phone;
- domain email pattern = verified person email;
- directory listing = current attribution;
- search snippet = verified contact;
- same phone/email across records = same person.

Preserve attribution states.

Never silently upgrade organization-level contact data to person-level data.

---

# 10. SOURCE INDEPENDENCE LAW

Do not count hostname diversity as evidence independence.

The desired model is:

```
publisher/original source
→ publication/extraction chain
→ source family
→ observed evidence
→ claim
```

If five sites repeat one press release, Apex should understand that as one underlying information lineage unless there is evidence of independent corroboration.

Identical-passage fingerprinting and source-family signals are part of this architecture.

---

# 11. BOUNDED CONTEXT — CRITICAL HISTORICAL FAILURE

One live run demonstrated a serious failure mode:

Investigator-facing context grew to approximately **214,957 characters** and produced HTTP 413 request-size failures.

The correct fix is NOT:
- deleting durable history;
- pretending old evidence does not exist;
- shortening the research trajectory artificially;
- replacing Groq/Mistral with Gemini;
- hard-coding a next search;
- silently truncating important evidence.

The correct architecture is:

```
complete durable research history
            ≠
complete history pasted into every model request
```

Model-facing context is a bounded projection.

Durable history remains authoritative.

The bounded projection should retain:
- objective;
- active hypotheses;
- discriminators;
- contradictions;
- negative findings;
- open questions;
- source-family coverage;
- high-value evidence/provenance;
- recent trajectory;
- mission/role context.

Relevant implementation:
- `investigation-context-compaction.ts`
- `agentic-web-research.ts`
- `agentic-web-research-core.ts`
- related tests.

When debugging this, inspect actual serialized request size, not merely character counts in one intermediate object.

---

# 12. CURRENT GEMINI MODEL CONTRACT

The current source must be inspected before changing model assumptions.

At the last documented control-plane boundary, the stable text registry included:

```
gemini-3.8-flash
gemini-3.7-flash
gemini-3.6-flash
gemini-3.5-flash
gemini-3.5-flash-lite
gemini-3.1-flash-lite
```

The role ordering intentionally differs.

Boss prefers stronger standard Flash models.

Right-hand prefers high-volume Flash-Lite models first.

The provider's live `/models` catalog for each credential/project is authoritative for actual availability.

Cooldown state is credential/project scoped.

A daily quota exhaustion must not be confused with an ordinary transient 429.

Multiple API keys belonging to the same Google project do not magically create independent project quota.

Before changing thinking levels or accepted models:
1. inspect current source;
2. inspect tests;
3. verify current official Gemini docs;
4. inspect live catalog behavior if authorized;
5. preserve role boundaries.

Do not use Gemini Live/TTS/image/specialized models as arbitrary text-control fallbacks.

---

# 13. CURRENT CONTROL-PLANE TEST HARDENING

After the epistemic vNext merge, main received control-plane test hardening.

Recent history:

- `69d12ccaa13a38ba03cadbb33adf9a3d044c06a7` — epistemic optimization merge.
- `9f17d5b9c2a900bd2dcf43595987a76060b2d39f` — aligned Gemini model-pool test contract with current thinking policy.
- `f4fd5feeaa9dd6bba74dd9ca88475cc1a3b7c0e0` — locked adaptive thinking boundaries and reset cooldown state between pool tests.
- `21f2b22447698c7de2f4026f70e33693c901cf26` — PR #450 merge.
- subsequent commits `4fda5593...`, `85cf43fb...`, `766832158...`, `0829ea900...`, `7a2f151...` reconcile the successor documentation/current-main boundary.

The important point:

**The newest commits after PR #450 are documentation/handoff reconciliation, not a new architecture rewrite.**

Therefore a successor must not assume the latest commit changed runtime code simply because the SHA moved.

---

# 14. VERIFIED STATIC/CI STATE

At the relevant parent correction boundary, the following were reported successful:

- Apex API Build 2016;
- Apex Research Quality Contracts 564;
- Apex Prompt Architecture Audit 734;
- Five Consecutive Full Code Audits 1101 — all five passed;
- Five Green Complete Codebase Audit 1241 — all five passed.

These are valuable evidence of static/test integrity.

They are NOT proof of:
- provider availability;
- Replit synchronization;
- live Gemini execution;
- live Groq/Mistral research;
- durable production evidence;
- successful three-target research.

Do not call Apex GREEN from CI alone.

If current CI is queried, use current GitHub evidence rather than repeating these historical results as though they were a current run on `7a2f151...`.

---

# 15. LIVE RUNTIME HISTORY — DO NOT CONFLATE RUNS

There are multiple important live runs.

## Run A — 391bbe22-0414-4ed4-965d-5714181af242

Real canonical UI-equivalent launch.

Contract:

```
targetCount=3
researchDepth=standard
targetTimeoutMs=420000
```

It failed closed during Gemini Right-hand control.

Observed:
- Boss used `gemini-3.6-flash`;
- Right-hand opening used `gemini-3.5-flash-lite`;
- terminal Right-hand path identified `gemini-3.1-flash-lite` as rate-limited;
- 5 Serper searches;
- 38 URL entries returned;
- 0 visits;
- 0 findings;
- 0 candidate entities/cards;
- 0 evidence rows;
- durable case had 12 events;
- Redis trace reported 0 slots despite durable durable activity;
- Groq Investigator attempts encountered approximately 214,957-character context / 413 failures and 429/cooldown behavior.

This is evidence of real runtime failure and observability mismatch.

## Run B — 77c7fb64-8c85-4d23-b1f2-0e048b9e8012

Real canonical launch.

Gemini Boss failed before Investigator.

Nested error:
- Gemini Interactions API;
- `gemini-3.5-flash`;
- `provider_unavailable`;
- HTTP 503.

Important diagnosis:
503 provider-unavailable is not automatically proof of quota exhaustion.

PR #440 hardened:
- actual last attempted Boss model attribution;
- ordered sanitized attempt summary;
- credential/project-specific live model catalog;
- credential/project-scoped cooldown;
- quota-exceeded handling that permits a distinct configured credential/project;
- no same-project fake quota multiplication;
- no Groq/Mistral substitution.

## Run C — c201a722-623d-45f0-b667-e20a4737c3f1

This is the latest exact UI-equivalent launch at the last documented runtime boundary.

Before launch:
- health endpoint 200;
- system status 200;
- active Atlas job false;
- unauthenticated dev session endpoint behaved as expected under the approved non-production auth bypass;
- durable research tables were at zero baseline.

Exact request:

```
POST /api/ingest/atlas-run
{
  "targetCount": 3,
  "researchDepth": "standard",
  "targetTimeoutMs": 420000
}
```

Response:
- HTTP 202;
- job accepted;
- job ID `c201a722-623d-45f0-b667-e20a4737c3f1`.

Then the environment reported:

> “You've reached your daily free quota limit. It will reset at 12:00 AM UTC.”

Polling therefore stopped before the terminal state was observed.

### Correct interpretation

```
launch accepted
→ polling interrupted by free-quota exhaustion
→ terminal outcome UNKNOWN / UNOBSERVED
```

Do NOT say:
- it succeeded;
- it failed;
- it reached Investigator;
- it produced evidence;
- it produced no evidence;
- it completed target 1;
- it completed target 3.

The only verified fact is that the launch was accepted and the terminal state was not observed.

Do not launch another run merely to infer what happened to this one.

A future audit may run a new job only when the normal release protocol authorizes it and the environment is synchronized.

---

# 16. REPLIT / RUNTIME SYNCHRONIZATION

The historical Replit workspace was stale at:

`f697fd1140a1159992221f3e4ff1b8f4fc03fabf`

It had a local TypeScript/esbuild syntax defect in:

`artifacts/api-server/src/src/routes/research/canonical-case-continuation.ts:21`

and returned API 502s.

That stale workspace is not evidence against current GitHub main.

Before a new live audit:

1. synchronize Replit to current `main`;
2. verify exact SHA;
3. ensure no stale local modifications;
4. frozen install;
5. preflight;
6. typecheck;
7. build;
8. bureau contract checks;
9. inspect DB before schema mutation;
10. use only the canonical guarded schema initializer if required:
   `APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh`;
11. disable schema mutation for normal boot;
12. boot canonical API on port 8080;
13. verify `/` and `/api/healthz`;
14. verify `/api/system/status`;
15. verify active Atlas job is false;
16. use the exact canonical UI-equivalent launch;
17. audit durable state;
18. stop at the first genuine terminal failure;
19. never manually continue a failed job;
20. never seed evidence to make the run appear successful.

Do not run standalone provider probes if the audit protocol forbids them.

---

# 17. CANONICAL RUNTIME CONTRACT

The UI-equivalent launch contract is:

```
POST /api/ingest/atlas-run

{
  "targetCount": 3,
  "researchDepth": "standard",
  "targetTimeoutMs": 420000
}
```

The canonical three-target proof is deliberately sequential.

Do not parallelize it merely because the code supports opt-in independent search parallelism.

The proof needs to demonstrate the real control loop:

```
target/case creation
→ Boss
→ Investigator
→ actual tool actions
→ observations
→ evidence/intelligence
→ Right-hand
→ Boss
→ next target/episode
→ persistence
→ terminal
```

The audit must verify actual durable state, not just UI animation.

---

# 18. DATABASE / PERSISTENCE

The durable research substrate is authoritative.

Known important tables include:

- `research_case_events`
- `research_cases`
- `entities`
- `research_sessions`
- `research_run_events`
- `research_evidence`
- `contact_evidence`

Before any schema modification:
1. inspect repository schema/migrations/init;
2. inspect live schema;
3. identify exact mismatch;
4. preserve existing data;
5. use canonical initializer/migration mechanism;
6. verify constraints/types;
7. boot with mutation disabled.

Apex must not turn database initialization into an ordinary boot side effect.

---

# 19. REDIS TRACE VS DURABLE EVENTS

A known observability discrepancy exists.

The Investigator trace route reads Redis telemetry.

Durable case/run activity is persisted elsewhere, including Postgres.

Therefore:

**Redis trace showing zero slots is not proof that no durable research events occurred.**

The correct debugging path is to compare:
- job ID;
- case ID;
- run/session ID;
- Redis trace identifiers;
- durable event rows;
- lifecycle timestamps;
- correlation IDs.

Do not “fix” this by deleting durable events or making Redis authoritative over the DB.

The likely correct architecture is:
- durable DB = authoritative research history;
- Redis = ephemeral/live telemetry;
- trace layer = a projection that must be made internally consistent or explicitly marked incomplete.

---

# 20. ACTIVE PROVIDER/SECRET CONTRACT

Do not print secret values.

The documented active provider/integration names include:

```
REDIS_URL_1
GROQ_API_KEY
GEMINI_API_KEY
MISTRAL_API_KEY
HF_TOKEN
SERPER_API_KEY
TAVILY_API_KEY
SERPAPI_API_KEY
EXA_API_KEY
SCRAPFLY_API_KEY
ZENROWS_API_KEY
COMPANIES_HOUSE_API_KEY
GEMINI_RIGHT_HAND_API_KEY
```

Separate deployment/browser security controls:

```
APEX_API_AUTH_TOKEN
APEX_OPERATOR_PASSWORD
APEX_SESSION_SECRET
```

Do not request or expose credentials.

Do not resurrect retired provider secrets simply because an old document mentions them.

The exact current environment contract must be verified from repository configuration/preflight before runtime.

---

# 21. RESEARCH GAUNTLET

The documented grounded registry is 38 cases under:
- schema `research-gauntlet-v1`;
- version `1.1.1`;
- status `grounded-reviewed`;
- ground truth frozen as of 2026-09-18.

It is a measurement instrument, not a single smartness score.

Measure separately:
- identity precision/recall;
- false identity rate;
- contact attribution precision/recall;
- claim support;
- unsupported-claim rate;
- contradiction detection/resolution;
- source-quality correctness;
- negative finding calibration;
- useful pivots;
- unnecessary calls;
- successful observations;
- trajectory length;
- wall time;
- model/provider cost proxies;
- timeout/cancellation/system failures;
- terminal false-stop/false-continue behavior.

Correct abstention and insufficient evidence are valid outcomes.

Do not publish a global model ranking from this benchmark.

---

# 22. FILES THE SUCCESSOR SHOULD INSPECT DEEPLY

At minimum inspect the actual current versions of:

## Control plane
- `case-bureau.ts`
- `case-bureau-prompt.ts`
- `gemini-boss-fallback.ts` and related Boss modules
- `gemini-model-pool.ts`
- `gemini-thinking-policy.ts`
- `gemini-right-hand-reasoning.ts`
- `adaptive-research-director.ts`

## Investigator
- `agentic-web-research.ts`
- `agentic-web-research-core.ts`
- `target-research.ts`
- `atlas-research-strategy.ts`
- `research-episode-policy.ts`
- `research-cascade.ts`
- `investigation-context-compaction.ts`

## Epistemic layer
- `research-policy.ts`
- `research-intelligence-engine.ts`
- `research-epistemic-vnext.ts`
- `research-terminal-gate.ts`
- `research-hypothesis-policy.ts`
- `research-action-learning.ts`
- `research-cognitive-routing.ts`
- `research-parallel-policy.ts`
- `gemini-evidence-probe.ts`
- `gemini-interaction-session.ts`

## Evidence
- `evidence-ledger.ts`
- `evidence-decision.ts`
- source-lineage/evidence provenance modules
- contact attribution modules
- identity admission/promotion modules

## Capability/security
- web search query/action modules;
- browser/fetch capability;
- registry/domain tools;
- SSRF validation;
- cancellation/timeout logic;
- provider budget controls.

## Runtime
- canonical Atlas launch route;
- job polling/status routes;
- startup entrypoint;
- `scripts/replit-boot.sh`;
- schema initializer;
- auth/session;
- Redis setup.

## Tests
Read tests named by the handoff files, especially:
- Boss fallback;
- Gemini model pool;
- Gemini thinking policy;
- Right-hand reasoning;
- context compaction;
- evidence binding;
- source independence;
- terminal gate;
- action learning;
- cognitive routing;
- parallel policy;
- Evidence Probe;
- runtime contracts.

Do not assume file names from this handoff still exist unchanged. Search current main.

---

# 23. ARCHITECTURAL NON-NEGOTIABLES

Never make a change that violates these merely to get a green test/run:

1. Gemini Boss remains control plane.
2. Gemini Right-hand remains oversight.
3. Groq/Mistral remains Investigator.
4. Investigator retains genuine research autonomy.
5. Search results remain leads.
6. Model assertions remain proposals until deterministic evidence admission.
7. Durable evidence remains authoritative.
8. Source independence matters.
9. Person/contact scope matters.
10. Model `done` is not terminal authority.
11. Deterministic terminal gates remain authoritative.
12. Context must remain bounded.
13. Durable history must not be destroyed to fit model context.
14. Provider failures remain failures.
15. Tool failures remain failures.
16. No fake evidence.
17. No fake progress.
18. No manual candidate seeding.
19. No paid capability silently enabled by default.
20. No provider substitution that changes architectural role.
21. No arbitrary MCP expansion.
22. No universal posterior threshold pretending to be calibrated probability.
23. No indiscriminate parallelism.
24. No benchmark gaming.
25. No weakening a failing assertion without establishing that the assertion is stale/wrong.

---

# 24. HOW TO BUG-HUNT CORRECTLY

When a live or test failure occurs:

### Step 1 — classify the layer

Is it:
- provider;
- request construction;
- model selection;
- thinking policy;
- retry/fallback;
- context serialization;
- capability execution;
- evidence admission;
- identity attribution;
- persistence;
- Redis telemetry;
- lifecycle;
- frontend projection;
- deployment/environment?

### Step 2 — capture actual evidence

Record:
- exact SHA;
- job/case/run IDs;
- actual provider;
- actual model;
- HTTP/status class;
- sanitized error;
- attempt sequence;
- context/request size if relevant;
- durable DB deltas;
- telemetry deltas.

### Step 3 — reproduce deterministically where possible

Prefer:
- unit regression;
- contract test;
- fixture;
- exact recorded response.

Do not repeatedly burn scarce provider quota just to reproduce a known deterministic defect.

### Step 4 — fix the smallest real root cause

Do not:
- weaken the architecture;
- add a scripted route;
- fake success;
- catch every error and call it “insufficient evidence”;
- silently substitute another provider.

### Step 5 — verify adjacent invariants

A fix to model selection can affect:
- thinking policy;
- cooldown state;
- role selection;
- fallback attribution.

A fix to context compaction can affect:
- evidence visibility;
- source diversity;
- identity state;
- terminal decisions.

A fix to Redis tracing can affect:
- UI;
- audit interpretation;
- lifecycle state.

### Step 6 — add regression coverage

Every real bug should have a focused test where practical.

### Step 7 — re-run broad gates

Only after the focused fix is green.

---

# 25. LIKELY NEXT WORK, IN ORDER

The architecture is no longer waiting for generic tool additions. The next work should be empirical and runtime-oriented.

## Priority 1 — Current-main repository reconciliation

Verify `7a2f151...` or newer.

Check whether any production source changed after PR #450.

Do not rely on documentation-only commit messages.

## Priority 2 — Current CI

Run or inspect current workflows.

Separate:
- current-main workflow results;
- historical parent-commit results.

Do not relabel historical green as current green.

## Priority 3 — Runtime synchronization

Get the real runtime environment synchronized to current main.

No new research run until:
- exact SHA matches;
- boot succeeds;
- health succeeds;
- DB is sane;
- required provider configuration is present.

## Priority 4 — Investigator context bounding

Trace actual request construction end-to-end.

Measure:
- prompt characters;
- UTF-8 bytes;
- serialized JSON bytes;
- tool/result payload sizes;
- retained evidence;
- compaction frequency;
- compaction output size.

Test at realistic large trajectories.

Goal:
avoid 413 while preserving epistemic state.

## Priority 5 — Right-hand model/cooldown/quota behavior

Review:
- live model catalog per credential/project;
- role eligibility;
- cooldown scope;
- 429 categories;
- daily quota vs transient rate limit;
- fallback ordering;
- terminal attempt attribution.

Do not treat every 429 as permanent quota exhaustion.

Do not treat every 503 as quota.

Do not assume multiple same-project keys multiply quota.

## Priority 6 — Redis trace consistency

Define the exact contract:
- what Redis represents;
- when slots are written;
- TTL;
- lifecycle;
- correlation IDs;
- what happens on restart/failure.

Then ensure the UI/audit layer does not imply “no research” merely because ephemeral telemetry is missing.

## Priority 7 — One fresh canonical three-target audit

Only after the above.

Exactly one launch.

No manual continuation.

Audit every transition.

The release question is not “did the API return 202?”

The release question is:

> Did real Apex perform the full intended research architecture and persist truthful evidence through terminal completion?

---

# 26. RELEASE / GREEN DEFINITION

Apex is GREEN only when all of the following are evidenced on the current release SHA:

1. current main is verified;
2. frozen install works;
3. typecheck/build/contract/audit gates are green;
4. schema is correct and normal boot does not mutate it;
5. canonical API boots;
6. health/system/auth/Redis readiness is verified;
7. Gemini Boss actually executes;
8. Gemini Right-hand actually executes in its intended role;
9. Groq or Mistral Investigator actually executes;
10. real tools execute;
11. observations are real and durably persisted;
12. evidence admission is truthful;
13. source independence is preserved;
14. identity/contact attribution is correct;
15. contradictions/falsification are represented;
16. context remains bounded;
17. provider failures remain truthful;
18. frontend state matches durable backend state;
19. canonical three-target sequential research completes;
20. terminal state is deterministic and auditable;
21. controlled failure cases remain truthful;
22. Gauntlet evidence demonstrates acceptable research quality;
23. documentation names the exact verified SHA.

Until then:

**NOT GREEN.**

---

# 27. WHAT THE SUCCESSOR MUST NOT DO

Do not:

- reset `main` to an old handoff SHA;
- delete durable evidence to make context fit;
- manually insert candidates/cards;
- hard-code target identities;
- write a fixed search recipe;
- replace Investigator autonomy with deterministic enrichment;
- replace Gemini control roles with Groq/Mistral;
- replace Groq/Mistral Investigator with Gemini;
- use Live/TTS/image models as arbitrary text fallbacks;
- fabricate source URLs;
- fabricate CI;
- fabricate Replit;
- call the unknown `c201a722...` run a failure;
- call it a success;
- launch repeated free-tier runs merely to compensate for poor observability;
- weaken tests solely because a provider is inconvenient;
- claim production GREEN from static tests;
- treat a UI animation as evidence;
- treat search-result snippets as proof;
- treat five syndicated pages as five independent sources;
- turn heuristic hypothesis scores into calibrated probabilities;
- add arbitrary paid dependencies;
- silently enable Deep Research;
- introduce generic MCP tooling without an evidence-based need.

---

# 28. HOW TO USE THE HANDOFF PACKAGE

The handoff package is layered.

### Layer 1 — mandatory study protocol
`docs/AGENT_REPOSITORY_STUDY_PROTOCOL.md`

### Layer 2 — living context
`docs/context.md`

### Layer 3 — architecture/runtime volumes
`docs/apex-atlas-handoff/00_INDEX.md` through `09_MASTER_SUCCESSOR_HANDOFF_2026-10-01.md`

### Layer 4 — this current-main master handoff
`10_SUCCESSOR_MASTER_HANDOFF_CURRENT_MAIN_2026-10-01.md`

The successor should read all layers, then use the source tree as the actual implementation authority.

If this file becomes stale, update the handoff rather than leaving contradictory claims in place.

---

# 29. EXPECTED SESSION REPORT FORMAT

At the end of substantial continuation work, report:

## Verified
Exact facts directly observed.

## Changed
Exact files and commit/PR.

## Tested
Exact commands/workflows and results.

## Runtime
Exact SHA, boot, health, auth, Redis, provider status.

## Research
Only actual live research evidence.

## Blockers
Exact unresolved blocker and layer.

## Next action
One concrete next step.

Never bury an unknown result inside confident prose.

---

# 30. FINAL SUCCESSOR MESSAGE

You are not inheriting a normal CRUD application.

You are inheriting a research system whose central problem is **epistemic control under imperfect tools, imperfect models, bounded budgets, and uncertain identity**.

The most important architectural insight is:

> **The model should be free to research, but never free to redefine what counts as evidence.**

The most important operational insight is:

> **A green test suite is not a green research system.**

The most important debugging insight is:

> **When a live run fails, fix the boundary that failed instead of making the architecture less truthful.**

The most important performance insight is:

> **Optimize information gained per unit of free-tier model/tool budget, not the number of model calls.**

The most important continuity rule is:

> **Read current main before trusting this handoff.**

Current verified boundary after handoff reconciliation:

`main @ 9f7faaaf1ce23ef8e9c33aaeb1019f305ce5ca3a`

The commits immediately preceding this final documentation boundary are handoff/index/context reconciliation commits; they do not represent a new production architecture change.

Current release state:

**NOT GREEN / NOT PRODUCTION CERTIFIED**

Latest exact UI-equivalent launch:

`c201a722-623d-45f0-b667-e20a4737c3f1`

Its terminal outcome:

**UNKNOWN / UNOBSERVED because polling was interrupted by daily free-quota exhaustion.**

Do not change that fact.

Continue from verified repository truth.

## 2026-10-01 successor continuation — post-PR #451

The repository has now advanced beyond the documentation-only `4ff71d211830c9221b5a57150fc23a4f1f4d727e` boundary.

### Current implementation boundary

Merged PR #451 produced:

`3fa9559a3805a4d322228c85d2c6ef0a51aa48ab`

The change is intentionally narrow. `research-terminal-gate.ts` now uses the lineage-aware `IntelligenceContext.independentSourceUnits` value already produced by `ResearchIntelligenceEngine`, rather than recomputing independence from hostnames. This keeps deterministic terminal authority aligned with the evidence graph's source-lineage semantics.

Regression test:

`artifacts/api-server/src/src/test/research-terminal-gate.test.ts`

### Verification

Corrected PR-head verification passed:
- Apex API Build;
- workspace typecheck;
- strict provenance/provider-cache regression tests;
- Research Quality Contracts.

A patch-local TypeScript error was encountered and corrected before merge; do not report the failed intermediate run as the final test state.

### Current release state

**NOT GREEN / NOT production-certified.**

This fix does not prove:
- Replit synchronization;
- live provider execution;
- Gemini Boss/Right-hand runtime success;
- Groq/Mistral Investigator runtime success;
- real tool observations;
- durable live evidence;
- sequential three-target completion.

### Next successor action

Treat `3fa9559a3805a4d322228c85d2c6ef0a51aa48ab` as the latest verified code boundary, then verify the current `main` SHA again before any further implementation or runtime work. Synchronize the real runtime, complete readiness/static gates, and only then run the single authorized canonical three-target audit.

## 2026-10-01 fresh Replit audit boundary

### Current main
`14eff01d17ab3d95340139521405ca8ca9edccf1`

This is newer than the prior `fee96d…` boundary and contains the test reconciliation described below.

### Fresh live run
- Replit audit SHA: `21f2b22447698c7de2f4026f70e33693c901cf26`.
- Job: `96a80589-f510-4703-b79f-cd8264e15715`.
- Launch: canonical UI-equivalent `targetCount=3`, `researchDepth=standard`, `targetTimeoutMs=420000`.
- Terminal boundary: Gemini Boss opening.
- Three same-role Gemini models returned HTTP 503 `service_unavailable`.
- No Right-hand, Investigator, discovery, source visits, evidence admission, entities, or cards.
- Durable counts remained zero.
- Active lane released.
- No retry/continuation/standalone provider probe/manual write.

### Interpretation
The observed run establishes a real provider-unavailable failure for that configured Gemini runtime. It does not establish a global Gemini outage, a bad Interactions request, or a need to replace Gemini Boss.

Current official Gemini documentation lists Gemini 3.8/3.7/3.6/3.5 Flash and Flash-Lite models for the Interactions API and documents `generation_config.thinking_level`; Gemini 3.8 supports `low`, `medium`, and `high`, with `minimal` unsupported.

### Repository correction after the audit
The audit exposed stale focused Gemini tests. They assumed generation happened before catalog resolution and expected `minimal` for a standard Flash request. Those assumptions no longer matched the executable implementation.

The tests were corrected and a transient 503 retry regression was added. The resulting changes are merged in `14eff01d17ab3d95340139521405ca8ca9edccf1`.

GitHub currently reports no completed Actions/status checks for that commit. This is a verification gap, not a test failure.

### UI clarification
The dashboard's `9 LIVE` chip comes from `ApiKeyHealth` and represents active configured provider slots. It is not the Atlas job-state indicator. Atlas job activity is authoritative from `/api/ingest/job/active/atlas-run`.

### Release
**NOT GREEN / NOT production-certified.**

The next successor must not launch another canonical research run until the merged test suite is verified and the provider-side 503 condition is understood sufficiently to justify another scarce live audit.
