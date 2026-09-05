# Volume 277 — Runtime Truth, Scope Truth, and Blind Comparison

## Status

Active implementation note for the current Apex Atlas mainline. This volume supersedes any older assumption that a green static autonomy check is sufficient.

## 1. New non-negotiable distinction

Apex has three independent contracts:

1. **Research autonomy** — models choose queries, pages, tools, pivots, and stopping points.
2. **Evidence honesty** — deterministic code may reject malformed identity/provenance and may prevent organization evidence from becoming personal evidence.
3. **Runtime reproducibility** — CI must execute the exact committed source without source-mutating prebuild hooks, stale binary assumptions, or hidden environment drift.

A pass in one contract cannot substitute for the other two.

## 2. Scope law

An agentic finding with `scope=candidate` may carry the known target/person identity.

An agentic finding with `scope=organization` or `scope=unknown` must never inherit the target name during persistence or promotion. Unknown scope is conservatively treated as organization scope at the agent-to-ledger boundary.

This is not research ranking. It is an identity/scope safety boundary.

## 3. Source law

A contact claim is not promoted because a deterministic helper can construct a Google/EDGAR/search URL. The URL must identify the public source that actually exposed the claim. Search-result URLs are navigation aids, not evidence of a contact.

## 4. Runtime law

The build must not silently rewrite TypeScript sources through `prebuild`, `pretest`, `pretypecheck`, or CI patch scripts. If a fix is required, it must be committed as source. This makes a live result attributable to a SHA and prevents the classic stale-binary / patch-at-build-time failure.

## 5. Comparison law

Every meaningful 10-target live run should have a blind comparison artifact when runtime permits:

- freeze the same ten names before either side is scored;
- Apex receives only its normal case/target context;
- baseline receives the same names and a comparable public-web research budget;
- do not paste Apex findings into the baseline;
- score card truth, primary-source attribution, organization honesty, wrong-family collisions, and empty-card failures;
- a longer trajectory is never a win by itself;
- Apex loses honestly whenever the independent baseline has a cleaner attributable public route.

## 6. Required failure classes

- `L-ORG-AS-DIRECT`: organization route promoted as personal
- `L-COLLISION`: wrong person/family attribution
- `L-EMPTY`: evidence observed but card remained empty
- `L-NO-SOURCE`: finding lacks exact source URL
- `L-JUNK-ID`: metadata/title/product/fragment became a person
- `L-FAME-RABBIT`: budget consumed by celebrity/billionaire/list enumeration without an attributable route
- `L-SCRIPT`: deterministic code selected a research hop
- `L-RUNTIME`: stale build, mutated source, provider/catalog, install, or environment failure

## 7. Product thesis

Apex is allowed to lose a target. It is not allowed to manufacture a win.

The desired behavior remains: a strong general model with Apex's multi-model context, public-web tools, registries, browser recovery, and evidence ledger should make better decisions than a single generic web agent. That superiority must be demonstrated by same-target outcomes, not asserted from architecture.

## 8. Operational rule

Run in batches of ten where infrastructure permits. Do not claim a 10-target victory from a partial batch. A batch is complete only when all targets have terminal states and the comparison artifact records every target, including no-contact outcomes.
