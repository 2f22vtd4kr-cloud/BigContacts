# Pre-Replit GO — Apex Atlas

**This document is an acceptance checklist, not a claim that a live deployment has passed.** Repository/CI verification and runtime verification are separate.

## Canonical instructions

Use these current files in this order:

1. `replit.md` — single-workflow boot contract.
2. `docs/REPLIT_DEPLOY.md` — environment, import, and health checklist.
3. `docs/REPLIT_UPDATE_PROMPT_LATEST.md` — current provider and secret names.
4. `docs/APEX_REPLIT_STARTUP_PROMPT.md` — full operator startup and empirical runtime-verification procedure.

Older provider guidance describing Gemini, Mistral, DeepSeek, or NVIDIA NIM as active control-plane transports is superseded. The active control plane is Groq Boss + Groq Right-hand oversight + independently selectable Groq Investigator capabilities. Never substitute a retired provider to bypass a failure.

## Before launch

1. Import the GitHub repository and use `main` after PR #759 is merged.
2. Verify the checkout SHA and install with `pnpm install --frozen-lockfile`.
3. Verify the platform-managed `DATABASE_URL`, canonical durable `REDIS_URL_1`, and active Groq/search secrets. Never print values.
4. Run `pnpm run typecheck`, `pnpm run build`, `pnpm run check:bureau`, and review the presence-only result from `node scripts/replit-preflight.mjs`.
5. Start one API workflow with `bash scripts/replit-boot.sh`. The desk is at `/`; health is at `/api/healthz`. Database schema changes are opt-in and must be deliberately authorized.
6. Confirm `bureauIntegrity` is not critical and that the running instance uses the expected SHA.

## Runtime acceptance invariants

- The Investigator chooses research actions; no deterministic forced-hop sequence or preset target query.
- Search snippets and result URLs remain leads until fetched; failed/blocked retrievals are not observations.
- Findings and promotions retain exact source provenance and correctly separate organization review leads from person/wealth claims.
- A first review card is acceptable only when the source-backed lead contract passes; it is not proof of ownership, wealth, targetability, or a verified contact route.
- Capture the actual trajectory, successful observed URLs, execution status, structured finding/promotion decisions, resulting card/evidence records, and terminal/lease state.
- A booted API, green CI, queued job, or plausible-looking card alone is not accepted as a successful investigation.

## Acceptance state

The source tree can be declared import/build ready only after the merged SHA, required CI/audit workflows, and the setup configuration have been verified. Runtime verified remains **pending** until the user's imported Replit instance is started and the accessible URL is smoke-tested against the contract above.
