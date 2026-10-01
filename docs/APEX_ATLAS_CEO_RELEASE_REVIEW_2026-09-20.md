# Apex Atlas — CEO / Lead-Engineer Release Review

**Review date:** 2026-09-20  
**Reviewed branch:** `audit/apex-atlas-very-strong-v1`  
**Production/certification branch:** `audit/genuine-five-green-final`  
**PR:** #347, draft

## Executive decision

**Do not publish Apex Atlas yet.**

The architecture is now substantially stronger and internally coherent, but the remaining risk is whether the deployed system actually performs truthful, durable research under real conditions.

If my capital and reputation were at stake, I would keep the release candidate behind the gate until runtime, end-to-end research, UI truth, failure drills, and empirical quality gates are demonstrated.

## What I would trust today

- **Role separation:** Gemini Boss and Gemini Right-hand are oversight; Groq/Mistral are the Investigator pool.
- **Model-owned trajectory:** the Investigator chooses the research route; deterministic code enforces safety rather than a hidden search recipe.
- **Evidence-first state:** observations, claims, identity hypotheses, contradictions, contacts, negative findings, provenance, and trajectory are durable research state.
- **Bounded cognition:** model-facing context is compacted without deleting durable evidence.
- **Source independence:** copied/syndicated pages are not automatically treated as independent corroboration.
- **Adaptive discovery:** historical yield can influence discovery while diversity floors protect coverage.
- **Structured decisions:** provider-native structured outputs reduce malformed action transport risk, followed by semantic validation.
- **Failure observability:** identity, source, attribution, stopping, prompt-injection, and system failure signals are explicit diagnostics.

Current Groq documentation states that strict structured outputs guarantee schema adherence on supported models and require closed objects/required fields; Mistral recommends custom structured outputs when possible. This validates the direction of the structured-output work, but not the semantic correctness of the research decisions.

## What I would not trust yet

### Critical 1 — Production runtime

The last canonical runtime audit failed closed because the required Apex provenance/database schema was missing.

The correct behavior was to refuse startup rather than run without durable evidence.

The explicit schema initializer now exists, but release still requires:

1. schema initialization;
2. verification of required durable tables;
3. schema mutation disabled;
4. canonical boot;
5. health verification;
6. one real research run;
7. durable evidence verification after the run.

### Critical 2 — Research quality

The current grounded Gauntlet registry contains 38 cases.

The fixture is not proof of research quality. Before publication I want repeated live runs with identical task contracts, documented resource envelopes, preserved raw trajectories/evidence, deterministic scoring, system failures separated from research failures, and unknown/insufficient-evidence allowed.

### Critical 3 — UI truth

Manual, Reactor, profiles, cards, and job views must all be projections of canonical state.

A convincing UI showing simulated or stale activity is a release blocker. The Manual has now been rewritten to match the current architecture and retired-provider contract; a live UI audit is still required.

### Critical 4 — Failure drills

Deliberately force provider timeout, 429/5xx, request-size pressure, cancellation, same-name collision, copied evidence, stale contact, contradictory sources, prompt injection, and unavailable tools.

For every drill, truthful durable state must survive.

### Critical 5 — CI

The first Very Strong CI run exposed a workflow defect: setup-node attempted to configure the pnpm cache before pnpm was installed. That workflow defect was fixed. The corrected workflow still needs a successful run on the actual release candidate.

## Architecture risks I would monitor

### Adaptive feedback loops

Feedback-driven discovery can over-exploit historically successful lanes. Diversity floors reduce the risk, but live telemetry must verify that coverage does not collapse.

### Correlated independent trajectories

Parallel investigators are only useful if they explore materially different evidence/source families. Lane identity and provenance must remain inspectable.

### Context compaction

The compacted context must preserve unresolved questions, weak/strong hypotheses, source independence, failed avenues, and support references. The full history must remain durable.

### Contact quality

The commercial promise depends on attributable contact paths, not plausible-looking names. Release metrics should therefore emphasize contact attribution precision, false-person admissions, unsupported-contact rate, and negative-finding calibration.

## Important engineering correction made during this review

The adaptive discovery implementation originally allocated only from a pre-randomized slate. That meant a high-performing lane could never be selected if it missed that slate.

This has now been corrected so feedback competes across the full eligible discovery pool, with a regression test for pool-wide learning.

## Release gates I would personally sign

- [ ] Reviewed branch is cleanly integrated into the intended production branch.
- [ ] Frozen install succeeds.
- [ ] Typecheck succeeds.
- [ ] Architecture/autonomy checks succeed.
- [ ] Very Strong CI succeeds on the actual release candidate.
- [ ] Schema initialization succeeds and ordinary boot leaves schema mutation disabled.
- [ ] Canonical boot and health succeed.
- [ ] Gemini Boss executes with its own credential.
- [ ] Gemini Right-hand executes with its own credential.
- [ ] Groq or Mistral executes as the Investigator.
- [ ] A real investigation produces source-backed observations.
- [ ] Evidence graph/event ledger persist across the run.
- [ ] Final contacts trace to evidence, not only LLM prose.
- [ ] Cancellation and provider failures preserve truthful durable state.
- [ ] UI displays the same durable truth as the API/database.
- [ ] Repeated Gauntlet trials are completed.
- [ ] Research metrics are reviewed by case class.
- [ ] Release branch/SHA/model configuration/schema state are pinned.

## Final assessment

Apex is now much closer to a genuine research system rather than a collection of OSINT tools around an LLM. The strongest parts are model-owned strategy, deterministic safety, durable evidence, bounded cognition, source independence, adaptive discovery, independent research lanes, structured model contracts, and failure observability.

If all my money were in the company, I would continue investing in this architecture.

I would **not** confuse architectural maturity with demonstrated field reliability.

The remaining work is the decisive work: run Apex in a fresh environment, research real cases, make every claim traceable to evidence, deliberately break the system, verify truthful recovery, and measure the results.

Only then would I put the public release behind my name.
