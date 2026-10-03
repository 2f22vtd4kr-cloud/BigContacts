# CURRENT OVERRIDE — 2026-10-03

> This section supersedes all conflicting historical provider/auth statements later in this living-context document. Repository source at the current `main` HEAD is authoritative.
>
> **Current main HEAD:** `9980d451367bd0cf67e5311b0b2d88e050665812`
>
> **Canonical control plane:** Groq Boss (`openai/gpt-oss-120b`, bounded 20B fallback) → Groq Right-hand (`openai/gpt-oss-120b`, bounded 20B fallback) → Groq Investigator (`qwen/qwen3.8-27b`, bounded GPT-OSS fallbacks).
>
> **Role-scoped credentials:** Boss uses `GROQ_BOSS_API_KEY`, `_1` … `_10`; Right-hand uses `GROQ_RIGHT_HAND_API_KEY`, `_2` … `_5`; Investigator uses `GROQ_INVESTIGATOR_API_KEY`, `_1` … `_5`. Do not restore Mistral/Gemini control credentials.
>
> **Operator authentication is retired from the Apex desk/API.** The browser has no operator sign-in wall, the API does not mount operator-auth middleware, and `APEX_API_AUTH_TOKEN`, `APEX_OPERATOR_PASSWORD`, `APEX_SESSION_SECRET`, and `APEX_DEV_AUTH_BYPASS` are not active runtime requirements.
>
> **Groq GPT-OSS request contract:** Right-hand requests use `reasoning_effort` plus `include_reasoning:false`; they do not send the unsupported `reasoning_format` field. Discovery context is progressively compacted under a hard 20,000-character user-prompt boundary with a 1,024-character safety reserve.
>
> **Verification rule:** provider capacity is never inferred from configured-key status. No live provider request or Atlas launch is part of the source changes recorded after the 2026-10-03 live-run failures unless explicitly documented in the sequential audit.
>
# Apex Atlas / BigContacts — Living Context

> **Updated:** 2026-09-20. This is the living engineering, architecture, deployment, and research-quality handoff for the current reviewed Apex Atlas state.

**Repository:** `2f22vtd4kr-cloud/BigContacts`  
**Canonical working/integration branch:** `main`  
**Historical five-green branch:** `audit/genuine-five-green-final`  
**Historical Very Strong review branch:** `audit/apex-atlas-very-strong-v1`  
**Review status:** `main` contains the newer Very Strong implementation/documentation line. Neither branch history nor static gates alone constitutes production certification.


> **AUTHORITATIVE CURRENT STATE — 2026-10-02:** Canonical control is Groq Boss + Mistral Right-hand + model-owned Groq/Mistral Investigator. Generic GROQ_API_KEY and MISTRAL_API_KEY are Investigator credentials. Boss uses GROQ_BOSS_API_KEY[_1.._10]; Right-hand uses MISTRAL_RIGHT_HAND_API_KEY[_2.._5]. Do not restore Gemini transport or reuse generic Investigator credentials for control roles.
>
> The latest canonical live audit failed closed at the opening Mistral Right-hand gate before Investigator execution. The provider was classified rate_limited. Remediation now preserves structured provider diagnostics including HTTP status, provider code, bounded retry counts/delay, raw Retry-After, and redacted body structure; readiness also evaluates subsequent role-scoped keys after a failed catalog attempt.
>
> New canonical runtime durable labels and system status use Groq/Mistral identities. Historical Gemini material remains historical only. Source/diff verification has passed; a synchronized workspace still needs the full build/typecheck/Vitest run before this remediation can be called green.

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

Active provider/integration names include role-scoped control-plane credentials plus generic Investigator credentials:

```
REDIS_URL_1
GROQ_API_KEY
GROQ_BOSS_API_KEY
MISTRAL_API_KEY
MISTRAL_RIGHT_HAND_API_KEY
HF_TOKEN
SERPER_API_KEY
TAVILY_API_KEY
SERPAPI_KEY
EXA_API_KEY
SCRAPFLY_API_KEY
ZENROWS_API_KEY
COMPANIES_HOUSE_API_KEY

```

Former operator authentication controls `APEX_API_AUTH_TOKEN`, `APEX_OPERATOR_PASSWORD`, and `APEX_SESSION_SECRET` are retired and must not be restored as a Replit workaround.

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


## 2026-10-01 epistemic optimization vNext implementation

Apex now contains the first complete implementation pass of the epistemic optimization roadmap in \`docs/apex-atlas-handoff/08_EPISTEMIC_OPTIMIZATION_VNEXT_IMPLEMENTED_2026-10-01.md\`.

Implemented capabilities include:
- exact observed source-span binding and retained offsets;
- source-lineage units with identical-passage fingerprinting;
- explicit research-question/discriminator state;
- question-oriented provider disagreement grouping;
- deterministic terminal evidence gates;
- adaptive Gemini thinking allocation;
- information-gain prediction/calibration;
- state-conditioned action learning;
- dependency-aware parallel search actions;
- multi-tool Gemini verification episodes using Search + URL Context;
- bounded stateful Gemini Interactions sessions;
- canonical investigator evidence excerpts and stricter immutable-act validation.

The implementation deliberately does not use an uncalibrated universal posterior threshold, does not require fixed evidence classes for every case, does not introduce a giant replacement graph database, does not adopt the unrelated local "Apex" model/quantization recommendations, and does not permit arbitrary MCP expansion.

**Validation status:** this branch requires a fresh GitHub CI/typecheck/test run and a fresh canonical live Atlas run before any GREEN/release claim. The latest historical live run remains pre-vNext evidence.


## 2026-10-01 MASTER SUCCESSOR HANDOFF — CURRENT MAIN RECONCILIATION

A newer main baseline supersedes the older SHA references in earlier sections of this living context. The verified current main at handoff preparation is:

`21f2b22447698c7de2f4026f70e33693c901cf26`

Recent control-plane hardening after `69d12ccaa13a38ba03cadbb33adf9a3d044c06a7` includes:
- `9f17d5b9c2a900bd2dcf43595987a76060b2d39f`: aligned Gemini model-pool contract with the current thinking policy;
- `f4fd5feeaa9dd6bba74dd9ca88475cc1a3b7c0e0`: locked adaptive Gemini thinking boundaries and reset model cooldown state between pool tests;
- `21f2b22447698c7de2f4026f70e33693c901cf26`: merged PR #450, test/contract hardening only.

The latest successful relevant GitHub Actions evidence is on the PR parent correction commit `f4fd5feeaa9dd6bba74dd9ca88475cc1a3b7c0e0`: API Build 2016, Research Quality Contracts 564, Prompt Architecture Audit 734, Five Consecutive Full Code Audits 1101, and Five Green Complete Codebase Audit 1241 all succeeded. Do not invent a workflow result for the merge commit itself when none is exposed.

### Latest runtime boundary

The most recent exact UI-equivalent launch was job `c201a722-623d-45f0-b667-e20a4737c3f1` with `targetCount=3`, `researchDepth=standard`, and `targetTimeoutMs=420000`. It was accepted with HTTP 202 after health/system/active-job readiness checks. Polling was then interrupted by the environment's daily free-quota message. **Its terminal outcome is unknown/unobserved.** Do not classify it as success or failure and do not launch another run merely to infer the outcome.

The earlier real Boss failure job `77c7fb64-8c85-4d23-b1f2-0e048b9e8012` remains historical evidence of a Gemini Boss 503/provider-unavailable failure before Investigator execution. PR #440 hardened terminal attribution, per-credential catalog selection, and project/credential-scoped quota handling.

The earlier full live job `391bbe22-0414-4ed4-965d-5714181af242` remains historical evidence of Right-hand rate limiting, 413 Investigator context growth, and Redis-trace/durable-event discrepancy. It must not be conflated with the later accepted-but-unobserved job.

### Mandatory master handoff

The most complete successor document is now:

`docs/apex-atlas-handoff/09_MASTER_SUCCESSOR_HANDOFF_2026-10-01.md`

A successor must read it **after** the repository study protocol and the other handoff volumes, then verify current main and actual source before making changes.

**Current release state remains NOT GREEN / not production-certified.**

## 2026-10-01 current-main successor handoff reconciliation

The repository has advanced beyond the older SHA references preserved in this living document. The latest verified main at the time of this reconciliation is:

`7a2f15107081043e16b3af26e25317519f5f5e60`

The newest commits after PR #450 are primarily successor-documentation reconciliation. They do not constitute a new production architecture rewrite.

The current comprehensive continuation document is:

`docs/apex-atlas-handoff/10_SUCCESSOR_MASTER_HANDOFF_CURRENT_MAIN_2026-10-01.md`

A successor must read the mandatory repository study protocol, current source, all relevant handoff volumes, and then verify the actual current `main` SHA again before acting.

### Current runtime boundary

The latest exact UI-equivalent Atlas launch remains job `c201a722-623d-45f0-b667-e20a4737c3f1`.

Contract:

```
targetCount=3
researchDepth=standard
targetTimeoutMs=420000
```

The launch was accepted with HTTP 202 after readiness checks. Polling was interrupted when the environment reported daily free-quota exhaustion.

Therefore the terminal outcome is:

**UNKNOWN / UNOBSERVED.**

It is neither a verified success nor a verified failure. Do not infer downstream Investigator, evidence, card, or terminal activity from the accepted 202 alone.

### Current release state

**NOT GREEN / NOT production-certified.**

Static architecture/test maturity is not equivalent to live research certification.

### Successor rule

The repository itself is authoritative. Never let an older SHA in this living context override current Git history. Never let a handoff document override executable/runtime evidence.

## 2026-10-01 continuation — lineage-aware terminal gate correction

The latest verified production-code boundary is now:

`3fa9559a3805a4d322228c85d2c6ef0a51aa48ab`

PR #451 applied a narrow deterministic terminal-gate correction. The research intelligence engine already computes `independentSourceUnits` from `SourceLineageGraph`, but the terminal adapter had been recomputing source independence from raw hostnames. The terminal adapter now consumes `IntelligenceContext.independentSourceUnits` directly.

Regression coverage was added in:

`artifacts/api-server/src/src/test/research-terminal-gate.test.ts`

The test covers both:
- multiple independent lineage units sharing a hostname;
- a single resolved lineage unit remaining below the terminal threshold.

Verification on the PR head included:
- Apex API build: PASS;
- workspace typecheck: PASS;
- strict provenance/provider-cache regression tests: PASS;
- Research Quality Contracts: PASS, including research contract tests and typecheck;
- the initial typecheck failure was caused by a patch fixture/return-property mistake, was corrected, and the corrected run passed.

The current release remains **NOT GREEN / NOT production-certified**. This correction improves deterministic terminal evidence accounting; it does not constitute live research certification.

Official Gemini documentation rechecked during this continuation confirms that 429 `rate_limit_exceeded` / `too_many_requests` are transient-rate-limit classes, `quota_exceeded` is daily quota, and 503 `service_unavailable` is a temporary service-capacity condition. Gemini rate limits are applied per project rather than per API key. See the official Gemini API error/rate-limit documentation before changing provider behavior.

### Required next action

Synchronize the real Replit/runtime environment to the current main SHA, run the guarded static/readiness sequence, and only then perform the single authorized canonical three-target audit. Do not infer runtime certification from CI.

## 2026-10-01 live Replit audit reconciliation

Latest verified `main` is `14eff01d17ab3d95340139521405ca8ca9edccf1`.

A fresh UI-equivalent canonical run was executed on Replit at commit `21f2b22447698c7de2f4026f70e33693c901cf26`:
job `96a80589-f510-4703-b79f-cd8264e15715`.

The run was stopped at the first genuine terminal failure. Gemini Boss attempted three catalog-eligible models and each returned HTTP 503 `service_unavailable`; the run never reached Right-hand, Investigator selection, discovery, or research. Durable baseline and post-run counts for cases, events, sessions, evidence, contact evidence, and entities remained zero. The active Atlas lane was released.

No retry, continuation, standalone provider probe, manual evidence, or manual entity/card creation occurred.

The provider failure is not evidence of a globally broken Gemini API or of invalid request syntax. Current official Gemini documentation confirms the Interactions API supports the relevant Flash models and the `generation_config.thinking_level` request shape; 503 is a provider-unavailable condition. The live run therefore remains an empirical provider-capacity failure at the Boss boundary, not a reason to replace Gemini Boss or bypass the control plane.

Two deterministic repository issues exposed by the audit were corrected:
- Gemini Interactions tests now model the catalog-first resolver and current adaptive thinking policy.
- A regression test now covers one transient 503 retry on the same model before accepting a successful response.

Those test changes were merged as `14eff01d17ab3d95340139521405ca8ca9edccf1`. GitHub currently reports no completed Actions/status checks for that merge commit, so static verification must still be performed by the next available repository/runtime harness before claiming CI-green.

The dashboard `9 LIVE` chip is not an Atlas-job badge. It is the authenticated provider/API-key health chip and can legitimately show the number of currently active provider slots while Atlas is idle. The authoritative Atlas active-job endpoint remains the source for whether research is running.

Release remains **NOT GREEN / NOT production-certified**.


## 2026-10-02 CI verification reconciliation

Current main now includes PR #456 merge commit `3322a2df13e17c0a0deb335845d4104b04789eef`. PR #456 added the corrected Gemini Interactions control-plane regression suite to the canonical Apex API Build workflow.

Final verification on PR head `054d60b859d66a36b14d302e6cd6498fab629843`:
- Apex API Build: success.
- Gemini Interactions regression suite: 5/5 tests passed.
- Existing strict provenance/provider-cache tests: 12/12 passed.
- Workspace/API typecheck passed before the test gate.
- The Gemini suite includes a transient HTTP 503 same-model retry regression.

The first CI attempt exposed a wrong test path in the new workflow step; the second exposed a stale call-order assertion. Both were corrected. No production Gemini fallback policy was weakened or bypassed.

The live runtime remains NOT GREEN. The latest authorized canonical Replit run `96a80589-f510-4703-b79f-cd8264e15715` failed at Gemini Boss opening with three HTTP 503 `service_unavailable` responses and admitted no research/evidence/entities/cards. CI verification of the transport contract does not establish live provider capacity. Do not launch another canonical research run merely to compensate for the provider failure; synchronize the deployment environment and make a provider-readiness decision before the next authorized live audit.

## 2026-10-02 Groq Boss control-plane migration

The canonical Boss provider has been changed from Gemini to Groq after repeated empirical Gemini Boss 503 failures. The new adapter is:

- `artifacts/api-server/src/src/lib/groq-boss.ts`
- primary model: `openai/gpt-oss-120b`
- bounded fallback: `openai/gpt-oss-20b`
- Boss credential: `GROQ_BOSS_API_KEY` (plus `_1` through `_10`); generic `GROQ_API_KEY` remains reserved for Investigator use.
- transport: Groq OpenAI-compatible Chat Completions API

Gemini remains the independent Right-hand oversight provider. The Investigator remains the existing model-owned Groq/Mistral research layer. The Boss does not gain web-search or Investigator authority merely because Groq supports browser tools; the canonical Boss request is text/control-only.

The Groq adapter accepts only already-compacted Boss prompts up to 20,000 characters by default; oversized prompts fail closed so durable evidence is never arbitrarily discarded. Discovery context is compacted explicitly before the model-facing prompt while the durable case remains complete. The current Groq Free Plan documents 8K TPM / 200K TPD for GPT-OSS 120B and 20B. The adapter maps the old Gemini `minimal` setting to GPT-OSS `low`, suppresses reasoning output, uses strict JSON Schema for control responses, and has bounded same-model 503 recovery plus short-window 429 recovery.

`GET /api/system/status` remains ordinary local/cached telemetry. It no longer needs a provider generation/readiness call. The explicit live provider diagnostic is `POST /api/system/diagnostics/groq-readiness`; it checks Groq model catalog availability only and is not a substitute for a canonical Atlas run.

New deterministic checks/tests:
- `scripts/check-groq-boss-model-boundary.mjs`
- `artifacts/api-server/src/test/groq-boss.test.ts`

The canonical release state remains **NOT GREEN / NOT production-certified** until the implementation is verified in the actual runtime and a later authorized single canonical Atlas audit reaches the real Right-hand → Investigator → evidence → terminal path. No Groq key value is committed to the repository.
## 2026-10-02 Mistral Right-hand control-plane migration

The canonical Right-hand provider is now Mistral Small 4 (mistral-small-2603), with mistral-small-latest as a bounded catalog fallback. Groq remains the Boss; the Investigator remains the existing model-owned Groq/Mistral research layer. The Right-hand is oversight only and has no research-tool authority.

The adapter is artifacts/api-server/src/src/lib/mistral-right-hand-reasoning.ts, uses MISTRAL_RIGHT_HAND_API_KEY (plus `_2` through `_5`), while the generic MISTRAL_API_KEY remains reserved for the Investigator, Mistral /v1/models for capability discovery, and /v1/chat/completions for bounded JSON control. Prompts are capped at 20,000 characters and oversized model-facing context fails closed rather than silently discarding durable evidence. Ordinary /api/system/status remains provider-call-free; POST /api/system/diagnostics/mistral-readiness is the explicit catalog-only diagnostic.

gemini-right-hand-reasoning.ts is now only a compatibility shim and contains no Gemini transport. The canonical boundary gate is scripts/check-mistral-right-hand-model-boundary.mjs and the regression suite is mistral-right-hand.test.ts.

## 2026-10-02 CURRENT MASTER SUCCESSOR STATE

Current canonical main HEAD is `44118b641747b034eccc00d0aca5f0209aea3259`.

The current comprehensive successor handoff is:
`docs/apex-atlas-handoff/19_MASTER_SUCCESSOR_HANDOFF_CURRENT_2026-10-02.md`

Current control-plane roles are now:
- Boss: Groq `openai/gpt-oss-120b`, bounded `openai/gpt-oss-20b` fallback.
- Right-hand: Mistral `mistral-small-2603`, bounded `mistral-small-latest` catalog fallback.
- Investigator: existing model-owned Groq/Mistral research layer.

The Gemini Boss and Gemini Right-hand transports are no longer canonical. `gemini-right-hand-reasoning.ts` is a compatibility shim with no Gemini transport. The old Gemini Boss boundary gate was retired.

Latest exact canonical Atlas job: `6097cdeb-d176-4807-96cb-1c59e334a5e3`, accepted with targetCount=3, standard depth, 420000ms target timeout. It was observed running at 0/4 during Groq Boss -> Mistral Right-hand -> Investigator opening. Its terminal outcome is currently UNKNOWN/UNOBSERVED; do not classify or relaunch solely for that reason.

HEAD `44118b6` CI boundary: Apex API Build PASS; discovery static check PASS; frontend five-condition gate PASS; Five Consecutive Full Code Audits FAIL at the Atlas control contract regression because the old test still asserts Gemini Right-hand implementation details (`runGeminiRightHandFreeJson(` and `rateLimitRetryDelayMs`). This is a stale contract-test failure against the intentional Mistral compatibility shim, not evidence that Mistral generation is broken. Fix the test to assert the current Mistral implementation/boundary rather than restoring Gemini transport.

Release remains **NOT GREEN / NOT production-certified**.


## 2026-10-03 Mistral Right-hand rate-limit investigation

- The 2026-10-03 canonical UI-equivalent run failed closed at the first Mistral Right-hand review with a persisted `rate_limited` result, but the live process still rendered the provider detail as `[object Object]`. This means that run did not execute the latest structured-diagnostic adapter path, or another deployment boundary was running an older snapshot; do not treat that run as proof that the current `main` adapter lacks diagnostics.
- Mistral's current documentation states API 429s can be caused by requests-per-second, tokens-per-minute, or tokens-per-month limits; rate limits are organization-level, and API keys are workspace-scoped but use the workspace/org quota and rate limits. A newly created Right-hand key therefore does not imply a fresh quota pool. A new key can legitimately receive its first 429 if the shared organization/model/workspace capacity is already exhausted. 
- `mistral-small-2603` is the current Mistral Small 4 API model and supports Chat Completions and structured outputs; the model identifier itself is not currently retired.
- Current remediation commits after the previous handoff: `39bf6481f969cc21d86b42055142a8014c7e0dd3` hardens live Mistral diagnostics with a non-secret key fingerprint and rate-limit headers and fixes the missing readiness-function closing brace; `403294c0e62f4faa915bb7d0aa65b7cab5080cc` adds structured diagnostic assertions; `d5c539e6b453888977272441fe81a5cf092e88cc` covers Mistral rate-limit response headers. Current `main` is `d5c539e6b453888977272441fe81a5cf092e88cc`.
- The live 2026-10-03 run must not be retried merely to test this. Before the next authorized canonical launch, the running preview/workspace must be proven to contain the current `main` SHA and the updated adapter. If a future Mistral 429 occurs, its durable diagnostic must identify HTTP status, provider code/type via the structured body summary, non-secret key fingerprint, model, Retry-After, rate-limit headers when supplied, retry counts, and quota signals without exposing credentials.


Current main verification checkpoint: `17708ce36d59aac74f2a999c8aba2870807a0ab9`. Live-audit workflows are manual-only; no new Atlas launch is authorized by repository pushes.


## 2026-10-03 Mistral Free-tier Right-hand fallback decision

A controlled single-call audit sent exactly one direct Right-hand request to `mistral-small-2603` using `MISTRAL_RIGHT_HAND_API_KEY`. It returned HTTP 429 after 308 ms; captured headers included `x-ratelimit-limit-req-minute=0` and `x-ratelimit-remaining-req-minute=0`. No retry, fallback, catalog call, or Atlas launch occurred. The provider error body was not retained by that one-off harness, so the precise quota/workspace/billing cause remains unresolved.

Independent current Mistral documentation confirms Ministral 3 14B/8B/3B support Chat Completions and Structured Outputs. Recent community reports also describe Free-tier accounts receiving 429/zero effective allowance on Mistral Small while Ministral models remain callable. This is evidence for a genuine cross-family Right-hand fallback, but not proof that the user's specific Workspace has the same entitlement state. Do not represent the community observation as a guaranteed Free-tier allowance.

Implementation at main now defines:
- canonical Right-hand model: `mistral-small-2603`
- genuine cross-family fallback chain: `ministral-14b-2512` → `ministral-8b-2512` → `ministral-3b-2512`
- `mistral-small-latest` is deliberately no longer a fallback because it is not a meaningful cross-family escape from Small 4 entitlement/rate-limit behavior.
- live catalog admission is still required; Apex does not invent a fallback model absent from the provider catalog.
- on a hard 429 carrying the observed zero request-minute signals, Apex records the complete redacted diagnostic and advances to the next genuine model family without retrying the same model. Ordinary short-window 429s retain the bounded Retry-After/1.1s retry policy.
- the process-wide Mistral request gate remains in force to respect the documented 1 RPS ceiling.

Regression coverage was added in `artifacts/api-server/src/src/test/mistral-right-hand.test.ts` for the canonical model/fallback policy and credential non-disclosure. The canonical model-boundary script should also assert the cross-family fallback chain.

No live Mistral call or Atlas launch was made to validate the new fallback. Validation must remain CI/static/test-only until the user explicitly authorizes another provider call. The current GitHub push triggered the Five Consecutive Full Code Audits workflow; its run was pending at the last check.

## 2026-10-03 CURRENT CANONICAL MASTER STATE — GROQ CONTROL PLANE

Superseding all earlier provider-role sections above, current canonical main uses Groq for all three AI control/research roles:
- Boss: Groq openai/gpt-oss-120b with openai/gpt-oss-20b fallback; credentials GROQ_BOSS_API_KEY and _1 through _10.
- Right-hand: Groq openai/gpt-oss-120b with openai/gpt-oss-20b fallback; credentials GROQ_RIGHT_HAND_API_KEY plus _2 through _5.
- Investigator: Groq-only; credentials GROQ_INVESTIGATOR_API_KEY plus _1 through _5.
- Gemini and Mistral are retired from the canonical active control plane. Historical audit sections may mention them as prior failures/migrations only.

Important merged commits:
- PR #465 merged the explicit Groq Right-hand retry-ownership boundary.
- PR #466 merged as e92135a1b8332a5f13e28e8f0cc576f78eaba8f corrected the remaining canonical Groq Investigator runtime contract and cognitive routing.
- 2026-10-03 audit update commit: 3cf795028944dad30436cee55d1cb0a015767454.

PR #466 source corrections:
- GPT-OSS Investigator no longer sends reasoning_format. It uses include_reasoning:false, matching the current Groq GPT-OSS contract.
- Strict Investigator structured output now exposes every action field already parsed by the runtime, including target/targetType/profile for SpiderFoot and locale/market for search.
- Investigator reasoning budget is cognitive-task aware: ordinary discovery/identity medium, contact extraction low, contradiction/final adjudication high, with only validated low/medium/high environment overrides.
- Cognitive routing is state-driven from the Research Intelligence frontier and does not choose the research action. The model still owns the next research action; deterministic code only selects an appropriate reasoning budget/model family and enforces evidence law.
- Regression coverage and scripts/check-agentic-runtime.mjs now enforce the provider request/schema invariants.

Architecture law:
- Human objective → Groq Boss → model-owned Investigator research loop → immutable observations/provenance → Research Intelligence → Groq Right-hand oversight when the control loop requires it → Groq Boss → next model-owned episode → deterministic terminal gate.
- Do not convert this into a fixed source/tool sequence. The state-of-the-art target is deterministic evidence law surrounding a model-owned research policy.
- Search results are leads, not proof. A page must be observed before its content can support a finding. Identity, scope, source independence, contradictions, and contact attribution are deterministic admission concerns.
- Training knowledge is useful for hypothesis/query generation but is never itself evidence for identity, wealth, ownership, role, or contact.
- Prompt context should remain compact and structured while durable case state remains complete outside the model prompt.

Live certification boundary:
- The imported Replit project remains unavailable through the connected Replit app list in this environment.
- No backend CI status is currently exposed for the latest merged source in the connected GitHub status surface.
- No live Groq request was made for PR #466 and no new Atlas launch was made after job 78d032e0-6878-4276-aeb5-5ac5371b11e9.
- The one-launch authorization from the 2026-10-03 sequential audit is consumed. A new canonical Atlas launch requires separate explicit user authorization.
- Therefore current source architecture is corrected and reviewed, but Apex is not yet live-certified end-to-end.

Current model/API references used for the correction:
- https://console.groq.com/docs/reasoning
- https://console.groq.com/docs/structured-outputs
- https://console.groq.com/docs/model/openai/gpt-oss-120b
- https://console.groq.com/docs/model/qwen/qwen3.8-27b
- https://console.groq.com/docs/prompt-caching
