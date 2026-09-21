# Apex Atlas Research & Reliability Roadmap v3

Status: implementation program opened from the first real canonical ReAct smoke failure, 2026-09-20.

## Purpose

This roadmap turns Apex from a structurally certified agentic bureau into a research system that can sustain long investigations without losing evidence, repeating dead ends, exceeding provider request budgets, or stopping before the evidence warrants a conclusion.

The governing principle:

> The model owns research strategy; the runtime owns memory discipline, evidence integrity, safety, and resource budgets.

The phases describe engineering capabilities and evaluation gates, not mandatory investigation hops.

## Phase 0 — Canonicalize the research surface

Goal: eliminate stale/retired capability references and make the current active tool surface truthful.

Steps:
1. Remove retired WHOIS references from institutional orientation and architecture documentation.
2. Keep RDAP/domain inspection only where it is actually implemented and permitted.
3. Audit provider/model names against active code.
4. Add a static audit that rejects retired-provider references in active Apex prompt/tool-surface files.
5. Record the canonical source SHA and branch for every release checkpoint.

Exit gate: no active Apex orientation/documentation tells an Investigator to use a retired WHOIS provider; active-provider audits remain green.

## Phase 1 — Context engineering / working memory

Goal: prevent ReAct trajectory growth from becoming a provider request failure or a quality-degrading memory dump.

Steps:
1. Treat durable trajectory as append-only research history, not prompt storage.
2. Build a bounded Investigator working context with an immutable objective, current findings, latest observation, recent full acts, compact archived trajectory index, and explicit context-management law.
3. Preserve every durable observation and URL outside the prompt.
4. Never use arbitrary tail truncation that can erase the only source for a claim.
5. Make the context budget configurable and conservative.
6. Measure prompt characters before every Investigator call.
7. Add regression tests for 10x/100x trajectory growth.
8. Add an adaptive tighter-budget path after provider request-size rejection.

Exit gate: synthetic long trajectories remain below the configured working-context ceiling, retain source URLs/findings, and continue the next model turn without 413-class request failure. A second bounded emergency reducer handles an unexpected provider-size rejection.

## Phase 2 — Observation shaping and evidence-first retrieval

Goal: make each observation dense enough to support the next decision without flooding context.

Steps:
1. Keep raw observations durable.
2. Create bounded model-facing observation packets.
3. Prioritize source URL, page title/host, exact supporting passages, contact facts, identity discriminators, contradictions, and execution status.
4. Deduplicate repeated source content while retaining all source references.
5. Distinguish search leads from verified page observations.
6. Preserve negative findings and failed avenues as compact research state.
7. Add source-quality and freshness metadata where available.

Exit gate: large search/page outputs do not dominate the working context, while evidence-bearing passages remain available.

## Phase 3 — Long-horizon investigation memory

Goal: let Apex resume a 20–64 turn investigation as a researcher rather than as a transcript reader.

Steps:
1. Maintain explicit active hypotheses and missing discriminators.
2. Maintain a dead-end ledger.
3. Maintain an evidence ledger keyed by durable observation IDs.
4. Rehydrate objective, hypotheses, contradictions and unresolved questions after compaction.
5. Prevent repeated searches that already failed without new justification.
6. Keep current target identity separate from discovered candidates.
7. Preserve temporal changes instead of flattening them into contradictions.
8. Add restart/replay tests from compacted state.

Exit gate: long synthetic investigations preserve identity hypotheses, contradictions, dead ends and evidence references across repeated compaction boundaries.

## Phase 4 — Research decision quality

Goal: improve what Apex chooses to investigate, not merely how much context it can carry.

A strong human researcher generally establishes the exact question, forms competing hypotheses, seeks high-discrimination sources, triangulates independent sources, deliberately tests disproof, separates discovery leads from verification evidence, pivots from low-yield avenues, and stops when evidence is sufficient or public avenues are exhausted.

Engineering steps:
1. Expose expected-information-gain signals without prescribing a fixed tool order.
2. Make open questions and missing discriminators first-class Investigator state.
3. Track source independence and copied-source clusters.
4. Track useful vs low-yield actions.
5. Feed contradiction and disproof state into the next decision.
6. Preserve abstention as a valid outcome.

Exit gate: evaluation cases show fewer repeated/low-yield actions without reducing evidence coverage or increasing unsupported claims.

## Phase 5 — Identity, attribution, and contact resolution

Goal: make the jump from interesting lead to defensible person/contact attribution explicit and testable.

Steps:
1. Separate person discovery, identity resolution, attribution, corroboration and verification.
2. Require supporting observation IDs for promoted identities.
3. Score candidate hypotheses against discriminators, not name similarity alone.
4. Track contradictory identity evidence explicitly.
5. Treat organization contact routes as organization-scoped unless attribution is evidenced.
6. Handle stale/temporal contact data.
7. Require independent-source corroboration for high-confidence contact claims.

Exit gate: grounded cases show reduced false-person and false-contact admissions while preserving legitimate multi-valued/temporal contacts.

## Phase 6 — Tool resilience and provider-aware execution

Goal: make provider failures ordinary execution events rather than research-ending surprises.

Steps:
1. Classify 4xx/5xx/timeouts/cancellation separately.
2. Distinguish request-size failure from rate limiting and provider outage.
3. Use bounded same-provider request reduction before any allowed retry.
4. Never cross provider roles merely to hide an Investigator failure.
5. Preserve actual provider/model in every trajectory record.
6. Track provider request size and response size.
7. Add replayable tests for 413, 429, 5xx, timeout and cancellation.

Exit gate: provider failures are observable, bounded, and do not corrupt durable case/job state.

## Phase 7 — Empirical research gauntlet

Goal: measure investigative quality independently from architecture certification.

Steps:
1. Freeze versioned grounded cases.
2. Run repeated blind trials under matched resource envelopes.
3. Preserve raw trajectories and evidence graphs.
4. Score identity precision/recall, attribution, supported claims, unsupported claims, contradictions, source quality and negative-finding calibration separately.
5. Report operational cost/latency/tool-use metrics separately.
6. Analyze failure classes before changing prompts/models.
7. Never collapse the evaluation into a single winner score.

Exit gate: repeated runs across the expanded grounded registry demonstrate stable evidence-backed behavior; release claims are based on measured artifacts.

## Phase 8 — Release and operational hardening

Goal: make the bureau dependable in continuous real use.

Steps:
1. Add long-run memory and provider health telemetry.
2. Add durable checkpoint/recovery semantics.
3. Verify cancellation and restart recovery.
4. Keep UI as a projection over canonical evidence state.
5. Keep retired-provider and architecture audits in CI.
6. Require real smoke investigations before release.
7. Keep live empirical quality separate from structural CI.

Exit gate: a fresh environment can import the authoritative branch, launch Apex, complete controlled real investigations, recover from provider/context failures, and expose truthful evidence state.

## Roadmap acceptance law

No phase may solve research quality by adding a fixed search sequence, forcing a provider, substituting Gemini for an Investigator, promoting LLM prose without source evidence, deleting durable observations to make prompts fit, or silently converting provider failures into success.

The runtime may compress presentation. It may never rewrite history.

Current implementation slice: Phase 0 + Phase 1 working-memory boundary, plus bounded 413/request-size recovery. Phase 2+ remain explicitly gated by their tests and research-quality evidence.