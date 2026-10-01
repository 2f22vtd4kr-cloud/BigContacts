# Apex Atlas / BigContacts — Living Context

> **Updated:** 2026-09-20. This is the living engineering, architecture, deployment, and research-quality handoff for the current reviewed Apex Atlas state.

**Repository:** `2f22vtd4kr-cloud/BigContacts`  
**Canonical working/integration branch:** `main`  
**Historical five-green branch:** `audit/genuine-five-green-final`  
**Historical Very Strong review branch:** `audit/apex-atlas-very-strong-v1`  
**Review status:** `main` contains the newer Very Strong implementation/documentation line. Neither branch history nor static gates alone constitutes production certification.

## 1. Executive state

Apex Atlas is an AI-powered public-web research bureau, not a deterministic enrichment workflow.

The current branch strengthens the canonical bureau with:

- Gemini Boss + independent Gemini Right-hand oversight;
- a Groq/Mistral Investigator pool where the selected Investigator owns the research trajectory;
- capability-semantic action selection and information-gain assessment;
- durable evidence-graph cognition exposed through bounded working context;
- adaptive discovery portfolio allocation with diversity floors;
- opt-in independent Investigator trajectories with deterministic evidence merging;
- provider-native structured model-output contracts for Investigator decisions;
- source-family / source-class intelligence and failure diagnostics;
- bounded request-size recovery without changing the Investigator role/provider;
- focused regression tests and a dedicated CI verification workflow.

The key rule remains:

> **The model owns research strategy; deterministic code owns safety, evidence integrity, authorization, persistence, and resource budgets.**

A green architecture check does not mean the research quality is proven. Release requires a real, controlled research campaign plus a clean production boot.

## 2. Canonical architecture

```
CASE / OBJECTIVE
        ↓
Gemini Boss + Gemini Right-hand
        ↓
select Investigator LLM + research objective
        ↓
Groq OR Mistral Investigator
        ↓
model chooses WHAT / WHERE / HOW
        ↓
validated non-LLM capability
        ↓
immutable observation + provenance
        ↓
evidence graph: claims / hypotheses / contradictions / contacts / negatives
        ↓
bounded cognitive context
        ↺ Right-hand review ↺ Boss oversight ↺ next Investigator act
        ↓
explicit finding / abstention / promotion / stop
```

There is no hidden identity → organization → contact recipe. Search, browser/fetch, registry, domain, footprint, and other approved executors are capabilities. The Investigator may choose, revisit, pivot, disprove, narrow, broaden, or stop.

## 3. AI role law

### Gemini Boss

Gemini Boss owns case direction, assignment, Investigator selection, continuation disposition, and high-level review. It does not browse and does not become the Investigator.

### Gemini Right-hand

Gemini Right-hand is a separate Gemini oversight invocation. It critiques the latest act, evidence gaps, contradictions, and research objective. It does not browse, choose the Investigator's tools, or invent evidence.

### Investigator

The active Investigator pool is exactly:

```
groq
mistral
```

The selected Investigator is the researcher. It receives durable case/run context and owns query formulation, tool choice, pivots, verification, disproof, and stopping.

DeepSeek/NVIDIA is not an active Investigator or Right-hand path.

## 4. Tool and safety boundary

Tools are capabilities, not phases.

Current hard controls include:

- bounded Investigator iteration budget (`MAX_ITER=64`);
- bounded observation size and trajectory records;
- bounded model-facing context with durable history outside the prompt;
- outbound timeouts and response-size limits;
- SSRF-safe transport and cancellation propagation;
- actual-capability validation for model-selected actions;
- provenance requirements for promoted evidence;
- explicit contact scope and attribution states;
- duplicate-source/source-family awareness;
- tool failures remain failures;
- Python-backed network OSINT remains fail-closed until enforceable sandbox egress exists.

The application must never convert a missing tool, failed fetch, provider error, or model assertion into successful evidence.

## 5. Durable evidence state

The dossier/card is a projection, not the source of truth.

Durable research state preserves:

- case and objective;
- selected Investigator model;
- every selected action and actual execution/provider;
- execution status and failures;
- observations and source URLs;
- retrieval timestamps and provenance;
- claims and uncertainty;
- competing identity hypotheses and discriminators;
- contradictions and their resolution state;
- contacts and contact scope/state;
- negative findings, dead ends, and open questions;
- oversight decisions;
- trajectory and replay/correlation identifiers.

Evidence promotion follows:

```
raw observation
  → model-authored claim / hypothesis
  → attribution / promotion proposal
  → deterministic identity + provenance + scope validation
  → durable evidence graph + event
  → projection
```

An LLM statement, search snippet, copied directory entry, or guessed email pattern is not proof.

## 6. Current cognition layer

The Very Strong batch now treats the evidence graph as cognitive state rather than only an output ledger.

The Investigator working context exposes bounded:

- current objective and findings;
- identity hypotheses and discriminators;
- contradictions;
- contacts and attribution state;
- negative findings;
- open questions;
- recent actions;
- source-family coverage;
- source-quality summaries;
- mission/role context.

When context is compacted, durable evidence remains outside the prompt. The compactor reduces presentation; it does not rewrite research history.

## 7. Adaptive discovery

Discovery now has two cooperating controls:

1. deterministic safety/diversity constraints;
2. feedback-driven portfolio allocation.

The allocator can learn from prior lane yield, useful evidence, reachability, duplicate rate, geography, occupation, wealth mechanism, and source kind while retaining diversity floors.

It must not become a hidden fixed route or a fame/wealth leaderboard. The objective is useful research coverage, not celebrity discovery.

## 8. Independent trajectories

Apex can run multiple materially independent Investigator lanes in parallel when the caller opts into the ensemble path.

The lanes are designed to vary source families and research angles. Results are merged deterministically by normalized finding/vector identity and observed URL coverage. Independent runs remain individually inspectable.

Parallelism is a research capability, not a requirement for every case.

## 9. Structured model decisions

Investigator action decisions use provider-aware structured-output contracts where supported.

- Groq uses structured JSON/schema output on supported models, with reasoning kept out of the action payload.
- Mistral uses strict JSON-schema response formatting.
- Semantic validation still runs after schema validation.
- The system must never treat brace extraction as the primary correctness boundary.

Provider behavior can change; runtime validation remains authoritative.

## 10. Source independence and failure observability

Apex distinguishes source families/classes instead of counting copied or syndicated pages as independent corroboration.

The failure observatory records diagnostic signals such as:

- identity collision or overcommitment;
- insufficient evidence;
- misleading search result;
- stale source;
- copied contact;
- wrong entity;
- contact misattribution;
- contradiction misclassification;
- missed or unnecessary pivot;
- tool-selection error;
- premature/late stopping;
- prompt injection exposure;
- source-quality error;
- system failure.

These diagnostics are not allowed to silently mutate the research result.

## 11. Canonical control loop

```
Gemini opening oversight
  → Investigator selection
  → Investigator-selected act
  → actual capability execution
  → immutable observation
  → evidence/state update
  → Gemini Right-hand review
  → Gemini Boss disposition
  → next Investigator act
```

Every act must be inspectable: model, action, actual provider/tool, status, observation, provenance, findings, uncertainty, open questions, and oversight result.

## 12. Runtime/deployment truth

**Branch correction (2026-09-21):** `main` is the canonical future-work branch. `audit/genuine-five-green-final` is an ancestor of `main`, with `7cb15619113cad7c19750bdcf7747e7bf39970a8` as the merge base. The newer Very Strong implementation and operational documentation are on `main`. The older branch remains historical only.

Canonical application boundary:

- API: port `8080`;
- desk: `/`;
- API: `/api/`;
- canonical startup: `bash scripts/replit-boot.sh`.

The repository now includes an operator-approved schema initialization helper:

```bash
APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh
```

Schema mutation must be an explicit first-time operator action, not ordinary boot behavior.

The last known canonical runtime audit was blocked because the required Apex provenance/database schema was missing. Required durable tables included `research_case_events`, `research_cases`, `entities`, `research_sessions`, `research_run_events`, `research_evidence`, and `contact_evidence`.

**Therefore: do not claim production readiness until the schema is initialized, canonical boot succeeds, health is verified, and at least one controlled live research run completes with durable evidence.**

## 13. Active secret contract

Exactly 13 active provider/integration names:

```
REDIS_URL_1
GROQ_API_KEY
GEMINI_API_KEY
MISTRAL_API_KEY
HF_TOKEN
SERPER_API_KEY
TAVILY_API_KEY
SERPAPI_KEY
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

Do not request or print GitHub credentials, `DATABASE_URL`, DeepSeek/NVIDIA credentials, WHOISJSON credentials, or other retired secrets as part of the active contract.

## 14. Research Gauntlet v1

The current grounded registry is **38 cases**, schema `research-gauntlet-v1`, version `1.1.1`, status `grounded-reviewed`, with ground truth frozen as of 2026-09-18.

The benchmark is a measurement instrument, not a single-number scoreboard.

It measures separately:

- identity precision/recall;
- contact attribution precision/recall;
- claim support correctness;
- unsupported-claim rate;
- false-positive identity rate;
- contradiction detection/resolution;
- source-quality correctness;
- negative-finding calibration;
- useful pivots;
- unnecessary calls;
- successful observations;
- trajectory length;
- wall time and measurable model cost;
- timeout/cancellation/system-failure rates.

Unknown/insufficient-evidence is a valid result.

Do not publish a global winner from the benchmark. Use matched tasks, budgets, repeated runs, frozen artifacts, and blind adjudication where practical.

## 15. Current engineering gates

The current branch has focused static/unit coverage for:

- free/model-owned research trajectory;
- capability semantics;
- deterministic information-gain assessment;
- adaptive discovery diversity;
- evidence-graph context compaction;
- structured action contracts;
- target/investigator autonomy;
- source-family independence;
- prompt-injection and stopping diagnostics;
- agentic runtime/timeout invariants.

The branch also has a dedicated CI workflow for the Very Strong batch.

## 16. CEO / release gate

Apex should be treated as **not yet publishable** until all of these are true:

1. authoritative branch contains the reviewed batch;
2. fresh install with frozen lockfile succeeds;
3. all required architecture/type/build checks are green;
4. schema initialization succeeds and is then disabled for normal boot;
5. canonical API boots on 8080 and health is verified;
6. Gemini Boss and Right-hand both execute with their distinct credentials;
7. a real Investigator run executes using Groq or Mistral;
8. observations, provenance, evidence graph, contacts, failures, and oversight persist durably;
9. controlled failure cases (provider error, timeout, cancellation, prompt injection, identity collision) remain truthful;
10. repeated Gauntlet runs demonstrate acceptable evidence quality;
11. UI is verified against canonical evidence state, not simulated/demo state;
12. release documentation matches the exact deployed branch/SHA.

Architecture maturity is strong. Deployment/research maturity is still gated by empirical evidence.

## 17. Operator rule

If a check fails, fix the root cause. Do not weaken the check, seed evidence, force a research route, or convert an unavailable capability into a fake success merely to obtain a green release report.

This file is the source-of-truth handoff for what Apex **is**, what it **is not**, and what remains necessary before publication.


## 2026-09-27 recovery audit continuation

The live Replit audit reached Gemini Right-hand after the Gemini Boss compatibility repair. The next failure was Right-hand returning invalid JSON. Source inspection identified the boundary defect: the Right-hand Interactions adapter relied on prompt text saying JSON-only without enforcing a structured-output response format for its typed contracts.

The recovery branch now enforces Gemini Interactions structured JSON for case-reasoning and discovery-advice contracts, keeps local parsing/validation, and adds a bounded same-model/same-key HTTP 400 compatibility retry that removes only response_format. No Groq/Mistral substitution is permitted. A regression test covers the 400 -> same-model unstructured retry path.

Current verification status: PR #384 is the implementation vehicle. CI must be green before merge. After merge, the real Replit canonical launch remains mandatory evidence; a passing test suite alone does not establish live provider success.

The Investigator architecture was also re-audited: Boss-selected Groq or Mistral owns one ReAct trajectory; deterministic capability execution supplies Serper/Tavily/Exa, public HTTP, browser escalation, domain/registry, harvesting, email and username footprint tools; observations remain distinct from promoted evidence; cancellation, SSRF, provider budgets, and lifecycle fences remain deterministic boundaries.


## 2026-10-01 successor handoff

Read the durable continuation volumes in docs/apex-atlas-handoff/: 00_INDEX.md, 01_SYSTEM_INTRODUCTION.md, 02_GEMINI_CONTROL_PLANE.md, 03_RUNTIME_AUDIT_HISTORY.md, 04_NEXT_WORK_PLAN.md, and 05_SUCCESSOR_PROMPT.md. These supplement this living context and the mandatory repository study protocol.

Latest operator-conducted live run: job 391bbe22-0414-4ed4-965d-5714181af242. It used exactly one canonical UI-equivalent launch with targetCount=3, researchDepth=standard, targetTimeoutMs=420000. It failed closed at 2026-10-01T04:08:00.295Z during Gemini Right-hand control turn 4. Boss used gemini-3.6-flash; Right-hand opening used gemini-3.5-flash-lite; terminal error identified gemini-3.1-flash-lite as rate_limited. Discovery made 5 Serper searches and returned 38 URL entries, but produced 0 visits, 0 findings, 0 candidate entities/cards, and 0 evidence rows. Durable case 1 contained 12 events. The Redis trace endpoint reported 0 slots despite durable case activity. Groq Investigator attempts also showed request-size failures as model-facing context grew to about 214,957 characters, plus 429/cooldown behavior.

This is NOT GREEN. Before another live run, investigate: (1) Gemini Right-hand model eligibility, cooldown scope, retry/rotation and quota classification; (2) Investigator context growth/compaction and request-size handling without losing durable research history; (3) Redis trace versus durable event consistency. The sequential three-target runtime proof remains unverified.

## 2026-10-01 current-main correction

The repository advanced after the live audit. The current main commit is now `94e58f94529d30ed9cfd8a4bbba241272b619869`, merged from PR #439, **Harden Gemini Right-hand across legitimate project credentials**. This is newer than the live audit's `f11371d95337c1bd8a7c2b49d7c383903a08bfb5`.

PR #439 expands Right-hand support to multiple configured Gemini credentials (`GEMINI_RIGHT_HAND_API_KEY` through `_5`), resolves a live stable-text catalog independently for each credential, caches catalogs per credential, and gives each credential its own cooldown scope. It explicitly does **not** claim that multiple keys in the same Google project create additional quota, and it does not substitute Groq/Mistral for Gemini Right-hand. It adds regression coverage for recovery through a second configured credential/project and per-credential catalog caching.

Therefore all future engineering must treat `94e58f94529d30ed9cfd8a4bbba241272b619869` as the current main baseline unless a newer SHA is verified. The latest live runtime result remains historical evidence from the earlier `f11371d...` baseline; PR #439 itself still requires a fresh canonical runtime audit before its resilience is considered proven.

The durable successor volumes are now committed under `docs/apex-atlas-handoff/`. Read them before continuing: `00_INDEX.md`, `01_SYSTEM_INTRODUCTION.md`, `02_GEMINI_CONTROL_PLANE.md`, `03_RUNTIME_AUDIT_HISTORY.md`, `04_NEXT_WORK_PLAN.md`, and `05_SUCCESSOR_PROMPT.md`.

Official Gemini provider research checked during handoff preparation: Google documents RPM/TPM/RPD limits, project-level application of rate limits, RPD reset at midnight Pacific, distinct 429 error classes, exponential-backoff guidance, stable text model families versus Live/TTS/image/specialized models, and model-specific thinking levels. Re-check the current official documentation before changing provider behavior.

## Handoff package finalization — 2026-10-01

The durable successor volumes were refreshed after PR #439 and are now part of current main. The current main SHA after documentation finalization is `94e58f94529d30ed9cfd8a4bbba241272b619869`. Always verify a newer SHA before work begins.

The live runtime evidence remains the earlier pre-PR-439 job `391bbe22-0414-4ed4-965d-5714181af242`; PR #439 and subsequent documentation commits have not been validated by a new canonical three-target run. The correct next step is source/test verification followed by a fresh authorized runtime audit, not a claim of recovery.

## 2026-10-01 Gemini Boss fallback hardening — PR #440

Read-only diagnosis followed the canonical UI-equivalent run job 77c7fb64-8c85-4d23-b1f2-0e048b9e8012, which failed before Right-hand/Investigator because Gemini Boss exhausted bounded same-role fallback after an HTTP 503. The 503 is a provider-unavailable class, not proof of quota exhaustion.

PR #440 (`apex-boss-fallback-hardening-2026-10-01`) implements three fixes on top of main SHA 15eca3ac70d03ce6c77c6f112cd273fe28f29d3c: (1) Boss terminal attribution now reports the actual last attempted model and a sanitized ordered attempt summary; (2) Boss resolves live model catalogs per Gemini credential/project and keeps cooldown state credential-scoped; (3) a 429 `quota_exceeded` stops the exhausted credential but permits a separately configured credential/project to be tried. This preserves the rule that multiple keys in one Google project do not create extra quota.

Regression coverage was added in `artifacts/api-server/src/src/lib/gemini-boss-fallback.test.ts`, and `scripts/check-gemini-boss-model-boundary.mjs` was updated for project-scoped quota failover.

Static source/boundary checks performed in-chat all passed. GitHub workflow reporting was not yet available for the PR, and the execution environment could not clone the repository because outbound DNS/network access was unavailable. The PR #440 API build/typecheck/static-contract/regression gates now pass on the latest head; broader audit suites had stale Right-hand test assertions that were corrected in a4fbb5f and are being re-run.

Do not launch Atlas again yet. The API build/typecheck/static-contract/regression gates pass on the latest head. Broader audit suites must finish their rerun after the Right-hand regression assertion repair. Continue bug hunting around Investigator context bounding, Redis trace vs durable event consistency, and Gemini role/provider boundaries. Do not authorize a fresh canonical runtime until those gates finish.

## 2026-10-01 research architecture expansion

A broader architecture review was performed against current deep-research systems and recent research, deliberately independent of the Gemini provider incident work. See `docs/apex-atlas-handoff/06_RESEARCH_ARCHITECTURE_REVIEW_2026-10-01.md`.

The implementation batch adds deterministic research-frontier scoring, source-independence scoring, advisory knowledge-gap guidance in bounded Investigator context, and person-scoped contact evidence keys. It does not alter the core role law: Gemini remains control/oversight, Groq/Mistral remains Investigator, and the deterministic evidence substrate remains authoritative.

Do not call this architecture GREEN until the batch has passed typecheck/build/contract tests, repeated bug-hunt review, and the required controlled live evidence audit.


## FINAL STATE — 2026-10-01

Current main: 369887858c9d73f6eb6dd6aa37e668277b99eb28.

The research-architecture vNext batch is merged and CI-verified. The authoritative completion record is docs/apex-atlas-handoff/07_RESEARCH_ARCHITECTURE_VNEXT_COMPLETION_2026-10-01.md.

Completed controls:
- bounded episode-level Gemini oversight;
- bounded Gemini Evidence Probe using Gemini Google Search grounding;
- atomic claim/source/passage/attribution evidence bindings;
- provider disagreement as an epistemic signal;
- log-odds-style hypothesis updating;
- explicit falsification planning;
- empirical action-yield statistics;
- cognitive-task Investigator model routing;
- optional asynchronous Deep Research escalation, disabled by default;
- existing opt-in independent Investigator parallel lanes preserved.

CI for final correction commit 093fdacf0465149372c55f6154dc2ba9ac234765 is green:
- Apex API Build 1992;
- Apex Research Quality Contracts 541;
- Apex Prompt Architecture Audit 711;
- Five Consecutive Full Code Audits 1073, all five passed;
- Five Green Complete Codebase Audit 1218, all five passed;
- ordinary audit passed.

PR #446 merged the final correction batch. Merge commit: 369887858c9d73f6eb6dd6aa37e668277b99eb28.

LIVE RUNTIME GATE:
A fresh post-merge Replit Atlas run has not been completed. The available Replit workspace identifies as BigContacts/Apex Atlas but is stale at local revision f697fd1140a1159992221f3e4ff1b8f4fc03fabf. Its API workflow fails during startup with a TypeScript/esbuild syntax error at artifacts/api-server/src/src/routes/research/canonical-case-continuation.ts:21 caused by a literal backslash-n between TypeScript statements. Health, system-status, and active-job endpoints return 502. No Atlas research run was launched.

Do not call Apex production GREEN. Synchronize Replit to current GitHub main, boot the canonical API, verify readiness, then perform exactly one controlled UI-equivalent launch and audit durable evidence/card/entity admission deltas.

The architecture batch is complete. Empirical live research quality remains a release gate.


## FINAL DOCUMENTATION MERGE — 2026-10-01

Current main is now 64a4f20c25d8888112a4dc025f19e576d52fb774 after the successor-documentation merge (PR #447).

The architecture completion state remains exactly as recorded above. The documentation merge changed no production code. CI for the documentation branch passed its research-quality, prompt-architecture, five-consecutive, and five-green audit workflows before merge.

Live runtime remains explicitly uncertified because the available Replit workspace is stale and cannot boot the API. Synchronize Replit to current main before the next canonical runtime audit.
