# Apex Atlas — canonical Replit startup prompt

Paste this into the Replit Agent after importing `2f22vtd4kr-cloud/BigContacts`. This is the current operator-facing initialization/run prompt and must stay synchronized with the executable architecture.

```text
APEX ATLAS — CURRENT CANONICAL REPLIT INITIALIZATION / RUNTIME VERIFICATION

Operate ONLY inside the existing imported Replit App for:
https://github.com/2f22vtd4kr-cloud/BigContacts
Branch: main

This is NOT greenfield work.
Do not create a second app, replacement frontend, mock ledger, fake contacts, synthetic evidence, fixed research sequence, or alternate architecture.
Do not reset, rebase, force-push, downgrade main, or destroy uncommitted operator work.

============================================================
1. VERIFY THE ACTUAL REPOSITORY FIRST
============================================================

Show:
  git remote -v
  git branch --show-current
  git rev-parse HEAD
  git status --short

Fetch/update main safely. If main has advanced, use the newest main; never downgrade to an old audit SHA.

Read the current repository contract before changing anything:
- docs/AGENT_REPOSITORY_STUDY_PROTOCOL.md
- docs/CHATGPT_AGENT_HANDOFF_2026-09-21.md
- docs/context.md
- docs/BUREAU_REACT_ARCHITECTURE.md
- docs/APEX_ATLAS_VERY_STRONG_ROADMAP.md
- docs/APEX_ATLAS_CEO_RELEASE_REVIEW_2026-09-20.md
- docs/APEX_RESEARCH_GAUNTLET_V1.md
- docs/REPLIT_NEW_ACCOUNT_SETUP.md
- docs/RUN_BUREAU.md
- docs/APEX_REPLIT_INITIALIZATION_BLUEPRINT.md
- docs/APEX_REPLIT_STARTUP_PROMPT.md

Also inspect the actual current source, schemas/migrations, scripts, tests, workflows, frontend and deployment configuration. Documentation never overrides executable behavior.

============================================================
2. CURRENT APEX PROVIDER ARCHITECTURE — DO NOT ALTER
============================================================

The active research architecture is:

Gemini Boss
    ↓
Gemini Right-hand
    ↓
Groq OR Mistral Investigator
    ↓
Investigator-owned free-ReAct web research
    ↓
real tool execution → observations/provenance → evidence graph
    ↓
Gemini oversight → continue / redirect / stop
    ↓
finding, promotion, contradiction handling, or honest abstention

Provider roles are strict:

- Gemini Boss: oversight/control plane only. No browsing. No evidence invention.
- Gemini Right-hand: oversight/advisory only. No browsing. No tool selection/execution. No evidence invention.
- Investigator pool: ONLY Groq and Mistral.
- DeepSeek is RETIRED from the active architecture.
- NVIDIA NIM is RETIRED from the active architecture.
- Gemini is NOT an Investigator fallback.
- Boss/Right-hand unavailability is fail-closed.

Do NOT restore or request any retired DeepSeek/NVIDIA credential.
Do NOT run any DeepSeek migration.
Do NOT introduce a new provider merely to bypass a failure.
Do NOT put fixed search/provider/query/URL sequences into the Investigator.

Current Right-hand credential:
GEMINI_RIGHT_HAND_API_KEY

Current Boss credential:
GEMINI_API_KEY

The Right-hand has a bounded Gemini model fallback chain implemented by the application. Do not replace it with a second provider.

============================================================
3. CANONICAL OPERATOR SECRETS
============================================================

For a fresh Replit setup, verify presence of the current required names only:

1. REDIS_URL_1
2. GROQ_API_KEY
3. GEMINI_API_KEY
4. MISTRAL_API_KEY
5. HF_TOKEN
6. SERPER_API_KEY
7. TAVILY_API_KEY
8. SERPAPI_KEY
9. EXA_API_KEY
10. SCRAPFLY_API_KEY
11. ZENROWS_API_KEY
12. COMPANIES_HOUSE_API_KEY
13. GEMINI_RIGHT_HAND_API_KEY
14. APEX_API_AUTH_TOKEN
15. APEX_OPERATOR_PASSWORD
16. APEX_SESSION_SECRET

DATABASE_URL is platform-managed by Replit/Postgres. Never ask the operator to invent or paste it when the platform provides it.

Never request, restore, print, echo, commit or log:
- DEEPSEEK_API_KEY
- NVIDIA_NIM_API_KEY / NVIDIA_API_KEY
- WHOISJSON_API_KEY
- WHOXY credentials
- REDIS_URL_2 through REDIS_URL_5

Never expose secret values.

============================================================
4. RUNTIME CONTRACT
============================================================

Use the existing package manager, lockfile and scripts.

Canonical API port:
PORT=8080

Canonical boot:
  bash scripts/replit-boot.sh

Do not start duplicate API workflows.

Before live research:
  node scripts/replit-preflight.mjs
  pnpm run typecheck
  pnpm run build
  pnpm run check:bureau

Use the actual current scripts present in main. Do not resurrect obsolete commands.

Health:
  curl -sS http://127.0.0.1:8080/api/healthz

Verify Redis, bureau integrity, authentication and provider readiness as exposed.
If a provider is unavailable, diagnose the actual error. Do not fake a successful research result.

============================================================
5. ARCHITECTURE INTEGRITY
============================================================

Never:
- force research hops;
- hardcode target-specific searches;
- replace free-ReAct with deterministic research;
- fabricate observations or contact data;
- inherit target names as identity proof;
- promote a claim without an observed evidence chain;
- let Boss or Right-hand mutate research reality;
- weaken authentication;
- disable a failing architecture guard;
- delete tests to obtain green CI.

Deterministic code may enforce safety, authorization, schemas, budgets, cancellation, provenance and promotion integrity. It must not secretly own research strategy.

Safety ceilings remain ceilings:
MAX_ITER 64
MAX_OBS 16000
MAX_TRAJECTORY_RECORDS 512
MAX_NETWORK_RESPONSE_BYTES 2000000

Cancellation and timeout propagation must remain intact.

============================================================
6. LIVE RESEARCH SMOKE
============================================================

After build, runtime and integrity checks are genuinely green:

1. Verify the desk at / is non-blank.
2. Query the real entity ledger.
3. If a real entity already exists, do not create another merely for testing.
4. If discovery is genuinely needed, use the existing canonical discovery-first path.
5. For a real target, run the canonical Investigator path with the real application.
6. Preserve actual trajectory, tool observations, provenance, evidence graphs, claims, contradictions, identity state and oversight decisions.

Do not fabricate a result if the provider/network is unavailable.
A booted API is not a successful investigation.

============================================================
7. RESEARCH CAMPAIGN
============================================================

Do NOT run the 150-run empirical campaign during ordinary fresh-account initialization.

The official campaign is:
50 grounded cases × 3 matched trials = 150 research runs.

Use:
  scripts/build-research-gauntlet.mjs
  scripts/run-research-campaign.ts
  scripts/validate-research-campaign.mjs
  scripts/validate-failure-records.mjs
  scripts/score-research-campaign.mjs
  scripts/build-failure-observatory.mjs

The campaign envelope and registry in the repository are authoritative.
Never call a workflow start, queued job, or partial run a successful campaign.
Inspect the actual artifacts/results.

============================================================
8. IF SOMETHING FAILS
============================================================

Fix the root cause without weakening the architecture.

For installation failures, preserve the lockfile and dependency graph.
For schema failures, inspect schema/migrations and preserve existing data.
For provider failures, distinguish auth, quota/capacity, model, timeout and transport failures.
For research failures, inspect the actual Investigator trajectory and observations.
For documentation drift, update the active canonical document; do not rewrite genuinely historical archives merely to erase history.

After every fix, rerun the relevant gates.

============================================================
9. FINAL REPORT
============================================================

Report exactly what was empirically verified:

branch:
exact HEAD SHA:
provider architecture:
Boss:
Right-hand:
Investigator:

configured secret names only:
install:
preflight:
typecheck:
build:
architecture checks:
healthz:
Redis:
desk:
live research:
entity/run IDs:
trajectory/evidence status:
campaign status:
exact blockers:

Never claim success without direct evidence.
END.
```
