# Apex Atlas — World-Class OSINT AI Architecture

This document is the architectural north star for Apex as an autonomous OSINT research bureau. It deliberately goes beyond the current implementation: it defines what the finished system should be, while distinguishing guarantees that are already implemented from capabilities that still need proof or engineering.

## 1. What a world-class OSINT AI actually is

A serious OSINT AI is **not a search box with an LLM attached** and it is not a deterministic enrichment pipeline with AI labels.

It is an **evidence-native investigation system** in which:

```text
MISSION / CASE OBJECTIVE
        ↓
INSTITUTIONAL CONTEXT + POLICY
        ↓
AI CONTROL PLANE
  Gemini Boss
  DeepSeek/NVIDIA Right Hand
        ↓
FREE-REACT INVESTIGATOR
  Groq / Mistral capacity
        ↓
CAPABILITY FABRIC
  search · fetch · browser · registry · OSINT executors
        ↓
UNTRUSTED OBSERVATIONS
        ↓
EVIDENCE GATEWAY
  identity · provenance · scope · freshness · source integrity
        ↓
CLAIMS / RELATIONSHIPS / HYPOTHESES
        ↓
INVESTIGATION GRAPH + CASE MEMORY
        ↓
CONTINUOUS OVERSIGHT
        ↺
        ↓
OPERATOR-READY DOSSIER / EXPORT
```

The key distinction is **observation → claim**. Tools observe. The Investigator interprets. Deterministic code verifies whether an interpretation is admissible. The system never silently converts a convenient string into a fact.

## 2. Apex's design choices are intentional

Apex keeps a strict three-role hierarchy:

- **Gemini = Boss / Head Investigator.** Case direction, strategic integration, assignment, final case-level judgment.
- **DeepSeek through NVIDIA NIM = Right Hand / Oversight.** Critique, gap analysis, contradiction detection, advisory control decisions.
- **Groq + Mistral = Investigator capacity.** These models perform the actual free-ReAct investigation.

Gemini and DeepSeek must never become hidden Investigator fallbacks. Groq/Mistral must never become final-review authorities merely because they are available.

Provider fallback is infrastructure. Research strategy remains an AI decision.

## 3. Evidence is the product, not the final prose

Every material assertion should be representable as a typed claim with:

- `claimId`;
- case/run/target scope;
- subject entity/person;
- predicate and normalized value;
- exact source observation ID;
- exact observed URL and retrieval timestamp;
- source artifact hash where archival is permitted;
- extractor/model/action that produced the claim;
- identity basis;
- confidence/uncertainty;
- freshness/validity window where relevant;
- promotion/rejection decision;
- corroboration and contradiction edges;
- revocation history.

A source URL alone is not enough. The system should be able to answer:

> **Which exact successful observation caused Apex to believe this exact claim about this exact person?**

If it cannot answer that question, the claim is a lead, not trusted evidence.

## 4. Immutable observation layer

A world-class system preserves the original observation separately from its interpretation.

The preferred lifecycle is:

```text
fetch / search / browser / registry / executor
        ↓
transport receipt
        ↓
bounded raw observation
        ↓
normalized observation
        ↓
model-visible observation
        ↓
model claim
```

The raw observation must never be overwritten by normalization. When retention is permitted, store a content hash and retrieval metadata. If raw retention is not permitted, store a deterministic fingerprint plus the minimum evidence excerpt necessary for later audit.

The observation record should include at least:

- source URL / provider endpoint;
- attempted URL vs successfully observed URL;
- HTTP status / transport result;
- retrieval time in UTC;
- content type;
- response-size bound;
- redirect history where safely observable;
- tool/capability version;
- run/turn/action identifiers;
- content hash when retained.

## 5. Investigation graph

Apex should evolve toward a real evidence graph rather than a flat contact table.

Core node types:

- Person
- Organization
- Legal entity
- Brand / operating asset
- Domain
- URL / page
- Email
- Phone
- Social account
- Registry record
- Filing / document
- Asset
- Address
- Event
- Investigation run
- Observation
- Claim
- Hypothesis

Core edge types:

- `IDENTIFIES`
- `EMPLOYED_BY`
- `DIRECTOR_OF`
- `OWNS`
- `CONTROLS`
- `OPERATES`
- `RELATED_TO`
- `CONTACTS`
- `APPEARS_AT`
- `REGISTERED_AS`
- `MENTIONED_IN`
- `SUPPORTED_BY`
- `CONTRADICTED_BY`
- `DERIVED_FROM`
- `DISCOVERED_DURING`

Every evidence-bearing edge needs provenance. A graph edge without provenance is a hypothesis, not a fact.

## 6. Identity resolution must be probabilistic but promotion must be deterministic

Apex should allow the Investigator to maintain competing identity hypotheses rather than forcing premature resolution.

For example:

```text
Candidate A — 0.74
Candidate B — 0.19
Unresolved — 0.07
```

The probabilities are model reasoning, not truth. Promotion requires deterministic admissibility rules such as:

- sufficient independent target anchors;
- exact source/claim co-occurrence;
- no known entity collision;
- allowed source class;
- appropriate scope;
- explicit Investigator promotion;
- no unresolved contradiction above the configured threshold.

Never inherit the case target's name as proof of identity.

## 7. Leads, hypotheses, evidence, claims, and decisions are different objects

Apex should maintain four epistemic layers:

### Lead
Something worth investigating.

### Hypothesis
A model-generated explanation of what may be true.

### Evidence
A bounded observation that supports or contradicts a proposition.

### Claim
A normalized proposition admitted into the case graph after deterministic validation.

The UI and API should never blur these layers. A search snippet saying `John Smith` is not equivalent to a promoted `Person` node.

## 8. Free-ReAct means capability choice, not recipe execution

The Investigator's first action is model-selected.

The model can choose:

- search provider;
- page visit;
- browser escalation;
- registry;
- email footprinting;
- Maigret;
- Sherlock;
- theHarvester;
- other explicitly governed capabilities;
- `done`.

A compound action such as `footprint_username` that silently runs Maigret + Sherlock is not fully agentic. Each materially different research capability should be individually selectable when the architecture exposes it.

The capability fabric should eventually be represented by a typed registry:

```text
Capability
  id
  description
  argument schema
  risk class
  network class
  cancellation contract
  quota contract
  provenance contract
  output schema
  availability
  version
```

The Investigator sees the capabilities. Deterministic code enforces their contracts.

## 9. Safety must exist below the model

Prompt instructions are not a security boundary.

Every network-capable capability needs a real transport boundary:

- HTTP(S)-only where appropriate;
- private/link-local/metadata IP blocking;
- DNS pinning / rebinding protection;
- redirect validation;
- response-size limits;
- timeout;
- cancellation;
- per-run and global quotas;
- concurrency limits;
- credential isolation;
- destination audit trail.

Subprocess OSINT tools are the difficult case. Environment proxy variables are not a formal egress boundary because a child process can bypass them. Apex should ultimately run network-capable subprocesses inside a real sandbox/egress broker or route them through a governed service.

Until that exists, the safe choices are explicit classification, restricted operation, or fail-closed behavior — not pretending that a proxy environment variable is enforcement.

## 10. Continuous oversight should be event-driven

Boss and Right Hand should not repeatedly receive giant summaries.

Each Investigator turn should emit a compact durable event:

```text
turn
model
selected action
validated arguments
execution result
observation reference
new evidence delta
new/changed hypotheses
contradictions
open questions
cost / latency
provider-capacity events
```

Oversight should react to meaningful deltas:

- new identity candidate;
- new direct contact;
- contradiction;
- high-value source;
- no-progress/stagnation;
- capability failure;
- budget pressure;
- evidence threshold crossed;
- candidate promotion request.

This reduces duplicate reasoning and LLM spend while improving intelligence.

## 11. The trajectory is a first-class forensic object

The durable trajectory must be replayable without hidden chain-of-thought.

Persist:

- explicit model action JSON;
- exact arguments;
- exposed `thought` field only when the product contract explicitly provides it;
- tool result status;
- bounded observation;
- observed URLs;
- model findings;
- promotion/rejection;
- provider fallback/capacity events;
- stop reason;
- state/version references.

Never store hidden chain-of-thought merely because a provider internally produced it.

The trajectory should make it possible to reconstruct **what Apex did**, not expose private internal reasoning.

## 12. Freshness and contradiction are first-class

OSINT goes stale. A phone number from 2022 and a filing from yesterday are not equally current.

Claims should therefore carry freshness metadata and source-specific temporal semantics.

Contradictions should not be silently merged away. Apex should represent:

```text
Claim A — supported by source 1 — active
Claim B — supported by source 2 — conflicting
Resolution — unresolved / superseded / explained
```

A later source can supersede an older claim without destroying the historical record.

## 13. Research stopping should be evidence-based

The Investigator should stop when it decides the marginal information gain is too low, the objective is satisfied, or public avenues are reasonably exhausted.

Deterministic controls still enforce:

- maximum turns;
- hard wall-clock budget;
- provider spend budget;
- tool concurrency;
- repeated-source suppression;
- cancellation;
- no-progress safeguards.

Apex should eventually add **information-gain telemetry** so the stopping decision can be evaluated empirically rather than inferred from iteration count.

## 14. Cost is part of intelligence quality

The objective is not maximum LLM usage. It is maximum useful evidence per unit cost/time.

Measure:

- physical provider calls per logical turn;
- tokens per useful finding;
- latency per verified claim;
- source diversity;
- unique evidence delta per turn;
- duplicate search/page ratio;
- false-promotion rate;
- contradiction rate;
- successful direct-contact rate;
- investigation completion rate;
- cost per operator-usable dossier.

Provider fallback should not accidentally turn one logical decision into a dozen equivalent calls.

## 15. Case memory must be explicit and rebuildable

The living case document should be a projection of durable events, not an opaque mutable prompt blob.

Preferred model:

```text
immutable events
      ↓
case state projection
      ↓
Investigator context pack
      ↓
Boss / Right-hand context pack
      ↓
operator dossier
```

This makes the investigation resumable, auditable, and recoverable after process failure.

## 16. Discovery is a mode, not a fake target

Discovery mode must have explicit semantics:

- no implied person identity;
- no fake target string such as `Discovery slot`;
- Investigator may discover candidates;
- candidates remain review-only until identity/promotion gates are satisfied;
- discovery itself has a durable trajectory;
- the discovered candidate becomes a new target context only after explicit admission.

Target mode and discovery mode should share the same evidence law and capability fabric.

## 17. Operator UX for a serious investigation

The operator should be able to see, without reading logs:

### Mission
What is Apex trying to establish?

### Current state
What is known, uncertain, disputed, and missing?

### Live Investigator
Which model is acting, what capability it selected, and what just happened?

### Evidence
Every promoted claim opens the exact source observation that supports it.

### Graph
People, organizations, domains, contacts, filings, assets, events and relationships with provenance.

### Contradictions
Conflicts are visible rather than averaged away.

### Coverage
Which research surfaces have actually been investigated — and which were simply unavailable?

### Cost / health
Provider capacity, latency, retries, budget and failure reasons.

### Resume
A stopped or failed investigation can be resumed from durable state without restarting from scratch.

## 18. Reporting should be evidence-first

A final dossier should contain:

1. Executive finding.
2. Identity assessment.
3. Strongest verified claims.
4. Direct/public contact routes with exact provenance.
5. Ownership/control structure.
6. Key relationships.
7. Contradictions and unresolved hypotheses.
8. Negative findings / exhausted avenues.
9. Investigation timeline.
10. Source register.
11. Evidence appendix.
12. Confidence and freshness.

Every important sentence should be traceable to a claim ID and source observation.

## 19. Global architecture: the finished Apex stack

```text
┌───────────────────────────────────────────────────────────────┐
│ OPERATOR / CASE DESK                                          │
│ mission · scope · live investigation · graph · evidence      │
└──────────────────────────────┬────────────────────────────────┘
                               ↓
┌───────────────────────────────────────────────────────────────┐
│ CASE / EVENT LEDGER                                            │
│ immutable events · trajectory · provenance · hashes · state   │
└──────────────────────────────┬────────────────────────────────┘
                               ↓
┌───────────────────────────────────────────────────────────────┐
│ CONTROL PLANE                                                  │
│ Gemini Boss ↔ DeepSeek/NVIDIA Right Hand                      │
│ strategic direction · critique · target continuation           │
└──────────────────────────────┬────────────────────────────────┘
                               ↓
┌───────────────────────────────────────────────────────────────┐
│ FREE-REACT INVESTIGATOR                                       │
│ Groq / Mistral                                                │
│ model-selected action → observation → next action → done      │
└──────────────────────────────┬────────────────────────────────┘
                               ↓
┌───────────────────────────────────────────────────────────────┐
│ CAPABILITY FABRIC                                              │
│ search · visit · browser · registry · OSINT executors         │
│ each with schema + quota + timeout + cancellation + egress    │
└──────────────────────────────┬────────────────────────────────┘
                               ↓
┌───────────────────────────────────────────────────────────────┐
│ EVIDENCE GATEWAY                                               │
│ observation ≠ claim · identity · source binding · scope       │
│ freshness · contradiction · promotion                         │
└──────────────────────────────┬────────────────────────────────┘
                               ↓
┌───────────────────────────────────────────────────────────────┐
│ INVESTIGATION GRAPH                                            │
│ entities · relationships · claims · hypotheses · provenance   │
└──────────────────────────────┬────────────────────────────────┘
                               ↺
                    oversight / resume / pivot
```

## 20. Current Apex gap map

### Strong foundation already present in the repository

- Gemini Boss / DeepSeek Right-hand / Groq+Mistral role separation.
- Free-ReAct Investigator loop with bounded iterations.
- Run-scoped cancellation for canonical Node-side network paths.
- SSRF-safe HTTP transport on canonical web research.
- Explicit discovery mode.
- Target-specific continuation and durable case context.
- Model-authored promotion boundary.
- Source-bound evidence checks.
- Durable trajectory records in the ReAct result shape.
- Static architecture guards around the most important role/control-plane boundaries.

### Remaining engineering priorities

1. **Real subprocess egress governance (#141/#139).** Cancellation is improving, but network-capable Python tools still need a real sandbox/egress boundary.
2. **Canonical source parity.** Migration scripts are useful during transition, but the final architecture should live directly in checked-in TypeScript rather than requiring build-time mutation.
3. **Durable trajectory persistence (#140).** The in-memory trajectory structure exists; operator/audit-grade durable event storage and replay need completion.
4. **Legacy route retirement (#129/#137/#138).** Finish reachability proof and quarantine/delete obsolete research control planes.
5. **Capability registry.** Promote individual tool contracts into a first-class registry instead of encoding the surface as a growing action union.
6. **Claim graph.** Connect contact evidence, identity, relationships, source observations and contradictions into one provenance graph.
7. **Freshness / contradiction engine.** Preserve historical claims and explicitly resolve conflicts.
8. **Evaluation harness.** Maintain blind investigation fixtures and measure verified evidence per token, latency and source diversity.
9. **Operator dossier/export.** Make evidence-backed reports and replayable investigation packages a first-class output.
10. **Live proof.** Replit is the eventual runtime proving ground; static repository inspection must never be represented as runtime/provider success.

## 21. Definition of world-class

Apex is world-class when an experienced investigator can ask it an ambiguous public-source question and trust the following sequence:

- Apex understands the mission before research begins.
- Apex chooses its own research path.
- Apex can discover unexpected people, organizations and relationships.
- Every observation is treated as untrusted until interpreted.
- Every important claim has exact provenance.
- Identity is resolved without target-name inheritance.
- Contradictions remain visible.
- Old claims remain historically recoverable.
- Network and subprocess capabilities cannot escape their safety envelope.
- The Investigator can stop, pivot, revisit or pursue a novel lead without a hidden script.
- Boss and Right Hand continuously understand the actual investigation state.
- The operator can inspect exactly what Apex did and why the resulting claim was admitted.
- The case can resume after failure without losing its trajectory.
- The final dossier is a projection of evidence, not a prose hallucination.

That is the standard Apex should be built toward.
