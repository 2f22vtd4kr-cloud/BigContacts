# Apex Atlas — 31 Aug session addendum

## Provider-timeout forensic finding
The previous live audit `33381234172` reached the Bureau and then failed in polling because the Dig `llmStep` used an 18-second Promise race while the provider fetch itself had a 40-second deadline. The API process exited on `groq:timeout`; the result was correctly classified as inconclusive rather than research success.

### Fixes
- `ba2ec5ad` — add canonical provider timeout hardening: deadline >=45s, configurable through `AGENTIC_PROVIDER_DECISION_TIMEOUT_MS`, and explicit `.then(..., ...)` consumption with timer cleanup so late provider rejections cannot escape.
- `d0c502d` — wire the hardener into the API canonical build while preserving the exact API dependency graph.
- `04caaf6` — add a source/build wiring regression gate.
- `e0fe75c` — update `check-agentic-runtime.mjs` so the runtime invariant matches the new timeout contract and also requires late-rejection consumption.

## Live rerun status
- `33388551779` — current live 10-target audit.
- Checkout: `de86c848`.
- Schema/API build: GREEN.
- Static autonomy checks: GREEN.
- Provider preflight: GREEN.
- API start: GREEN.
- 10-target discovery-first launch: GREEN.
- Bureau polling: **IN PROGRESS**.
- Research-quality verdict: **NOT YET CLAIMED**.

## Frontend/Figma workaround
Figma connector is unavailable in this session. No Figma inspection is being fabricated. Frontend work continues directly against the actual React/Reactor source, GitHub CI, current React guidance via Context7, public 2026 agent-UX research, Canva visual references, and Vercel project inspection.

Current code evidence:
- `use-bureau-live.ts` stops polling when Atlas is not live and clears its interval during cleanup.
- Mobile Reactor derives live state from actual running status plus a recent event heartbeat.
- `bureau-ops-stage.tsx` sanitizes internal prompts/log dumps and only exposes an explicit query when one actually exists.

## 57-point handoff
A complete numbered status ledger is now committed at `docs/bureau-plan/57_HANDOFF_STATUS_2026-08-31.md`.
