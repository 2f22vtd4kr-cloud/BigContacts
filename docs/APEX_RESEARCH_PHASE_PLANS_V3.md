# Apex Atlas Research & Reliability — Phase Plans v3

**Updated:** 2026-09-20

This file is the executable plan behind `docs/APEX_RESEARCH_ROADMAP_V3.md). Phase order is an engineering dependency order, not a mandated research sequence.

## Phase 0 — Canonicalize the research surface

Implementation:
- keep the active 13-secret contract explicit;
- keep Groq/Mistral as the only Investigator pool;
- keep Gemini Boss/Right-hand role-separated;
- prevent retired provider names from re-entering active prompts/tool surfaces.

Gate:
- no active runtime contract requires DeepSeek/NVIDIA/WHOISJSON.

## Phase 1 — Context engineering / working memory

Implementation:
- bounded Investigator context;
- durable trajectory outside prompt;
- evidence-bearing recent records plus compact archived history;
- emergency tighter reducer after provider request-size rejection.

Gate:
- long trajectories remain usable without deleting durable evidence.

## Phase 2 — Observation shaping

Implementation:
- bounded model-facing observations;
- source URLs, evidence-bearing passages, execution status, source class, and extraction method;
- repeated-source awareness.

Gate:
- no single observation dominates the working context.

## Phase 3 — Long-horizon memory

Implementation:
- hypotheses/discriminators;
- contradictions;
- negative findings/dead ends;
- contact state;
- source-family coverage;
- durable observation references.

Gate:
- compaction/restart preserves research state.

## Phase 4 — Research decision quality

Implementation:
- capability semantics;
- information-gain assessment;
- identity/contact/source-independence signals;
- model-owned stopping and pivots.

Gate:
- live cases show useful-pivot/evidence improvements without unsupported-claim growth.

## Phase 5 — Identity and attribution

Implementation:
- explicit promotion state;
- source-backed identity hypotheses;
- organization/person scope;
- stale/temporal contact handling;
- independent source-family corroboration.

Gate:
- false-person and false-contact admissions decrease on grounded cases.

## Phase 6 — Provider resilience

Implementation:
- structured provider responses;
- explicit provider/model attribution;
- request-size recovery;
- failure taxonomy;
- truthful timeout/cancellation behavior.

Gate:
- 413/429/5xx/timeout/cancellation drills preserve durable truth.

## Phase 7 — Empirical gauntlet

Implementation:
- current 38-case grounded registry;
- repeated matched trials;
- frozen run artifacts;
- deterministic scoring;
- blind adjudication where practical.

Gate:
- empirical release claims are reproducible and failure classes are understood.

## Phase 8 — Release hardening

Implementation:
- fresh-environment boot;
- schema initialization and post-init lockout;
- durable recovery/checkpoint verification;
- UI projection checks;
- retired-provider CI audit;
- real smoke research;
- release artifact pinning.

Gate:
- a fresh environment can complete and recover a controlled investigation while retaining truthful evidence.

## Current checkpoint

The current reviewed branch has substantial implementation across Phases 0–6 and the benchmark infrastructure for Phase 7. The remaining work is primarily empirical/runtime proof, failure-drill coverage, and release hardening—not another architecture-only status document.
