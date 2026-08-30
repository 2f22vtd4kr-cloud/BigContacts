# Apex Atlas 40K Living Plan — Implementation Log / 2026-08-30

**Parent specification:** `docs/bureau-plan/40K_RESEARCH_AGENT_INTEGRITY_PLAN.md`

**Purpose:** This is an append-only implementation log for the 40K living engineering contract. It records evidence discovered while implementing the contract and converts that evidence into explicit next actions. It is intentionally separate from the monolithic master document so an implementation cycle never overwrites historical plan text merely to append a new finding.

## 1. Why this entry exists

The 40K plan requires the system to be treated as a model-led research bureau rather than a deterministic enrichment pipeline. It also requires every live claim to be distinguished from static verification and requires failures to be traced causally from model-visible assignment through observation, parsing, promotion and persistence.

The current implementation cycle produced a useful result: the first identity-boundary patch was necessary but not sufficient. The remaining risk is not primarily a missing name regex. The more dangerous class is **identity inheritance**: a downstream adapter can receive an incomplete finding and fill the missing person association from ambient target context. That converts a hypothesis or observation into an identity claim without new evidence.

The second finding is equally important: the durable contact persistence layer still contains a historical compatibility behavior that can manufacture a public search URL when an agentic contact finding has no exact source URL. A search URL is not evidence of the underlying email or phone claim. This violates the evidence law even if the resulting row remains marked as candidate/review-only.

These two findings update the implementation priority for the plan.

## 2. Evidence observed in the repository

### 2.1 Candidate identity inheritance

The bureau and target-contact adapters previously accepted a candidate-scoped finding with `personName=null` and used the caller's target name as the effective person. This is causally unsafe because the target name is assignment context, not evidence extracted from the finding.

The corrected rule is:

```text
candidate + explicit personName -> candidate/person-scoped evidence
candidate + missing personName -> organization/unknown evidence
```

The target supplied to an agent is never allowed to fill a missing identity field.

### 2.2 Source-backed does not mean identity-backed

The existing source-backed filter correctly requires an HTTP(S) source URL. That is necessary but insufficient. A real URL can still be unrelated to the named person. Therefore the identity boundary has two separate predicates:

1. **source existence:** the finding has a real public URL;
2. **source establishment:** the source actually supports the claimed identity/value relationship.

The second predicate must remain an evidence requirement, not a fame, wealth, relevance or target-fitness gate.

### 2.3 Durable persistence contains a synthetic-search-URL path

The contact persistence implementation currently contains a compatibility path that, for some agent/target-contact sources, constructs a Google search URL when a phone/email/social finding has no source URL. That URL makes the claim look reviewable but does not establish that the value was observed on the source.

This is contrary to the plan's exact-source law. A search query can be a **research action** recorded in trajectory state; it cannot be substituted for the **evidence source** of the resulting contact claim.

The same conceptual problem exists in related-person/issuer fallback paths that construct registry search URLs when no exact source is present. Those URLs may be useful research actions, but they must not be persisted as if they were evidence of the resulting claim.

### 2.4 Discovery contact collection has an identity fallback

The durable discovery-contact collection path also contains a fallback where an evidence item associated with a candidate whose name matches the requested target can inherit `targetName` when `item.personName` is absent.

That is the same causal bug in another location. Matching the candidate container is not proof that every child contact finding belongs personally to that human.

The correct invariant is:

```text
container identity match != child claim identity
```

A child finding must carry its own person association or remain non-personal evidence.

## 3. Changes already made in this implementation cycle

The current fix branch establishes the first layer of the boundary:

- candidate-scoped findings without an explicit `personName` are demoted rather than bound to the caller target;
- organization/unknown findings do not inherit the target person;
- model-selected discovery admission is not ranked by target fitness;
- model-selected candidates remain subject to identity/provenance safety;
- candidate identity tests preserve historical malformed-fragment regressions;
- focused identity/provenance CI is executable independently of the broken repository-wide typecheck;
- the CI workflow installs pnpm before enabling pnpm caching;
- the workflow runs the focused regression suite after dependency installation.

The corrected focused GitHub Actions run completed successfully. This proves the targeted regression suite executes and passes; it does **not** prove the full repository builds, provider-backed research works, or Apex beats a baseline.

## 4. New implementation priorities

### Priority P0 — eliminate evidence fabrication at persistence

The persistence layer must become fail-closed for source provenance. If a contact claim arrives without an exact public HTTP(S) source, the persistence layer must not manufacture a search URL, registry search URL, or other query endpoint and store it as `sourceUrl`.

The research query should remain available in trajectory telemetry. The claim itself should either:

- be discarded from durable contact evidence;
- remain as an explicitly non-evidence hypothesis in transient state; or
- be persisted in a separate observation/hypothesis structure whose schema cannot be mistaken for evidence.

The choice must preserve the agent's ability to continue researching without allowing an ungrounded value to become a durable fact.

### Priority P0 — remove container-to-child identity inheritance

Audit every function that maps discovery candidates, research findings, evidence rows or contact vectors into a person/entity card. Search specifically for patterns equivalent to:

```text
missing personName ? targetName : personName
```

and:

```text
candidate container matches target -> child claim is personal
```

The correct behavior is to preserve uncertainty. A finding may remain useful without being personal.

### Priority P1 — distinguish query URLs from evidence URLs in the type system

The system should make it difficult to represent a search query URL as a claim source. A useful conceptual split is:

- `EvidenceSourceUrl`: URL where the claimed value was observed or established;
- `ResearchActionUrl`: URL/query used to discover or navigate to evidence;
- `SourceStatus`: retrieved / blocked / errored / unavailable;
- `EvidenceBinding`: person / organization / unknown.

If a full type migration is too broad for one cycle, enforce the distinction at the persistence boundary first and then migrate the internal representation incrementally.

### Priority P1 — preserve provider and trajectory causality

The focused tests are not sufficient to establish agent autonomy. Future live audits must capture:

- exact provider/model;
- provider health state;
- model-visible objective;
- model-selected action;
- tool arguments;
- raw/normalized observation;
- model interpretation;
- candidate hypothesis;
- identity gate decision;
- evidence promotion decision;
- durable card mutation.

A deterministic fallback query must never be presented as model-selected research.

### Priority P1 — provider truth before 10-target batches

The existing plan already records provider failures including quota exhaustion, rate limits and model lifecycle failures. The next live batch must not start until provider preflight establishes that at least one configured model can actually generate a response and that the research tools required by the selected lane are reachable.

A secret being present is not provider readiness. A successful health endpoint is not model readiness. A successful model response is the minimum evidence that a real research trajectory can begin.

### Priority P2 — 10-target comparison only after integrity gate

Once live provider readiness is established, execute a 10-target batch against an independent strong baseline. Score card truth, source quality, identity correctness, organization honesty, route quality and collision rate. Do not optimize for trajectory length or number of tool calls.

Historical failure cases must be included. Easy names must not dominate the batch.

## 5. Tests required by the plan

The regression suite must grow from string-level malformed-candidate tests toward causal fixtures.

### Required fixture A — missing person association

Input:

- target: Jane Example;
- candidate scope: candidate;
- personName: null;
- value: `info@example.com`;
- source: real public contact page.

Expected:

- no personal contact claim;
- no target-name inheritance;
- organization/unknown scope only;
- no direct-contact promotion.

### Required fixture B — missing source

Input:

- personName: Jane Example;
- value: `jane@example.com`;
- candidate scope;
- sourceUrls: empty.

Expected:

- no durable evidence row with a synthetic search URL;
- no direct card promotion;
- trajectory may retain the research action/hypothesis separately.

### Required fixture C — real URL, wrong identity

Input:

- personName: Jane Example;
- source URL: a real page naming John Example instead.

Expected:

- source existence passes;
- identity establishment fails;
- no personal promotion.

This fixture prevents the system from replacing one simplistic gate with another simplistic gate that treats any HTTP URL as identity evidence.

### Required fixture D — namesake collision

Input:

- common human name;
- source belonging to a different organization/geography/person;
- second source supporting the intended target.

Expected:

- conflicting evidence is represented as uncertainty;
- the wrong source does not overwrite the intended identity;
- promotion requires adequate binding.

## 6. What this entry explicitly does NOT claim

This entry does not claim that Apex has won a research comparison.

It does not claim that the repository-wide TypeScript build is green.

It does not claim that all configured providers are healthy.

It does not claim that the current model routing is optimal.

It does not claim that the new identity gate is sufficient for namesake disambiguation.

It does not claim that static free-ReAct tests prove real autonomy.

It does not claim that a focused CI pass is equivalent to a provider-backed live run.

These distinctions are mandatory under the parent 40K plan.

## 7. Acceptance criteria for closing this workstream

This identity/evidence workstream is not complete until all of the following are true:

1. No durable contact evidence can obtain a fabricated source URL from a research query.
2. No downstream mapper can fill a missing person identity from ambient target context.
3. Organization contact routes cannot become direct personal contacts through promotion.
4. A real source that names a different person cannot establish the intended candidate merely because the URL is valid.
5. Historical malformed candidate strings remain rejected without expanding into an unmaintainable blacklist.
6. Focused CI passes.
7. A provider-backed trajectory can be run when credentials/quota permit and its causal trace is captured.
8. A 10-target batch can be compared honestly against a strong independent baseline before any superiority claim is made.

## 8. Plan revision rule

If implementation of these changes reveals that the durable schema cannot distinguish observation, hypothesis, evidence and identity claim cleanly, the next plan revision must prioritize a typed evidence graph rather than adding more parser heuristics.

If live testing shows that the model is selecting poor actions despite receiving sufficient state and healthy tools, then prompting/model routing becomes the next causal investigation.

If live testing shows the model selects good actions but the card is wrong, promotion/persistence becomes the next causal investigation.

If the provider is unavailable, the result remains a provider-readiness failure and must not be scored as a research failure.

That causal separation is the governing rule for the next iteration.