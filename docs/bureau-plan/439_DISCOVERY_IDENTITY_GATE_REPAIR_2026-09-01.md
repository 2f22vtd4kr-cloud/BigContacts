# Volume 439 — Discovery Identity Gate Repair and Source-of-Truth Migration

**Date:** 2026-09-01
**Status:** active living-plan entry
**Parent:** APEX_ATLAS_MASTER_BUREAU_PLAN

## 1. New verified evidence

The first provider-backed 10-target audit attempt after the previous runtime-gate repair did **not** reach a provider-backed Bureau launch. The build itself succeeded, the static autonomy checks passed, and the focused discovery tests then exposed seven real contract failures.

Five were malformed-name regressions:

- `comPrecision Production`
- `Head of Marketing`
- `Chief Marketing Officer`
- `Vice President of Sales`
- `Managing Director`

One was an admission-scope regression: an explicitly named person on an organization-scoped leadership page was being rejected even though the source was visited and the personName was explicit.

One was a stale static assertion: the test expected the old `parsePersonFindings(result.findings...)` text while the executable source had already moved to `result.modelFindings` plus trajectory evidence.

## 2. Root cause

The important failure was not that the LLM needed a larger blacklist. The canonical discovery source had accumulated a strong identity boundary, but the compatibility hardener was not carrying the complete intended boundary into the generated runtime. In addition, the runtime test had drifted behind the modelFindings control-plane change.

The correct response is:

1. preserve model-owned research judgment;
2. strengthen only the deterministic identity/provenance safety boundary;
3. make tests inspect executable contracts rather than prose;
4. migrate generated hardening into permanent source so build-time rewriting is no longer the source of truth.

## 3. Permanent identity rule

A candidate may enter the ledger only when the model explicitly emits the person, the candidate has a real HTTP(S) source, the cited source is not merely a search/list URL, and the cited page was actually observed in the trajectory.

Organization scope is not itself a rejection when `personName` is explicitly emitted. A company leadership page is an organization source but may contain a genuine named human. The semantic decision remains the model's; the deterministic gate verifies shape, provenance, and observation.

Title strings, extraction fragments, addresses, generic sector phrases, product phrases, and camelCase scrape artifacts remain safety failures. This is identity hygiene, not HNWI ranking.

## 4. Forbes / fame rule

Forbes/Bloomberg billionaire rankings remain allowed as incidental context when a model independently finds a person, but they are not an intake strategy. Discovery should prefer operating principals, founders, investors, family-office principals, owners, advisers, and other people with plausible public/intermediary routes. The model must decide whom to pursue; deterministic code must not score wealth or fame.

## 5. Runtime-gate rule

`AGENTIC_RESEARCH_CONCURRENCY` limits simultaneous independent runs only. Once a model owns a run, its ReAct action surface remains free: query wording, source choice, visits, OSINT tools, pivots, depth, and stopping are model decisions subject only to global execution budgets and provenance/promotion safety.

## 6. Required source migration

The compatibility hardeners are transitional. The next implementation stage is to copy their proven behavior into the canonical TypeScript modules, then make the hardeners no-op/idempotent verification guards rather than source rewriters.

The generated runtime must be byte/semantic-equivalent to main-source behavior before the compatibility scripts are retired.

## 7. Validation sequence

After this repair:

1. focused discovery identity tests;
2. full static autonomy suite;
3. provider generation preflight;
4. single-target real Dig trace;
5. 10-target discovery-first batch;
6. trajectory/provenance audit;
7. independent blind baseline on exactly the same admitted targets;
8. only then expand to repeated 10-target batches and the 100-target validation set.

No green static run is a research-quality victory.
