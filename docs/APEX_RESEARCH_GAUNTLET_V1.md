# Apex Research Gauntlet v1

## Purpose

Apex has reached a structural/regression milestone. The next question is empirical:

> Given the same research problem and comparable resources, does Apex produce accurate, well-supported investigations with fewer unsupported or misattributed claims?

This benchmark measures the complete research system, not an abstract model ranking.

## Protocol

### 1. Freeze the case

Every case is versioned and contains the objective, target description, allowed scope, ground-truth identities, supported claims, expected contact states, known distractors, important contradictions and source-quality expectations.

Ground truth is established independently from Apex output and reviewed before scoring.

### 2. Use matched runs

For each case:
- run Apex at least 3 times with the same task contract;
- preserve every raw output, trajectory, observation and evidence graph;
- use the same case objective and comparable resource/time/token envelopes for each baseline;
- record system/version/provider/model configuration separately from the scored answer;
- do not seed URLs, contacts or expected identities into the system under test.

Baseline systems may include a strong single-agent researcher and a strong multi-agent researcher. An external product/model is included only if its tool access, task prompt, budget and output evidence are sufficiently comparable.

### 3. Blind scoring

The scorer receives only frozen ground-truth and recorded-run artifacts. Human adjudication should be blind to system identity where practical.

The deterministic scorer never calls the web or infers missing ground truth.

## Metrics

### Research correctness

- Identity precision / recall.
- Contact attribution precision / recall.
- Claim support correctness.
- Unsupported-claim rate.
- False-positive identity rate.
- Contradiction detection / resolution.
- Source-quality correctness.
- Negative-finding calibration.

### Operational behavior

- useful pivots;
- unnecessary calls;
- successful observations;
- trajectory length;
- wall time;
- token/model cost where available;
- timeout/cancellation/failure rate.

Operational metrics describe behavior; they are not converted into a single quality score.

## Required run artifact

A recorded run uses schemaVersion research-run-v1 and contains caseId, system, trialId, identities, claims, contacts, contradictions, observations, trajectory and outcome.

Every claim/contact must reference the observations that support it. Observation IDs must be unique within a run.

## Interpretation

Report distributions and case-class breakdowns rather than one global smartness number.

For each aggregate metric report the number of scored runs, mean/rate, case-class breakdown, missing/system-failure counts and notable failure examples.

Do not treat a system failure as a research miss. Keep system_failure, insufficient_evidence, and wrong_answer distinct.

Do not publish a single overall ranking. The benchmark identifies where each architecture succeeds or fails and which engineering changes improve reproducible evidence quality.

## Adversarial classes

The registry includes classes for common-name collisions, same-organization collisions, sparse footprints, stale contacts, conflicting contacts, copied aggregators, organization-only traps, ownership/succession chains, multi-pivot investigations, negative findings, misleading search results, public-page prompt injection, duplicate publishers, social-profile collisions, role drift, temporal contradictions, multiple legitimate contact channels, and strong identity evidence with no direct contact.

Expand to 30–50 fully grounded cases before using the benchmark as a release gate.

## Repository artifacts

- benchmarks/research-gauntlet-v1.json — versioned case registry/schema.
- scripts/validate-research-gauntlet.mjs — deterministic artifact validation.
- scripts/evaluate-research-gauntlet.mjs — deterministic metric computation.
- artifacts/api-server/src/src/test/research-gauntlet.test.ts — scorer regression tests.

The benchmark is deliberately separate from scoreboard-shell.mjs. The old scoreboard is an operational contact-card heuristic; it is not a research-quality benchmark.