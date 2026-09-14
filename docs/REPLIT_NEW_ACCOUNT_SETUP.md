# Apex Atlas — new Replit account setup contract

## Repository

Import this existing repository through the connected Replit ↔ GitHub integration:

`https://github.com/2f22vtd4kr-cloud/BigContacts`

Use branch `main`.

Do not ask the operator for a GitHub PAT, `GITHUB_TOKEN`, or any other GitHub credential. Repository access is provided by the connected Replit ↔ GitHub integration.

## First action

Before modifying, installing, or running anything, read `docs/context.md` completely. It is the living development and architecture source of truth.

Do not scaffold a new application, replace the project, simplify the existing architecture, or redesign Apex during setup.

## Runtime secrets

Ask the operator for exactly these 17 runtime secrets, using these canonical names:

1. `REDIS_URL_1`
2. `GROQ_API_KEY`
3. `GEMINI_API_KEY`
4. `DEEPSEEK_API_KEY`
5. `MISTRAL_API_KEY`
6. `HF_TOKEN`
7. `SERPER_API_KEY`
8. `TAVILY_API_KEY`
9. `SERPAPI_KEY`
10. `EXA_API_KEY`
11. `SCRAPFLY_API_KEY`
12. `ZENROWS_API_KEY`
13. `COMPANIES_HOUSE_API_KEY`
14. `WHOISJSON_API_KEY`
15. `APEX_API_AUTH_TOKEN`
16. `APEX_OPERATOR_PASSWORD`
17. `APEX_SESSION_SECRET`

The final three are production security controls required by the API before a production process can start:

- `APEX_API_AUTH_TOKEN`: machine/API bearer authentication token; use a random value of at least 32 characters.
- `APEX_OPERATOR_PASSWORD`: operator login password; use a strong random value of at least 16 characters.
- `APEX_SESSION_SECRET`: session-signing secret; use a strong random value of at least 32 characters and keep it stable across replicas/restarts.

Mappings:

- The operator's Upstash Redis connection URL belongs in `REDIS_URL_1`.
- The Hugging Face token belongs in `HF_TOKEN`.
- The NVIDIA credential belongs in `DEEPSEEK_API_KEY`.
- The Exa credential belongs in `EXA_API_KEY`.
- `REDIS_URL` and `EXA_1` are compatibility aliases and are not additional operator asks.

Do not ask for:

- GitHub credentials;
- `DATABASE_URL`;
- `WHOXY_*` credentials;
- `REDIS_URL_2` through `REDIS_URL_5`;
- duplicate Redis or Exa credentials.

Replit Postgres is platform-managed. `DATABASE_URL` is not an operator-provided secret. If the platform database is unavailable, use the platform database tooling rather than inventing a connection string.

Never print secret values, write them to source, commit them, or include them in reports.

## Install and run

Use the repository's existing package manager, lockfiles, scripts, and configuration. Do not replace dependency management.

Run the existing Replit preflight and architecture checks. Build the desk and API using the repository's existing commands. Start the application through the canonical API workflow on port `8080`.

### First-time database initialization

A brand-new Replit Postgres instance may not yet contain the Drizzle schema. Schema mutation is deliberately **not** part of ordinary replica boot.

For the first deployment, after `DATABASE_URL` is available and dependencies are installed:

```bash
APEX_ALLOW_SCHEMA_PUSH=true pnpm --filter @workspace/db run push
```

Verify the command succeeds, then remove `APEX_ALLOW_SCHEMA_PUSH` from the workflow environment and start the normal boot. Do not leave schema push enabled on a persistent production workflow. Subsequent schema changes are explicit deployment operations, followed by a normal restart.

The canonical `scripts/replit-boot.sh` already refuses to mutate schema unless `APEX_ALLOW_SCHEMA_PUSH=true` is explicitly set.

Fix genuine install, build, migration, or boot failures at their root cause. Do not weaken tests, bypass checks, disable architecture guards, or apply cosmetic patches merely to obtain green output.

## Expected setup behavior

A successful setup means:

- the repository remains on the imported GitHub source of truth;
- the canonical runtime secret names are present without exposing values;
- dependencies install;
- the platform database is initialized explicitly if it is new;
- the frontend/desk builds;
- the API builds;
- the canonical regression and architecture checks run;
- the application starts on the expected API workflow;
- `/api/healthz` can be checked;
- failures are reported honestly with their actual blocker.

A successful boot is not by itself proof that a research trajectory succeeded. Research readiness and live trajectory evidence are governed by `docs/context.md` and `docs/RUN_BUREAU.md`.

## Final report

Report:

- branch;
- commit SHA;
- configured secret names only, never values;
- dependency installation result;
- preflight result;
- database initialization result (if first deployment);
- frontend build result;
- API build result;
- application boot result;
- health result;
- exact remaining blockers, if any.

Finish with exactly one of:

`SETUP COMPLETE — READY FOR NEXT INSTRUCTIONS`

or:

`SETUP BLOCKED — [specific blocker]`
