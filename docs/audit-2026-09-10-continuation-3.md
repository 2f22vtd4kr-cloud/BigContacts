# Apex Atlas forensic continuation — 2026-09-10, pass 3

## Work completed in this pass

### Legacy deterministic research control-plane cleanup
- Deleted the unmounted legacy `artifacts/api-server/src/routes/research/mcts.ts` deterministic MCTS router.
- Deleted the unmounted legacy `artifacts/api-server/src/routes/research/bulk.ts` deterministic bulk-hybrid router.
- Deleted the unreachable duplicate `artifacts/api-server/src/lib/startup.ts` scheduler after confirming the live API imports `src/src/lib/startup.ts` instead.
- Strengthened `check-retired-research-routes.mjs` so those files cannot silently return and stale legacy startup/UI references remain visible as failures.
- Strengthened `check-unified-investigator-architecture.mjs` so canonical Case Bureau discovery cannot reintroduce `runBroadDiscovery()` as a deterministic research step.

### Browser/API authorization boundary
- Added `src/src/routes/auth.ts` with a single-operator, signed 8-hour HttpOnly session cookie.
- Added same-origin CSRF protection for cookie-authenticated state-changing API requests.
- Preserved bearer-token authentication for external automation; the bearer secret is never sent to the browser.
- Added an operator login gate to the Apex desk.
- Added `docs/OPERATOR_AUTH.md` describing the required Replit Secrets.
- Updated the frontend auth contract guard to verify the browser session boundary and prohibit Vite exposure of `APEX_API_AUTH_TOKEN`.

## Still open — deliberately not papered over

1. **#120 — forced initial ReAct observation.** `agentic-web-research-core.ts` still seeds `lastObservation` with an instruction to begin with `web_search`. This must be removed from the runtime, not merely hidden by a test.
2. **#125 — deterministic secondary public surface.** `expandSecondaryPublicSurface()` remains a fixed research playbook and is still referenced by canonical sources. It must be retired from automatic canonical research; surviving capabilities belong behind Investigator-selected actions.
3. **#126 — secondary-surface transport.** The surviving deterministic function contains direct outbound fetches and must not retain an independent HTTP transport. Prefer retirement over a second SSRF implementation.
4. **#128 — canonical Groq final review.** `src/src/lib/ai-extractor.ts` still contains the Groq final-review fallback. The architecture guard continues to fail on this real role violation.
5. **Broad discovery.** `src/src/lib/enrichment/broad-discovery.ts` remains a template/query rotation engine. Its canonical Case Bureau use is now explicitly guarded as forbidden, but the caller still needs to be removed/replaced by the Investigator capability path.
6. **Frontend auth runtime proof.** Browser session code is now present, but no live Replit runtime proof has been performed. Required Secrets must be configured before deployment verification.
7. **Build/CI.** No claim of green CI is made. Prior Build API failures remain relevant, and the current main branch has no workflow run attached by the connector because the repository workflow query is PR-triggered.

## Non-negotiable architecture state

- Gemini = Boss only.
- NVIDIA/DeepSeek = Right-hand only.
- Groq/Mistral = Investigator only.
- Investigator owns research trajectory, tool choice, query formulation, pivots, stopping, and explicit promotion decisions.
- Deterministic code owns safety, transport, persistence, provenance, validation, quotas, cancellation, and impossible-state prevention.
- Observation is not evidence; explicit Investigator promotion plus observed provenance is required.
- No deterministic MCTS/bulk research router is mounted or retained in the retired top-level route tree.

**Status: PRE-DEPLOYMENT / STATIC HARDENING CONTINUES / LIVE RESEARCH PROOF NOT YET ESTABLISHED.**
