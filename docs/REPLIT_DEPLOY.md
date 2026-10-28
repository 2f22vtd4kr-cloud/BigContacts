# Apex Atlas — Replit deployment and runtime verification

**Canonical repository:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Canonical branch:** `main`  
**Last reconciled:** 2026-10-28

Use this guide together with `replit.md` and `docs/APEX_REPLIT_STARTUP_PROMPT.md`. The executable scripts and current provider-role source take precedence over older audit notes.

## Runtime topology

Run **one API Server workflow** on `PORT=8080`. The API server also serves the built desk UI:

- `/` — Apex desk UI
- `/api/healthz` — service/provider health
- `/api/*` — API routes

Do not run a second frontend/Vite server as the Replit preview. Build output is generated at `artifacts/apex-finder/dist/public` and served by the API.

Canonical boot command:

```bash
bash scripts/replit-boot.sh
```

The script builds the desk when its static output is absent, builds the API unless a valid clean-revision build stamp can be reused, and starts `@workspace/api-server`. It does **not** mutate the database schema by default. Keep `ENABLE_AUTO_PIPELINE=false` unless continuous runs are deliberately required.

## Active providers and resources

The current architecture is **Groq Boss → selected Groq Investigator capability**, with Groq Right-hand providing bounded oversight. Boss and Right-hand do not browse, choose fixed research actions, or author evidence. Investigator research remains free-ReAct and model-directed.

Do not restore retired Gemini, Mistral, DeepSeek or NVIDIA NIM control-plane transports. Never ask an operator to invent or paste secret values into source files.

Core runtime configuration:

| Name | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection, normally injected by the Replit/Postgres environment |
| `REDIS_URL_1` | Canonical durable Redis store for Atlas job/lease state; configure a real Redis/Upstash URL |
| `REDIS_URL` | Optional local cache; boot derives it from `REDIS_URL_1` when unset |
| `GROQ_BOSS_API_KEY` | Groq Boss control capability |
| `GROQ_RIGHT_HAND_API_KEY` | Groq Right-hand oversight capability |
| `GROQ_INVESTIGATOR_API_KEY` | First selectable Groq Investigator capability |
| `SERPER_API_KEY` | Primary web-search capability |

Other integration secrets such as `GROQ_INVESTIGATOR_API_KEY_1`, `TAVILY_API_KEY`, `EXA_API_KEY`, `SERPAPI_KEY`, `SCRAPFLY_API_KEY`, `ZENROWS_API_KEY`, `COMPANIES_HOUSE_API_KEY`, and `HF_TOKEN` enable additional independently configured capabilities. See `docs/REPLIT_UPDATE_PROMPT_LATEST.md` and `scripts/replit-preflight.mjs` for the current names. Never print or commit values.

`node scripts/replit-preflight.mjs` is a **presence-only audit of all listed integration capabilities**, not a minimum boot-dependency checker. It exits nonzero if any listed capability is absent and prints names/statuses only; do not invent credentials or treat every missing optional integration as proof that the API cannot boot.

## Import and startup

1. Import this repository into Replit and use the current `main` branch after the PR is merged.
2. Confirm the workspace checkout is on the reviewed commit and install from the lockfile:

   ```bash
   pnpm install --frozen-lockfile
   ```

3. Ensure Replit/Postgres provides `DATABASE_URL`, and configure the canonical `REDIS_URL_1` plus the active provider/search secrets in Replit Secrets. Do not create substitute credentials.
4. Apply schema/migrations only during an explicit, controlled setup/migration window. The boot script requires the opt-in:

   ```bash
   APEX_ALLOW_SCHEMA_PUSH=true bash scripts/replit-boot.sh
   ```

   Otherwise, the normal boot intentionally skips schema mutation. Preserve existing database data and inspect migration output.
5. Start exactly one API workflow with `bash scripts/replit-boot.sh`.
6. Run the repository gates where appropriate:

   ```bash
   pnpm run typecheck
   pnpm run build
   pnpm run check:bureau
   node scripts/replit-preflight.mjs
   ```

7. Verify health and open `/` in the Replit preview:

   ```bash
   curl -fsS http://127.0.0.1:8080/api/healthz
   ```

   Confirm `bureauIntegrity` is not critical, the canonical Redis store is available, and the health response reflects the provider configuration. A successful build alone does not establish runtime readiness.

## Controlled model-trace capture

The development config keeps a run-scoped model-prompt capture enabled for the requested audit. It writes to the ignored `.local/audits/` directory, not a tracked `audits/` file, and visible-file override is disabled. Contact data can be retained in this controlled local trace; treat the generated file as private. After the controlled run, disable `APEX_CAPTURE_MODEL_PROMPTS` and `APEX_MODEL_AUDIT_INCLUDE_CONTACT_DATA` for ordinary development and do not commit raw traces.

## Runtime acceptance

Do not claim live acceptance because CI is green or the API starts. For the actual Replit smoke test, record the deployed Git SHA, `/api/healthz`, canonical job/case identifiers, actual model-selected actions, successful observations, exact observed source URLs, evidence/promotion decisions, resulting review/card state, stop reason, and active-job/lease state. Failed retrievals and search snippets remain leads, not fetched evidence. If a provider/network boundary fails, preserve the trajectory and report that failure; do not fabricate a card or research result.

The application is runtime-verified only after the running Replit URL is checked against this evidence contract.
