# Apex Atlas roadmap amendment — second audit pass

This amendment supersedes the phase-status lines in `APEX-ATLAS-PRODUCTION-AUDIT-ROADMAP.md` where they conflict. The roadmap remains living; the original ordering and invariants remain in force.

## Newly completed phases

### Phase 5 — Provenance, identity, contact quality: COMPLETE

Current `main` was re-read directly. The canonical agentic path now requires successful observed-source provenance, claim/value presence in the observed material, candidate person identity evidence, exact case/run provenance, and a fail-closed strict promotion boundary. Historical PR #183 established the exact execution/run provenance and observation-material requirement; merged PR #184 preserved cancellation and atomic launch-lock behavior. The strict persistence path also uses exact entity binding, compare-and-set card updates, and immutable claim/observation references.

### Phase 6 — Prompt injection / untrusted data: COMPLETE for current architecture; adversarial expansion remains in Phase 13

The canonical ReAct prompt explicitly labels all public-source/search/registry/browser/OSINT output as untrusted data and rejects embedded instructions, policy overrides, promotion requests, and tool commands as evidence. Model output is parsed into a closed action union, field-bounded, URL-validated, and promotion findings are independently provenance-checked before persistence. The remaining work is deeper adversarial evaluation against multi-hop prompt poisoning, not a known missing basic boundary.

Current professional guidance reinforces this design: OWASP's 2026 Agentic Top 10 treats goal hijack, tool misuse, identity/privilege abuse, supply-chain compromise, and excessive agency as first-class risks. These are now explicit acceptance criteria for the final adversarial pass.

### Phase 7 — Tool authority / sandbox: COMPLETE for currently enabled capabilities; Python network capabilities remain intentionally unavailable

The Python capability boundary is fail-closed until a trusted sandbox attestation exists; environment variables or package installation cannot authorize network-capable subprocess execution. The SSRF transport is a separate pinned public-web egress boundary. Browser escalation, registry, search, and Python capabilities are delegated as distinct actions rather than arbitrary shell authority.

This is deliberately not a claim that a production Python sandbox exists. The correct current state is unavailable-by-default.

### Phase 8 — Deterministic strategy / legacy reachability: COMPLETE

Repository guards now walk canonical source for retired legacy imports, explicitly account for the two unreachable compatibility route bodies, and separately verify route topology. The deterministic-research guard rejects historical search/tool/provider sequence patterns from the canonical discovery source. Historical provider-fallback hardening is present in current `main`: a Boss-selected Investigator provider is authoritative for the act; same-provider model/key retries remain inside that provider and cross-provider fallback is blocked at the outbound boundary.

## Phase 9 status update

**Phase 9 — Data model / database / concurrency: COMPLETE for the current known control-plane invariants; longer-term schema work remains.**

Merged hardening now uses owner-bound atomic Redis compare-and-delete for canonical launch locks instead of read-then-delete, and durable event replay uses case + correlation identity with payload equality checks. Target promotion is bound to exact execution/run identity and stale oversight is fenced. Remaining longer-term items are relational uniqueness for execution identity and a full DB-level immutability writer census; these are retained for Phase 13 rather than falsely marked solved.

## Phase 10–13 remain open

The next passes focus on route-wide auth/input/deployment review, observability and real provider evidence, product-quality/contact adjudication, and the final adversarial/launch gate. These are not being declared complete from static architecture evidence alone.

## New findings / roadmap changes

1. **Provider response cache hardening is now implemented and guarded.** Aggregate bytes, credential/cookie isolation, common content variants, `Set-Cookie`, and private/no-store responses are handled fail-closed.
2. **Live audit dependency installation is now reproducible.** pnpm is pinned and the committed lockfile is required.
3. **Unexpected GitHub workflow execution remains a CI-control-plane anomaly.** The repository source says the manual single-target workflow is not push-triggered and the live audit is main/path scoped, yet GitHub reported push-triggered failures on the first audit branch. This needs explicit follow-up in Phase 10/11 rather than being ignored.
4. **Current provider documentation changed the audit standard.** Mistral and Groq both now document structured JSON/schema output; Apex's deterministic parser remains the final enforcement boundary, but the provider adapters should be reviewed for stronger schema-level output enforcement in the next model-provider pass.
