# Apex Atlas provider secrets and readiness

**Purpose:** operational reference for the current API configuration. This document lists environment-variable names only; it never contains secret values.

## Role-specific Groq credentials

Each role has its own credential pool. A generic `GROQ_API_KEY` is a retired legacy name and does not substitute for these role-specific variables.

- **Groq Boss:** `GROQ_BOSS_API_KEY`, plus `GROQ_BOSS_API_KEY_1` through `GROQ_BOSS_API_KEY_10`.
- **Groq Investigator:** `GROQ_INVESTIGATOR_API_KEY`, plus `GROQ_INVESTIGATOR_API_KEY_1` through `GROQ_INVESTIGATOR_API_KEY_7`.
- **Groq Right-hand:** `GROQ_RIGHT_HAND_API_KEY`, plus `GROQ_RIGHT_HAND_API_KEY_1` through `GROQ_RIGHT_HAND_API_KEY_5`.

Do not copy one role's credential into another role's variable. Role separation is intentional.

## Search-provider key pools

- **Serper:** `SERPER_API_KEY`, `SERPER_API_KEY_2`, `SERPER_API_KEY_3`; `SERPER_KEY` is also accepted.
- **Tavily:** `TAVILY_API_KEY`, plus `TAVILY_API_KEY_1` through `TAVILY_API_KEY_8`.
- **Exa:** `EXA_API_KEY`, `EXA_1`, `EXA_2`, plus `EXA_API_KEY_1` through `EXA_API_KEY_8`.

## Additional source credentials

- `SCRAPFLY_API_KEY`
- `ZENROWS_API_KEY`
- `COMPANIES_HOUSE_API_KEY`

These source credentials do not replace the Groq role credentials or search-provider pools.

## Readiness semantics

- Public `/api/healthz` exposes only a coarse `researchKeysConfigured` boolean. It means at least one canonical model or research-source credential is present; it does **not** guarantee every role or search pool is ready.
- Authenticated `/api/system/status` reports the detailed Groq role, search-pool, database, and Redis state.
- The Atlas header chip distinguishes active keys, limited/cooling keys, configured-but-not-active keys, no configured keys, and an unreachable API.
- A generic `GROQ_API_KEY`, `HF_TOKEN` alone, or a Redis URL alone does not make research ready.

## Deployment checklist

1. Add the required provider-specific names to the API server's deployment Secrets/environment. Do not prefix server secrets with `VITE_`.
2. Keep each Groq role's credentials in its own pool.
3. Restart/redeploy the API server after changing Secrets so the process reads the new environment.
4. Open **System status** and verify the individual role and search-provider slots. Do not infer full readiness from the public health boolean alone.
5. Never paste secret values into source control, issue comments, screenshots, or this document.

The canonical readiness list is implemented in `artifacts/api-server/src/src/lib/research-key-readiness.ts`; the authenticated detail payload is implemented by `artifacts/api-server/src/src/routes/system-status.ts`.