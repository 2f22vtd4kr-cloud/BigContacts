# ★ Apex Atlas — Control-Plane Hardening — 2026-10-04

## Scope

This audit records the code-level remediation following the single authorized 2026-10-04 canonical Atlas launch. No second live launch, recovery, provider probe, secret change, or manual data mutation was performed during this remediation.

## Observed live boundary

- The authorized run reached the second Groq Boss control decision after eight successful Investigator search actions.
- The durable Boss control event was `status=unavailable`; the Right-hand review nested inside that decision completed.
- The run produced zero admitted entities and zero research-evidence rows, so no card was created and no star request was issued.
- The sanitized failure record did not identify a remote Groq HTTP status. The upstream cause therefore remains unproven from the live record alone.

## Root cause found in code

The run's external-provider gate used the default `process` provider scope for canonical Atlas Boss and Investigator Groq calls. The gate's default per-scope budget is 40 attempts per 10-minute window. Right-hand already had its own `atlas-right-hand` scope.

That meant the canonical Atlas Investigator's LLM attempts consumed the same local `process|groq` budget that the later Boss control decision needed. With roughly 39 Investigator attempts already recorded, the next Boss control call could be blocked by Apex's own gate before reaching Groq. This produces an HTTP-less `ProviderQuotaError` and is distinct from a Groq 429.

This is a local capacity-accounting defect, not a license to bypass Groq limits. Groq documents rate limits at the organization level and exposes remaining/reset headers on real 429 responses; project limits can further restrict an organization's ceiling.

## Remediation

1. **Per-job canonical Atlas scope.** The canonical launch now wraps the complete provider-using pipeline in `atlas-run:<jobId>`. Canonical continuation/recovery uses the same job-scoped pattern. Right-hand retains its dedicated `atlas-right-hand` scope.
2. **Bounded Atlas scope budget.** `atlas-run:*` receives a dedicated `APEX_ATLAS_PROVIDER_MAX_REQUESTS_PER_SCOPE` budget, defaulting to 80 and hard-capped at 80. The ordinary process scope remains at 40. The provider-level Groq ceiling remains independent, so this does not create an unlimited bypass.
3. **No futile local-quota fallback.** Investigator LLM fallback now stops immediately on a local `ProviderQuotaError` instead of cycling through other Groq keys/models that the local gate will reject before any upstream request.
4. **Boss fail-fast diagnostics.** Boss now stops on the same local gate condition and persists a privacy-safe provider code/failure class (`budget_exhausted`/`cooldown`, `rate_limited`) instead of an opaque `HTTP none` attempt summary.
5. **Failure classification.** Atlas Boss generation failure classification now recognizes local provider-gate rate limiting even when there is no HTTP status.
6. **Regression coverage.** Added provider-gate scope tests, privacy-safe local-quota diagnostics tests, Atlas control classification tests, and a source guard that prevents removal of the per-job scope/fail-fast boundaries.
7. **Deterministic test isolation.** The existing Right-hand transient-429 regression used its own mock-call history to decide whether to return the retry response. It now uses an explicit chat-call counter, removing test-runner timing/mock-order ambiguity while preserving the assertion that the retry stays on the same model.
8. **429 classification correction.** The Right-hand retry classifier previously treated `rateLimitKind="unknown"` as a hard quota condition because `unknown` was non-null. That suppressed the bounded transient-429 retry path and could cause unnecessary model fallback. Unknown 429s now enter the bounded transient retry path; only confirmed request/token exhaustion is treated as a hard rate-limit condition.

## Why this is the correct architecture

The fix does not redesign Atlas into deterministic enrichment. Groq Boss still owns control decisions, Investigator still owns research actions, Right-hand remains independent oversight, provenance/admission remains fail-closed, and terminal transitions remain deterministic safety gates.

The larger Atlas-local budget only prevents unrelated process-scope accounting from terminating a single canonical run prematurely. It does not override upstream provider limits. Groq's documented 429 handling remains authoritative; a real upstream 429 must still be respected rather than bypassed with more keys.

## Provider-capacity interpretation

Groq's current documentation says rate limits are organization-level and may include RPM/RPD/TPM/TPD/ITPM/OTPM dimensions. Project-specific request limits can be configured, but organization limits remain the ceiling; spending limits are organization-wide across API keys. Therefore a new key is not, by itself, a reliable fix for an exhausted organization/project capacity condition.

## Live-launch policy

- Do not resume or recover the parked case merely to test these changes.
- Do not launch another external Atlas run until code verification is green and the intended Groq capacity is available.
- Do not paste or commit a Groq key into source/chat.
- Do not bypass the Right-hand gate, evidence admission gate, provenance gate, or terminal gate.
- The next authorized live run must remain the dashboard-equivalent `targetCount=3`, `researchDepth=standard`, `targetTimeoutMs=420000` launch.

## Verification target

Required before the next live launch: typecheck, build, provider-gate tests, provider-error-diagnostics tests, Atlas control regression tests, canonical provider-scope static guard, and the existing bureau/full-code audit suites. A live run remains a separate proof obligation; passing code tests does not prove external provider capacity.

## External references

- Groq rate-limit semantics and headers: official Groq Rate Limits documentation.
- Groq project-level limits and organization ceiling: official Groq Projects documentation.
- Groq organization-wide spend limits: official Groq Spend Limits documentation.
