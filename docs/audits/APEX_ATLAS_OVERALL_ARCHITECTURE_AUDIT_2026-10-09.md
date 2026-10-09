# Apex Atlas — Overall Architecture Bug Hunt

**Audit date:** 2026-10-09  
**Branch:** `main` only  
**Scope:** End-to-end source/control-flow review, durable evidence and terminal proof, provider boundaries, lock/lease recovery, prompt budgets, current-main tests/CI, frontend taxonomy, and operational documentation.  
**Runtime boundary:** No Replit workflow was run and no live Apex research job was launched for this audit. This is not a claim of production/runtime acceptance.

## Architectural contract preserved

Apex is intended to be a model-directed research bureau, not a deterministic enrichment ladder. The flow remains: human objective → Groq Boss → Groq Right-hand review → model-owned Investigator trajectory → durable observations/provenance → Research Intelligence and evidence sufficiency → target-scoped investigation when justified → Boss continuation/stop → deterministic terminal authority.

The deterministic layer enforces authorization, lane ownership, resource/deadline limits, output shape, source provenance, immutable history, evidence sufficiency, and honest terminal status. It should not prescribe “search this, then visit that, then query a registry.” A liveness guard can prohibit repeating a nonproductive action class without choosing the next tool; this constrains failure without scripting research.

## High-impact defects fixed or materially hardened on main

1. **Discovery names could be counted as admitted before evidence existed.** The canonical admission boundary requires a promoted candidate-scoped finding, observed HTTP provenance, and a successful retrieved-page observation from the same Investigator run matching the normalized full name and a claimed source URL. Only an entity with durable review evidence is returned to subsequent control decisions. Entity/evidence writes are transactional; failure to create the evidence session aborts the transaction. Relevant code: `canonical-atlas-discovery.ts`, `identity-text-match.ts`, discovery admission guards.

2. **Discovery completion could be reported with zero durable admissions.** A model's `MODEL_DECIDED_DONE` alone no longer establishes discovery terminal authority or a complete case when there is no source-backed durable admission. Zero admissions means review/incomplete, not success by assertion.

3. **Identity matching could confuse substrings or differently normalized names.** The shared matcher uses Unicode NFKC, case/punctuation/whitespace normalization, and token-bounded full-name matching; deduplication uses the same identity normalization. This prevents matching “Ann Li” inside “Joann Li.”

4. **Opening Right-hand reviews accepted weakly shaped JSON.** Discovery and target opening Right-hand calls now use a bounded strict response contract for decision, reason, focus lanes, and confidence. Empty, malformed, extra-field, overlong, or out-of-range payloads fail closed. Tests exercise accepted and rejected shapes.

5. **Target terminal status did not fully require completed oversight.** Target terminal proof requires a completed Investigator episode, `MODEL_DECIDED_DONE`, at least one evidence graph, completed Right-hand/Boss oversight explicitly choosing stop, and no cancellation/resource/deadline fence. The overall Atlas terminal gate includes the run deadline. Model intent is evidence for a decision, not permission on its own to claim terminal success.

6. **Lease-loss handling risked divergence between Redis job and database case state.** A confirmed owner mismatch from a successful lease-renewal command triggers two independent best-effort fences: an atomic Redis script rechecks current ownership and preserves missing/terminal job snapshots before cancellation, while the database independently transitions only active cases bound to that job into review. `Promise.allSettled` means a failure in one store cannot prevent the attempt against the other; failures are surfaced with sanitized state diagnostics. A transport/command error during renewal remains a retryable ambiguous failure and does not trigger lease-loss fencing. This separation is intentional partial-outage recovery, not a research-policy decision.

7. **Investigator prompt/context handling has structural bounds.** The assembled provider message is bounded together with the stable system instruction. Working context keeps the latest trajectory record visible and an archive index for older observations; complete observations remain in durable storage. Emergency compaction preserves task-contract/action boundaries. Repeated malformed action results have a liveness ceiling. These rails bound resource failure without prescribing the next research action.

8. **Contact promotion and source provenance have been tightened.** Agentic contact values must be grounded in immutable observations tied to the correct case/job/target; candidate name and contact must be supported by the same identity-bearing observation, and each cited page must support the claim attributed to it. Search-result pages are not claim-grade sources. Source lineage—not raw URL count—determines independence.

9. **Provider/cache/transport safeguards have expanded.** Current main includes queue-time budget rechecks, refreshed provider-gate reads around waits, credential-bearing URL cache isolation, safe outbound-fetch/SSRF checks, bounded parser recovery, and Groq structured response contracts. Capacity waits use provider reset telemetry as a bounded temporary wait, not as evidence of a hard quota or a reason to silently drop to a smaller model.

10. **The current provider-role documentation was stale.** The new-account initialization blueprint was corrected to stop describing Mistral as an active Investigator option. Historical Gemini-era handoffs are marked as historical; current source/config and current setup docs govern role names.

## End-to-end paths inspected

- UI launch intent, launch-body normalization, canonical route ownership and legacy-route retirement.
- Distributed `atlas-run` claim/release, heartbeat renewal, lease-loss handling, job terminal protection, cache authority, stop/cancel races and durable case fences.
- Groq Boss opening assignment, Right-hand review, Investigator selection, model-owned ReAct/tool selection, malformed-action recovery, search-only liveness and bounded episode continuation.
- Tool observations and durable case events, run/job/source identity, evidence graphs, source lineage, contact promotion and candidate admission.
- Review-only discovery entities/evidence, target-scoped investigation, oversight status, final deadline/resource proof and terminal projection.
- Provider quotas/reset headers, queue/cache behavior, SSRF boundaries, frontend entity taxonomy, package/static guards and the documentation agents are instructed to follow.

## Remaining items — do not mark the system fully green

- **Runtime acceptance remains unverified.** The October 4/6 audited runs created no admitted entities/evidence rows. The code path is materially stronger, but only a fresh, explicitly authorized Replit run can prove real provider calls, durable ledger inserts, candidate admission, target research and UI projections agree. This audit did not launch a run.
- **CI must be checked at the exact final head.** During the sweep, the static discovery check and frontend five-condition gate passed on nearby commits. API checks exposed lease static assertions that lagged source changes; the assertions and lease logic were updated. The branch was receiving concurrent commits and CI runs were being cancelled/restarted during inspection, so a nearby pass is not final-head verification. Do not infer that “Five Consecutive Full Code Audits” passed unless five completed green audits exist on the current final source.
- **Candidate taxonomy is a product/data-model risk.** A review-only discovered person is currently persisted internally as `entities.type = "HNWI"` even when wealth is not established. The row is marked review-only and contact promotion is separately gated, but HNWI is stronger than “person/candidate.” A neutral person/review-lead type needs a coordinated schema, API validation, frontend taxonomy/filter, prompt, and migration change; that cross-cutting data-model redesign was not made in this bug hunt. Do not treat review-only metadata as proof of wealth.
- **Historical trace-vs-ledger telemetry must be reconciled on live acceptance.** Previous audits found trace counters could diverge from immutable event counts. A fresh run must compare before/after job/case/event/evidence/session/entity counts, event IDs, supporting URLs, target IDs and UI projections—not just health or model summaries.
- **Character ceilings are not token budgets.** The transmitted message envelope is bounded, but actual selected-model tokens, prompt caching, reset headers, wait durations, retries and request-size behavior must still be confirmed with live telemetry. Never silently omit the action schema or downshift model/context quality to conceal pressure.
- **Research quality needs trajectory-level evaluations, not just static/mocked contracts.** Add a clean-case evaluation corpus covering hard identity ambiguity, contradictory and stale sources, source-family dependence, empty discovery, rate limits, prompt injection and legitimate early stopping. Grade the result plus the trajectory and source grounding, use multiple trials, and send ambiguous cases to human review.

## External research applied

- OpenAI's [Deep Research guide](https://developers.openai.com/api/docs/guides/deep-research) describes multi-step research that uses tools and model reasoning.
- The OpenAI [Deep Research System Card](https://openai.com/index/introducing-deep-research/) documents the risk of instructions embedded in untrusted web content; fetched pages must remain observations, not control-plane instructions.
- Anthropic's [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents) argues for control patterns suited to the task while preserving model/tool flexibility.
- Anthropic's [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) recommends trajectory/task-level assessment, groundedness/source-quality grading, multiple trials and a combination of automated checks and human review.
- Groq's [Rate Limits](https://console.groq.com/docs/rate-limits) and [Structured Outputs](https://console.groq.com/docs/structured-outputs) cover the provider capacity/reset signals and schema-constrained responses relevant to this runtime.

**Disposition:** This pass produced source, test/guard and documentation improvements on `main`; it does not replace final-head CI or explicitly authorized runtime acceptance. Keep the Bureau model-led. Continue strengthening the boundaries and measurement around the model rather than converting the Investigator into a scripted enrichment pipeline.
