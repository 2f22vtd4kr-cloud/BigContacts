# Volume 435 — Observation → Identity Boundary and Source-Parity Gate

**Date:** 2026-08-30  
**Status:** binding implementation addendum to the living 40K plan  
**Priority:** P0 integrity / P0 architecture

## 1. Finding

The current repository has the correct high-level Bureau role separation:

- **Boss = Gemini** — case direction and final case-level judgment.
- **Right-hand = NVIDIA NIM** — case-file critique and advisory recommendation.
- **Dig / Investigator = Groq → Mistral** — actual web research, tool selection, pivots, evidence collection and stopping.

The Boss and right-hand do **not** conduct web research. A run in which Gemini or NVIDIA becomes the Dig provider is an architectural violation, even if the resulting card looks useful.

The current 40K architecture addendum and `docs/context.md` correctly state this separation. The implementation must remain aligned with those documents.

A second, more important integrity finding is present in the checked-in Dig source: `agentic-web-research.ts` contains a large deterministic HTML helper, `extractContactFactsFromHtml`, that emits `PERSON:` records from title/name adjacency and prose patterns. This collapses an observation into an identity claim before the research model has made that judgment.

Examples of the problematic boundary are patterns equivalent to:

```text
raw HTML
  -> deterministic regex
  -> PERSON: <name> — <role>
  -> AgenticFinding.personName / candidate scope
  -> discovery admission
```

That is precisely the extraction → identity collapse the 40K plan is intended to eliminate. The problem is not that regex is intrinsically bad. Regex is appropriate for recovering literal contact tokens such as a `mailto:` address or `tel:` link. The problem is assigning **semantic person identity** to a regex extraction and handing it forward as if the page had already established the relationship.

## 2. Normative boundary

The canonical data flow is:

```text
RAW OBSERVATION
  source URL
  retrieval status
  page/snippet text
  structured contact tokens
        |
        v
MODEL HYPOTHESIS
  "this appears to name a person"
  "this contact may belong to that person"
        |
        v
IDENTITY CLAIM
  full name + context + relationship
        |
        v
EVIDENCE BINDING
  exact observed source URL
  observed page content / source context
  attribution relationship
        |
        v
PROMOTION
  candidate or contact route
        |
        v
CARD
```

Deterministic observation preprocessing may:

- normalize HTML;
- remove boilerplate;
- recover literal `mailto:` and `tel:` values;
- preserve exact URLs;
- classify an observation as search result, page, registry result, blocked page, timeout, CAPTCHA/error, etc.;
- enforce provenance, scope, budgets and data integrity.

It must **not** turn arbitrary page text into a person identity authority.

In particular, the observation layer must not emit `PERSON:` facts solely because a capitalized phrase occurs near a title. A page may contain a heading, navigation label, quoted person, former employee, author, unrelated executive, namesake, or organization text. Those are model-research questions, not deterministic promotion decisions.

## 3. Contact extraction remains useful, but scope is explicit

Literal contact extraction remains valuable because it improves observation quality. However, contact value truth and relationship truth are different properties:

```text
real email/phone
      !=
proof that target person owns/uses it
```

The observation may therefore expose:

```text
EMAIL: info@example.com
scope: unknown
source: https://example.com/contact
```

The model can decide whether to investigate that route. Persistence may classify it as organization contact when attribution is absent. It must not become `direct_email` merely because the source page belongs to the target organization.

The existing strict contact-persistence and unattributed-contact regression work remains binding.

## 4. Source parity is a release gate

The checked-in TypeScript source is part of the architecture. A build-time mutation script may be used temporarily as a migration mechanism, but it must not be the only place where the canonical architecture exists.

The current API build invokes `apply-agentic-concurrency-hardening.mjs` before compilation. That hardener correctly enforces the Dig provider boundary (`Groq → Mistral`) and removes the stale global provider circuit. However, this means the source tree can temporarily describe a different runtime from the built artifact.

That is a P0 source-of-truth defect.

The required end state is:

```text
checked-in agentic-web-research.ts
        ==
compiled runtime behavior
        ==
40K architecture contract
```

The hardener should eventually become a no-op compatibility check, not the mechanism that creates the canonical provider router or identity semantics.

## 5. Required implementation sequence

### Gate A — isolate observation enrichment

Replace semantic `PERSON:` generation inside the deterministic HTML helper with literal observation enrichment only. Preserve email/phone recovery and exact page context. Do not lose useful page text merely to eliminate identity leakage.

### Gate B — model-owned identity interpretation

Give the Dig model enough page context to decide whether a named person is actually relevant to the target and whether the page establishes the role/organization relationship. The model may reject, pivot, or continue. No numbered search sequence is introduced.

### Gate C — evidence binding

A candidate/contact claim must bind to an actually observed page or tool result, not merely a model-supplied URL. The existing discovery admission requirement that a cited page appear in the trajectory remains necessary but is not sufficient; future work must also bind the claim to the page observation/content.

### Gate D — scope-preserving promotion

Maintain separate states for:

- direct personal contact;
- organization contact;
- intermediary contact;
- public profile;
- company route;
- unknown/unattributed.

Promotion may preserve or demote evidence scope, but may not upgrade unknown/organization evidence into a personal relationship without evidence.

### Gate E — source parity

After the canonical implementation is checked in, run the build without mutating production source. The old hardener should detect an already-canonical source and exit without changing it. CI must fail if the build would need to rewrite source to become correct.

### Gate F — trajectory regression

Capture model prompt → action → observation → next model state → finding → admission → promotion. Add regression fixtures for:

- `President PERSON`-style fragments;
- `State St`;
- `Operational Enablement`;
- `Product Comparisons Sage Products`;
- organization `info@` promoted as personal;
- person-shaped text from a page that was not actually visited;
- correct named person on a visited primary page;
- namesake with contradictory organization evidence.

## 6. Provider-role invariant

The Bureau topology remains:

```text
                         ATLAS ORCHESTRATOR
                                  |
              +-------------------+-------------------+
              |                   |                   |
              v                   v                   v
         DISCOVERY            CASE BUREAU          TARGET DIG
              |                   |                   |
              |             +-----+-----+             |
              |             |           |             |
              |             v           v             |
              |          GEMINI      NVIDIA NIM      |
              |           BOSS       RIGHT-HAND       |
              |             |           |             |
              |             +-----+-----+             |
              |                   |                   |
              +-------------------+-------------------+
                                  |
                                  v
                         DIG INVESTIGATOR
                         Groq -> Mistral
                                  |
                                  v
                           MODEL-CHOSEN TOOLS
                                  |
                                  v
                         EVIDENCE / PROVENANCE
                                  |
                                  v
                              CARD STATE
```

The arrows into Dig represent assignment/case context, not web execution by Boss or right-hand.

## 7. Evaluation consequence

Apex cannot claim a research-quality improvement from static autonomy checks. A valid result requires:

1. an actual Dig-capable provider;
2. a real model decision;
3. model-selected tool actions;
4. observed source evidence;
5. identity/contact attribution checks;
6. truthful card promotion;
7. independent baseline comparison on the same target.

If the independent baseline produces a cleaner primary-source route, Apex loses. The response is a bug investigation, not a new forced hop.

## 8. Immediate work item

The next engineering change should remove deterministic person-identity generation from the Dig observation layer while preserving literal contact-token extraction, then lock the boundary with a regression test and make the checked-in source match the canonical Dig provider implementation.

This volume supersedes any older planning language that treats the HTML contact extractor as an identity authority or describes Gemini/NVIDIA as web-research providers.
