# Volume 438 — Runtime Gate Repair and Live-Validation Blockers

**Date:** 2026-08-31  
**Status:** active living-plan entry  
**Purpose:** record verified runtime evidence instead of treating static green/red states as research-quality results.

## 1. Verified repository state

The canonical provider-role architecture is:

```text
Boss = Gemini
Right-hand = NVIDIA NIM
Dig investigator = Groq -> Mistral
Tools = model-selected web / OSINT executors
```

Gemini and NVIDIA are not web-research actors. The Dig investigator owns search, page inspection, OSINT selection, hypothesis formation, pivots, verification and stopping. This agrees with Volume 434 and is now the binding interpretation of the bureau architecture.

## 2. What the live GitHub audit actually proved

The API workspace installed successfully and the API build completed successfully on the tested commits. The build invokes the canonical Dig hardener before bundling:

```text
apply-agentic-concurrency-hardening.mjs
apply-discovery-runtime-correctness.mjs
build.mjs
```

The canonical hardener reports:

```text
provider=Groq->Mistral
observation boundary=literal contacts only
no Boss/right-hand Dig providers
no global cross-target circuit
```

However, the first two post-change audit runs stopped in the static runtime-check stage because the new check itself used brittle prose/format matching. Those were test-gate defects, not research results.

### Gate defect A

The check expected a textual form of the compatibility-hardener delegation that did not match the actual executable implementation. The implementation was correct; the test was wrong. The check was changed to assert the executable `path.join(...canonical...)` and `spawnSync(process.execPath, [canonical])` relationship instead of matching prose.

### Gate defect B

The next check expected a particular explanatory phrase in the canonical hardener. The implementation instead expressed the invariant structurally through `observationBoundaryRe`, `observationReplacement`, and a literal-contact-only `facts.join(...)` implementation. The check was changed to assert those actual implementation anchors and the absence of `PERSON` manufacturing in the replacement layer.

These failures reinforce an engineering rule: release gates must verify behavior/structure, not a preferred wording of comments.

## 3. Important architectural observation

The repository still contains a large historical `extractContactFactsFromHtml` implementation with semantic `PERSON:` regexes in the source file. The canonical build hardener replaces that function with an observation-only implementation before the API bundle is produced.

This is a transitional architecture, not the desired final source of truth.

The intended final state is:

```text
raw page
  -> literal contact observation
  -> model interpretation
  -> evidence / identity hypothesis
  -> provenance gate
  -> promotion
```

not:

```text
raw page
  -> deterministic PERSON regexes
  -> candidate
```

The historical extractor must eventually be removed from the canonical source rather than merely rewritten during build. Until that source migration is complete, the hardener is a mandatory build invariant and the generated runtime must be tested after hardening.

## 4. Identity attribution remains the highest research-risk area

Current discovery admission correctly rejects malformed phrases, requires HTTP(S) provenance, rejects search-result URLs and list-only billionaire pages, and requires that a cited page was actually visited.

But a visited-page requirement is not equivalent to semantic attribution.

A model can still theoretically emit:

```text
personName = Jane Example
sourceUrl = https://some-page-that-was-visited.example
```

without the page actually establishing that Jane Example is a person or that the person is the intended subject.

The next architecture step therefore needs explicit evidence relationship state. A source URL proves that a page was observed; it does not by itself prove that a named person occurs on that page or that the named person is the target.

The LLM must retain the semantic decision. Deterministic code should verify the existence and provenance of the underlying evidence rather than perform wealth/value/reachability ranking.

## 5. Contact provenance rule

The canonical agentic bureau path already uses the strict source-backed persistence wrapper. Synthetic Google/SEC query URLs are not accepted as claim provenance on that path.

This distinction is mandatory:

```text
search URL = evidence that a search happened
claim URL = source page where the claim was observed
```

A query URL must never be promoted into the latter category.

Organization inboxes and switchboards remain organization routes unless the evidence explicitly establishes personal attribution.

## 6. Current live-validation status

The tested audit runs did **not** reach a provider-backed Bureau launch because the static gate failed first. Therefore there is currently no honest live 10-target research-quality result from these runs.

The correct status is:

```text
build: verified
static autonomy checks: being repaired
provider-backed Dig run: not yet validated by this audit attempt
10-target Bureau: not yet run by this audit attempt
research-quality verdict: inconclusive
```

No victory claim is permitted from these runs.

## 7. Next gate

After the static gate is green on the actual generated runtime:

1. provider generation preflight must verify the Dig capability itself;
2. Boss and right-hand probes must remain role-scoped;
3. start Apex only after those checks pass;
4. run the first genuine single-target Dig trace;
5. inspect the full trajectory, including provider/role, tool actions, observations, findings and promotion;
6. verify no identity/contact corruption;
7. then run the first 10-target batch;
8. only then compare against the independent baseline.

A static pass is a prerequisite, not a research-quality result.
