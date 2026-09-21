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

**Branch correction (2026-09-21):** `main` is now the canonical future-work branch. A direct GitHub comparison showed `main` is 60 commits ahead and 0 commits behind `audit/genuine-five-green-final`, with `7cb15619113cad7c19750bdcf7747e7bf39970a8` as the merge base. The newer Very Strong implementation and operational documentation are on `main`. The older branch remains historical only.

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
