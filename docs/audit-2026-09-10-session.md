# Forensic audit — 2026-09-10

## Session progress

- Retired the known legacy deterministic enrichment mutation routes at the API boundary. They now return HTTP 410 rather than entering alternate research lanes.
- Kept the generic `/enrich/*` compatibility surface scope-checked for explicitly non-Apex maintenance until each endpoint is separately retired.
- Fixed the canonical agentic source-parity gate: after the SSRF wrapper/core split, the gate was still reading the wrapper file and therefore failed before build/typecheck. It now inspects `agentic-web-research-core.ts` and verifies the wrapper mounts that core.
- Moved the legacy Apex mutation guard immediately after the public health router so it wraps both `ingestRouter` and `extendedOsintRouter`. Previously `/enrich/*` extended-OSINT routes were mounted after the guard and could bypass it.
- Strengthened the legacy mutation static gate to require that global placement.
- Added a frontend API-auth audit artifact and a non-wired regression probe. The shared client exposes `setAuthTokenGetter`, but no application registration was found; the server bearer secret must never be shipped in a browser bundle.

## Newly confirmed blockers

1. `agentic-web-research-core.ts` still contains the forced initial observation `Begin. Choose an initial web_search query — do not wait for instructions.`. Free-ReAct is therefore not yet clean. This remains issue #120.
2. The canonical `src/src/lib/ai-extractor.ts` still exposes Groq as a final card reviewer. The corrected architecture gate now catches this real role-boundary violation; issue #128 tracks the implementation fix.
3. `expandSecondaryPublicSurface()` is still a deterministic research playbook reachable from canonical research (issue #125) and contains website fetches that bypass the canonical SSRF boundary (issue #126).
4. `startup.ts` still contains scheduled legacy research calls, including deep-web OSINT and Hybrid Research bulk passes. The API boundary now blocks the retired deep-web endpoint, but the scheduler itself remains stale and should be retired rather than repeatedly attempting a 410 route.
5. `jobs.tsx` still advertises retired legacy tasks such as `sync-hot-flags`, `deep-web-osint`, and `bulk-hybrid-research`; UI cleanup is required so the operator surface cannot launch retired control planes.
6. The duplicate legacy/canonical API-server source trees need reachability tracing and quarantine; issue #129 tracks this.
7. Frontend API authorization/session integration still needs a safe product-level solution. Do not put `APEX_API_AUTH_TOKEN` into a Vite/browser bundle.

## Architecture law reaffirmed

Apex has exactly two oversight/intelligence layers: Gemini Boss and DeepSeek/NVIDIA Right-hand. Groq and Mistral are Investigator LLMs. Investigator research strategy is model-owned free-ReAct: reason, choose a capability, observe, reason again, pivot, and decide sufficiency. Deterministic code may enforce safety, authorization, validation, schemas, provenance, persistence, quotas, timeouts, transport, telemetry, deduplication, and explicit boundaries. It must not silently choose research strategy, provider sequence, research hops, or completion. Evidence crosses into a card only through an explicit model promotion decision plus deterministic provenance/identity validation.

No runtime/Replit verification has been claimed. No green build has been claimed.
