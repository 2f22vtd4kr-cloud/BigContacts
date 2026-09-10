# Forensic audit — 2026-09-10

## Session progress

- Retired the known legacy deterministic enrichment mutation routes at the API boundary. They now return HTTP 410 rather than entering alternate research lanes.
- Kept the generic `/enrich/*` compatibility surface scope-checked for explicitly non-Apex maintenance until each endpoint is separately retired.
- Fixed the canonical agentic source-parity gate: after the SSRF wrapper/core split, the gate was still reading the wrapper file and therefore failed before build/typecheck. It now inspects `agentic-web-research-core.ts` and verifies the wrapper mounts that core.
- GitHub Actions run 329 exposed the stale parity gate; run 330 is executing against the corrected gate. Runtime/Replit verification has not been claimed.

## Newly confirmed blockers

1. `agentic-web-research-core.ts` still contains the forced initial observation `Begin. Choose an initial web_search query — do not wait for instructions.`. Free-ReAct is therefore not yet clean. This remains issue #120.
2. `expandSecondaryPublicSurface()` is still a deterministic research playbook reachable from canonical research (issue #125) and contains website fetches that bypass the canonical SSRF boundary (issue #126).
3. `startup.ts` still contains scheduled legacy research calls, including deep-web OSINT and Hybrid Research bulk passes. The API boundary now blocks the retired deep-web endpoint, but the scheduler itself remains stale and should be retired rather than repeatedly attempting a 410 route. A follow-up audit item is required for the entire startup research schedule.
4. `jobs.tsx` still advertises retired legacy tasks such as `sync-hot-flags`, `deep-web-osint`, and `bulk-hybrid-research`; UI cleanup is required so the operator surface cannot launch retired control planes.

## Architecture law reaffirmed

Deterministic code may enforce safety, authorization, validation, schemas, provenance, persistence, quotas, timeouts, transport, telemetry, deduplication, and explicit boundaries. It must not silently choose research strategy, provider sequence, research hops, or completion. Investigator models own research trajectory and explicit promotion decisions.
