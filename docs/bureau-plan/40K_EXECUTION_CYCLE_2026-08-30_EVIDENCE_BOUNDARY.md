# Apex Atlas 40K Execution Cycle — Evidence Boundary

**Date:** 2026-08-30  
**Parent contract:** `docs/bureau-plan/40K_RESEARCH_AGENT_INTEGRITY_PLAN.md`  
**Status:** active implementation cycle  
**Purpose:** convert the latest repository audit into executable work without pretending that a green static test establishes research quality.

---

## 1. Revision trigger

This cycle was triggered by inspection of the live discovery/contact persistence path. The earlier identity-boundary repair correctly removed one class of target-name inheritance, but the audit found a second causal boundary violation in durable contact persistence: when an agentic contact finding lacks an exact source URL, the persistence layer can construct a Google search URL and store it as `sourceUrl`.

That behavior is incompatible with the 40K evidence contract.

A search URL proves only that a query was issued. It does not prove that the value appearing in the query was observed at a source. Storing it as the claim's source URL converts a research action into purported evidence.

This is not a candidate-regex problem. It is a representation and persistence problem.

---

## 2. Current causal model

The required evidence pipeline is:

```text
MODEL OBJECTIVE
    ↓
MODEL-SELECTED ACTION
    ↓
RESEARCH ACTION / QUERY
    ↓
TOOL OBSERVATION
    ↓
SOURCE URL + RETRIEVAL STATUS
    ↓
MODEL INTERPRETATION / HYPOTHESIS
    ↓
IDENTITY + SCOPE BINDING
    ↓
EVIDENCE CLAIM
    ↓
DURABLE PERSISTENCE
    ↓
CARD PROMOTION
```

The following shortcut is prohibited:

```text
finding.value
    + targetName
    ↓
constructed search URL
    ↓
sourceUrl
    ↓
personal contact evidence
```

The same prohibition applies to registry search endpoints such as SEC/EDGAR searches. A registry search may be an excellent research action; it is not itself evidence of the resulting person/contact relationship.

---

## 3. P0 workstream: separate research actions from evidence

### 3.1 Required invariant

`sourceUrl` on a durable evidence claim must be an exact public HTTP(S) URL at which the claimed value was observed or established.

It must not be:

- a Google/Bing/Serper/Tavily/SerpAPI search URL;
- a generated registry search URL;
- a query endpoint generated from target name plus value;
- a navigation URL used only to discover another page;
- an inferred URL constructed from a domain/name without retrieval evidence.

### 3.2 Representation

Introduce an explicit distinction between:

- `evidenceSourceUrl` — exact source establishing the claim;
- `researchActionUrl` — URL/query used to search or navigate;
- `retrievalStatus` — retrieved, blocked, errored, unavailable;
- `evidenceBinding` — person, organization, intermediary, unknown.

The first implementation may enforce this at the persistence boundary without requiring an immediate database-wide migration. The migration should then move internal trajectory and contact types toward the same vocabulary.

### 3.3 Fail-closed behavior

If a contact value has no exact evidence URL:

1. do not manufacture one;
2. do not promote the value to a personal card field;
3. preserve the hypothesis/research action in trajectory state when available;
4. allow the model to continue researching;
5. allow an honest no-contact result.

The system must never create a fake citation merely to make a card look complete.

---

## 4. P0 workstream: child-claim identity

A candidate container is not evidence that every child contact belongs to the candidate.

Required invariant:

```text
candidate identity match != child contact identity match
```

Every personal contact claim needs its own identity association or must remain organization/unknown/intermediary scoped.

A caller's `targetName` is assignment context. It cannot be used to populate a missing `personName` field.

The existing regression for missing `personName` therefore remains mandatory and must be applied to every adapter that converts findings into contact evidence.

---

## 5. P1 workstream: source establishment

An HTTP(S) URL is necessary but insufficient.

The source must establish the claimed relationship.

Required causal predicates:

```text
hasHttpSource
AND
sourceContentRetrieved
AND
sourceEstablishesClaim
AND
identity/scopeBindingSufficient
```

A real page naming another person must not establish the requested person's identity. A search result snippet must not automatically become page evidence. A blocked page must not count as positive evidence merely because its URL exists.

This rule applies to names, roles, emails, phones, social profiles and organization relationships.

---

## 6. P1 workstream: promotion boundary

Card promotion must consume durable evidence, not raw model findings and not synthetic URLs.

Before promotion, verify:

- evidence source exists;
- evidence source is not a search endpoint;
- evidence binding is known;
- organization/intermediary routes remain correctly scoped;
- collision risk is represented;
- the claim is attributable to the target person where personal promotion is requested.

If these conditions are not met, preserve the finding as uncertainty rather than filling the card.

---

## 7. Required regression fixtures

### Fixture EB-01 — search URL is not evidence

Input:

- target: `Jane Example`;
- email: `jane@example.org`;
- source URLs: empty;
- agentic source marker present.

Expected:

- zero durable evidence rows whose `sourceUrl` is a generated search URL;
- zero direct personal promotion;
- research action may be retained separately.

### Fixture EB-02 — registry query is not evidence

Input:

- related person or issuer finding;
- no exact source URL;
- company name available.

Expected:

- no SEC/EDGAR search URL stored as evidence source;
- finding remains hypothesis/action state or is dropped from durable evidence.

### Fixture EB-03 — real source, wrong person

Input:

- claimed person: Jane Example;
- real public URL whose content establishes John Example.

Expected:

- URL validity passes;
- source-establishment check fails for Jane;
- no personal promotion.

### Fixture EB-04 — organization inbox

Input:

- target: Jane Example;
- `info@example.org`;
- company contact page.

Expected:

- organization contact scope;
- never `direct_email` for Jane;
- source URL remains the actual company contact page.

### Fixture EB-05 — namesake collision

Input:

- common name;
- evidence from an unrelated organization/geography;
- separate evidence supporting the intended person.

Expected:

- conflicting evidence remains visible;
- wrong source cannot overwrite identity;
- promotion requires adequate binding.

### Fixture EB-06 — blocked page

Input:

- claimed person;
- URL returns CAPTCHA/blocked/error content.

Expected:

- retrieval failure is recorded;
- URL is not treated as positive identity evidence;
- model may choose another research action.

---

## 8. Trajectory acceptance requirements

For every live validation target, capture at minimum:

1. assignment/objective;
2. provider/model;
3. model-selected action;
4. tool and arguments;
5. normalized observation;
6. exact observed source URL(s);
7. model interpretation;
8. hypothesis;
9. identity/scope decision;
10. evidence promotion decision;
11. durable card mutation;
12. stopping reason.

The evaluation harness must make it possible to answer exactly where a false identity or false contact entered the system.

A final bad card without its causal trajectory is insufficient for debugging.

---

## 9. Provider gate before live research

The 40K plan already records recent provider failures. The next real research batch must first prove provider readiness.

Required distinction:

- configured secret;
- reachable API;
- authorized credential;
- usable model identifier;
- non-rate-limited/quota-available state;
- successful harmless generation;
- successful tool-capable model turn.

No ten-target quality comparison begins if the system cannot demonstrate a real model decision.

A provider outage is an operational readiness failure, not evidence that the model's research strategy is poor.

---

## 10. Evaluation gate

The first meaningful comparison remains a ten-target batch.

The Apex and baseline runs must:

- receive the same targets and objective;
- remain independent;
- use comparable research opportunity;
- freeze results before comparison;
- score factual card quality rather than prose quality;
- count identity collisions and unsupported contacts;
- distinguish organization routes from personal routes;
- record inconclusive/provider-failure cases honestly.

Apex does not win because it generated more tool calls, more hops, or more fields.

---

## 11. Exit criteria for this cycle

This cycle is not complete until all of the following are true:

- no persistence path manufactures search/registry URLs as evidence sources;
- child findings cannot inherit target identity implicitly;
- search/action URLs and evidence URLs are distinguishable in code or at the persistence boundary;
- EB-01 through EB-06 exist as executable regression fixtures;
- focused CI passes;
- the full repository build status is separately documented rather than hidden;
- provider preflight produces an honest readiness result;
- at least one provider-backed trajectory is captured if credentials/capacity permit;
- any live failures are converted into new regression artifacts;
- the 40K master plan or its generated source is updated with the resulting evidence before the next validation batch.

---

## 12. Explicit non-claims

This cycle does not claim:

- that Apex currently beats a strong baseline;
- that the entire repository builds cleanly;
- that every provider is healthy;
- that static free-ReAct tests prove autonomy;
- that a valid URL proves a claim;
- that an empty card is a failure when evidence is genuinely unavailable.

The standard remains: truthful research or honest uncertainty.
