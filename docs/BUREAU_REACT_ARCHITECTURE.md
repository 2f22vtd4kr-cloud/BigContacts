# Apex Atlas — ReAct Bureau Architecture

**Updated:** 2026-10-09  
**Canonical branch:** `main`  
**Authority:** executable code on `main`, `docs/context.md`, and `README.md`.

This describes the current implementation contract, not the historical control-plane wiring in older handoffs.

## 1. Core law

Apex Atlas is an AI-driven public-source research bureau, not a deterministic enrichment pipeline.

**The selected model owns research strategy. Deterministic runtime code owns safety, authorization, source provenance, identity attribution, durable persistence, cancellation, resource budgets, and terminal integrity.**

Tools are capabilities, not mandatory stages. There is no hidden identity → company → social profile → email recipe.

## 2. Roles

- **Boss = Groq Boss:** Groq Boss owns high-level case direction and model-selected transitions.
- **Right-hand = Groq Right-hand:** Groq Right-hand is bounded independent oversight of the Investigator's work; it does not take over the research trajectory.
- **Investigator LLM pool:** the configured Groq Investigator capability slots are the only canonical Investigator pool. Selection is explicit and capability-owned; there is no silent cross-provider or credential rotation.
- **Two-layer architecture:** AI models own research reasoning and trajectory choices; the deterministic runtime owns authorization, bounded execution, provenance, durable state, cancellation, and terminal truth. Right-hand is oversight within this design, not a scripted third research layer.
- **Search capability surface:** Tavily and Exa are independent enabled search capabilities available to the Investigator; neither imposes a required order.
- **Browser/fetch capability surface:** Scrapfly and ZenRows are provider-backed retrieval/browser capabilities where configured; the Investigator chooses when their capability semantics fit the evidence gap.

### Detailed role descriptions

### Groq Boss

Boss directs the case, interprets accumulated evidence, selects an available Investigator capability, and decides whether to continue, redirect, investigate a candidate, revisit, or stop. It does not browse and must not invent evidence. Model/capability selection is runtime configuration, not a promise that every deployment uses the same model ID.

### Groq Right-hand

Right-hand is a separate bounded oversight invocation. It critiques completed Investigator work, evidence gaps, contradictions, and alignment with the objective. It does not browse, choose the Investigator's tools, or manufacture a successful review when unavailable.

### Selected Groq Investigator

The selected Investigator capability owns the actual research trajectory: what question to investigate, which enabled capability to use, what query to form, where to pivot, what to verify or disprove, and when to stop or abstain. A credential slot is a capability boundary; it must not silently rotate to another credential after quota trouble.

Gemini, Mistral, and DeepSeek/NVIDIA transports are retired from the canonical execution path. Historic persisted events may still require compatibility readers; that does not make a retired transport an active runtime role.

## 3. Free-ReAct boundary

The Investigator may choose among enabled capabilities, including web search, page retrieval, browser escalation, public registries, domain/RDAP inspection, permitted footprint tools, disproof, revisits, and stopping. Runtime validation can reject malformed, unsafe, unavailable, unauthorized, over-budget, or provenance-invalid actions.

No forced search order: the runtime must not secretly prescribe a query list, provider order, source sequence, identity hop, or research ladder. Guidance may explain capability semantics and current evidence gaps, but the model still chooses the research move.

A discovery-only liveness guard prevents unproductive search loops: after three successful search-only actions without a successful non-search observation, another search is blocked. This does not prescribe the next tool; the Investigator chooses how to inspect or resolve a lead.

## 4. Evidence and identity

Apex distinguishes **lead → observation → attribution → corroboration → verification**.

- Search results and snippets are leads, not claim-grade proof.
- Discovery admission requires an explicitly promoted candidate, a successful same-run page retrieval, the exact observed source URL, and full-name support at token boundaries.
- A nearby substring must not establish identity (for example, `Ann Li` from `Joann Li`).
- Organization-scoped evidence stays organization-scoped unless a person relationship is independently attributed.
- URLs, people, relationships, contacts, and wealth must not be invented.
- Copied or syndicated pages are not independent corroboration merely because they have different URLs.
- Unknown or insufficient evidence is a valid outcome.

Evidence should retain source URL/host, retrieval time, source type/family, supporting observation, claim/identity linkage, contradictions, confidence, and scope.

## 5. Structured action contracts and provider failures

Investigator action responses use provider-native structured output where supported, followed by deterministic schema and semantic validation. Reasoning text is not an action payload. Bounded compatibility repair may address response-format differences, but it must never bypass allowed-action validation or transform a failed action into evidence.

Provider failures remain typed and bounded. Token-window pressure is not hard quota. Credential reassignment is explicit, never silent. Tool failure is not positive evidence.

## 6. Resource and network safety

Iteration, observation, trajectory, prompt/context, response-size, concurrency, and elapsed-time limits are safety boundaries, not research strategy. Cancellation must reach the actual work and be rechecked before trusted persistence.

Outbound network code rejects non-public destinations, revalidates redirects where the client controls them, and caps response size. Browser/provider-backed retrieval needs the same destination policy at the point of actual network egress; a local pre-check alone does not prove that a remote fetch provider's redirect/DNS behavior is safe. Python-backed network OSINT remains fail-closed until enforceable sandbox egress exists.

## 7. Durable state and replay

Durable case/event state is canonical truth. UI, Reactor, and logs are projections, not independent research engines. Replay uses immutable event IDs as sequence authority; timestamps and iteration numbers do not replace event ordering.

Persist enough to audit and replay the objective, capability selection, model-selected action, actual tool/provider, execution status, observations, observed URLs, provenance, findings, hypotheses, contradictions, control decisions, case/job/run/turn correlation, and terminal outcome.

Promoted discovery candidates begin as review-only identity candidates. Contact promotion requires separate target-scoped research and strict source-backed attribution; model prose alone cannot promote a contact. Late callbacks may not rewrite terminal job state.

## 8. Runtime and release truth

Canonical runtime contract:

- Desk: `/`
- API: `/api/`
- API port: `8080`
- Boot command: `bash scripts/replit-boot.sh`
- Explicit first-time schema initialization: `APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh`

Ordinary boot must not mutate schema. Static tests validate structural invariants; they do not establish successful provider execution, live research quality, or production readiness. The latest documented Replit run (2026-10-08) failed before the first valid Investigator action and persisted no searches, visits, findings, admissions, or evidence rows. Fresh runtime acceptance remains outstanding.

## 9. Evaluation

Evaluate matched, reviewable runs with separate metrics for identity correctness, attribution, claim support, source quality, contradictions, negative findings, useful pivots, unnecessary calls, trajectory length, and system failures. Do not collapse these dimensions into a single “smartness” score or claim live performance from architecture tests alone.
