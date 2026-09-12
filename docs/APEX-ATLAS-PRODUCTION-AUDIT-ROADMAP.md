# Apex Atlas — Production Audit & Hardening Roadmap

**Audit start:** 2026-09-12  
**Current pass:** 2026-09-12 final hardening  
**Repository:** `2f22vtd4kr-cloud/BigContacts`

## Mission

Treat Apex Atlas as a launch-critical autonomous research/control-plane system. The roadmap is living: every new source inspection, CI result, runtime observation, or professional guidance can amend it. A phase is complete only when implementation, regression coverage, and operational evidence agree.

## Non-negotiable architectural contract

1. Gemini Boss owns assignment, direction, continuation/redirect/stop; it does not delegate a deterministic research recipe.
2. Exactly one supervisory/control plane; DeepSeek/NVIDIA Right Hand is advisory/challenger only.
3. Target-mode Investigator execution is one act at a time (`maxIterations: 1`) with durable observation/review before another act.
4. Provider authority is durable and caller-controlled provider overrides are rejected. No silent Groq↔Mistral Investigator fallback.
5. Public-source material is untrusted data and cannot directly mutate control state, credentials, provider authority, trusted contacts, or tool authority.
6. Important operations are bound to the appropriate case/run/target/entity identity.
7. Observation identity, replay identity, provenance, promotion causality, and cancellation fences fail closed.
8. Per-request and long-lived resource growth is bounded.
9. Retired deterministic OSINT paths are unreachable, not merely unused on the happy path.
10. TypeScript strictness and architectural intent are never weakened to manufacture green CI.

## Phase status

### Phase 0 — Baseline & repository truth
**COMPLETE**

Repository/default branch, merged history, workflow topology, source tree, and current verification surfaces were directly inspected.

### Phase 1 — CI / build / verification integrity
**COMPLETE**

The canonical API gate is frozen to the committed lockfile. Live audit is explicitly treated as a separate operational smoke. Merge state is not treated as proof of green verification.

Final hardening added an immutable GitHub Action pin guard. GitHub's current security guidance recommends pinning third-party actions to full commit SHAs as the immutable-release control. The audited workflows now pin checkout/setup-node/upload-artifact to verified full SHAs.

A final trigger audit found that the single-target workflow's synthetic "deny push" branch filter did not behave as a safe deny control: GitHub executed the workflow on an ordinary branch push during this audit. The workflow was corrected to use `workflow_dispatch` only. This is now a regression fact in the roadmap, not an assumption.

### Phase 2 — Control-plane and act linearization
**COMPLETE**

Boss → Investigator → observation → Right Hand → Boss continuation, target single-act semantics, provider authority, cancellation, replay identity, launch locking, stale-worker fencing, and promotion ordering were re-audited and remain enforced.

### Phase 3 — Long-lived resource / isolation
**COMPLETE**

Provider state, waiters, in-flight work, response cache, semantic cache, discovery state, event payloads, job locks, and cross-case identity were reviewed. Provider response cache was strengthened with an aggregate byte budget, credential/cookie exclusion, variant-aware identity, and private/no-store/Set-Cookie exclusion.

### Phase 4 — Network / SSRF / egress
**COMPLETE**

The pinned public-web transport validates all resolved addresses, connects to the checked address, preserves TLS hostname verification, rejects unsafe destinations, avoids silent redirects, bounds request/response sizes, and propagates cancellation.

### Phase 5 — Provenance, identity, and contact quality
**COMPLETE for the current canonical architecture**

Strict persistence requires observed material, matching source evidence, candidate identity, exact case/run provenance, entity binding, collision protection, and atomic empty-field updates. Identity resolution is review-only and requires an explicit accepted identity gate before confirmation. Legacy contact-research control endpoints return retirement responses rather than invoking the former coordinator.

Remaining quality evaluation is fixture-based and belongs to Phase 12 rather than being mislabeled as a missing security boundary.

### Phase 6 — Prompt injection / untrusted-data adversarial audit
**COMPLETE for baseline architecture; adversarial expansion retained in Phase 13**

Public/search/registry/browser/OSINT material is explicitly untrusted. Structured model actions are closed-union parsed and deterministically constrained before effects. The remaining work is broad adversarial corpus coverage, not a known missing baseline mediation boundary.

### Phase 7 — Tool authority and sandbox audit
**COMPLETE for currently enabled capabilities**

Python network OSINT is unavailable by default and requires trusted sandbox attestation; environment variables cannot grant authorization. Browser/registry/search/OSINT capabilities are distinct and bounded. The final adversarial pass must continue to test tool confusion, capability escalation, output limits, and cancellation.

### Phase 8 — Deterministic-strategy / legacy reachability
**COMPLETE**

Canonical source guards prove retired deterministic strategy imports/reachability remain blocked. Historical deterministic research paths are not used by the canonical control plane. Compatibility route bodies are explicitly quarantined/retired.

### Phase 9 — Data model / database / concurrency
**COMPLETE for current known control-plane invariants**

Replay identity, durable case/run binding, immutable event protections, atomic job-lock release, stale-worker fencing, cancellation-vs-promotion boundaries, and bounded payload/event controls were reviewed. Longer-term schema-level writer census remains a Phase 13 regression concern.

### Phase 10 — API / auth / deployment boundary
**COMPLETE for current deployed architecture**

API routes are mounted behind the authentication boundary except the intentionally public health/login/session bootstrap paths. Bearer comparison is constant-time; production boot requires strong API/session/operator secrets; mutation sessions require same-origin; login failures are bounded. JSON/urlencoded bodies are bounded to 128 KiB and production security headers are set.

The Replit production runtime was also corrected from Node 20 to Node 22. Node 20 reached EOL in March 2026; Node 22 is currently an LTS line. Production boot now has a regression guard for the runtime baseline.

### Phase 11 — Observability / live evidence
**COMPLETE as an operational evidence framework; live provider success remains environment-dependent**

Live workflows record exact commit, provider preflight results, health, launch/status state, bounded entity/scoreboard snapshots, and audit artifacts. Missing provider credentials are reported as explicit evidence gaps; the workflow refuses to claim a real Dig when no configured provider passes preflight.

A live run cannot be represented as successful merely because CI infrastructure is available. The final launch assessment must distinguish static proof, CI proof, and real-provider evidence.

### Phase 12 — Product-quality / investor-contact research audit
**COMPLETE for enforcement boundaries; quality benchmark remains an explicit launch metric**

The system distinguishes public/direct/intermediary contact semantics, rejects inferred contact promotion without evidence, requires observed person identity, and keeps identity resolution review-only. Quality fixtures for ambiguous names, shared brands, operators, holding companies, and indirect routes remain part of the final benchmark suite.

### Phase 13 — Final adversarial pass and launch gate
**COMPLETE pending final CI/merge evidence**

Final hardening implemented:
- immutable GitHub Action pinning across audited workflows;
- supported Node 22 production runtime;
- provider cache memory/privacy boundaries;
- workflow pinning regression guard;
- production boot runtime regression guard;
- strictly manual single-target audit trigger;
- retained provenance/auth/sandbox/concurrency/legacy gates.

The final launch gate is evidence-based: API build, strict workspace typecheck, complete static architecture suite, targeted regression tests, workflow integrity checks, and (when credentials exist) live provider smoke must be green. A missing external credential is an evidence gap, not a fabricated success.

## Professional-source baseline

- OWASP Top 10 for Agentic Applications 2026: prompt injection, excessive agency, tool misuse, supply-chain risk, and bounded authority are treated as first-class controls.
- OWASP API Security Top 10 2023: authorization, resource consumption, SSRF, security misconfiguration, inventory, and unsafe third-party API consumption are mapped to the audit.
- OWASP Secure Code Review / Authorization guidance: server-side authorization, fail-safe defaults, object-level checks, business-logic/race review, and security-focused manual review remain required.
- GitHub Actions secure-use guidance: workflow actions are pinned to immutable commit SHAs.
- Current provider documentation: Mistral and Groq support schema-based structured outputs; provider adapters remain subject to deterministic application-side validation.
- Node.js release guidance: production should use supported Active/Maintenance LTS; Node 20 is EOL, Node 22 is LTS.

## Dynamic adjustment log

### A1 — Provider cache
Direct inspection found entry-count-only caching could permit excessive aggregate memory and unsafe request-context sharing. Fixed with byte budget, cacheability rules, and variant-aware identity.

### A2 — Agentic security standard
Current 2026 OWASP agentic guidance made excessive agency, untrusted data, tool authority, and resource bounds explicit architectural acceptance criteria.

### A3 — CI supply chain
Current GitHub guidance made mutable action tags a launch-control concern. The final pass pins audited workflow actions to full SHAs and adds a regression guard.

### A4 — Runtime lifecycle
Direct deployment inspection found Replit configured Node 20. Current Node.js data shows Node 20 EOL; the production runtime is now Node 22 and CI checks the deployment configuration.

### A5 — Live evidence
The live audit is deliberately separate from static proof. Provider availability, quotas, and credentials are external evidence and must be reported rather than inferred.

### A6 — Workflow trigger reality
The audit directly observed a supposedly manual single-target workflow executing on an ordinary push. The synthetic branch filter was therefore treated as unsafe and removed. Manual-only sensitive workflows now use only `workflow_dispatch`; trigger behavior is considered an empirically tested security property, not a YAML comment.

## Final working rule

Do not optimize for changed-line count. Optimize for provable invariants, bounded resources, explicit authority, causal provenance, race-safe transitions, reproducible builds, immutable CI dependencies, trigger correctness, and honest operational evidence.
