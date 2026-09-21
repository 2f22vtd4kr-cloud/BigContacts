# Apex Atlas / BigContacts — Living Context

> **Updated:** 2026-09-18. The authoritative engineering state is the source on branch `audit/genuine-five-green-final`; this document is the living architecture and research-evaluation handoff.

**Repository:** `2f22vtd4kr-cloud/BigContacts`  
**Authoritative branch:** `audit/genuine-five-green-final`  
**Certification:** the authoritative branch is continuously re-certified by the five-consecutive workflow and independent prompt-architecture audit. Treat the exact SHA reported by the latest successful runs as authoritative; never copy an older SHA into this handoff.

## 1. System constitution

Apex is an AI-powered public-web research bureau, not a deterministic enrichment workflow.

```
USER / CASE OBJECTIVE
        ↓
Gemini Boss + Gemini Right-hand
        ↓
select Investigator LLM + clarify research objective
        ↓
Groq OR Mistral Investigator
        ↓
model chooses WHAT / WHERE / HOW
        ↓
validated non-LLM tool execution
        ↓
raw observation + provenance
        ↓
claim / identity hypothesis / contradiction / contact state
        ↓
durable case state + evidence graph + event ledger
        ↓
next Investigator decision
        ↺ Right-hand review ↺ Boss oversight
        ↓
explicit finding / promotion / stop
```

The important boundary is **model-owned research trajectory, deterministic safety**. Deterministic code may reject an unsafe, unauthorized, malformed, over-budget or provenance-invalid action. It must not secretly replace the Investigator with a fixed research sequence.

## 2. AI role law

There are exactly two AI layers:

1. **Gemini Boss + Gemini Right-hand** — bounded oversight/control plane.
2. **Investigator LLM pool** — actual investigation.

The active Investigator pool is exactly:

```text
groq
mistral
```

Gemini is never an Investigator fallback. DeepSeek and NVIDIA NIM are not part of active Apex execution.

### Boss
Owns case direction, assignment, continuation disposition and high-level review. It may supply a research objective or redirect, but it must not browse or prescribe a tool/provider/query/URL sequence.

### Right-hand
Independent bounded Gemini oversight. It critiques the current act, evidence gaps and next objective. It does not browse, choose tools or invent evidence. If unavailable, the control plane fails closed rather than pretending the review happened.

### Investigator
The selected Groq/Mistral model is the researcher. It receives the durable target/run context and owns the trajectory: discovery, search, page visits, pivots, revisits, verification, disproof and stopping are capabilities it may choose, not mandatory phases.

## 3. Tool and safety boundary

Search, browser/page fetch, registry/domain and approved OSINT executors are capabilities, not stages.

Current hard safety ceilings include:

- `MAX_ITER = 64`
- `MAX_OBS = 16_000`
- `MAX_TRAJECTORY_RECORDS = 512`
- bounded HTTP response size and outbound timeouts
- run-scoped cancellation
- SSRF-safe outbound transport
- actual-capability validation for model-selected actions
- tool failures remain failures
- duplicate visits are not converted into successful observations

Python-backed OSINT remains fail-closed until enforceable sandbox/container/VM egress isolation exists. Do not re-enable networked Python OSINT merely because a source mutator or guard can make it appear available.

## 4. Durable research state

The dossier/card is a projection, not the source of truth.

Canonical durable state must preserve, across turns and restarts:

- objective and case identity;
- Investigator model and every selected action;
- actual execution/provider and execution status;
- observations and source URLs;
- retrieval timestamps and provenance;
- model-authored claims and uncertainty;
- competing identity hypotheses and disproof;
- contradictions and their resolution state;
- contact values and contact state;
- open questions, negative findings and dead ends;
- oversight decisions;
- trajectory records and replay/correlation IDs.

Do not use arbitrary context truncation that destroys evidence or trajectory history. Compaction must be high-signal and reference durable event IDs/records.

## 5. Evidence and identity law

An observation is not automatically an attributed fact.

```
raw observation
  → model-authored claim / hypothesis
  → explicit attribution or promotion proposal
  → deterministic identity / provenance / scope validation
  → durable evidence graph + event
  → projection
```

Discovery admission must never accept an LLM-emitted person merely because the model said the person exists. `materializeAtlasAdmissions()` must connect admission to actual successful observed/persisted evidence.

Evidence provenance should retain, at minimum:

- original and normalized URL;
- host;
- retrieved / first-seen / last-seen timestamps;
- source type and quality;
- extraction/collection method;
- supporting passage or observation;
- claim linkage;
- identity-resolution confidence;
- contradiction links;
- evidence confidence.

Contact states are explicit:

```text
DISCOVERED → OBSERVED → ATTRIBUTED → CORROBORATED → VERIFIED
                              ↘ STALE
                              ↘ CONTRADICTED
                              ↘ REJECTED
```

Multiple contact values are not automatically contradictions. The contradiction engine should distinguish legitimate multi-valued fields, temporal changes, scoped values and genuine conflicts, while preserving the claims and sources that caused the classification.

The typed evidence-graph foundation includes observations, claims and support edges. The next quality step is to make multi-observation attribution a first-class admission path without weakening the existing source/identity gates.

## 6. Canonical control loop

The canonical target path is:

```
Gemini opening oversight
  → Gemini-selected Groq/Mistral Investigator
  → Investigator-selected act
  → actual tool execution
  → immutable tool observation
  → target/run durable state
  → Gemini Right-hand review
  → Gemini Boss disposition / research objective / stop
  → next Investigator act
```

Boss/Right-hand do not secretly determine the Investigator's query or hop sequence. The Investigator does.

Every act must be inspectable: model, action, actual tool/provider, execution status, observation, provenance, findings, uncertainty, open questions and oversight result.

## 7. Remaining engineering cleanup

The five-green certification is an architecture/regression milestone, not proof that investigative quality is solved.

Known source-migration programs still requiring deliberate reachability analysis include:

1. registry cancellation direct-source migration;
2. target investigation event-ledger source migration;
3. secondary-surface deterministic caller retirement;
4. remaining duplicate-tree/legacy-writer cleanup;
5. identity-review/manual writer audit;
6. Python sandbox/egress architecture.

Never delete a mutator or compatibility tree merely because a guard passes. First migrate the invariant into source, trace callers/transitive callers/error paths/persistence/cancellation, inspect the diff, then remove the mutator.

## 8. Research-quality phase: Apex Research Gauntlet v1

The next phase is **empirical research evaluation**, not another architecture score.

The benchmark asks:

> Given the same research problem, does Apex produce a more accurate, better-supported, less hallucinated investigation than strong baselines?

The benchmark must not use the existing single-number scoreboard as a proxy for research quality.

### Benchmark design

The grounded v1 registry now contains 38 independently cross-checked cases with two public-source records per case; expand toward 50 before using the benchmark as a release gate. Include:

- ambiguous/common names;
- sparse public footprints;
- multiple people at one organization;
- ownership/succession chains;
- stale profiles;
- conflicting contact values;
- misleading search results and SEO copies;
- copied/aggregated directories;
- negative-finding cases where the correct outcome is uncertainty;
- multi-pivot cases where the useful path is not obvious;
- adversarial identity collisions;
- prompt-injection-bearing public pages.

Each case has a versioned ground-truth packet. Ground truth records the expected identity set, supported claims, disallowed/distractor identities, contact-state expectations, source-quality expectations and important contradictions. Ground truth must be established from primary/public evidence and reviewed independently of Apex's own output.

### Blind runs

For each case, run multiple independent trials with the same objective and resource envelope. Preserve the full raw trajectory and evidence graph.

Compare against clearly specified baselines, such as:

- a strong single-agent research workflow;
- a strong multi-agent research workflow;
- optional external systems only when comparable runs, tool access and evaluation rules are actually available.

Do not compare model names abstractly. Compare **systems under matched tasks and budgets**.

### Metrics

Primary metrics:

- identity precision / recall;
- contact attribution precision / recall;
- claim support correctness;
- unsupported-claim rate;
- false-positive identity rate;
- contradiction detection / resolution;
- source-quality correctness;
- negative-finding calibration.

Operational metrics:

- useful pivots;
- unnecessary tool calls;
- successful observations;
- trajectory length;
- wall time;
- token/model cost where measurable;
- clean-stop / timeout / cancellation rate.

A run must be allowed to say **unknown / insufficient evidence**. Do not reward forced answers.

### Analysis

Do not collapse the benchmark into one overall winner score. Report metric distributions, confidence intervals where appropriate, case-class breakdowns and failure exemplars.

Investigate failures before changing architecture. Candidate interventions include query diversification, source-quality modeling, better entity resolution, parallel independent investigators, verification passes, provider/model changes and evidence-graph improvements.

## 9. Benchmark implementation

The repository now treats the Gauntlet as a versioned, source-grounded evaluation artifact:

- `docs/APEX_RESEARCH_GAUNTLET_V1.md` — protocol and interpretation rules;
- `benchmarks/research-gauntlet-v1.json` — case registry and ground-truth schema;
- `scripts/evaluate-research-gauntlet.mjs` — deterministic scorer for recorded runs;
- `scripts/validate-research-gauntlet.mjs` — fixture/run schema validation;
- `artifacts/api-server/src/src/test/research-gauntlet.test.ts` — evaluator regression coverage.

The evaluator scores supplied ground truth against recorded claims and verifies that claim support resolves through the run's observation IDs to the frozen gold source URLs; it never invents ground truth, calls the web, or declares a model/system globally superior.

## 10. Acceptance rules for the Gauntlet

A benchmark result is publishable only when:

- case and ground-truth versions are pinned;
- task prompts are identical across systems;
- tool/resource budgets are documented;
- runs are independently seeded where applicable;
- outputs and trajectories are preserved;
- scoring is deterministic from frozen input artifacts;
- adjudication is blind to system identity where practical;
- missing evidence is not silently treated as false;
- system failures are distinguished from research failures;
- no metric is reported from a different task population without labeling it.

**Working rule:** architecture green means the bureau is structurally credible. Research quality must now be earned by measured, reproducible outcomes.


## 11. Current research-reliability implementation

The current canonical ReAct loop uses bounded Investigator working context from `investigation-context-compaction.ts`, with a one-time tighter emergency reducer after a provider request-size rejection. Durable trajectory/evidence is retained outside the prompt; the model-facing context prioritizes the objective, current findings, latest observation, recent acts, and an archived trajectory index. The implementation roadmap and per-phase engineering plan are `docs/APEX_RESEARCH_ROADMAP_V3.md` and `docs/APEX_RESEARCH_PHASE_PLANS_V3.md`.
