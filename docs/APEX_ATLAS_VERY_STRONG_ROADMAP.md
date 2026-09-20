# Apex Atlas — Very Strong Agentic OSINT Improvement Batch

This batch strengthens the whole Atlas mechanism rather than optimizing isolated features.

## Design principles

1. Model-owned trajectory, deterministic safety. Investigators choose research moves; the application enforces permissions, SSRF, budgets, provenance, cancellation, and persistence.
2. Capability semantics over function names. Every OSINT capability declares purpose, information it can reveal, prerequisites, complementary sources, limitations, evidence class, and cost.
3. Hypothesis-driven research. Each non-terminal move states what it is testing, why it matters, and expected information gain.
4. Independent corroboration. Repeating the same source family is not equivalent to corroboration. Source-family diversity is explicit state.
5. Evidence graph as cognitive state. Facts, hypotheses, contradictions, negative findings, contacts, and open discriminators remain durable and compactable.
6. Adaptive target portfolios. Discovery should maximize useful diversity across geography, occupation, wealth mechanism, uniqueness, public footprint, and reachability rather than optimize for fame or raw wealth.
7. Escalation by need. Ordinary HTTP precedes browser retrieval; enrichment follows verified prerequisites.
8. No invented contacts. Public contact observations require source URLs and remain scoped until attribution is independently supported.
9. Structured model contracts. Agent decisions should be schema-constrained and semantically validated.
10. Evaluate the mechanism end-to-end. Unit tests are necessary; real controlled investigations are the acceptance test.

## Implemented in this batch

- atlas-capability-registry.ts: purpose-aware registry for search, visit, browser, registries, domain, email and username capabilities.
- atlas-research-strategy.ts: deterministic information-gain assessment and diversified target-portfolio ranking/selection.
- Investigator prompts now expose the capability registry and deterministic research-move rubric.
- Investigator actions now carry hypothesis, purpose, and expectedInformationGain metadata.
- Source-family reuse is surfaced to the Investigator so it can deliberately seek independent evidence.
- Prompt guidance explicitly requires falsifiable hypotheses, prerequisite-aware escalation, independent corroboration, and no synthetic target/contact generation.

## Next hardening stages

### Stage A — Evidence graph cognition
Promote the existing intelligence state into the canonical investigator context: identity hypotheses, discriminators, contradictions, contact attribution states, source-family coverage, and failed routes. Every proposed action should map to an unresolved discriminator.

### Stage B — Adaptive discovery portfolio
Replace static discovery weighting with feedback-driven portfolio allocation. Track yield by geography, occupation, wealth mechanism, source lane, reachability and duplicate rate. Reallocate future discovery slots toward high-yield under-covered lanes while enforcing diversity floors.

### Stage C — Independent research trajectories
Permit two or more Investigator runs to explore materially different hypotheses/source families in parallel. Merge observations deterministically, deduplicate source syndication, reconcile contradictions, and let Right-hand/Boss adjudicate only after the independent paths produce evidence.

### Stage D — Information-gain execution
Estimate expected value from current unresolved hypotheses rather than raw URL/finding counts. Reward identity discrimination, contradiction testing, independent source families and contact relevance; penalize repeated sources and unnecessary browser/enrichment cost.

### Stage E — Structured model outputs
Use provider-native structured outputs/function calling wherever supported. Validate semantic constraints after schema validation. Never rely on brace extraction as the primary parser.

### Stage F — Security and trust
Treat every web result as untrusted content. Apply deterministic tool authorization and prompt-injection boundaries, with heavier action screening on high-impact actions. Maintain complete audit telemetry without persisting secrets.

### Stage G — Evaluation
Build scenario suites covering same-name identity collisions, fake or poisoned web pages, duplicated press syndication, organization email vs personal attribution, stale officer records, conflicting registry/press dates, browser escalation, provider outage, model timeout, cancellation, source-family exhaustion, discovery diversity, stopping too early, and continuing after evidence saturation.

The acceptance criterion is not "all static checks pass". The acceptance criterion is repeatable, evidence-backed, end-to-end research with an auditable trajectory and no fabricated facts.

## External engineering basis

The design follows current agent-engineering guidance emphasizing clear tool interfaces, environmental ground truth, bounded autonomy and stopping conditions; current Gemini documentation supports schema-constrained structured output and function calling; OWASP guidance emphasizes prompt-injection resistance, least privilege, tool-call validation and monitoring; NIST AI RMF provides a lifecycle risk-management framework.
