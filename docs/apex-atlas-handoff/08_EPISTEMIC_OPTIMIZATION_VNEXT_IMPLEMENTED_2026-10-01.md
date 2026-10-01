# Apex Atlas — Epistemic Optimization vNext

**Branch:** \`apex-vnext-epistemic-optimization-2026-10-01\`  
**Purpose:** implement the next research-quality evolution without replacing the Bureau architecture.

## Design law

Apex remains an OSINT research operating system. Models own research strategy; deterministic Apex owns evidence admissibility, provenance, identity/scope boundaries, budgets, persistence, terminal authority, and safety.

The vNext loop is:

\`\`\`
human objective
  -> unresolved research question
  -> discriminator
  -> candidate actions
  -> utility / cost
  -> Investigator execution
  -> observed evidence
  -> exact span + attribution + source lineage
  -> hypothesis/frontier update
  -> verification / adversarial review
  -> deterministic terminal gate
\`\`\`

## Implemented phases

### Phase 1 — Evidence truth
- \`research-epistemic-vnext.ts\` adds exact observed source-span binding.
- Evidence retains span offsets and rejects the old model-note-only interpretation when no observed span exists.
- \`SourceLineageGraph\` represents origin/dependency relationships.
- Identical observed passage fingerprints can collapse to one lineage unit.
- Canonical target-act evidence now carries observed excerpts into the durable evidence graph.
- Canonical investigator evidence validation requires an exact excerpt when immutable-act validation is enabled.

### Phase 2 — Question-centric frontier
- \`ResearchQuestion\` and discriminator primitives are defined.
- Intelligence context now exposes explicit \`researchQuestions\`.
- Provider disagreement groups prefer the research purpose/hypothesis over literal query strings, so reformulated searches can still represent one epistemic question.
- Investigator guidance explicitly maps actions to unresolved discriminators.

### Phase 3 — Deterministic terminal integrity
- \`research-terminal-gate.ts\` evaluates evidence sufficiency independently of model \`done\`.
- Target completion requires minimum evidence, independent evidence units, exact span bindings, no unresolved high-severity contradictions, and required falsification.
- Discovery keeps its legacy safety gate and now also passes the epistemic gate.
- The gate does not pretend that a heuristic score is a calibrated posterior probability.

### Phase 4 — Adaptive reasoning
- Gemini model capability metadata now admits medium/high thinking levels where supported.
- Modern Gemini Flash models default to materially stronger reasoning than the previous minimal/low configuration.
- \`gemini-thinking-policy.ts\` scales thinking effort from epistemic risk: routine turns stay cheap; contradictions, identity ambiguity, falsification, and terminal decisions escalate.
- The implementation is monotonic: increasing epistemic risk cannot reduce allocated thinking effort.

### Phase 5 — Question-aware action economics
- \`scoreActionUtility\` combines expected information gain, identity discrimination, evidence quality, falsification value, success probability, source diversity, latency, token, and provider cost.
- Existing \`research-policy\` scoring remains in the loop as a secondary signal rather than being discarded.
- Action learning is now keyed by action plus research purpose/hypothesis when available.
- Investigator-predicted information gain is compared with realized information gain.

### Phase 6 — Dependency-aware parallelism
- \`research-parallel-policy.ts\` provides deterministic dependency batching.
- Investigator now has a \`parallel_web_search\` action for 2–4 independent searches.
- Parallel searches execute concurrently and merge observations before the next Investigator turn.
- Dependent research remains sequential; the system does not parallelize indiscriminately.

### Phase 7 — Verification episodes
- Gemini Evidence Probe now exposes a multi-tool verification episode combining Google Search grounding and URL Context.
- The episode accepts Investigator-selected URLs plus unresolved claims.
- Structured JSON output is enforced locally; verification prose is never itself admitted as evidence.
- \`gemini-interaction-session.ts\` adds bounded stateful Gemini Interactions sessions using \`previous_interaction_id\` for specialist multi-turn work.

### Phase 8 — Closed-loop learning
- Action telemetry now records predicted IG, realized IG, and prediction error.
- Yield is contextualized by action plus research question/purpose where available.
- The learned signal remains a weak prior. It never outranks observed evidence or deterministic policy.

## Deliberate non-implementations

The following recommendations were intentionally not adopted literally:

1. No universal \`P(H) >= 0.85\` terminal rule. Apex's current hypothesis score is not a calibrated probability.
2. No universal evidence-class requirement such as "registry + website + contact". Evidence contracts must be case-specific.
3. No giant new dual-graph database. Existing intelligence state plus explicit research questions and dependency batches are the measured first step.
4. No local 25.2B "Apex" model or quantization changes. Those belonged to a different model/framework accidentally conflated with Apex Atlas.
5. No autonomous arbitrary MCP expansion. Capabilities remain registered, bounded, and policy-controlled.
6. No model vote as an epistemic consensus mechanism. Investigator/Right-hand disagreement must resolve through evidence.

## Verification requirements

Static/unit verification must cover:
- exact source span binding;
- source-lineage independence;
- adaptive thinking policy;
- predicted vs realized IG;
- dependency batching;
- terminal gate rejection;
- strict parallel action schema;
- canonical act excerpt validation.

The repository's existing complete Bureau gates remain authoritative.

A fresh canonical live Atlas run is still required after this branch is integrated. Static green does not constitute production GREEN.

## Empirical next step

Run the Research Gauntlet with matched cases and compare:
- identity attribution accuracy;
- false identity rate;
- exact citation support;
- source independence fidelity;
- contradiction detection;
- falsification completion;
- useful evidence/action;
- research latency;
- provider calls;
- model calls;
- token/cost proxies;
- terminal-gate false-stop / false-continue rates.

The architecture should retain only changes that improve measured research value per total cost.
