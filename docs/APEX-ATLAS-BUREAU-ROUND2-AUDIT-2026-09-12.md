# Apex Atlas / Bureau Round-Two Audit — 2026-09-12

This round reviewed the canonical Bureau backend in pieces: Investigator wrapper/core, target per-act oversight, strict contact persistence and promotion, browser escalation, SSRF/cancellation boundaries, registry and Python OSINT capability paths, durable case/job binding, evidence attribution, and the canonical single-target runner.

Professional security guidance consulted included OWASP Agentic Applications 2026, OWASP SSRF prevention guidance, OWASP API Security guidance, and current GitHub Actions security guidance.

## Finding fixed

Browser/anti-bot escalation could pass an Investigator-selected URL to Scrapfly, ZenRows, or Browserless without first applying the canonical SSRF gate. Direct HTTP and Playwright navigation were already governed, but proxy escalation is itself an outbound capability and must not become an SSRF bypass.

The browser fetch boundary now calls `assertSafeOutboundUrl()` before any browser provider is invoked. `check-ssrf-cancellation-boundary.mjs` now statically guards that invariant.

## Guard maintenance

- Investigator-selection guard now recognizes the helper-bound durable case lookup used by Bureau.
- Apex ten-point integrity guard now checks the same durable selection authority without requiring an obsolete inline query shape.
- Strict persistence source URLs are explicitly narrowed before promotion, preserving the atomic empty-field promotion path.

## Current invariants

- Investigator execution is bound to the exact durable target case, entity, and Atlas job.
- Provider selection comes from durable case state; caller input cannot override it.
- Target oversight is exact-case bound.
- Investigator observations and Boss decisions are transactionally durable and replay-bound by case/run/turn.
- Trusted card promotion requires immutable case/run provenance and observed-source evidence.
- Cancellation is rechecked immediately before trusted promotion.
- Direct and browser-proxy egress share the SSRF boundary.
- Browser response size, fetch count, timeout, and cancellation remain bounded.
- Legacy deterministic research/mutation surfaces remain retired or quarantined.
