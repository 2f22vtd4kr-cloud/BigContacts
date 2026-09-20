# Apex Atlas — Context, Memory, Research Engine and Contact Model

## 1. Memory architecture

Apex needs three distinct memory surfaces.

### Durable history

Canonical state. It must preserve:
- every Investigator act;
- model/provider;
- action and actual tool;
- arguments;
- execution status;
- observation;
- source URLs;
- provenance;
- findings;
- claims;
- identity hypotheses;
- contradictions;
- contacts;
- oversight;
- timestamps;
- correlation IDs.

### Working memory

The model-facing context. It must be bounded and high signal.

Priority should normally be:
1. objective;
2. target and organization state;
3. current findings;
4. identity hypotheses;
5. unresolved questions;
6. contradictions;
7. latest observation;
8. a small number of recent full acts;
9. archived older trajectory index;
10. relevant evidence/source references.

### Scratch reasoning

Temporary model reasoning is not the canonical evidence record.

## 2. Current bounded context contract

The existing Phase 1 implementation intends:
- default max: 18,000 characters;
- configurable range: 8,000–32,000;
- recent full records: small bounded count;
- bounded observation/finding sizes;
- older trajectory represented by an index containing turn/action/execution/URLs/findings;
- explicit warning that omitted detail is not negative evidence;
- emergency reducer default: 12,000 characters.

The runtime may compress presentation. It must never rewrite durable history.

## 3. Long-horizon memory to build after Phase 1

Eventually make these explicit durable structures:

### Active hypotheses

Example:
candidate A supports observations 17 and 22; observation 31 contradicts it; state is contested.

### Missing discriminators

Example:
exact employer, current role, geography, board membership.

### Dead-end ledger

Example:
old directory repeatedly copied; low-yield unless new evidence appears.

### Evidence ledger

Every important claim points to durable observation IDs.

### Contact state

Example:
an executive-office address may be OBSERVED and ORGANIZATION/EXECUTIVE-OFFICE scoped without being promoted to DIRECT_PERSON.

These structures allow the Investigator to continue after compaction without rereading the entire transcript.

## 4. Research decision quality

The Investigator should eventually reason around:
- information gain;
- source independence;
- source quality;
- contradiction pressure;
- identity discriminators;
- contact scope;
- freshness;
- research cost;
- dead-end avoidance.

These are decision signals, not fixed search stages.

Do not encode a mandatory “search A then B then C” path.

## 5. Contact investigation

The target use case is public professional contact discovery.

Possible legitimate routes include:
- public professional email;
- executive office;
- company switchboard;
- investor relations;
- media/press office;
- corporate-development route;
- official public contact form;
- professional profile;
- public assistant/office route;
- portfolio-company or intermediary route;
- public professional association;
- organization contact clearly evidenced as a path to the target.

Represent scope explicitly.

Suggested conceptual scopes:
- DIRECT_PERSON
- EXECUTIVE_OFFICE
- ORGANIZATION
- INTERMEDIARY
- ROUTE
- LEAD

A company switchboard is not a direct person phone. A generic support address is not a direct executive email.

## 6. Identity resolution

Identity must use discriminators such as:
- exact organization;
- role;
- geography;
- career history;
- dates;
- board memberships;
- education;
- publications;
- affiliations;
- other distinctive public professional evidence.

Name similarity alone is weak.

A correct result can be unresolved.

## 7. Source independence

Five sites copying one biography are not five independent confirmations.

Eventually model source relationships:
- original/primary;
- independent secondary;
- syndicated;
- copied aggregator;
- unknown.

Do not count URL quantity as evidence quality.

## 8. Contradictions

Distinguish:
- genuine contradiction;
- temporal change;
- scope difference;
- copied stale value.

Example:
one source says CEO in 2024 and another says CEO in 2026. That may be temporal history, not contradiction.

## 9. Search result versus observation

Search results are discovery leads.

Page visits/actual public documents provide observations.

A model-emitted finding must not be admitted merely because it sounds plausible.

The promotion path should remain:

raw observation -> model claim/hypothesis -> deterministic provenance/identity/scope validation -> immutable event/evidence graph -> projection.

## 10. Real live research cases

After build and runtime are fixed, run at least:

### Case A — clear professional target
Must execute actual research and produce evidence-backed identity/contact-route state.

### Case B — ambiguous identity
Must not merge same-name people without support.

### Case C — contact route
Must distinguish organization/office/intermediary route from direct person contact.

### Case D — long trajectory
Must maintain bounded context and durable evidence through many acts.

Do not seed expected URLs or contacts.

## 11. Honest stopping

Apex must be able to return:
- verified;
- corroborated;
- unresolved;
- insufficient evidence;
- organization-only route;
- no public route found;
- contradictory evidence.

These are legitimate outcomes.

Never manufacture a direct contact to satisfy the UI.
