# Apex Atlas Recovery Progress — 2026-09-27

## Live recovery chain

1. Original canonical Replit launch failed at Gemini Boss with Interactions API HTTP 400 invalid_request.
2. Same-model Gemini Boss compatibility retry was verified live; the workflow advanced to Gemini Right-hand.
3. Right-hand then failed because its adapter requested JSON by prompt instruction only and received invalid JSON.
4. PR #384 enforces structured JSON for typed Right-hand contracts, preserves local validation, and retries the same model/key without response_format on HTTP 400.
5. Regression coverage was added for the exact compatibility path.
6. CI initially exposed a test-fixture type error; the fixture was corrected and a fresh audit wave is running.

## Architecture audit findings

- Boss remains the authority for Investigator selection.
- Right-hand is advisory oversight only and never receives web/tool authority.
- Investigator owns one model-selected ReAct trajectory.
- Groq and Mistral are same-role alternatives, not silent cross-provider fallbacks.
- Serper, Tavily, Exa, public HTTP, browser escalation, domain lookup, registry search, harvesting, email footprinting, and username footprinting are capability calls chosen by the Investigator.
- Observations are separated from promoted evidence.
- SSRF-safe outbound fetch pins DNS-resolved addresses, blocks private/reserved destinations, disables automatic redirects, and enforces byte/cancellation limits.
- Provider gates enforce global/per-provider concurrency, request windows, cooldowns, cache limits, and account/scope separation.
- Python-backed network OSINT remains fail-closed when enforceable egress is unavailable.

## Provider verification notes

Current provider documentation was checked during this audit. Gemini Interactions supports structured JSON via top-level response_format; Groq currently supports the repository's three agentic models and structured JSON modes; Mistral currently documents JSON mode and live model discovery.

## Documentation law

This file is a continuation aid, not a substitute for the canonical source code, tests, audit workflows, or live Replit verification. Never mark the recovery complete until the intended changes are on main and the five-green condition plus live canonical launch are green.
