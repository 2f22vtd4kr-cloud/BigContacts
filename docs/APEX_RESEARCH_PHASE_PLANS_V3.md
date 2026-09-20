# Apex Atlas Research & Reliability — Phase Plans v3

This file is the executable plan behind docs/APEX_RESEARCH_ROADMAP_V3.md.

Each phase has an implementation contract, concrete work items, tests, and a release gate. Phase ordering is an engineering dependency order, not a mandated research sequence for the Investigator.

## Phase 0 — Canonicalize the research surface

Implementation:
- Audit institutional prompt/tool surfaces for retired capabilities.
- Remove WHOIS/WhoisJSON/Whoxy references from active Apex orientation and canonical architecture docs.
- Keep only currently implemented domain/registry capabilities.
- Add a static retired-provider audit to prevent regression.

Tests:
- Search active prompt/tool-surface source for retired-provider strings.
- Verify active Investigator pool remains exactly Groq/Mistral.
- Verify Gemini is never listed as an Investigator.

Gate: no retired provider appears in active Apex capability declarations.

## Phase 1 — Context engineering / working memory

Implementation:
- Introduce bounded working-context assembly.
- Default dynamic Investigator context budget: 18,000 characters.
- Keep objective/findings/latest observation first.
- Keep the newest two trajectory records with bounded observations.
- Replace older raw records with an indexed representation containing turn, action, execution, URLs and findings.
- Preserve complete records in the run result and durable case state.
- Make budget knobs environment-configurable.
- Continue using existing LLM telemetry for prompt size.
- Add a tighter-budget retry path for provider request-size failures without changing Investigator provider or role.

Tests:
- 30/100/500 synthetic records.
- Very large observations.
- Long URLs.
- Duplicate and contradictory findings.
- Ensure source URLs/findings remain represented in compact history.
- Ensure context stays below the configured ceiling.

Gate: trajectory growth no longer causes the prompt to grow linearly with all raw observation text.

## Phase 2 — Observation shaping

Implementation:
- Add bounded model-facing packets for search, visit, browser and specialist-tool results.
- Retain raw provider output durably where the existing event model supports it.
- Extract exact source URLs and evidence-bearing passages.
- Deduplicate repeated copies.
- Preserve negative/failed observations.

Tests:
- Large SERP response.
- Large HTML page.
- Duplicate aggregator pages.
- Page with prompt injection.
- Contact facts embedded in HTML.

Gate: no single tool observation can consume the majority of the Investigator working context.

## Phase 3 — Long-horizon memory

Implementation:
- Promote hypotheses, missing discriminators and dead ends into durable state.
- Add addressable observation/evidence references.
- Rehydrate compacted state deterministically.
- Add restart/replay checkpoint tests.

Tests:
- Multi-compaction investigation.
- Restart after turn 20 and turn 40.
- Contradiction introduced after compaction.
- New evidence invalidating the leading hypothesis.

Gate: the Investigator can continue after multiple compaction boundaries without inventing prior state or forgetting the active objective.

## Phase 4 — Research decision quality

Implementation:
- Expose information-gain and source-independence state.
- Track repeated/low-yield actions.
- Surface unresolved discriminators.
- Preserve deliberate disproof as an available objective, never a mandatory step.
- Keep stopping model-owned.

Tests:
- Ambiguous identity.
- Strong first hypothesis with later contradiction.
- Low-yield search avenue.
- Negative-finding case.
- Case where stopping is correct.

Gate: measured runs improve useful-pivot rate and/or evidence coverage without increasing unsupported claims.

## Phase 5 — Identity and attribution

Implementation:
- Strengthen identity-hypothesis support edges.
- Require source-backed promotion.
- Distinguish organization/person scope.
- Handle stale and temporal contact state.
- Add independent-source corroboration semantics.

Tests:
- Same-name collision.
- Multiple executives at one organization.
- Old vs current role.
- Shared organization switchboard.
- Same contact value across copied sources.

Gate: false-person and false-contact admissions decrease on grounded cases.

## Phase 6 — Provider resilience

Implementation:
- Add explicit provider error taxonomy.
- Treat 413 as request-size pressure.
- Compact before retrying.
- Never silently cross role/provider boundaries.
- Preserve actual provider/model and failure status.
- Add request-size telemetry.

Tests:
- 413.
- 429.
- 500/502/503/504.
- Timeout.
- Cancellation.
- Provider unavailable.

Gate: all failure classes remain truthful and durable; no failure becomes fabricated success.

## Phase 7 — Empirical gauntlet

Implementation:
- Expand grounded registry.
- Execute repeated matched trials.
- Freeze artifacts.
- Score separate quality dimensions.
- Blind adjudication where practical.
- Analyze failures before interventions.

Tests:
- Duplicate trial identity.
- Missing run.
- Wrong configuration envelope.
- Unsupported claim.
- Missing observation linkage.
- Ambiguous gold.

Gate: research-quality claims are reproducible from frozen artifacts.

## Phase 8 — Release hardening

Implementation:
- Long-run health telemetry.
- Recovery checkpoints.
- Fresh-environment launch verification.
- UI/evidence projection checks.
- Continuous retired-provider audit.
- Real smoke investigation on release candidate.

Gate: Apex survives long, interrupted, provider-constrained investigations while retaining truthful durable state.

## Current implementation checkpoint

The first implementation slice in this repository is Phase 0 + Phase 1:
- retired WHOIS references are removed from active orientation/architecture declarations;
- Investigator working context is bounded and selective;
- complete trajectory records remain durable;
- source URLs/findings remain represented in compact history;
- regression tests cover long trajectories;
- subsequent phases remain explicit and gated rather than falsely declared complete.