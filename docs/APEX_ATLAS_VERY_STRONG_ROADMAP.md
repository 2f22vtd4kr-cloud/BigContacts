# Apex Atlas — Very Strong Engineering State and Release Roadmap

**Updated:** 2026-10-09  
**Canonical working branch:** `main`  
**Current architecture authority:** `docs/context.md`, `README.md`, and the executable code on `main`.

> **Historical-document warning:** This roadmap originated before the current main-branch control-plane migration. Any later section that names Gemini as Boss/Right-hand, Mistral as an active Investigator, or an audit branch as the production/certification branch is historical and superseded. The current canonical role law on `main` is Groq Boss + Groq Right-hand for control/oversight and the selected Groq Investigator capability for research. Do not restore retired providers based on this document. Static CI does not certify live deployment or empirical research quality.

## Design principles

1. Model-owned trajectory; deterministic safety.
2. Capability semantics over function names.
3. Hypothesis-driven research and explicit information-gain signals.
4. Independent corroboration, not URL-count corroboration.
5. Evidence graph as durable cognitive state.
6. Adaptive discovery with diversity floors.
7. Escalation by need rather than scripted phase order.
8. No invented contacts or unsupported admissions.
9. Provider-native structured model contracts plus semantic validation.
10. End-to-end empirical evaluation rather than architecture-only claims.

## Current implementation status

| Capability | Status | What is actually true |
|---|---|---|
| Groq Boss + Groq Right-hand separation | Implemented | Distinct control/oversight roles; neither becomes the Investigator |
| Groq Investigator capability pool | Implemented | A selected configured capability owns the trajectory; no silent credential rotation |
| Model-owned research trajectory | Implemented | No fixed identity→org→contact route |
| Capability registry | Implemented | Actions expose purpose, evidence value, limitations and cost |
| Evidence-graph cognition | Implemented baseline | Durable state is rendered into bounded Investigator context |
| Context compaction | Implemented | Prompt-facing state is bounded; durable history remains outside prompt |
| Information-gain assessment | Implemented baseline | Every selected action receives deterministic research-value assessment |
| Adaptive discovery portfolio | Implemented baseline | Historical lane feedback changes allocation while preserving diversity floors |
| Independent Investigator ensemble | Implemented opt-in | Parallel lanes can explore materially different source families |
| Source-family/source-class intelligence | Implemented | Copied/syndicated sources are not automatically independent |
| Structured action output | Implemented baseline | Groq uses provider-aware structured response contracts where supported, followed by semantic validation |
| Failure observability | Implemented baseline | Diagnostic trajectory failure signals are recorded without mutating results |
| Prompt-injection boundary | Implemented baseline | Public web content remains untrusted and tool execution is validated |
| Durable provenance/evidence ledger | Implemented in architecture | Production release still requires live schema/boot verification |
| Real research-quality benchmark | Not yet release-gated | 38-case grounded registry exists; controlled campaign still required |
| Fresh production runtime certification | Not yet | Latest documented user-run Replit audit (2026-10-08) stopped before the first valid Investigator action; no durable research evidence was produced |

## What the model may do

The Investigator may choose among enabled capabilities such as:

- web search;
- page/HTTP retrieval;
- browser/fetch escalation;
- public registries;
- domain/RDAP inspection;
- approved footprint/contact tools;
- disproof and contradiction searches;
- revisits and alternate source families.

The application may reject an unsafe, malformed, unauthorized, over-budget, provenance-invalid, or unavailable action. It must not silently replace the model's research strategy with a hidden route.

## Research cognition

The current Investigator context includes bounded projections of:

- objective;
- findings;
- identity hypotheses;
- discriminators;
- contradictions;
- contacts;
- negative findings;
- open questions;
- recent actions;
- source-family coverage;
- source-quality summary;
- durable mission context.

Compaction is presentation-layer compression only. Full observations and trajectory records remain durable.

## Adaptive discovery

The allocator uses prior lane feedback including:

- candidate yield;
- admission yield;
- useful evidence;
- reachability;
- duplicate rate;
- geography;
- occupation;
- wealth mechanism;
- source kind.

Diversity floors prevent one high-yield lane from monopolizing discovery.

## Independent trajectories

The optional ensemble path runs multiple Investigator lanes concurrently and merges findings deterministically. Each lane remains independently inspectable.

This is not a mandatory “multi-agent route”; it is a capability available when independent exploration is useful.

## Structured output

Provider-native structured responses are used where supported:

- Groq: provider-native structured JSON/schema response; reasoning is kept separate from the action payload.
- Semantic validation follows schema validation.
- Provider errors remain explicit.

## Failure observability

Current diagnostic classes include identity collision/overcommitment, insufficient evidence, misleading search result, stale source, copied contact, wrong entity, contact misattribution, contradiction misclassification, missed/unnecessary pivot, tool-selection error, premature/late stop, prompt injection, source-quality error, and system failure.

These signals are diagnostics. They do not rewrite the research result.

## Empirical release gate

The current Gauntlet registry is:

- schema `research-gauntlet-v1`;
- version `1.1.1`;
- `grounded-reviewed`;
- 38 cases;
- ground truth as of 2026-09-18.

Before release, run repeated matched trials and preserve:

- raw model outputs;
- trajectory;
- observations;
- provenance;
- evidence graph;
- final claims/contacts;
- system failures.

Report separate correctness and operational metrics. Unknown is valid. Do not collapse the benchmark into a single winner score.

## Release hardening still required

### Gate 1 — Runtime truth
Initialize the required Apex schema through the explicit operator-approved helper, then boot without schema mutation enabled.

### Gate 2 — End-to-end smoke
Run at least one controlled real case through Groq Boss → selected Groq Investigator → tool → observation → evidence → Groq Right-hand/Boss review → durable final state.

### Gate 3 — Failure drills
Exercise provider timeout/error, cancellation, context pressure, identity collision, copied-source corroboration, stale contact, and public-page prompt injection.

### Gate 4 — UI truth
Verify the Manual, Reactor, profiles, job status, evidence, and contact cards are projections of the same canonical durable state. Remove or label any demo/simulated state that could be mistaken for live research.

### Gate 5 — Gauntlet campaign
Run the grounded cases repeatedly under matched resource envelopes and review failure classes before publishing research-quality claims.

### Gate 6 — Release artifact
Pin branch/SHA, dependency lockfile, database migration state, environment contract, model configuration, and benchmark version in the release record.

## Release law

Apex is not “production ready” because architecture checks are green.

Production readiness means a fresh environment can:

1. install reproducibly;
2. initialize schema explicitly;
3. boot canonically;
4. authenticate safely;
5. execute a real Investigator trajectory;
6. persist truthful evidence and provenance;
7. survive controlled failures;
8. render the same truth in the UI;
9. produce reproducible empirical evaluation artifacts.

No release may weaken tests, force a research route, seed evidence, promote LLM prose without source support, or hide a provider/system failure.
