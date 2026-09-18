# Apex 10-Phase Implementation Roadmap

Status: implemented baseline, 2026-09-18

This document turns the post-certification roadmap into executable repository contracts. It deliberately separates engineering certification, research correctness, source quality, safety, and human review.

## Phase 0 — reproducibility freeze
- Pin the benchmark registry/version, evaluator version, system/provider/model configuration, task envelope, seed and trial id.
- Every benchmark run is immutable once recorded.
- The certified SHA is metadata, never a hard-coded release truth.

## Phase 1 — real Gauntlet execution
- The 38 grounded cases are the baseline.
- A campaign is 3+ matched trials per case.
- Raw trajectories, observations and evidence graphs are mandatory artifacts.
- Missing evidence is valid; unsupported certainty is not.

## Phase 2 — Investigator Failure Observatory
Every run may emit structured failure records. Failures are classified independently from research outcomes and system failures.

Canonical classes:
IDENTITY_COLLISION, IDENTITY_OVERCOMMITMENT, INSUFFICIENT_EVIDENCE, MISLEADING_SEARCH_RESULT, STALE_SOURCE, COPIED_CONTACT, WRONG_ENTITY, CONTACT_MISATTRIBUTION, CONTRADICTION_MISCLASSIFICATION, MISSED_PIVOT, UNNECESSARY_PIVOT, TOOL_SELECTION_ERROR, PREMATURE_STOP, LATE_STOP, PROMPT_INJECTION, SOURCE_QUALITY_ERROR, SYSTEM_FAILURE.

## Phase 3 — adversarial expansion
New cases are regression cases derived from observed failures. The release target is 50+ independently grounded cases; the current 38 remain the frozen baseline.

## Phase 4 — Evidence Graph 2.0
Claims and contacts must be traceable to observations and sources. Identity hypotheses retain supporting and disconfirming evidence. Temporal validity is first-class so legitimate succession does not become a contradiction.

## Phase 5 — Source Intelligence
Every observation records source class, URL provenance, freshness timestamps and extraction method where available. Source quality is measured separately from claim correctness.

Canonical source classes:
REGULATORY, OFFICIAL_COMPANY, OFFICIAL_GOVERNANCE, OFFICIAL_PERSONAL, REPUTABLE_NEWS, PROFESSIONAL_DIRECTORY, SOCIAL_PROFILE, SEARCH_RESULT, AGGREGATOR, SCRAPED_DIRECTORY, UNKNOWN.

## Phase 6 — controlled Investigator experiments
Groq and Mistral remain the active Investigator pool. Matched experiments compare behavior by case class and operational envelope; they do not produce a global model ranking.

## Phase 7 — evidence-driven Investigator evolution
Prompt/policy changes require benchmark evidence and regression coverage. Useful pivots, unnecessary calls, premature stops and unsupported claims are tracked as behavioral signals.

## Phase 8 — OSINT safety
Python-backed OSINT remains fail-closed until enforceable sandbox/container/VM egress isolation exists. Redirects, oversized responses, hostile content and prompt injection are security test classes.

## Phase 9 — investigator workstation
The existing frontend should expose the evidence path: objective → identity hypotheses → claims/contacts → observations → original source, plus trajectory, oversight and final outcome. UI changes must not create a second research control plane.

## Phase 10 — continuous evaluation
CI validates benchmark artifacts and schemas. Research campaigns produce machine-readable results and failure observations. Engineering, research and safety gates remain separate.

## Release posture
Do not call the Gauntlet a release gate until the registry reaches 50+ grounded cases and repeated campaigns demonstrate stable evidence-backed behavior. Never convert the multidimensional metrics into a single intelligence score.
