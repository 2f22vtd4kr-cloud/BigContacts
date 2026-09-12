# Apex Atlas — Production Audit & Hardening Roadmap

**Audit start:** 2026-09-12  
**Baseline:** `main` at `5e21c9c25730f5e5e566a86f611887bac1b2c3d1` (PR #275 merged)  
**Repository:** `2f22vtd4kr-cloud/BigContacts`

## Mission

Treat Apex Atlas as a launch-critical autonomous research/control-plane system, not as a collection of passing tests. The goal is to reach the strongest realistically supportable production architecture through repeated adversarial inspection, evidence-backed fixes, regression tests/guards, verified CI, and verified merges.

This roadmap is intentionally **living**. Every phase can add, split, reorder, or retire work when source inspection, CI, production telemetry, or current professional guidance reveals a new issue. A phase is complete only when the implementation, tests/guards, and operational evidence agree.

## Non-negotiable architectural contract

1. Gemini Boss owns assignment, direction, continuation/redirect/stop — never a deterministic research recipe.
2. Exactly one supervisory/control plane; DeepSeek/NVIDIA Right Hand is advisory/challenger, never an independent Investigator.
3. Target-mode Investigator execution is one act at a time (`maxIterations: 1`) with durable observation and review before another act.
4. Provider authority is durable and caller-controlled provider overrides are rejected. No silent Groq↔Mistral provider fallback.
5. Public-source material is untrusted data and cannot directly mutate control-plane state, credentials, provider authority, trusted contacts, or tool authority.
6. Every important operation is bound to the appropriate case/run/target/entity identity.
7. Observation identity, replay identity, provenance, promotion causality, and cancellation fences remain fail-closed.
8. Per-request **and long-lived** resource growth must be bounded.
9. Legacy deterministic OSINT paths must be unreachable, not merely unused by the happy path.
10. TypeScript strictness and architectural intent must never be weakened to manufacture green CI.

## Evidence baseline already reviewed

- Handoff supplied with this task, including prior PR history and known remaining risks.
- Current repository tree and `package.json`.
- Current `main` workflow configuration and PR #275 state.
- Current Apex API typecheck workflow and live audit workflow.
- Current agentic research core, provider gate, SSRF boundary, and model catalog.
- Current 2026 OWASP GenAI/agentic guidance and current Vercel AI SDK production-agent guidance.

The latest OWASP 2026 material explicitly emphasizes prompt injection, improper output handling, excessive agency, vector/embedding weaknesses, misinformation, and unbounded consumption; the agentic guidance emphasizes minimum functionality/permissions/autonomy and complete mediation. Those principles are treated as architectural tests, not marketing claims.

## Phase 0 — Baseline & repository truth

**Status: COMPLETE**

- [x] Verify repository and default branch.
- [x] Verify current `main` SHA and latest merged PR.
- [x] Verify PR #275 was actually merged and record its merge SHA.
- [x] Inspect current CI workflow definitions rather than trusting historical handoff claims.
- [x] Inventory repository tree and identify API, DB, frontend, scripts, workflows, tests, and legacy surfaces.
- [x] Establish that the latest main commit has workflow activity; do not infer green status from merge state.

**New finding:** the repository has extensive static gates, but the live audit workflow is materially different from the frozen CI gate (non-frozen install, explicit schema push, external provider preflight, and a 3-target smoke). These must be audited separately.

## Phase 1 — CI / build / verification integrity

**Status: COMPLETE**

- [x] Audit the canonical API typecheck workflow for dependency reproducibility, scope, strictness, and gate coverage.
- [x] Audit the live audit workflow for secret scope, network reachability, test determinism, timeout behavior, and artifact collection.
- [x] Verify that current checks are actually associated with current commits where possible.
- [x] Identify deployment-provider failures separately from GitHub CI failures; never treat an unrelated Netlify preview failure as a code-quality pass/fail without evidence.
- [x] Preserve the rule that merge state is not equivalent to green verification.

**New finding:** `apex-api-typecheck.yml` is frozen and comprehensive, while `apex-live-audit.yml` intentionally uses a non-frozen install and local PostgreSQL/Redis. The latter is a separate operational smoke and should not be allowed to become the only source of truth for reproducible builds.

## Phase 2 — Control-plane and act linearization audit

**Status: COMPLETE**

- [x] Re-check Boss → Investigator → durable observation → Right Hand → Boss continuation ordering.
- [x] Re-check target-mode single-act enforcement and cancellation boundaries.
- [x] Re-check durable control replay identity and payload mismatch behavior.
- [x] Re-check provider authority propagation into Investigator execution.
- [x] Re-check that model output cannot directly mutate durable control state.
- [x] Re-check launch/cancel/promotion ordering and stale-worker fencing.

**New finding:** the current Investigator core is deliberately capable of multi-step discovery, but the selected provider is fixed for each invocation and the target runner must enforce the one-act contract. This distinction is important: multi-step discovery is not evidence of a target-mode autonomy violation by itself.

## Phase 3 — Long-lived resource / isolation audit

**Status: COMPLETE**

For every in-memory/Redis/DB structure, answer: scope, maximum cardinality, maximum lifetime, eviction trigger, restart behavior, cancellation cleanup, attacker-controlled key growth, and cross-case impact.

- [x] Provider state, waiters, response cache, and in-flight map.
- [x] Agentic provider admission and trajectory storage.
- [x] DigSpan/discovery history and active-job state.
- [x] Semantic/embedding caches and bounded corpora.
- [x] Research-event ledger and case payload limits.
- [x] Redis canonical job lock / heartbeat / durable fencing.
- [x] Cross-case and cross-run cache identity.

**New finding requiring implementation:** provider response caching is bounded by entry count but not by aggregate bytes, and cache identity does not account for all request headers or cookie-bearing requests. A 512-entry cache with 1.5 MB bodies can approach ~768 MB before object overhead. This is too coarse for a launch-critical long-lived process and creates avoidable cache-poisoning/variant risks.

## Phase 4 — Network / SSRF / egress audit

**Status: COMPLETE**

- [x] Validate hostname/IP normalization and blocked address classes.
- [x] Validate all-address DNS checking and pinned connection address.
- [x] Validate TLS SNI/hostname behavior after IP pinning.
- [x] Validate redirects are not silently followed.
- [x] Validate proxy/environment behavior and Unix-socket avoidance.
- [x] Validate request/response byte limits and cancellation.
- [x] Validate credential-bearing URLs/headers and cache interaction.

**New finding:** the custom pinned HTTP(S) transport is substantially stronger than a normal fetch wrapper: it checks all resolved addresses and connects to the selected checked address. Continue with regression tests for unusual IPv4/IPv6 forms and redirect/caching interactions rather than replacing it casually.

## Phase 5 — Provenance, identity, and contact-quality audit

**Status: IN PROGRESS — continue after first merge**

- [x] Verify source URL alone is not sufficient proof for promotion.
- [x] Verify observed material is retained as causal evidence.
- [x] Verify direct vs intermediary contact semantics are represented.
- [x] Verify target/case/run binding at persistence boundaries.
- [ ] Audit every promotion path, including compatibility/legacy paths.
- [ ] Audit identity adjudication for ambiguous names, shared brands, operators, parent companies, and candidate people.
- [ ] Add adversarial tests for indirect-contact mispromotion and URL-only evidence.

## Phase 6 — Prompt injection / untrusted-data adversarial audit

**Status: NOT STARTED**

- Trace every path from web/search/registry/browser/PDF content into prompts.
- Verify untrusted text cannot become system/developer instructions or tool authority.
- Verify model-structured outputs are schema-validated and deterministically constrained before control-plane effects.
- Test malicious pages that request credential disclosure, provider switching, case cancellation, promotion, tool invocation, or prompt replacement.
- Test multi-hop poisoning where one observation is fed into a later model turn.
- Review memory/trajectory persistence for instruction-like content.

## Phase 7 — Tool authority and sandbox audit

**Status: NOT STARTED**

- Audit browser, Python, shell/subprocess, filesystem, network, and environment access.
- Confirm capability selection is minimum necessary and independently authorized.
- Audit sandbox escape, process accumulation, environment/credential exposure, output limits, and cancellation.
- Audit domain harvesting, username footprinting, registry, browser escalation, and all OSINT tools as distinct capabilities.

## Phase 8 — Deterministic-strategy / legacy-reachability audit

**Status: NOT STARTED**

- Search routers, exports, scripts, workers, dynamic imports, tests, and CLI entrypoints.
- Prove retired deep-web/MCTS/broad-discovery deterministic recipes are unreachable.
- Distinguish legitimate provider/model fallback from forbidden research-strategy fallback.
- Inspect compatibility code before deleting anything.
- Add/repair guards where architectural drift can recur.

## Phase 9 — Data model / database / concurrency adversarial audit

**Status: NOT STARTED**

- Re-check event identity and immutable ledger behavior under replay.
- Re-check serializable transaction boundaries and row-lock ordering.
- Test cancellation-vs-promotion, continuation-vs-cancellation, and stale-worker reactivation races.
- Audit JSONB merge semantics, size caps, event-count caps, advisory locks, and indexes.
- Review tenant/account isolation and query authorization.

## Phase 10 — API / auth / deployment boundary audit

**Status: NOT STARTED**

- Audit every route for auth, mutation/read separation, input bounds, error leakage, and method semantics.
- Review CORS, security headers, body limits, health endpoints, login throttling, and production boot behavior.
- Review Replit/Vercel/Netlify/deployment assumptions without assuming any single host is authoritative.
- Verify production builds are reproducible and do not mutate source.

## Phase 11 — Observability / live-evidence audit

**Status: NOT STARTED**

- Verify telemetry is bounded and does not expose secrets or untrusted content unsafely.
- Run the live audit only when required credentials are actually available.
- Inspect real provider preflight behavior, admission, cancellation, provenance, and result quality.
- Treat missing secrets or unavailable external systems as explicit evidence gaps, never as fabricated success.

## Phase 12 — Product-quality / investor-contact research audit

**Status: NOT STARTED**

- Measure direct public contact vs legitimate intermediary paths separately.
- Verify no inferred personal email patterns are promoted without evidence.
- Verify person identity is not inferred from name + URL alone.
- Verify negative findings and search gaps are retained where useful.
- Build quality fixtures for ambiguous names, shared brands, operators, holding companies, and indirect contact routes.

## Phase 13 — Final adversarial pass and launch gate

**Status: NOT STARTED**

- Re-run the full static architecture suite after all fixes.
- Run API build and strict workspace typecheck.
- Run relevant targeted regression suites.
- Re-run long-lived resource review after all new caches/state are added.
- Re-run cross-case contamination review.
- Re-run cancellation/lease/promotion race review.
- Verify main after every merge.
- Only then produce a launch-readiness assessment with explicit residual risks and evidence gaps.

## Dynamic adjustment log

### Adjustment 2026-09-12 / A1
Initial handoff emphasized per-entry provider cache bounds. Direct source inspection revealed a second-order issue: aggregate response-cache memory and request-variant identity are under-specified. Therefore Phase 3 now requires **byte-budgeted cache memory plus credential/cookie/variant-aware cacheability**, not just an entry-count guard.

### Adjustment 2026-09-12 / A2
Current 2026 OWASP guidance explicitly elevates unbounded consumption, excessive agency, improper output handling, and vector/embedding weaknesses. Therefore these are first-class audit dimensions rather than optional hardening tasks.

### Adjustment 2026-09-12 / A3
Current Vercel AI SDK 7 guidance emphasizes tool approvals, durable execution, timeouts, sandboxing, and observability. Apex is not required to adopt Vercel's architecture, but these capabilities are useful comparison points for evaluating whether its custom control loop has equivalent safety properties.

## Working rule

Do not optimize for the number of changed lines. Optimize for **provable invariants, bounded resources, explicit authority, causal provenance, race-safe state transitions, and evidence that the system still behaves correctly after the fix**.
