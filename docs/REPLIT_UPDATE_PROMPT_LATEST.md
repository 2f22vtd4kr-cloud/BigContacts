# Replit — canonical new-account setup prompt

This file is the repository's canonical setup handoff for importing Apex Atlas into a new Replit account.

```text
Import and set up this existing GitHub repository:

https://github.com/2f22vtd4kr-cloud/BigContacts

Use the current main branch.

Do not ask me for a GitHub PAT, GITHUB_TOKEN, or any other GitHub credential. Repository access is handled through the connected Replit ↔ GitHub integration.

Before doing anything else, read docs/context.md completely. It is the living development transcription and architecture source of truth for Apex Atlas. Also read docs/REPLIT_NEW_ACCOUNT_SETUP.md and docs/RUN_BUREAU.md for the canonical setup and operational contracts.

Do not scaffold a new application. Do not replace, simplify, or redesign the existing project during setup.

Create and ask me to provide exactly these 14 runtime secrets using these canonical names:

1. REDIS_URL_1
2. GROQ_API_KEY
3. GEMINI_API_KEY
4. DEEPSEEK_API_KEY
5. MISTRAL_API_KEY
6. HF_TOKEN
7. SERPER_API_KEY
8. TAVILY_API_KEY
9. SERPAPI_KEY
10. EXA_API_KEY
11. SCRAPFLY_API_KEY
12. ZENROWS_API_KEY
13. COMPANIES_HOUSE_API_KEY
14. WHOISJSON_API_KEY

Important mappings:
- the operator's Upstash Redis URL goes in REDIS_URL_1;
- the Hugging Face token goes in HF_TOKEN;
- the NVIDIA key goes in DEEPSEEK_API_KEY;
- the Exa key goes in EXA_API_KEY.

REDIS_URL and EXA_1 are compatibility aliases, not additional operator asks.

Do not ask for DATABASE_URL, WHOXY credentials, REDIS_URL_2 through REDIS_URL_5, duplicate Redis/Exa credentials, or any GitHub credential.

Replit Postgres is platform-managed. DATABASE_URL is not an operator-provided secret. Never invent or request a database connection string when the platform database is expected.

Never print secret values or place them in source code, commits, logs, or documentation.

Use the repository's existing package manager, lockfiles, scripts, and configuration. Install dependencies without replacing dependency management.

Run the existing preflight and architecture checks, then build the desk and API using the repository's existing commands. Start the canonical API workflow on port 8080.

Fix genuine install, build, or boot failures at their root cause. Do not weaken tests, bypass architecture checks, disable regression guards, or apply cosmetic patches merely to obtain a green result.

Verify that dependencies install, the desk builds, the API builds, the application starts, and /api/healthz can be checked.

A successful boot is not by itself proof of a successful research trajectory. Live research behavior and acceptance are governed by docs/context.md and docs/RUN_BUREAU.md.

Keep the imported GitHub repository synchronized through the connected Replit integration. Do not create a parallel or disconnected copy.

When setup is complete, report:
- branch;
- commit SHA;
- configured secret names only, never values;
- dependency installation result;
- preflight result;
- frontend build result;
- API build result;
- application boot result;
- health result;
- exact remaining blockers, if any.

Finish with exactly one of:

SETUP COMPLETE — READY FOR NEXT INSTRUCTIONS

or:

SETUP BLOCKED — [specific blocker]
```
