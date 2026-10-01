# Apex Atlas — Research Architecture vNext Completion Record
## 2026-10-01

## 1. Purpose

This volume records the completed research-architecture implementation after the Gemini Boss fallback hardening and the epistemic-frontier batch. It is the durable handoff for the next engineer/researcher.

**GitHub source of truth:** `2f22vtd4kr-cloud/BigContacts`

**Current main:** `369887858c9d73f6eb6dd6aa37e668277b99eb28`

The implementation is now on `main). Do not infer runtime health from CI alone.

---

## 2. What is now implemented

### A. Episode-level supervision

The target Investigator no longer requires Gemini Right-hand/Boss review after every single ordinary action.

Implemented in:
- `artifacts/api-server/src/src/lib/research-episode-policy.ts`
- `artifacts/api-server/src/src/lib/agentic-web-research.ts`

Normal research proceeds in bounded episodes (default 3–5 actions). Immediate checkpoint/escalation remains for:
- contradictions;
- identity changes;
- high-value person-scoped contacts;
- failed actions;
- terminal/done proposals;
- low-information-gain stagnation.

The Investigator still owns the trajectory. Gemini supervision decides whether to continue, redirect, or stop; it does not prescribe tools or URLs.

### B. Gemini Evidence Probe

Implemented:
- `artifacts/api-server/src/src/lib/gemini-evidence-probe.ts`
- `artifacts/api-server/src/src/lib/gemini-evidence-probe.test.ts`

The Probe is a bounded specialist, invoked only at high-value verify/falsify checkpoints. It can use Gemini Google Search grounding to investigate one narrowly scoped claim.

Important boundary:
- It is **not** the Investigator.
- It is **not** a general research replacement.
- Its prose is not automatically admitted as evidence.
- Returned URLs/citations enter the intelligence trajectory as observed probe material and remain subject to Apex evidence adjudication.

### C. Atomic evidence binding

Research Intelligence now exposes statement-level evidence binding:
- claim;
- claim ID;
- source URL/host;
- source class;
- exact observed passage;
- attribution;
- source family.

Implemented in:
- `research-intelligence-engine.ts`
- `research-intelligence-engine.atomic.test.ts`

This moves Apex beyond a loose “finding + URL” representation toward claim-level provenance.

### D. Provider disagreement

Research Intelligence now detects when different search providers are used for the same normalized query and return materially different source hosts.

This is exposed as `providerDisagreements` and is an epistemic signal, not a winner-selection rule.

A disagreement should cause the Investigator to test a discriminator rather than average provider outputs.

### E. Hypothesis posterior / log-odds-style scoring

Implemented:
- `research-hypothesis-policy.ts`
- `research-hypothesis-policy.test.ts`

Evidence contributions are weighted by:
- source reliability;
- source independence;
- identity specificity.

Contradictions subtract evidence weight.

The implementation is explicitly **not described as a calibrated Bayesian posterior**. It is an auditable bounded log-odds-style relative score.

### F. Explicit falsification planning

Implemented in `research-hypothesis-policy.ts`.

A leading hypothesis can expose:
- missing discriminator;
- contradiction pressure;
- unresolved pressure;
- whether active falsification is required;
- a candidate discriminator.

This is guidance for the Investigator, not a deterministic research playbook.

### G. Empirical action-yield learning

Implemented:
- `research-action-learning.ts`
- `research-action-learning.test.ts`

Each action kind receives an empirical statistic:
- attempts;
- useful outcomes;
- failures;
- mean information gain;
- weak Beta-style posterior success estimate.

This is deliberately **training-free** and **not RL**.

The current implementation is run/case-local intelligence. Durable trajectory/events remain the source for future cross-run aggregation; no opaque learned model is introduced.

### H. Cognitive-task model routing

Implemented:
- `research-cognitive-routing.ts`
- `research-cognitive-routing.test.ts`
- wired into Investigator execution.

The task class is inferred from the research frontier:
- discovery;
- identity resolution;
- contact extraction;
- contradiction resolution;
- final adjudication.

Within Groq's available model pool, stronger reasoning models are preferred for identity/contradiction/adjudication and efficient models for discovery/contact work.

This does **not** replace Groq/Mistral ownership or introduce cross-provider fallback.

### I. Optional Deep Research escalation boundary

Implemented:
- `gemini-deep-research-escalation.ts`
- `gemini-deep-research-escalation.test.ts`

It supports asynchronous start/poll semantics.

It is **disabled by default**:
`APEX_ENABLE_GEMINI_DEEP_RESEARCH=true` is required.

Therefore the free-tier Apex baseline does not invoke the paid/background Deep Research capability.

When explicitly enabled, its output is still research material, not automatic evidence admission.

### J. Existing parallel retrieval preserved

Apex already had an opt-in Investigator ensemble for independent lanes. It remains available for genuinely independent retrieval rather than being forced into every run.

The canonical single-target path remains trajectory-owned and sequential where later actions depend on prior evidence.

---

## 3. What was deliberately NOT changed

The architecture remains:

```
Human objective
  ↓
Gemini Boss — control plane
  ↓
Research episode
  ↓
Groq/Mistral Investigator — autonomous ReAct research
  ↓
Search / visit / OSINT / registry / browser capabilities
  ↓
Research Intelligence — evidence, claims, provenance, contradictions
  ↓
Gemini Evidence Probe when justified
  ↓
Gemini Right-hand — independent oversight/meta-analysis
  ↓
Gemini Boss — continuation/reframing/stop
```

Preserved invariants:
- Investigator owns research trajectory.
- Gemini Boss is not the Investigator.
- Right-hand is not a duplicate Investigator.
- Search results are leads, not proof.
- Deterministic evidence/provenance state remains authoritative.
- Person-scoped contact attribution remains enforced.
- Context remains bounded.
- No rigid scripted search pipeline was introduced.
- No paid provider is required by the default path.
- No Groq/Mistral substitution for Gemini Boss/Right-hand.
- Model `done` remains a proposal; deterministic grounding/control gates decide whether it can terminate research.
- Old 200k+ prompt failure mode was not reopened.

---

## 4. CI / repository verification

The final correction commit was:

`093fdacf0465149372c55f6154dc2ba9ac234765`

The final merge commit on `main` is:

`369887858c9d73f6eb6dd6aa37e668277b99eb28`

Verified for the final correction commit:
- **Apex API Build 1992 — success**
- **Apex Research Quality Contracts 541 — success**
- **Apex Prompt Architecture Audit 711 — success**
- **Five Consecutive Full Code Audits 1073 — success, all five audit jobs passed**
- **Five Green Complete Codebase Audit 1218 — success, all five audit jobs passed**
- ordinary audit check — success

The final CI failure discovered a stale Mistral model-catalog test cache assumption. It was corrected by isolating catalog-cache keys between tests.

A later full audit also found stale Gemini Boss transport-contract expectations. Those were refreshed to the current 240-second bounded overall budget and live model-catalog discovery semantics.

No production behavior was weakened to make tests pass.

---

## 5. Live Replit runtime status — separate from CI

A fresh live runtime audit was **not completed** after the final merge because the available Replit workspace is stale relative to GitHub `main` and cannot currently boot the API.

The Replit workspace identified itself as BigContacts/Apex Atlas, but reported:
- local revision: `f697fd1140a1159992221f3e4ff1b8f4fc03fabf`
- API workflow failed during startup build;
- TypeScript/esbuild syntax error in `artifacts/api-server/src/src/routes/research/canonical-case-continuation.ts:21`;
- a literal \\n occurs between TypeScript statements;
- `/api/healthz` returned 502;
- `/api/system/status` returned 502;
- `/api/ingest/job/active/atlas-run` returned 502;
- no Atlas run was launched.

This Replit failure is not evidence against the current GitHub `main`. The Replit workspace is not at the current GitHub revision and its configured Git remote was reported as a Replit backup rather than verified GitHub latest main.

**Do not call Apex GREEN from the Replit state above.**

Before a fresh production-like runtime audit:
1. synchronize the Replit workspace to GitHub `main` `369887858c9d73f6eb6dd6aa37e668277b99eb28`;
2. repair/remove the stale local syntax defect only if it is actually present after synchronization;
3. boot the canonical API workflow;
4. verify health/system/active-job readiness;
5. perform exactly one canonical UI-equivalent Atlas launch;
6. collect durable admission deltas;
7. stop at the first genuine failure;
8. do not add provider probes or retries.

---

## 6. Final architecture judgment for successors

Apex is now in the **intelligence-optimization phase**, not an infrastructure-rewrite phase.

The deterministic substrate should continue to own:
- identity;
- evidence;
- provenance;
- persistence;
- source independence;
- contact attribution;
- security;
- budgets;
- admission;
- audit.

The models should navigate that substrate.

The next research work should therefore focus on measured information gain and runtime quality, not adding generic tools or multiplying Gemini calls.

Recommended next measurement set:
- useful evidence per search;
- useful evidence per visit;
- marginal value of Gemini episode checkpoints;
- marginal value of Evidence Probe calls;
- source-family diversity gained per action;
- contradiction resolution rate;
- identity-discrimination gain;
- contact-attribution precision;
- action-yield by cognitive task/provider/model.

Only after those measurements should Apex consider further routing/policy learning.

---

## 7. Successor reading order

A successor must read:
1. `docs/context.md`
2. `docs/apex-atlas-handoff/00_INDEX.md`
3. `docs/apex-atlas-handoff/01_SYSTEM_INTRODUCTION.md`
4. `docs/apex-atlas-handoff/02_GEMINI_CONTROL_PLANE.md`
5. `docs/apex-atlas-handoff/03_RUNTIME_AUDIT_HISTORY.md`
6. `docs/apex-atlas-handoff/04_NEXT_WORK_PLAN.md`
7. `docs/apex-atlas-handoff/05_SUCCESSOR_PROMPT.md`
8. `docs/apex-atlas-handoff/06_RESEARCH_ARCHITECTURE_REVIEW_2026-10-01.md`
9. this volume: `07_RESEARCH_ARCHITECTURE_VNEXT_COMPLETION_2026-10-01.md`

Then inspect the actual current source files before making any claim about implementation.

Never use conversation memory as the source of truth when the repository contradicts it.
