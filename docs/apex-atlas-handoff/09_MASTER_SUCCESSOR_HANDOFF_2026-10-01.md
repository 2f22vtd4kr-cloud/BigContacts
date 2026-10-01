# Apex Atlas — Master Successor Handoff
## 2026-10-01 — current-main continuation package

**Repository:** `2f22vtd4kr-cloud/BigContacts`  
**Canonical branch:** `main`  
**Current verified main HEAD at preparation time:** `21f2b22447698c7de2f4026f70e33693c901cf26`  
**Repository status:** architecture and static/test gates are substantially mature; **live runtime/research certification is NOT GREEN**.  
**Purpose:** give a fresh ChatGPT/coding/research agent enough durable context to continue Apex Atlas correctly without trusting prior conversation memory.

---

# 0. READ THIS FIRST

This document is not a substitute for studying the repository. It is a map that tells the successor **what to read, why to read it, what has already been implemented, what evidence exists, what remains unverified, and what must never be assumed**.

The successor must begin by verifying the current `main` SHA. The SHA in this document is a snapshot, not a permanent truth.

## Mandatory reading order

Read, in this order:

1. `docs/AGENT_REPOSITORY_STUDY_PROTOCOL.md`
2. `docs/context.md`
3. `docs/apex-atlas-handoff/00_INDEX.md`
4. `docs/apex-atlas-handoff/01_SYSTEM_INTRODUCTION.md`
5. `docs/apex-atlas-handoff/02_GEMINI_CONTROL_PLANE.md`
6. `docs/apex-atlas-handoff/03_RUNTIME_AUDIT_HISTORY.md`
7. `docs/apex-atlas-handoff/04_NEXT_WORK_PLAN.md`
8. `docs/apex-atlas-handoff/05_SUCCESSOR_PROMPT.md`
9. `docs/apex-atlas-handoff/06_RESEARCH_ARCHITECTURE_REVIEW_2026-10-01.md`
10. `docs/apex-atlas-handoff/07_RESEARCH_ARCHITECTURE_VNEXT_COMPLETION_2026-10-01.md`
11. `docs/apex-atlas-handoff/08_EPISTEMIC_OPTIMIZATION_VNEXT_IMPLEMENTED_2026-10-01.md`
12. **This document**, `09_MASTER_SUCCESSOR_HANDOFF_2026-10-01.md`
13. Then inspect every source/test file named by those documents.
14. Then inventory the repository and trace runtime paths before changing anything.

The repository study protocol is deliberately strict. Do not say “I studied Apex” after reading only the handoff files.

---

# 1. SOURCE-OF-TRUTH HIERARCHY

When facts disagree, use this order:

1. **Current repository source at the verified current SHA**
2. **Current durable runtime/database evidence**
3. **Current official provider documentation**
4. **Fresh audit artifacts/logs**
5. Handoff documents
6. Previous chat summaries

A historical handoff can become stale within minutes when main advances.

If this document says one SHA and Git says another, Git wins. If a document says GREEN and a live run fails, the live run wins for runtime certification.

---

# 2. WHAT APEX ATLAS IS

Apex Atlas is an OSINT research operating system / research bureau.

It is **not**:

- a deterministic enrichment script;
- a fixed identity → company → email pipeline;
- a chatbot that merely calls search tools;
- a model-voting system;
- a UI demo whose animations imply research;
- a database of manually seeded people;
- a paid Deep Research wrapper;
- an excuse to replace deterministic evidence controls with model confidence.

The governing design law is:

> **Models own research strategy. Deterministic Apex owns safety, evidence admissibility, provenance, identity/scope boundaries, persistence, budgets, authorization, admission, and terminal authority.**

Search results are leads. A model assertion is a hypothesis/proposal. Evidence becomes durable only through the deterministic evidence/provenance boundary.

---

# 3. CORE ARCHITECTURE

The canonical conceptual loop is:

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
negative findings / source lineage / questions
      ↓
GEMINI EVIDENCE PROBE when justified
      ↓
GEMINI RIGHT-HAND
independent oversight / critique / blind-spot detection
      ↓
GEMINI BOSS
continue / redirect / reframe / stop
      ↓
next episode or deterministic terminal gate
```

The exact implementation must be read rather than inferred from this diagram.

## Role law

### Gemini Boss

Boss is the control plane.

Boss may:
- understand the mission;
- select the Investigator;
- decide continuation/reframing/stop;
- review high-level research state;
- allocate bounded reasoning effort.

Boss must not become the OSINT Investigator.

### Gemini Right-hand

Right-hand is independent oversight.

Right-hand may:
- identify unsupported inferences;
- identify identity collisions;
- identify contradictions;
- identify missing discriminators;
- identify dangerous premature stopping;
- recommend continue/falsify/verify/reframe.

Right-hand must not silently become a second Investigator or invent evidence.

### Groq/Mistral Investigator

The Investigator is the actual researcher.

The active provider pool is:

```
groq
mistral
```

The Investigator owns:
- research trajectory;
- query formulation;
- source selection;
- capability selection;
- pivots;
- verification;
- disproof;
- narrowing/broadening;
- stopping proposals.

The Investigator is not supposed to receive a deterministic search script.

### Deterministic Apex substrate

The deterministic layer remains authoritative for:
- actual capability availability;
- tool execution;
- SSRF/security;
- timeouts/cancellation;
- provider/resource budgets;
- observations;
- evidence admission;
- identity and person scope;
- source independence;
- provenance;
- persistence;
- terminal gates;
- audit/replay.

---

# 4. CURRENT MAIN: WHAT CHANGED SINCE THE OLD HANDOFF

The previous handoff volumes became stale because main advanced beyond the documented `69d12ccaa13a38ba03cadbb33adf9a3d044c06a7`.

Current verified recent history:

- `69d12ccaa13a38ba03cadbb33adf9a3d044c06a7` — merge of the epistemic optimization vNext implementation.
- `9f17d5b9c2a900bd2dcf43595987a76060b2d39f` — aligned Gemini model-pool contract with current thinking policy.
- `f4fd5feeaa9dd6bba74dd9ca88475cc1a3b7c0e0` — locked adaptive Gemini thinking boundaries and added/reset test coverage.
- `21f2b22447698c7de2f4026f70e33693c901cf26` — merge PR #450, current main at handoff preparation.

The last three commits are primarily **test/contract hardening**. They do not change the fundamental architecture or substitute providers.

PR #450 is titled:

`test(apex): lock current Gemini control-plane reasoning contracts`

Its stated scope:
- align stale Gemini model-pool thinking-level expectations with the current registry;
- reset model cooldown state between pool tests;
- add direct regression coverage for adaptive Gemini thinking by role and epistemic risk;
- no provider substitution;
- no quota bypass;
- no runtime behavior weakening.

The relevant changed files between `69d12cc...` and `21f2b224...` were:
- `artifacts/api-server/src/src/lib/gemini-model-pool.test.ts`
- `artifacts/api-server/src/src/lib/gemini-thinking-policy.test.ts`

---

# 5. CURRENT GEMINI MODEL / THINKING CONTRACT

The current model registry in `gemini-model-pool.ts` is:

```
gemini-3.8-flash       medium   standard
gemini-3.7-flash       medium   standard
gemini-3.6-flash       low      standard
gemini-3.5-flash       low      standard
gemini-3.5-flash-lite  minimal  high_volume
gemini-3.1-flash-lite  minimal  high_volume
```

Role preference order is intentionally different.

Right-hand:
1. 3.5 Flash-Lite
2. 3.1 Flash-Lite
3. 3.6 Flash
4. 3.5 Flash
5. 3.7 Flash
6. 3.8 Flash

Boss:
1. 3.8 Flash
2. 3.7 Flash
3. 3.6 Flash
4. 3.5 Flash
5. 3.5 Flash-Lite
6. 3.1 Flash-Lite

The provider's live `/models` catalog is still authoritative for which configured credential can actually use a model.

The pool maintains cooldown state with an explicit scope. Daily quota exhaustion is treated differently from ordinary rate limiting. The code attempts to calculate the next Pacific-midnight reset and otherwise uses a conservative bounded fallback.

There is a test reset helper for model cooldowns. This matters because earlier pool tests leaked cooldown state between tests.

## Adaptive thinking

The policy is epistemic-risk driven, not a universal fixed level.

High:
- strong contradiction pressure;
- high identity ambiguity;
- falsification required;
- terminal decision.

Medium:
- moderate contradiction pressure;
- moderate identity ambiguity.

Routine:
- Right-hand / low-risk routine work can use minimal for Lite and low for normal Flash.

Default non-routine:
- Lite → low;
- non-Lite → medium.

The important invariant is monotonicity: greater epistemic risk must not silently produce weaker reasoning.

Do not reintroduce old test expectations that assume all routine calls use minimal/low if the current policy intentionally allocates more reasoning.

Before changing accepted model/thinking levels, verify current official Gemini documentation and the live catalog behavior for the configured credential. Do not infer provider entitlement from a model name alone.

---

# 6. EPISTEMIC OPTIMIZATION vNEXT — IMPLEMENTED

The major architecture batch is complete on main.

Read:
`docs/apex-atlas-handoff/08_EPISTEMIC_OPTIMIZATION_VNEXT_IMPLEMENTED_2026-10-01.md`

The implemented loop is:

```
objective
→ unresolved question
→ discriminator
→ candidate actions
→ utility / cost
→ Investigator action
→ observation
→ exact span + attribution + lineage
→ hypothesis/frontier update
→ verification / adversarial review
→ deterministic terminal gate
```

## Phase 1 — Evidence truth

Implemented:
- exact observed source-span binding;
- retained offsets;
- source-lineage units;
- identical-passage fingerprinting;
- observed excerpts in durable evidence;
- canonical act evidence requiring exact excerpt when immutable validation is enabled.

Key principle:
A model note saying “the source says X” is not equivalent to the actual observed source passage.

## Phase 2 — Question-centric frontier

Implemented:
- explicit research questions;
- discriminators;
- question-aware intelligence context;
- provider disagreement grouped by research purpose/hypothesis, not only literal query;
- Investigator guidance linking actions to unresolved discriminators.

The goal is to make research about reducing important uncertainty rather than maximizing search count.

## Phase 3 — Deterministic terminal integrity

Implemented:
- independent research terminal gate;
- minimum evidence;
- independent evidence units;
- exact span bindings;
- unresolved high-severity contradiction checks;
- required falsification.

The model's `done` is a proposal. Deterministic Apex decides whether terminal conditions are actually satisfied.

There is intentionally **no universal calibrated P(H) threshold**.

## Phase 4 — Adaptive reasoning

Implemented:
- capability metadata for medium/high thinking;
- epistemic-risk-based Gemini thinking selection;
- cheap routine reasoning;
- stronger reasoning for ambiguity, contradictions, falsification, and terminal decisions.

## Phase 5 — Question-aware action economics

Action utility incorporates:
- expected information gain;
- identity discrimination;
- evidence quality;
- falsification value;
- success probability;
- source diversity;
- latency;
- token cost;
- provider cost.

Existing research-policy scoring remains part of the decision rather than being discarded.

Predicted information gain is compared with realized information gain.

## Phase 6 — Dependency-aware parallelism

Implemented:
- deterministic dependency batching;
- `parallel_web_search` for independent search actions;
- 2–4 independent searches can execute concurrently;
- dependent research remains sequential.

This is **not** permission to parallelize the canonical three-target runtime proof.

## Phase 7 — Verification episodes

Gemini Evidence Probe can now combine:
- Gemini Google Search grounding;
- URL Context;
- Investigator-selected URLs;
- unresolved claims.

The Probe's prose is not automatically evidence.

Stateful Gemini Interactions support exists for bounded specialist episodes using `previous_interaction_id`.

## Phase 8 — Closed-loop learning

Telemetry records:
- predicted IG;
- realized IG;
- prediction error;
- contextualized action yield.

This is a weak empirical signal, not RL.

Do not introduce an opaque learned policy before enough matched trajectory data exists.

---

# 7. OTHER IMPORTANT ARCHITECTURE ALREADY IMPLEMENTED

The earlier research architecture batch also implemented or preserved:

- episode-level Gemini supervision rather than a Gemini call after every ordinary Investigator action;
- bounded Evidence Probe use at high-value verification points;
- provider disagreement;
- log-odds-style hypothesis scoring;
- explicit falsification planning;
- empirical action-yield statistics;
- cognitive-task model routing within the Investigator pool;
- optional Deep Research adapter, disabled by default;
- opt-in independent Investigator trajectories;
- source-family/source-class independence;
- person-scoped contact evidence keys;
- deterministic research frontier scoring;
- adaptive discovery portfolio allocation with diversity floors;
- structured Investigator action contracts;
- failure observability;
- bounded context compaction;
- SSRF/cancellation/resource controls.

The architecture deliberately did **not** adopt:
- a universal 0.85 posterior terminal threshold;
- universal evidence classes for every case;
- a giant new graph database;
- the unrelated local 25.2B “Apex” model/quantization proposal;
- arbitrary MCP expansion;
- model-vote epistemic consensus;
- Gemini replacing Groq/Mistral as Investigator;
- indiscriminate parallelism.

---

# 8. BOUNDED CONTEXT IS A CRITICAL SAFETY PROPERTY

One historical failure must remain prominent.

The Investigator model-facing context once grew to roughly **214,957 characters** during a live attempt and produced HTTP 413 request-size failures.

The correct response is not:
- deleting durable research history;
- shortening the research itself;
- hard-coding a next search;
- replacing the Investigator;
- silently truncating evidence.

The architecture has a bounded context-compaction layer. Read:

- `investigation-context-compaction.ts`
- `agentic-web-research.ts`
- `agentic-web-research-core.ts`
- relevant compaction tests.

The desired invariant is:

```
complete durable history
        ≠
complete history pasted into every provider prompt
```

Durable history must remain complete. Model-facing context is a bounded projection that preserves high-value epistemic state.

The projection should preserve, at minimum:
- objective;
- hypotheses;
- discriminators;
- contradictions;
- negative findings;
- open questions;
- source-family coverage;
- important evidence/provenance;
- recent trajectory;
- mission/role context.

---

# 9. SOURCE INDEPENDENCE IS NOT HOSTNAME COUNTING

Apex must not count syndicated/copied pages as independent corroboration simply because they live on different domains.

The architecture uses source families/classes and lineage.

The conceptual chain is:

```
SOURCE
 → publisher/original source/source family
 → extraction/publication chain
 → EVIDENCE
 → CLAIM
 → HYPOTHESIS
```

Identical or materially copied passages can collapse into one lineage unit.

When a search provider returns five sites that all reproduce one press release, that is not five independent confirmations.

---

# 10. IDENTITY RESEARCH LAW

Identity ambiguity is first-class state.

Apex should maintain competing hypotheses where necessary:

```
H1 = person A is target
H2 = person B is target
H3 = same-name collision / unresolved
...
```

Evidence should update the hypotheses rather than immediately committing to the first plausible person.

Important discriminators may include:
- geography;
- employer/company;
- role;
- education;
- chronology;
- family/organizational relationships;
- unique public identifiers;
- contact attribution;
- source lineage.

Never let a model's fluent identification become deterministic identity admission without evidence.

---

# 11. CONTACT EVIDENCE LAW

Contact data is particularly dangerous.

The evidence key is scoped by:
- vector;
- person;
- normalized value.

The architecture distinguishes attribution states.

A company-level phone number is not automatically a person's direct phone.

A domain email pattern is not a verified person email.

A search snippet containing a contact is not proof of current attribution.

No contact should be silently promoted from organization scope to person scope.

---

# 12. LIVE RUNTIME HISTORY

There have been several materially different runtime audits. Do not merge them mentally.

## Historical run: 391bbe22-0414-4ed4-965d-5714181af242

This was a real canonical UI-equivalent launch before the later hardening.

Contract:

```
targetCount=3
researchDepth=standard
targetTimeoutMs=420000
```

Terminal time:
`2026-10-01T04:08:00.295Z`

Observed:
- Boss: `gemini-3.6-flash`
- Right-hand opening: `gemini-3.5-flash-lite`
- terminal Right-hand path identified `gemini-3.1-flash-lite` as rate_limited;
- discovery made 5 Serper searches;
- 38 URL entries returned;
- 0 visits;
- 0 findings;
- 0 candidate entities/cards;
- 0 evidence rows;
- durable case 1 had 12 events;
- Redis trace reported 0 slots despite durable case activity;
- Groq Investigator requests also encountered 413 request-size failures around 214,957 characters;
- Groq also encountered 429/cooldown behavior.

This run is evidence of real failure, not evidence of architecture success.

## Historical Boss failure: job 77c7fb64-8c85-4d23-b1f2-0e048b9e8012

A later canonical run reached Gemini Boss and failed before Investigator.

Nested error:
- Gemini Interactions API;
- `gemini-3.5-flash`;
- `provider_unavailable`;
- HTTP 503.

The important diagnostic conclusion was:
- 503 is provider-unavailable;
- it is not automatically proof of quota exhaustion;
- Boss had bounded same-role retry/fallback;
- terminal attribution previously had an observability discrepancy between aggregate model and nested attempted model.

PR #440 addressed the Boss-side defects:
1. actual last attempted model + sanitized ordered attempt summary;
2. per-credential/project live catalog resolution;
3. credential/project-scoped cooldown state;
4. `quota_exceeded` on one project/credential does not block a distinct configured project/credential;
5. multiple keys in the same Google project are **not** treated as extra quota.

No Groq/Mistral substitution is permitted.

## Latest authorized run from the current-main validation boundary: job c201a722-623d-45f0-b667-e20a4737c3f1

This is the most important distinction for the next agent.

The exact UI-equivalent request was accepted:

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
- job `c201a722-623d-45f0-b667-e20a4737c3f1`;
- polling endpoint returned the job.

Baseline was zero across the seven durable research tables.

Runtime readiness before launch:
- `/api/healthz` 200;
- `/api/system/status` 200;
- `/api/ingest/job/active/atlas-run` 200 with active=false;
- `/api/auth/session` 200;
- non-production boot had the approved development auth bypass.

Then the environment reported:

> “You've reached your daily free quota limit. It will reset at 12:00 AM UTC.”

Therefore:

**The terminal outcome of job c201a722-623d-45f0-b667-e20a4737c3f1 is UNKNOWN/UNOBSERVED.**

Do not call it success.  
Do not call it failure.  
Do not infer that it reached Investigator.  
Do not launch another run merely to “see what happened.”  
Do not fabricate a terminal status.

The correct record is:

```
launch accepted
→ polling interrupted by free quota exhaustion
→ terminal outcome unobserved
```

This distinction is essential.

---

# 13. REPLIT / DEPLOYMENT STATUS

A previous Replit workspace was stale at:

`f697fd1140a1159992221f3e4ff1b8f4fc03fabf`

It failed to boot because of a local TypeScript/esbuild syntax defect at:

`artifacts/api-server/src/src/routes/research/canonical-case-continuation.ts:21`

The defect was a literal backslash-n between TypeScript statements.

At that stale revision:
- health returned 502;
- system status returned 502;
- active-job endpoint returned 502;
- no research run was launched.

Do not attribute that stale workspace failure to current main.

The required deployment procedure is:

1. synchronize Replit to current GitHub main;
2. verify exact SHA;
3. preserve secrets;
4. frozen install;
5. preflight;
6. read-only DB/schema inspection;
7. guarded schema initialization only if necessary;
8. boot canonical `scripts/replit-boot.sh`;
9. verify API port 8080;
10. verify health/system/idle state;
11. only then authorize the one canonical runtime run.

---

# 14. DATABASE / SCHEMA DISCIPLINE

The canonical durable substrate includes research state such as:

- `research_case_events`
- `research_cases`
- `entities`
- `research_sessions`
- `research_run_events`
- `research_evidence`
- `contact_evidence`

The repository contains the guarded initializer:

```
APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh
```

Schema mutation must not become ordinary boot behavior.

Before schema work:
1. inspect repository schema;
2. inspect initializer/migration mechanism;
3. inspect live schema;
4. establish exact mismatch;
5. use canonical repository mechanism;
6. preserve existing data;
7. verify constraints/types;
8. boot with mutation disabled.

---

# 15. OBSERVABILITY: REDIS TRACE VS DURABLE EVENTS

A previous audit showed:

- durable case events existed;
- Redis trace endpoint reported zero slots.

The likely boundary is:

```
Redis telemetry
≠
Postgres durable research history
```

The repository has a trace route reading Redis telemetry while durable case history is stored elsewhere.

Do not treat a zero Redis trace as proof that no research occurred if durable events exist.

The next agent must trace:
- trace write path;
- Redis key;
- job/run/case correlation;
- TTL;
- cleanup;
- trace read route;
- UI consumption;
- durable event append;
- replay;
- projection;
- state transitions.

Until source inspection proves otherwise, durable case events should remain the research-history authority.

A useful regression should establish correlation between trace telemetry and durable case events without making Redis a new epistemic source of truth.

---

# 16. CI / STATIC VALIDATION CURRENTLY KNOWN

The final architecture batch had previously verified:

- Apex API Build;
- Apex Research Quality Contracts;
- Apex Prompt Architecture Audit;
- Five Consecutive Full Code Audits;
- Five Green Complete Codebase Audit;
- ordinary audit.

For the latest control-plane contract hardening, the parent commit `f4fd5feeaa9dd6bba74dd9ca88475cc1a3b7c0e0` has successful GitHub Actions runs:

- Five Consecutive Full Code Audits — run 1101 — success
- Apex Prompt Architecture Audit — run 734 — success
- Apex Research Quality Contracts — run 564 — success
- Apex API Build — run 2016 — success
- Five Green Complete Codebase Audit — run 1241 — success

The merge commit `21f2b224...` itself did not expose pull-request-triggered workflow runs through the connector, so do not invent a fresh run number for the merge. The successful parent/PR commit checks are the evidence currently available.

If the successor needs release certification, re-run/verify current-main workflows rather than relying forever on these historical successful runs.

---

# 17. KNOWN TEST / CONTRACT HISTORY

Several tests were intentionally stale after adaptive thinking was introduced.

Corrective work included:
- Boss fallback test expectations updated for adaptive `medium`;
- Boss latency expectations updated;
- Gemini model-pool expectation for `gemini-3.8-flash` aligned with current registry `medium`;
- cooldown state reset between model-pool tests;
- direct adaptive thinking policy tests added.

Do not “fix” such tests by weakening the adaptive policy.

The current source registry and policy are:

- 3.8 Flash → medium baseline
- 3.7 Flash → medium baseline
- 3.6 Flash → low baseline
- 3.5 Flash → low baseline
- 3.5 Flash-Lite → minimal routine
- 3.1 Flash-Lite → minimal routine

The adaptive policy may elevate a model above its baseline when epistemic risk demands it.

---

# 18. IMPORTANT PROVIDER ERROR DISTINCTIONS

Never flatten provider errors into “Gemini unavailable.”

At minimum distinguish:

- HTTP 400 invalid_request;
- HTTP 413 request/entity too large;
- HTTP 429 transient rate limiting;
- HTTP 429 quota exhausted / project-level daily quota;
- HTTP 503 provider unavailable;
- timeout;
- cancellation;
- malformed/invalid model response;
- tool execution failure.

A 400 compatibility retry may be valid only when the repository has demonstrated that a specific optional request field is the incompatibility. The existing Gemini Interactions compatibility repair removes only the incompatible `response_format` field on the bounded same-model retry; it must not silently change role/provider/model.

A 503 should not be reclassified as quota without evidence.

A 429 daily quota should not be “solved” by cycling keys from the same project.

A 413 should not be solved by deleting durable evidence.

---

# 19. GEMINI BOSS HARDENING — PR #440

PR #440 was created because the live Boss failure exposed three concrete issues.

## Defect 1: terminal attribution

The aggregate terminal error could name one model while the nested final error belonged to a later fallback model.

Fix:
- track actual last attempted model;
- retain sanitized ordered attempt summary;
- expose accurate terminal attribution.

## Defect 2: catalog selection

Different Gemini credentials/projects could have different exposed models.

Fix:
- resolve live catalogs independently per credential/project;
- cache per credential;
- do not reuse the first credential's catalog for every credential.

## Defect 3: quota scope

Quota exhaustion is project/credential scoped.

Fix:
- mark exhausted credential/model appropriately;
- allow a separately configured credential/project to be attempted;
- never assume several keys in one project provide several quota pools.

These changes preserve Gemini as the control plane.

---

# 20. RESEARCH-QUALITY ARCHITECTURE REVIEW

The architecture review used current deep-research research as design input, including themes from:
- OpenAI Deep Research;
- BrowseComp;
- Gemini Search grounding;
- Gemini function calling;
- Gemini Interactions;
- Gemini URL Context;
- DualGraph-style knowledge/outline research representations;
- DeepTRACE-style citation decomposition;
- AgentRx/TRACE-style trajectory diagnostics and credit assignment.

The architectural lesson adopted by Apex is not “copy another agent.”

It is:

- research needs strategic browsing;
- source/citation structure matters;
- long-horizon trajectories need observability;
- uncertainty should guide actions;
- verification should be selective;
- deterministic evidence state should outlive prompts;
- learning should first be empirical and auditable.

Re-check official documentation and current papers when making new provider/architecture changes.

---

# 21. RESEARCH GAUNTLET

The grounded Research Gauntlet is a measurement instrument, not a single intelligence score.

Historical registry:
- 38 grounded cases;
- schema `research-gauntlet-v1`;
- version 1.1.1;
- ground truth frozen as of 2026-09-18.

Measure separately:
- identity precision/recall;
- contact attribution precision/recall;
- claim support;
- unsupported-claim rate;
- false identity rate;
- contradiction handling;
- source-quality correctness;
- negative-finding calibration;
- useful pivots;
- unnecessary calls;
- successful observations;
- trajectory length;
- latency;
- measurable model cost;
- timeout/cancellation/system failures.

Unknown / insufficient evidence is a valid outcome.

Do not collapse this into a “smartness” ranking.

---

# 22. WHAT THE NEXT ENGINEER SHOULD DO

The current phase is **empirical runtime validation and targeted hardening**, not another broad architecture rewrite.

## Priority 1 — verify current source

Before modifying anything:
- verify current main SHA;
- inspect current `git status`;
- inventory tree;
- read required docs;
- inspect latest commits/diffs;
- inspect relevant tests;
- run targeted source tracing.

## Priority 2 — inspect current Gemini control plane

Read:
- `gemini-model-pool.ts`
- `gemini-thinking-policy.ts`
- Boss implementation in the current case-bureau/control-plane source
- `gemini-right-hand-reasoning.ts`
- provider error diagnostics
- retry logic
- model catalog discovery
- related tests and boundary scripts.

Verify:
- candidate ordering;
- catalog filtering;
- cooldown scope;
- 429 classification;
- 503 classification;
- same-model compatibility retry;
- credential/project separation;
- terminal attempt attribution;
- role preservation.

## Priority 3 — inspect Investigator context

Trace:

```
durable observations
→ trajectory records
→ working context
→ compaction
→ provider payload
→ model response
```

Prove:
- bounded request size;
- no durable-history loss;
- no duplicate explosion;
- no prompt injection contamination;
- important evidence remains represented;
- old 214k request-size failure cannot recur under equivalent history.

## Priority 4 — trace observability

Reconcile Redis telemetry with durable Postgres events.

Do not make the UI report “research happened” solely from ephemeral telemetry.

## Priority 5 — static verification

At current main:
- frozen install;
- typecheck;
- build;
- `check:bureau`;
- relevant Gemini tests;
- model-pool tests;
- thinking-policy tests;
- Investigator/context tests;
- evidence/terminal-gate tests;
- architecture boundary scripts;
- full CI where available.

## Priority 6 — official provider research

Before changing provider behavior, check current official Google documentation for:
- models;
- rate limits;
- API errors;
- troubleshooting;
- thinking;
- API keys;
- Interactions API;
- Search grounding;
- URL Context.

Record verification date.

## Priority 7 — runtime

Only after source/tests are clean:

1. synchronize Replit to current main;
2. verify exact SHA;
3. verify secrets by presence only;
4. inspect schema;
5. initialize schema only if required and only through guarded mechanism;
6. boot canonical API;
7. health 200;
8. system status 200;
9. active-job false;
10. establish durable baseline;
11. perform exactly one UI-equivalent launch;
12. `targetCount=3`;
13. `researchDepth=standard`;
14. `targetTimeoutMs=420000`;
15. audit every real Boss/Right-hand/Investigator/tool/provider transition;
16. prove sequential target progression;
17. inspect durable evidence/entity/card deltas;
18. stop at the first genuine terminal failure;
19. preserve all evidence.

Do not launch a second run to “confirm” a failure unless the operator explicitly authorizes a new controlled experiment.

---

# 23. CANONICAL RUNTIME REQUEST

The UI-equivalent contract is:

```http
POST /api/ingest/atlas-run
```

Body:

```json
{
  "targetCount": 3,
  "researchDepth": "standard",
  "targetTimeoutMs": 420000
}
```

This request is important because runtime audits must prove the real product path rather than a special test-only endpoint.

---

# 24. RELEASE / GREEN DEFINITION

Apex is **not GREEN** merely because:
- TypeScript compiles;
- unit tests pass;
- architecture looks strong;
- a PR is merged;
- the UI boots;
- a search endpoint works;
- a model returns JSON;
- a job is accepted with HTTP 202.

A genuine GREEN/release certification requires current-main evidence that:

1. repository source is verified;
2. fresh install/build/typecheck/contracts pass;
3. schema is correct;
4. canonical API boots;
5. health/system/active-job checks pass;
6. Gemini Boss actually executes;
7. Gemini Right-hand actually executes;
8. Groq/Mistral Investigator actually executes;
9. real search/visit capabilities execute;
10. observations persist;
11. exact evidence/source spans persist;
12. source independence is preserved;
13. identity/contact attribution is correct;
14. contradictions/falsification behave truthfully;
15. entities/cards are admitted from real evidence;
16. three targets execute sequentially in the canonical proof;
17. terminal gate is satisfied;
18. no hidden failure is being masked;
19. runtime artifacts correspond to the exact released SHA.

Until then use language such as:
- “architecture verified”;
- “static gates green”;
- “live launch accepted, terminal outcome unobserved”;
- “runtime gate pending”.

Do not say “production ready” or “GREEN”.

---

# 25. THINGS THE SUCCESSOR MUST NEVER DO

Never:
- fabricate evidence;
- seed entities/cards to demonstrate UI;
- manufacture provider responses;
- create fake research events;
- force a model to say done;
- weaken deterministic evidence gates;
- bypass identity attribution;
- count syndicated sources as independent;
- replace Gemini Boss with Groq/Mistral;
- replace Gemini Right-hand with Groq/Mistral;
- use Live/TTS/image Gemini models as text-control substitutes;
- turn the Investigator into a scripted search route;
- delete durable research history just to fit a prompt;
- treat model confidence as evidence;
- treat search snippets as proof;
- parallelize dependent research merely for speed;
- parallelize the canonical three-target runtime proof;
- use arbitrary MCP tools;
- add a paid dependency to the free-tier baseline without explicit design justification;
- call a partial run GREEN;
- claim a live run occurred if it did not;
- claim an unknown terminal state is success or failure.

---

# 26. FREE-TIER / COST PHILOSOPHY

The system is designed to maximize research quality using:
- architecture;
- deterministic policy;
- information gain;
- selective verification;
- bounded reasoning;
- source independence;
- good orchestration;
- free/available provider capacity.

Do not solve a weak architecture by simply increasing paid model calls.

Deep Research escalation exists but is:
- optional;
- disabled by default;
- not required for the baseline;
- still subordinate to Apex evidence adjudication.

---

# 27. THE “SEPARATE APEX MODEL” CONFUSION

A prior external analysis discussed a local ~25B MoE “Apex” model and Q4_K_M/llama.cpp-style deployment.

That was **not the same thing as Apex Atlas**.

Do not import those recommendations into Atlas unless the user explicitly asks to investigate a separate model.

Apex Atlas is the Bureau/research operating system.

The deterministic substrate + Gemini control plane + Groq/Mistral Investigator architecture remains the relevant Atlas architecture.

---

# 28. WHY THE ARCHITECTURE IS INTENTIONALLY MODEL-AGNOSTIC IN THE RIGHT PLACES

The model may decide:
- which question to pursue;
- which discriminator matters;
- which capability to use;
- whether a source is promising;
- whether to pivot.

Deterministic code decides:
- whether that capability is allowed;
- what actually ran;
- what was actually observed;
- what source/provenance exists;
- whether identity/contact scope is valid;
- whether evidence can be promoted;
- whether terminal requirements are met.

This separation prevents a powerful model from becoming an authority over facts merely because it is articulate.

---

# 29. RESEARCH MEASUREMENT ROADMAP

The next useful measurements are not “number of searches.”

Measure:

### Evidence efficiency
- useful evidence / search;
- useful evidence / visit;
- useful evidence / provider call.

### Epistemic progress
- information gain/action;
- identity discrimination/action;
- contradiction resolution/action;
- falsification completion;
- unresolved frontier reduction.

### Source quality
- source-family diversity;
- independent evidence units;
- copied/syndicated suppression;
- citation support.

### Oversight value
- marginal value of Right-hand episode checkpoints;
- marginal value of Evidence Probe;
- false-stop prevented;
- contradiction detected;
- unnecessary checkpoint cost.

### Model economics
- action yield by cognitive task;
- model/provider;
- latency;
- token/cost proxy;
- predicted vs realized IG error.

Only after enough data exists should Apex consider stronger cross-run policy learning.

---

# 30. FINAL SUCCESSOR INSTRUCTIONS

When you open a new chat with this repository:

1. Do not trust the previous chat.
2. Verify current `main`.
3. Read the repository study protocol.
4. Read the handoff volumes.
5. Inventory the actual repository.
6. Trace the actual runtime.
7. Compare docs against source.
8. Inspect tests and CI.
9. Identify exactly what is verified and what is not.
10. Fix root causes only.
11. Add regression tests for every concrete bug.
12. Re-run static gates.
13. Use official provider documentation for provider changes.
14. Use one controlled live run only after static/source gates.
15. Preserve failures as evidence.
16. Never convert “unknown” into “success” or “failure.”
17. Never call Apex GREEN without live proof.

The single most important mental model is:

> **Apex is a research operating system with LLMs embedded inside it, not an LLM with OSINT tools attached.**

The models navigate the epistemic search space. Apex owns the truth boundary.

---

# 31. CURRENT SNAPSHOT

At handoff preparation time:

```
Repository: 2f22vtd4kr-cloud/BigContacts
Branch: main
HEAD: 21f2b22447698c7de2f4026f70e33693c901cf26

Architecture vNext:
  implemented: YES
  merged: YES

Static/CI evidence:
  latest relevant parent commit gates: GREEN
  current merge commit workflow result: not independently asserted

Live runtime:
  canonical path exists: YES
  latest launch accepted: YES
  latest job: c201a722-623d-45f0-b667-e20a4737c3f1
  targetCount: 3
  depth: standard
  timeout: 420000ms
  terminal outcome: UNKNOWN / UNOBSERVED
  reason: free daily quota exhaustion interrupted polling

Production certification:
  GREEN: NO

Next correct phase:
  source verification → focused tests → synchronized runtime → one controlled three-target audit
```

This snapshot is intentionally conservative.

---

# 32. HANDOFF MAINTENANCE RULE

Whenever a successor changes Apex materially, update the handoff package with:

- current main SHA;
- exact changed files;
- exact tests and CI results;
- exact live run/job IDs;
- observed provider/model transitions;
- durable row/event deltas;
- unresolved defects;
- next action;
- whether runtime certification changed.

Do not append contradictory states without marking historical/current boundaries.

If a later run supersedes an older one, preserve the old run as historical evidence and explicitly identify the newer run as the current runtime result.



# 33. DOCUMENTATION-ONLY HEAD MOVEMENT AFTER SOURCE BASELINE

The production/source baseline described above is `21f2b22447698c7de2f4026f70e33693c901cf26`. After that merge, the following documentation-only commits reconciled the handoff package with the current runtime boundary:

- `85cf43fb35a2e5a1adb22145099c0734d4779fde` — created this master handoff;
- `4fda5593bf46e74d05001b18fc243aa6f2e203c1` — reconciled `docs/context.md`;
- `7668321587d9bfe57d999117714cc648da20ae1c` — reconciled the handoff index;
- `0829ea90087c71a39cd3cd85ced28e74a1f99afc` — reconciled the successor prompt.

These commits changed documentation only. When evaluating production behavior, treat `21f2b22447698c7de2f4026f70e33693c901cf26` as the latest verified application-code baseline unless a later source commit is found. The actual current main HEAD must still be checked at the start of the next session.
