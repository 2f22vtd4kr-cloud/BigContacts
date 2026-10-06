# Replit — canonical new-account setup prompt

This is synchronized with the current Apex Atlas provider architecture. For the complete operator/runtime procedure, use `docs/APEX_REPLIT_STARTUP_PROMPT.md`.

```text
Import and set up this existing repository:
https://github.com/2f22vtd4kr-cloud/BigContacts

Use the current main branch. Never downgrade main or create a replacement app.

Before changing anything, read:
- docs/context.md
- docs/REPLIT_NEW_ACCOUNT_SETUP.md
- docs/RUN_BUREAU.md
- docs/APEX_REPLIT_INITIALIZATION_BLUEPRINT.md
- docs/APEX_REPLIT_STARTUP_PROMPT.md

CURRENT PROVIDER ARCHITECTURE — DO NOT CHANGE

Groq Boss
  ↓
Groq Right-hand
  ↓
Groq Investigator

Boss and Right-hand are oversight only. They do not browse, execute tools, invent evidence, or choose fixed Investigator search sequences.

The active Investigator pool is ONLY Groq and Mistral.
DeepSeek and NVIDIA NIM are retired from the active architecture.
Do not restore them, migrate to them, request their credentials, or use them as fallbacks.
Gemini is not an Investigator fallback.
Boss/Right-hand unavailable => fail closed.

Canonical credentials:
- GROQ_BOSS_API_KEY — Groq Boss
- GROQ_RIGHT_HAND_API_KEY — Groq Right-hand

CURRENT FRESH-ACCOUNT SECRET CHECKLIST

1. COMPANIES_HOUSE_API_KEY
2. EXA_API_KEY
3. GROQ_BOSS_API_KEY
4. GROQ_RIGHT_HAND_API_KEY
5. GROQ_INVESTIGATOR_API_KEY
6. HF_TOKEN
7. GROQ_INVESTIGATOR_API_KEY_1
8. REDIS_URL_1
9. SCRAPFLY_API_KEY
10. SERPAPI_KEY
11. SERPER_API_KEY
12. TAVILY_API_KEY
13. ZENROWS_API_KEY

DATABASE_URL is supplied by the Replit/Postgres environment. Do not ask the operator to invent or paste it.

Never request or restore retired credentials:
- DEEPSEEK_API_KEY
- NVIDIA_NIM_API_KEY / NVIDIA_API_KEY
- WHOISJSON_API_KEY
- WHOXY credentials
- REDIS_URL_2 through REDIS_URL_5

Never print secret values.

RUNTIME

Use the repository's existing pnpm/lockfile/scripts.
Canonical API port: 8080.
Canonical boot: bash scripts/replit-boot.sh

Before live research:
- node scripts/replit-preflight.mjs
- pnpm run typecheck
- pnpm run build
- pnpm run check:bureau

Use the actual current scripts on main. Do not resurrect obsolete commands or weaken a failing guard.

RUNTIME / RESEARCH RULES

Do not create a second app, fake ledger, fake contacts, synthetic observations, deterministic research strategy, forced hops, hardcoded target searches, or hidden provider/query/URL preferences.

Deterministic code may enforce safety, authorization, budgets, cancellation, provenance and promotion integrity; research strategy remains Investigator-owned free ReAct.

A booted API is not a successful investigation. Verify actual observations, provenance, evidence graphs, identity state, contradictions and oversight decisions.

Do not run the 150-run empirical campaign during fresh-account initialization.

If a live investigation is requested, use the current canonical discovery/target path and preserve the complete trajectory. If a provider/network failure occurs, diagnose and report the real failure; never fabricate success.

FINAL REPORT

Report branch, exact HEAD SHA, configured secret names only, install/preflight/typecheck/build/architecture/boot/health results, actual live research result and exact blockers.

Never claim success without evidence.
END.
```
