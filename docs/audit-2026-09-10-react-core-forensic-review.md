# Forensic review — rewritten Investigator ReAct core

Date: 2026-09-10  
Current reviewed main tip: `7be56c019cb35f7263274c65f8ab20d9a928ba30` at review start; provider-quota wrapper fix was subsequently committed as `acf49d2cb42d5cbdbc6b597a94a82f9ee2d07e0e`, followed by context refresh `7be56c019cb35f7263274c65f8ab20d9a928ba30`.

> This document records source-level findings only. It does not claim CI, Replit, provider, database, Redis, or end-to-end runtime success.

## Scope

Reviewed the canonical ReAct core and connected execution path, including:

- `agentic-web-research-core.ts`
- `agentic-web-research.ts`
- `apex-bureau-orientation.ts`
- `bureau-agentic-pass.ts`
- `target-contact-agent.ts`
- `bureau-contact-persist-strict.ts`
- `identity-collision.ts`
- `ssrf-safe-fetch.ts`
- `browser-fetch.ts` / `browser-fetch-core.ts`
- `provider-gate.ts`
- `registry-client.ts`
- `domain-surface.ts`
- `python-tools.ts`
- canonical discovery and continuation routes
- relevant ReAct/static integrity guards.

## Confirmed correct

### First action
The rewritten core starts with context-only state. It no longer forces `web_search`. The prompt explicitly says there is no required first tool or hop order.

### Model action ownership
The model emits exactly one action per ReAct turn. The runtime executes that action and returns an observation before the next model decision. No deterministic discovery → target hop is embedded in the core.

### Tool surface
The model can choose web search, page visit, browser escalation, email footprint, username footprint, domain lookup, registry search, domain harvesting, or `done`.

### Search provider choice
`web_search` requires an explicit provider. There is no research-level Serper/Tavily/Exa sequence. Provider/model fallback exists only as infrastructure capacity handling.

### Role separation
Investigator adapters are Groq/Mistral. Gemini and DeepSeek are absent from the Investigator adapter pool.

### Evidence boundary
Deterministic HTML extraction is kept in the observation path. Only `action=done` produces `modelFindings`. Persistence subsequently checks run-scoped observed URLs and explicit promotion/scope.

### SSRF
The canonical entrypoint installs an Investigator-only network guard. The shared SSRF implementation validates HTTP(S), blocks private/loopback/link-local/metadata/reserved destinations, pins the DNS-resolved public address, and disables redirects at the transport boundary.

### Identity admission
Discovery admission requires explicit model person identity, candidate scope, source-backed URL, and `promotionDecision=promote`. Organization/unknown findings do not become person candidates.

## Findings requiring remediation

### HIGH — prompt injection
Search/page/registry/OSINT output is inserted into the user-side ReAct prompt. The current system orientation does not explicitly classify all such output as untrusted data that may contain instructions. This leaves a prompt-injection gap.

Required invariant: tool observations can inform reasoning but can never modify Apex's institutional policy, role, evidence law, action schema, or authority hierarchy.

### HIGH — hard timeout is only checked between turns
The loop checks elapsed time at the top of each iteration. An individual LLM call or tool can run until its own local timeout, so `hardTimeoutMs` is not a true end-to-end deadline.

Required invariant: one run-scoped abort signal must reach LLM calls, HTTP, browser escalation, and subprocess tools.

### HIGH — `MAX_ITER` is not a hard ceiling
The source defines `MAX_ITER = 40`, but the effective value is `Math.max(1, input.maxIterations ?? MAX_ITER)`. A caller can request more than 40 turns.

Required invariant: effective iterations must be `min(MAX_ITER, callerBudget)`.

### HIGH — core contains direct `redirect: "follow"`
`toolVisit()` requests redirect following. The live canonical wrapper overrides this through `safeOutboundFetch`, so the current canonical route is protected. Nevertheless, the core is not safe by construction if imported outside the wrapper.

Required invariant: the core's own visit transport must use the canonical pinned/manual-redirect boundary.

### MEDIUM/HIGH — provider quota bypass found and fixed
The initial composition was SSRF-safe but bypassed the provider quota gate because `safeOutboundFetch` did not delegate through `provider-gate`.

Fixed in `acf49d2cb42d5cbdbc6b597a94a82f9ee2d07e0e`: Investigator execution now composes provider quota around the SSRF-safe pinned fetch. A regression guard should still be added.

### MEDIUM — durable continuation memory projection
Discovery trajectory persistence rewrites `contextDocument` to objective/counters/trajectory. The broader `caseFile` retains more information, but continuation mounts `contextDocument`. The mounted memory should include relevant Boss/Right-Hand decisions, candidate admissions, evidence state, and open questions rather than trajectory alone.

### MEDIUM — identity collision validation can be too permissive
`assessIdentityCollision()` can obtain a sufficiently high score from target tokens appearing in evidence URLs/notes even if an explicit model-authored `personName` does not fully align with the target. Personal/card promotion should require explicit person-name alignment; source URLs cannot substitute for identity.

### MEDIUM — process-wide browser escalation counter
`browser-fetch-core.ts` uses a process-level browser-fetch counter while describing it as case-local. Concurrent cases can consume one another's browser budget.

### LOW/MEDIUM — provider bundles inside capabilities
`browser_fetch` internally tries multiple scrape providers, and `footprint_username` internally runs Maigret + Sherlock. These are acceptable as capability internals if they remain transport/tool implementation and never become a hidden research policy.

## Issue tracking

The hardening findings above are tracked in GitHub issue **#139**. Existing architectural blockers remain tracked separately, including #125/#126, #128, #129/#132, #133, #136, and #137/#138.

## Verification boundary

GitHub currently reports no completed CI status for the reviewed tip. The source audit is therefore classified as **verified statically**, not live-proven. The eventual acceptance test must observe a complete durable trajectory through Gemini → DeepSeek/NVIDIA → selected Groq/Mistral → genuine model-selected first action → tool pivots → observed provenance → explicit promotion → evidence-backed card.
