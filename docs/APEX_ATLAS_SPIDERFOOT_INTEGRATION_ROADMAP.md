# Apex Atlas — SpiderFoot Integration Roadmap

**Status:** implementation planning only  
**Purpose:** make SpiderFoot one ordinary Apex Atlas capability alongside Sherlock and the existing research tools.

## 1. Mission and architecture law

SpiderFoot is **not** a replacement for any Apex component. It is an additional OSINT capability selected by the Investigator when its expected information value justifies its cost.

The roles remain:

- Gemini Boss — case direction, assignment, Investigator selection, continuation/stop.
- Gemini Right-hand — bounded independent oversight.
- Groq/Mistral Investigator — owns the research trajectory and chooses tools.
- SpiderFoot — broad automated OSINT expansion.
- Deterministic Apex runtime — authorization, target/case binding, execution limits, cancellation, provenance, evidence admission, persistence, truthful failures.
- Atlas — canonical evidence, identity, contradiction, contact and negative state.

**Tools remain capabilities, not stages.** No fixed “Sherlock → SpiderFoot” or “SpiderFoot → contact” pipeline.

SpiderFoot upstream documents 200+ modules, multiple target types, publisher/subscriber module chaining, correlation rules, infrastructure/entity discovery, social/account enumeration, metadata analysis, threat-intelligence integrations and breach-related discovery. Upstream also recommends a packaged release rather than development master because master can contain insufficiently tested features. citeturn0search0turn0search6

## 2. Phase 0 — reconnaissance before implementation

Before touching production code:

1. Re-read the mandatory Apex repository study protocol.
2. Trace canonical launch → Investigator → capability execution → observation → evidence → oversight.
3. Inspect the existing Sherlock/Maigret integration as the closest precedent.
4. Inspect capability registry, action validation, discovery control plane, observation attribution, evidence ledger, failure observatory, Python sandbox, cancellation, leases, event ordering and context compaction.
5. Inventory tests and architecture checks protecting those boundaries.
6. Pin SpiderFoot v4.0 and inspect its runtime/dependency requirements.
7. Map every boundary a SpiderFoot invocation will cross.

**Deliverable:** a concrete integration map before implementation begins.

## 3. Phase 1 — canonical capability contract

Add one semantic capability, conceptually `osint.spiderfoot`.

Request contract:

- case/run/target binding;
- normalized target value/type;
- bounded scan profile;
- explicit module/use-case policy;
- deadline/timeout;
- event/output ceilings;
- cancellation;
- correlation ID.

Initial target classes:

- domain;
- hostname;
- IP;
- email;
- username;
- person name;
- ASN.

Do not expose all 200+ modules directly to the model. Start with bounded profiles:

- `identity-expansion`
- `domain-infrastructure`
- `organization-footprint`
- `contact-adjacent`
- `broad-osint`

Apex owns the profile allowlist; SpiderFoot owns its internal publisher/subscriber graph.

## 4. Phase 2 — isolated worker

SpiderFoot is Python and network-capable. Current Apex architecture deliberately keeps Python-backed network OSINT fail-closed until enforceable sandbox egress exists. **Do not bypass that rule.**

Preferred boundary:

`Investigator → validated Apex action → isolated SpiderFoot worker → normalized result stream → observation gateway`

The worker should:

- use pinned SpiderFoot v4.0;
- run outside the Node API process;
- have explicit public-web egress policy;
- have CPU/memory/time ceilings;
- have no Apex DB access;
- have no direct Atlas mutation permission;
- receive only minimum required secrets/configuration;
- emit structured results through a narrow contract;
- support cancellation;
- terminate cleanly;
- keep SpiderFoot's local SQLite state worker-local unless a later design proves otherwise.

SpiderFoot's scanner supports explicit module lists and target types, and its CLI exposes JSON/CSV output; this makes a bounded adapter preferable to embedding its application/database model into Apex. citeturn1search0turn1search1turn1search2

## 5. Phase 3 — observation normalization

Normalize SpiderFoot's event-oriented output into Apex observations rather than importing its database.

Conceptual fields:

```
sourceTool
sourceModule
scanId
target
eventType
observedValue
sourceUrl/sourceReference
observedAt
retrievedAt
parentObservation
provenance
executionStatus
correlationId
```

Rules:

- SpiderFoot module ≠ independent source.
- SpiderFoot correlation ≠ independent corroboration.
- SpiderFoot event ≠ verified identity.
- repeated/derived URLs do not become multiple independent sources.
- third-party API output remains attributable to that source family.
- failed modules remain failures.
- partial scans remain partial.

## 6. Phase 4 — evidence/provenance integration

Every admitted observation must retain:

- Apex case/target/run/turn;
- Investigator action ID;
- SpiderFoot scan ID;
- module/event type;
- source URL/reference;
- source family/class;
- retrieval timestamp;
- parent/derived lineage;
- tool version/profile;
- execution status;
- raw-result reference where retained.

Only the existing Apex evidence gateway can promote observations into canonical identity/contact/claim state.

SpiderFoot must never directly create or downgrade VERIFIED, STALE, CONTRADICTED, or other canonical states.

## 7. Phase 5 — model-facing capability semantics

Add SpiderFoot to the existing capability registry by **purpose and information value**, not just name.

Tell Investigator models it is useful for:

- broad entity expansion;
- domain/subdomain/infrastructure relationships;
- username/email/name expansion;
- metadata;
- threat-intelligence enrichment;
- finding new pivots after a research plateau.

Tell them when not to use it:

- target is weakly grounded;
- a narrow authoritative lookup is more informative;
- source-family coverage is already saturated;
- budget/deadline is low;
- direct verification is needed instead of discovery;
- the proposed scan mostly duplicates existing work.

Expected limitations must be explicit: noisy/derived results, stale data, collisions, API/module failures, large event volume and potentially high cost.

## 8. Phase 6 — collaboration with the existing tool family

SpiderFoot participates through pivots, never through a mandatory sequence.

Examples:

- **Sherlock → SpiderFoot:** Sherlock finds a username; SpiderFoot expands adjacent public surfaces.
- **SpiderFoot → Sherlock:** SpiderFoot discovers a username; Sherlock independently checks it.
- **SpiderFoot → search:** SpiderFoot finds a domain/person/company reference; search seeks independent corroboration.
- **SpiderFoot → visit/browser:** SpiderFoot finds a promising URL; Apex directly inspects it.
- **SpiderFoot → registry:** SpiderFoot finds a relationship; registry tests it against authoritative records.
- **Registry → SpiderFoot:** registry yields a domain/name/email/infrastructure clue; SpiderFoot expands it.
- **SpiderFoot → contact capability:** only after a contact-related observation is grounded.

The Investigator decides whether a pivot is worthwhile.

## 9. Phase 7 — efficiency

Optimize for **useful information per unit cost**, not event count.

Required controls:

- per-scan and investigation deadlines;
- module/profile allowlists;
- module-count ceiling;
- event-count ceiling;
- response/output ceiling;
- concurrency ceiling;
- cancellation;
- duplicate suppression;
- source-family deduplication;
- target-level scan deduplication;
- explicit partial status;
- no automatic rescans without a research reason.

Start narrow and allow broader follow-up only when early observations justify it.

Record:

- wall time;
- modules authorized/completed/failed;
- events produced;
- observations admitted;
- unique source families;
- useful pivots;
- duplicate ratio;
- downstream promotions.

## 10. Phase 8 — effectiveness

Measure incremental contribution, not tool prestige.

Track:

- useful pivots;
- new identity discriminators;
- organization relationships;
- independently verifiable URLs;
- contact-path opportunities;
- contradiction/disproof findings;
- duplicate rate;
- false identity associations;
- unnecessary scans;
- evidence promotion rate;
- incremental value after other tools already ran.

A scan producing hundreds of events but no useful pivot is not success.

## 11. Phase 9 — evidence-quality regression suite

Add tests proving:

1. failed SpiderFoot execution creates no positive evidence;
2. timeout cannot become success;
3. cancellation terminates and records cancellation;
4. discovered URLs are not trusted merely because SpiderFoot emitted them;
5. person-name events do not prove identity;
6. username events do not prove account ownership;
7. company relationships do not prove personal attribution;
8. duplicate modules do not count as independent corroboration;
9. API/module failures remain failures;
10. parent/derived lineage is preserved;
11. canonical contact/identity states cannot be downgraded;
12. SpiderFoot cannot mutate Atlas directly;
13. prompt injection in retrieved content remains untrusted;
14. event/output ceilings cannot be bypassed;
15. partial scans are represented truthfully.

## 12. Phase 10 — architecture contracts

Add deterministic checks for:

- exactly one SpiderFoot execution boundary;
- no direct SpiderFoot imports into ordinary Apex business logic;
- no SpiderFoot DB access from Atlas code;
- no unrestricted network subprocess;
- no unbounded module execution;
- capability-registry/action-schema parity;
- required provenance;
- cancellation propagation;
- target/case binding;
- source-family classification;
- failure-state preservation;
- no bypass around the Python sandbox contract.

Integrate these checks into `check:bureau` when production integration is reached.

## 13. Phase 11 — UI/operations

Do not turn Apex into a SpiderFoot UI clone.

Expose only truthful operational state:

- capability/profile;
- scan status;
- real module/event counts where available;
- failures;
- admitted observations;
- useful pivots.

A valid timeline might read:

```
Investigator selected SpiderFoot
→ profile: domain-infrastructure
→ 17 modules authorized
→ 11 completed / 3 failed
→ 42 events received
→ 8 observations admitted
→ 3 new pivots
→ 1 source queued for direct verification
```

Every displayed event must correspond to real backend state.

## 14. Phase 12 — security and operational classification

Do not enable every SpiderFoot module simply because upstream exposes it.

For each profile/module classify:

- purpose;
- source/data class;
- network destinations;
- credentials;
- operational/legal sensitivity;
- expected evidence quality;
- cost;
- enabled/disabled status.

Sensitive surfaces remain opt-in or disabled until separately reviewed. TOR/dark-web capabilities must never become silently enabled defaults.

## 15. Phase 13 — versioning

Initial pin: SpiderFoot **v4.0 packaged release**, not master.

Pin:

- SpiderFoot version;
- worker image/digest;
- Python runtime;
- dependency lock;
- profile configuration version.

Upgrades require:

1. new isolated worker;
2. compatibility tests;
3. normalized-schema comparison;
4. regression corpus;
5. research-quality comparison;
6. explicit promotion.

No upstream update may silently change Apex behavior.

## 16. Phase 14 — testing

### Unit
Target normalization, profile selection, parser, event normalization, provenance, source-family mapping, failures, cancellation, ceilings.

### Integration
Apex → worker → SpiderFoot → normalized observations → evidence gateway, including lifecycle and correlation IDs.

### Adversarial
Malformed/huge/repeated events, malicious strings, prompt injection, bogus URLs, identity collisions, worker/module crash, timeout, quota exhaustion and cancellation during active execution.

### Research
Controlled comparisons of existing tools, SpiderFoot alone where meaningful, and combined tool use. Measure incremental contribution without reducing quality to a simplistic single score.

## 17. Phase 15 — progressive rollout

**A — Disabled implementation:** contracts and tests only.

**B — Sandbox test:** synthetic fixtures and controlled public targets.

**C — Investigator-visible:** Groq/Mistral can select SpiderFoot under explicit profiles/budgets; no automatic default.

**D — Collaboration trials:** controlled Sherlock/search/registry/browser/SpiderFoot cases.

**E — Adaptive participation:** strategy can learn when SpiderFoot tends to be useful without hard-coding a route.

**F — Production consideration:** only after runtime, security, resource, evidence and empirical gates pass.

## 18. Definition of done

SpiderFoot is naturally adopted only when:

- it is an ordinary Apex capability;
- Investigator models understand when it is useful;
- no fixed route forces it;
- execution is isolated/governed;
- failures and partial scans remain truthful;
- cancellation/resource limits work;
- observations are normalized;
- provenance is complete;
- source independence is preserved;
- Atlas changes only through existing evidence controls;
- Sherlock and other tools can consume its pivots;
- SpiderFoot can consume pivots from other tools;
- UI reflects real execution;
- metrics exist;
- architecture/regression tests exist;
- versioning is pinned;
- empirical tests show incremental value;
- the final implementation passes **five consecutive complete Apex audits**.

## 19. Future implementation order

1. Re-study current `main` and existing Sherlock/tool seam.
2. Verify the current Python sandbox/egress contract.
3. Pin/package SpiderFoot v4.0 in an isolated worker.
4. Build worker health/version contract.
5. Build Apex adapter.
6. Add target/profile/action schemas.
7. Add capability-registry semantics.
8. Add normalized observation/provenance mapping.
9. Connect the existing evidence gateway.
10. Add cancellation/resource fences.
11. Add failure/partial-scan semantics.
12. Add collaboration/pivot metadata.
13. Add architecture checks.
14. Add unit/integration/adversarial tests.
15. Add truthful UI projection.
16. Run controlled research comparisons.
17. Fix every defect found.
18. Run the five-consecutive full-code audit.
19. On any audit failure, fix root cause and restart all five passes.
20. Report completion only when all five are green on the final implementation tree.

## 20. Success principle

The goal is not “Apex now has SpiderFoot.”

The goal is:

> **Apex can intelligently decide when SpiderFoot adds information its other capabilities are unlikely to provide, execute it safely, understand exactly what SpiderFoot observed, preserve the complete provenance chain, collaborate with the rest of the tool family, and promote only independently justified observations into durable Atlas knowledge.**
