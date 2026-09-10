# Forensic architecture continuation — 2026-09-10 / pass 4

## Status
PRE-DEPLOYMENT. Static architecture hardening continues. No live Replit proof is claimed.

## Changes in this pass

### 1. Operator workspace no longer exposes deterministic research launchers
`artifacts/apex-finder/src/pages/jobs.tsx` was replaced with a navigation/review desk. It no longer contains the retired task IDs or direct launch controls for deterministic research. Research is entered through the canonical Reactor / case surfaces; the workspace desk explicitly states that the UI does not select research strategy.

This is intentional: an operator page that still offered `deep-web-osint`, `bulk-hybrid-research`, `sync-hot-flags`, or similar controls would remain a second control plane even if the API returned 410.

### 2. Legacy deterministic MCTS/bulk routes remain deleted
The previously unmounted `src/routes/research/mcts.ts` and `bulk.ts` files remain deleted. The retirement guard continues to fail if either file is resurrected.

### 3. Legacy duplicate startup scheduler remains deleted
The unreachable duplicate `artifacts/api-server/src/lib/startup.ts` remains deleted. The live API uses the canonical `src/src/lib/startup.ts` path.

### 4. Browser authentication boundary is now a real session boundary
The Apex browser has an operator login backed by a signed HttpOnly session cookie. The server bearer token remains server-side and is not exposed through Vite/browser configuration. Cookie-authenticated state-changing API requests require same-origin provenance. The API middleware accepts either the server bearer token for automation or the browser operator session.

This is an authentication boundary, not a claim that production deployment has been runtime-verified.

## Newly confirmed blockers still requiring source work

### #120 — Free-ReAct opening turn
`agentic-web-research-core.ts` still initializes `lastObservation` with a forced `web_search` instruction. The first Investigator decision is therefore not fully free. Provider omission also still has deterministic provider-selection behavior. The architecture guard intentionally remains strict.

### #125 / #126 — deterministic secondary surface + SSRF
`expandSecondaryPublicSurface()` is still reachable from canonical/legacy source and remains a fixed research playbook with its own outbound fetching. The retirement guard intentionally reports live callers. This lane must be retired from automatic research or rebuilt as explicit Investigator capabilities behind the canonical SSRF boundary; merely renaming it is not acceptable.

### #128 — canonical Groq final reviewer
`artifacts/api-server/src/src/lib/ai-extractor.ts` still contains the Groq final-review fallback. Issue #71 demonstrates the exact safe removal pattern: delete the entire Groq final-review loop and fail closed through `adjudicateFinalTargetReview(input, {}, "unavailable-final-review")`. The canonical copy still needs that source edit; the architecture guard must not be weakened.

### #129 — duplicate source trees
The top-level and `src/src` trees still contain overlapping legacy modules. Some top-level files are now unmounted/deleted, but the remaining tree needs a complete import/reachability proof before deletion. No blind tree deletion is being used as a shortcut.

## Important architectural observation

The surviving canonical Investigator wrapper correctly scopes outbound Investigator fetches through the shared pinned-IP SSRF-safe transport. The problem in #126 is specifically the older secondary-surface lane, which bypasses that canonical boundary.

## Runtime honesty

No claim is made here that Replit starts successfully, Redis/Postgres are healthy, provider keys work, browser login works end-to-end, or an Investigator has completed a real case. Those remain runtime verification tasks after the static blockers are resolved.
