# Apex Atlas / Bureau Round-Two Audit — 2026-09-12

## Scope

This round reviewed the canonical Bureau backend in pieces, including the Investigator wrapper/core, target per-act oversight, strict contact persistence and promotion, browser escalation, SSRF/cancellation boundaries, registry and Python OSINT capability paths, durable case/job binding, evidence attribution, and the canonical single-target runner.

Professional security guidance consulted included OWASP Agentic Applications 2026, OWASP SSRF prevention guidance, OWASP API Security guidance, and current GitHub Actions security guidance.

## Finding fixed in this round

The browser/anti-bot escalation path could pass an Investigator-selected URL to third-party browser providers without first applying the canonical SSRF gate. Direct HTTP and Playwright navigation were already governed, but proxy escalation is itself an outbound network capability and must not become an SSRF bypass.

The browser fetch boundary now calls `assertSafeOutboundUrl()` before any provider escalation. A static regression guard was added to `check-ssrf-cancellation-boundary.mjs` so the invariant remains machine-enforced.

## Audit-guard maintenance

Two existing static guards were aligned with the current durable-case implementation rather than stale source shapes:

- `check-investigator-selection-authority.mjs` now recognizes the helper-bound durable case lookup used by Bureau.
- `check-apex-ten-point-integrity.mjs` now checks the same durable selection authority without requiring an obsolete inline query shape.

The strict persistence boundary also received a TypeScript narrowing correction for optional `sourceUrls`; the atomic empty-field promotion path remains intact.

## Current invariant set

- Target Investigator execution is bound to the exact durable target case, entity, and Atlas job.
- The Investigator provider is derived from durable case state; caller input cannot override it.
- Target oversight is loaded by exact case identity, not target-name fallback.
- Investigator observations and Boss decisions are transactionally durable and replay-bound by case/run/turn identity.
- Trusted contact-card promotion requires immutable case/run provenance and observed-source evidence.
- Cancellation is rechecked immediately before trusted promotion.
- Direct and browser-proxy web egress share the SSRF boundary.
- Browser response sizes, fetch counts, timeouts, and cancellation remain bounded.
- Legacy deterministic research/mutation surfaces remain retired or quarantined.

Final acceptance requires the complete Apex API build/typecheck/regression gate to pass on the final branch head.
