# Forensic architecture continuation — 2026-09-10 / pass 4

## Status
PRE-DEPLOYMENT. Static architecture hardening continues. No live Replit proof is claimed.

## Changes in this pass

### 1. Operator workspace no longer exposes deterministic research launchers
`artifacts/apex-finder/src/pages/jobs.tsx` was replaced with a navigation/review desk. It no longer contains the retired task IDs or direct launch controls for deterministic research. Research is entered through the canonical Reactor / case surfaces; the workspace desk explicitly states that the UI does not select research strategy.

### 2. Legacy deterministic MCTS/bulk routes remain deleted
The previously unmounted `src/routes/research/mcts.ts` and `bulk.ts` files remain deleted. The retirement guard continues to fail if either file is resurrected.

### 3. Legacy duplicate startup scheduler remains deleted
The unreachable duplicate `artifacts/api-server/src/lib/startup.ts` remains deleted. The live API uses lifecycle-only startup recovery in the canonical tree.

### 4. Browser authentication boundary is now a real session boundary
The Apex browser has an operator login backed by a signed HttpOnly session cookie. The server bearer token remains server-side and is not exposed through Vite/browser configuration. Cookie-authenticated state-changing API requests require same-origin provenance. This is an authentication boundary, not a claim that production deployment has been runtime-verified.

### 5. Institutional mission/bootstrap contract is now explicit and guarded
Apex's identity and purpose must exist before operator-specific case direction. Added `docs/APEX_AUTONOMOUS_MISSION_BOOTSTRAP.md` defining the required hierarchy:

`institutional constitution → role purpose → durable case context → operator contribution → AI decision`

Added `scripts/check-apex-mission-bootstrap.mjs` and wired it into the root `check:bureau` suite. The guard verifies that the canonical orientation exists, live Boss/Right-Hand/Investigator paths consume it, durable context remains part of the Investigator boundary, and the first research action is not allowed to become deterministic.

This formalizes the existing canonical `apex-bureau-orientation.ts` rather than introducing a second prompt/identity system.

## Newly confirmed blockers still requiring source work

### #120 — Free-ReAct opening turn
`agentic-web-research-core.ts` still initializes `lastObservation` with a forced `web_search` instruction, and the empty-observation prompt still tells the model to begin with `web_search`. The first Investigator decision is therefore not fully free. The new mission-bootstrap guard intentionally fails on these strings until the runtime source is repaired. The fix must remove the forced opening action, not replace it with another deterministic first tool.

### #125 / #126 — deterministic secondary surface + SSRF
`expandSecondaryPublicSurface()` is still reachable from canonical/legacy source and remains a fixed research playbook with its own outbound fetching. This lane must be retired from automatic research or rebuilt as explicit Investigator capabilities behind the canonical SSRF boundary; merely renaming it is not acceptable.

### #128 — canonical Groq final reviewer
`artifacts/api-server/src/src/lib/ai-extractor.ts` still contains the Groq final-review fallback. Issue #71 demonstrates the exact safe removal pattern: delete the entire Groq final-review loop and fail closed through `adjudicateFinalTargetReview(input, {}, "unavailable-final-review")`. The canonical copy still needs that source edit; the architecture guard must not be weakened.

### #129 — duplicate source trees
The top-level and `src/src` trees still contain overlapping legacy modules. Some top-level files are now unmounted/deleted, but the remaining tree needs a complete import/reachability proof before deletion. No blind tree deletion is being used as a shortcut.

### #133 — Apex institutional mission/bootstrap
The new issue tracks the broader invariant separately from #120. The operator may provide case-specific direction, but must never be required to teach Apex what Apex is, why it exists, what evidence law it follows, or what each AI role is responsible for. Every model must know its institutional and role purpose before discovery/research reasoning begins.

## Important architectural observation

The canonical Investigator wrapper correctly scopes outbound Investigator fetches through the shared pinned-IP SSRF-safe transport. The problem in #126 is specifically the older secondary-surface lane, which bypasses that canonical boundary.

## Runtime honesty

No claim is made here that Replit starts successfully, Redis/Postgres are healthy, provider keys work, browser login works end-to-end, or an Investigator has completed a real case. Those remain runtime verification tasks after the static blockers are resolved.
