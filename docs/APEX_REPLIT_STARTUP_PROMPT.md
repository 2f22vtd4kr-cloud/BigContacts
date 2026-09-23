# Apex Atlas — canonical Replit startup prompt

Paste this into the Replit Agent after importing `2f22vtd4kr-cloud/BigContacts`. It is intentionally runtime-first: the Agent must work inside the real Replit App Shell/workflow, not a detached sandbox.

```text
APEX ATLAS — EXECUTE END-TO-END IN THIS EXISTING REPLIT APP ONLY.
ONE REPORT AT THE END. DO NOT CREATE A SECOND APP. DO NOT REDESIGN.

REPOSITORY: https://github.com/2f22vtd4kr-cloud/BigContacts
BRANCH: main

FIRST: work inside the actual Replit App project runtime. Read completely:
- docs/context.md
- docs/REPLIT_NEW_ACCOUNT_SETUP.md
- docs/REPLIT_UPDATE_PROMPT_LATEST.md
- docs/RUN_BUREAU.md
- docs/APEX_REPLIT_STARTUP_PROMPT.md

Also inspect before changing anything:
- artifacts/api-server/src/src/lib/agentic-web-research.ts
- artifacts/api-server/src/src/lib/bureau-agentic-pass.ts
- artifacts/api-server/src/src/lib/apex-bureau-orientation.ts
- artifacts/api-server/src/src/lib/case-bureau.ts
- artifacts/api-server/src/src/lib/case-bureau-prompt.ts
- artifacts/api-server/src/src/lib/gemini-right-hand-reasoning.ts
- scripts/apply-agentic-concurrency-hardening.mjs
- scripts/check-agentic-runtime.mjs
- scripts/replit-preflight.mjs
- scripts/replit-boot.sh
- package.json

DO NOT create a second Replit App, second frontend, fake ledger, demo contacts, fake URLs, or a replacement architecture.

============================================================
PROVIDER ARCHITECTURE — MANDATORY
============================================================

Boss = Gemini.
Right-hand = Gemini.
Dig investigator = Groq -> Mistral.

The active Apex provider architecture is:

Gemini Boss
    ↓
Gemini Right-hand oversight
    ↓
Groq/Mistral Investigator
    ↓
real research capabilities

DeepSeek/NVIDIA Integrate is RETIRED from active Apex execution.

Do not request, configure, or use:
- DEEPSEEK_API_KEY
- NVIDIA_NIM_API_KEY
- DeepSeek-V4-Flash-0731
- NVIDIA Integrate

Do not put Gemini or the Right-hand into the Dig web-research lane.
Do not put Groq/Mistral into the Right-hand oversight lane.
Do not create hidden cross-provider fallback between Investigator providers.

Right-hand is case-file/discovery oversight only. It does not browse or execute OSINT capabilities.

The active Right-hand provider uses the application's Gemini abstraction and:
- GEMINI_RIGHT_HAND_API_KEY
- gemini-3.8-flash
- bounded Gemini fallback models
- bounded request and overall deadlines
- fail-closed behavior when all bounded attempts fail

Historical architecture documents and archived conversation material may mention DeepSeek/NVIDIA. Those are historical records, not active runtime instructions.

============================================================
ACTIVE PROVIDER VALIDATION
============================================================

Do not run any DeepSeek/NVIDIA migration.

Do not run:
node scripts/migrate-right-hand-to-deepseek.mjs

Before live research, verify the actual active Gemini Right-hand abstraction and its configured secret name without printing secret values.

The independent Dig contract MUST remain Groq -> Mistral.

============================================================
REPLIT RUNTIME — NEVER REPEAT THE PREVIOUS FAILURE
============================================================

This is an existing Replit App.

Postgres is platform-managed. NEVER ask for DATABASE_URL. Verify DATABASE_URL only from the actual project Shell/workflow runtime.

Redis uses ONLY:
REDIS_URL_1

The canonical boot script may alias REDIS_URL_1 to REDIS_URL internally. Never ask for REDIS_URL_2-5.

Run ONE API workflow only, on:
PORT=8080

Workflow environment:
PORT=8080
ENABLE_AUTO_PIPELINE=false
INSTALL_PYTHON_OSINT=false
APEX_SKIP_SEMANTIC=1
CI=true
RESEARCH_DEPTH=standard
NODE_OPTIONS=--max-old-space-size=1536

The managed workflow must invoke the repository's canonical scripts/replit-boot.sh from the workspace root. Do not bypass it by launching the API artifact directly. If the workflow working directory is artifacts/api-server, use the workspace-root path to the boot script.

============================================================
SECRETS
============================================================

Canonical operator-facing names:
REDIS_URL_1
GROQ_API_KEY
GEMINI_API_KEY
GEMINI_RIGHT_HAND_API_KEY
MISTRAL_API_KEY
HF_TOKEN
SERPER_API_KEY
TAVILY_API_KEY
SERPAPI_KEY
EXA_API_KEY
SCRAPFLY_API_KEY
ZENROWS_API_KEY
COMPANIES_HOUSE_API_KEY
WHOISJSON_API_KEY

Never ask for:
DATABASE_URL
WHOXY
REDIS_URL_2
REDIS_URL_3
REDIS_URL_4
REDIS_URL_5
DEEPSEEK_API_KEY and NVIDIA_NIM_API_KEY (retired; do not request)

Never print secret values.

Run:
node scripts/replit-preflight.mjs

The preflight must recognize GEMINI_RIGHT_HAND_API_KEY for the active Right-hand. Retired DeepSeek/NVIDIA credentials must not be requested or exposed.

============================================================
INSTALL — LOW OOM / FIREWALL RISK
============================================================

export NODE_OPTIONS=--max-old-space-size=1536
export NPM_CONFIG_REGISTRY=https://registry.npmjs.org
pnpm config set registry https://registry.npmjs.org
pnpm config set network-timeout 600000

If pnpm-lock.yaml contains internal proxy tarball hosts, rewrite only those hosts to https://registry.npmjs.org/ while preserving package/version/integrity data.

pnpm install --no-frozen-lockfile --registry=https://registry.npmjs.org --child-concurrency 1 --network-concurrency 1 --fetch-retries 5 --fetch-timeout 600000

If exit 137, retry once with the same low-concurrency flags.
Do not strip dependencies.
Do not empty or replace pnpm-lock.yaml.

============================================================
BUILD / STATIC GATES
============================================================

pnpm --filter @workspace/db run push
pnpm --dir artifacts/apex-finder run build
test -f artifacts/apex-finder/dist/public/index.html
pnpm --dir artifacts/api-server run build
pnpm run typecheck
pnpm run check:no-force-dig
pnpm run check:free-react
pnpm run check:discovery-quality
pnpm run check:comparison-contract
pnpm run check:trajectory
pnpm run check:agentic-runtime
pnpm run check:agentic-timeout
pnpm run check:provider-role-docs

Typecheck MUST pass. Never claim build success while typecheck or architecture checks fail.
Do not remove/disable a failing check.

============================================================
BOOT / HEALTH
============================================================

Start the managed API workflow using scripts/replit-boot.sh.

Then:
curl -sS http://127.0.0.1:8080/api/healthz

Verify:
status
redis
bureauIntegrity
provider readiness where exposed

If Redis is down, verify REDIS_URL_1, canonical boot aliasing, and workflow command/path; restart once and re-check. Do not ask for another Redis key.

If bureauIntegrity=critical, do not run a fake proof. Diagnose whether the cause is provider key/auth/quota, endpoint/model failure, timeout, malformed response, or source/runtime failure.

============================================================
GEMINI RIGHT-HAND SMOKE — BEFORE DISCOVERY
============================================================

Perform one tiny Right-hand provider smoke through the application's actual Gemini abstraction using GEMINI_RIGHT_HAND_API_KEY. Do not browse.

============================================================
DESK
============================================================

Open the App public URL at /
Hard refresh.
Verify non-blank current desk:
Entities / Profile / Reactor / Dig contacts where applicable.
Do not mistake old ApexFinder Pro artifacts for the current desk.
Do not redesign.

============================================================
LEDGER / DISCOVERY
============================================================

GET /api/entities?limit=5

If a real valid entity already exists, do not run discovery just to create another.

If ledger is empty, run ONE bounded discovery-first smoke only:

POST /api/ingest/atlas-run
{
  "discoveryFirst": true,
  "targetCount": 3,
  "researchLimit": 3,
  "runResearch": true,
  "skipFaa": true,
  "broadCategories": 1,
  "batchSize": 3,
  "phaseJBatchSize": 3,
  "targetTimeoutMs": 180000,
  "researchDepth": "standard"
}

Poll GET /api/ingest/atlas-status.
Stop as soon as a valid real entity is admitted OR the job becomes idle/terminal.
Do not start a second job while locked.
Do not leave discovery running forever.
If zero valid entities are admitted, do not fabricate one and do not loop endlessly.

============================================================
REQUIRED PROOF DIG
============================================================

Once a real entityId exists:

POST /api/ingest/atlas-run
{
  "singleTargetId": <REAL_ENTITY_ID>,
  "runResearch": true,
  "researchDepth": "standard",
  "targetTimeoutMs": 420000
}

Poll /api/ingest/atlas-status until idle/terminal. Record jobId.

Dig MUST remain free-ReAct.
The investigator model chooses web_search / visit / OSINT tools / pivots / done.
Do not force hops.
Do not hardcode target-specific searches.
Do not reference retired DeepSeek/NVIDIA as an active provider.

Success trajectory should show model-selected actions, not force_* or scripted sequences.

If evidence exists but the card is empty:
POST /api/entities/rehydrate-contacts
{"entityId": <REAL_ENTITY_ID>}

============================================================
SCOREBOARD
============================================================

Only if bureauIntegrity is not critical and a real entity + completed Dig exist:

bash scripts/replit-scoreboard-check.sh http://127.0.0.1:8080

Record mean / n / milestonePass.
Never fabricate scoreboard values.

============================================================
STOP CONDITIONS
============================================================

STOP and report if main is below the repository tip floor.
STOP and report if bureauIntegrity remains critical after legitimate diagnosis/restart.
STOP and report if provider credentials genuinely require operator action.
STOP and report if no valid entity can be admitted without inventing one.

Do not stop merely because a recoverable install/workflow/path problem occurred; fix it and continue.

============================================================
FINAL REPORT — ONE MESSAGE
============================================================

Apex Atlas execution report

tip SHA:
public URL:
provider architecture:
Boss:
Right-hand:
Dig:

secrets configured: yes/no (names only; no values)
Gemini Right-hand smoke: OK/FAILED
install: OK/FAILED
database push: OK/FAILED
preflight: OK/FAILED
typecheck: OK/FAILED
desk index.html: OK/FAILED
API build: OK/FAILED
no-force-dig: OK/FAILED
free-react: OK/FAILED
discovery-quality: OK/FAILED
agentic-runtime: OK/FAILED
provider-role-docs: OK/FAILED
healthz integrity:
redis:
desk non-blank: yes/no
entityId:
jobId:
trajectory:
scoreboard mean / n / milestonePass:
blockers: exact error text if any

Never expose secret values.
Never claim success without evidence.
END.
```
