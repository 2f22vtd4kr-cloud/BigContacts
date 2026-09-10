# Audit continuation — 2026-09-10

This is a supplemental audit log for the ongoing Apex Atlas forensic rebuild. `docs/context.md` remains the intended living architecture source of truth; this file records this continuation without replacing it.

## Operating law

Apex is an AI-driven OSINT bureau, not a deterministic research workflow disguised as an agent.

- Gemini = Boss / primary orchestrator.
- DeepSeek / NVIDIA = Right Hand / oversight intelligence.
- Groq + Mistral = Investigator LLM capability pool.
- The Investigator owns research trajectory, tool choice, query construction, pivots, evidence sufficiency, and stopping.
- Deterministic code owns safety, authorization, schemas, provenance, persistence, quotas, timeouts, lifecycle, telemetry, and explicit promotion boundaries.
- Context is durable state/memory, not a research script.

## Changes made in this continuation

### 1. Corrected the free-ReAct audit surface

`check-bureau-free-react.mjs` was still inspecting the pre-wrapper path `agentic-web-research.ts`, while the actual ReAct implementation is now `agentic-web-research-core.ts`. It now audits the canonical core and includes the full current action surface.

### 2. Added an explicit Free-ReAct regression gate

`scripts/check-free-react-boundary.mjs` is now part of the API build/test scripts. It rejects the known forced-first-search phrase and hidden Serper→Tavily→Exa research ladders, while requiring the architecture contract to state that search order is not forced.

This intentionally fails while the current canonical core still contains the forced initial observation. It is a guard, not a substitute for the source fix.

### 3. Hardened the two-source-tree reviewer guard

`check-unified-investigator-architecture.mjs` now inspects both canonical and legacy `ai-extractor.ts` copies for the actual `groq-final-review-fallback` implementation marker. It does not reject a legacy descriptive comment that mentions Groq without executing it.

The canonical Groq final-review fallback remains open as issue #128 and is still a real blocker.

### 4. Corrected additional stale ReAct audit scripts

These now inspect `agentic-web-research-core.ts` rather than the thin wrapper:

- `scripts/check-agentic-runtime.mjs`
- `scripts/check-agentic-timeout-abort-safety.mjs`
- `scripts/check-agentic-timeout.mjs`
- `scripts/check-agentic-llm-efficiency.mjs`
- `scripts/check-no-force-dig.sh`
- `scripts/check-agentic-ssrf-boundary.mjs`
- `scripts/check-embarrassment-floor.mjs`

The embarrassment floor was also corrected so it no longer treats deterministic secondary-surface expansion as a required/gold-standard behavior. That capability is under audit issues #125/#126.

## Current hard blockers / open audit leaves

1. **#128 — canonical Groq final-review fallback.** Remove the tertiary Groq reviewer from `artifacts/api-server/src/src/lib/ai-extractor.ts`; retain Gemini Boss → NVIDIA/DeepSeek Right Hand and fail closed when oversight is unavailable.
2. **#120 — forced initial web_search.** Remove the initial `lastObservation` seed that tells the Investigator to begin with web search. The first turn must choose any valid action from durable context/objective.
3. **#125 — deterministic secondary-surface expansion.** Retire automatic `expandSecondaryPublicSurface()` calls from canonical research; preserve its useful capabilities only as explicit Investigator-selectable tools if retained.
4. **#126 — secondary-surface SSRF.** Any surviving secondary website/leadership fetch must use the shared pinned-IP SSRF-safe transport and must not follow unvalidated redirects.
5. **#127 — stale startup/UI callers.** Remove scheduler/UI references to retired deterministic research routes rather than relying on HTTP 410 responses.
6. **#129 — duplicate API-server source trees.** Trace and quarantine/remove non-live `artifacts/api-server/src/lib/*` implementations after reachability is proven.
7. **Frontend API auth contract.** The API now requires bearer auth for non-health requests, but the application has not been found registering the shared client's auth-token getter. Never expose the server bearer secret in a Vite/browser bundle; finish the real session/auth contract before runtime acceptance.

## Verification status

GitHub Actions has repeatedly reached the canonical build gate. The build is intentionally not green while the canonical Groq final-review fallback and forced-first-search invariants remain unresolved. No Replit runtime verification has been claimed or completed in this continuation.

## Architectural review note

The correct end state is not a longer deterministic playbook. If the Investigator can legitimately discover a family office, holding company, foundation, board seat, executive assistant, portfolio company, professional identity, domain infrastructure, event/conference trail, registry connection, or another useful public route, the runtime should let the model choose that path because the evidence makes it useful. The harness should validate the action and its provenance, not predict the route in advance.
