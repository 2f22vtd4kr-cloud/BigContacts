# Apex Research Gauntlet v1

## Purpose

Apex has a strong structural/architecture foundation. The next question is empirical:

> Given the same research problem and comparable resources, does Apex produce accurate, well-supported investigations with fewer unsupported or misattributed claims?

This benchmark measures the complete research system, not an abstract model ranking.

## Current grounded registry

The current registry contains **38** cases, all marked ready and independently cross-checked.

- schema: `research-gauntlet-v1`
- version: `1.1.1`
- status: `grounded-reviewed`
- ground truth as of: `2026-09-18`

The registry is intentionally still below the eventual 50-case target. Do not describe it as a 50-case benchmark.

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

Baseline systems may include a strong single-agent researcher and a strong multi-agent researcher. External products are included only when their tool access, prompt, budget and output evidence are sufficiently comparable.

### 3. Blind scoring

The scorer receives only frozen ground truth and recorded-run artifacts. Human adjudication should be blind to system identity where practical.

The deterministic scorer never calls the web or infers missing ground truth.

## Metrics

### Research correctness

- identity precision / recall;
- contact attribution precision / recall;
- claim support correctness;
- unsupported-claim rate;
- false-positive identity rate;
- contradiction detection / resolution;
- source-quality correctness;
- negative-finding calibration.

### Operational behavior

- useful pivots;
- unnecessary calls;
- successful observations;
- trajectory length;
- wall time;
- token/model cost where available;
- timeout/cancellation/system-failure rate.

Operational metrics describe behavior; they are not converted into a single quality score.

## Required run artifact

A recorded run uses schema `research-run-v1` and contains caseId, system, trialId, identities, claims, contacts, contradictions, observations, trajectory and outcome.

Every claim/contact must reference the observations that support it. Observation IDs must be unique within a run.

## Interpretation

Report distributions and case-class breakdowns rather than one global smartness number.

For each aggregate metric report the number of scored runs, mean/rate, case-class breakdown, missing/system-failure counts and notable failure examples.

Do not treat a system failure as a research miss. Keep `system_failure`, `insufficient_evidence`, and `wrong_answer` distinct.

Do not publish a single overall ranking.

## Adversarial classes

The registry includes common-name collisions, same-organization collisions, sparse footprints, stale contacts, conflicting contacts, copied aggregators, organization-only traps, ownership/succession chains, multi-pivot investigations, negative findings, misleading search results, public-page prompt injection, duplicate publishers, social-profile collisions, role drift, temporal contradictions, multiple legitimate contact channels, and strong identity evidence with no direct contact.

## Release interpretation

The Gauntlet is not a release gate merely because the fixture exists. Release-quality evidence requires repeated controlled live runs, preserved trajectories/evidence, matched resource envelopes, deterministic scoring, and failure analysis.

## Repository artifacts

- `benchmarks/research-gauntlet-v1.json` — 38-case reviewed ground-truth registry.
- `scripts/validate-research-gauntlet.mjs` — deterministic artifact validation.
- `scripts/evaluate-research-gauntlet.mjs` — deterministic metric computation with source-backed claim verification.
- `artifacts/api-server/src/src/test/research-gauntlet.test.ts` — scorer regression tests.
