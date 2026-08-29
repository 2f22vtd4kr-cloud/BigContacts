# Replit — one-shot setup + Dig scoreboard

**This is the only Replit Agent prompt.** Paste the fenced block into the Agent **inside the BigContacts Repl** (project runtime). Do everything in order. One report at the end. No redesign.

```
Apex Atlas — full setup + single-target Dig scoreboard. Execute in THIS Repl only. One report. END when done.

IDENTITY
Repo https://github.com/2f22vtd4kr-cloud/BigContacts · branch main · tip 42b36b0 or newer.
Product: free-ReAct OSINT desk. Models invent queries; tools execute. No force_* hops, no scripted dig playbooks.

HARD RULES
• Do NOT create a second project
• Do NOT start Frontend workflow
• Do NOT ENABLE_AUTO_PIPELINE=true
• Do NOT ask for, invent, or print DATABASE_URL (Postgres injects it)
• Do NOT ask for WHOXY or REDIS_URL_2–_5
• Do NOT print secret values
• Do NOT invent entities or contacts
• Scoreboard proof = single-target Dig only (not discovery-first bulk)

STEP 0 — TIP
git fetch origin main && git checkout main && git pull origin main
git log -1 --oneline
If older than 42b36b0 → STOP, report SHA only.

STEP 1 — WORKFLOW ENV
API Server only, PORT=8080.
ENABLE_AUTO_PIPELINE=false
INSTALL_PYTHON_OSINT=false
APEX_SKIP_SEMANTIC=1
CI=true
RESEARCH_DEPTH=standard
NODE_OPTIONS=--max-old-space-size=1536

STEP 2 — SECRETS
Show list; operator fills Secrets UI. Do not invent/print values.
Minimum: REDIS_URL_1 (or REDIS_URL), GROQ_API_KEY or GEMINI_API_KEY, and one of SERPER_API_KEY / TAVILY_API_KEY / EXA_API_KEY.
Full: REDIS_URL_1, GROQ_API_KEY, GEMINI_API_KEY, NVIDIA_NIM_API_KEY, MISTRAL_API_KEY, HF_TOKEN, SERPER_API_KEY, TAVILY_API_KEY, SERPAPI_KEY, EXA_API_KEY, SCRAPFLY_API_KEY, ZENROWS_API_KEY, COMPANIES_HOUSE_API_KEY, WHOISJSON_API_KEY
Aliases: REDIS_URL↔REDIS_URL_1, EXA_1↔EXA_API_KEY
Wait for operator confirmation.

STEP 3 — INSTALL (OOM + firewall safe)
export NODE_OPTIONS=--max-old-space-size=1536
export NPM_CONFIG_REGISTRY=https://registry.npmjs.org
pnpm config set registry https://registry.npmjs.org
pnpm config set network-timeout 600000
# If pnpm-lock.yaml tarball URLs use internal proxy (e.g. http://35.245.43.102/npm/...), rewrite ONLY those hosts to https://registry.npmjs.org/ (keep versions/integrity).
pnpm install --no-frozen-lockfile --registry=https://registry.npmjs.org --child-concurrency 1 --network-concurrency 1 --fetch-retries 5 --fetch-timeout 600000
If exit 137: retry once. If lockfile emptied by mistake: git checkout HEAD -- pnpm-lock.yaml (or latest non-empty commit). Do not strip deps.

STEP 4 — DB + BUILDS
pnpm --filter @workspace/db run push
pnpm --dir artifacts/apex-finder run build
test -f artifacts/apex-finder/dist/public/index.html
pnpm --dir artifacts/api-server run build
pnpm run check:no-force-dig
pnpm run check:free-react

STEP 5 — BOOT + HEALTH
ENABLE_AUTO_PIPELINE=false RESEARCH_DEPTH=standard bash scripts/replit-boot.sh
curl -sS http://127.0.0.1:8080/api/healthz
Report: status, redis, bureauIntegrity only.
If critical → END (operator fixes secrets; restart API).
If Redis quota exhausted → operator replaces REDIS_URL_1; restart API; re-check healthz.

STEP 6 — PREVIEW
Public URL / must be non-blank desk (Entities / Profile / Reactor, Dig contacts). Hard refresh.

STEP 7 — SEED IF LEDGER EMPTY
If no entities: one tiny discovery-first only —
POST /api/ingest/atlas-run
{"discoveryFirst":true,"targetCount":3,"researchLimit":3,"runResearch":true,"skipFaa":true,"broadCategories":1,"batchSize":10,"phaseJBatchSize":5,"targetTimeoutMs":180000,"researchDepth":"standard"}
Poll status; when ≥1 entity exists, DELETE /api/ingest/atlas-lock (stop). Do not leave discovery running forever.

STEP 8 — PROOF DIG
POST /api/ingest/atlas-run
{"singleTargetId":<id>,"runResearch":true,"researchDepth":"standard","targetTimeoutMs":420000}
Poll GET /api/ingest/atlas-status until idle. Note jobId.
If card empty: POST /api/entities/rehydrate-contacts {"entityId":<id>}
bash scripts/replit-scoreboard-check.sh http://127.0.0.1:8080

PASS
tip 42b36b0+ · desk non-blank · checks OK · integrity not critical · Dig idle with jobId · scoreboard mean/n/milestonePass

REPORT then END
tip SHA:
public URL:
secrets configured: yes/no
install/desk/api OK:
no-force-dig / free-react:
healthz integrity:
entityId / jobId:
scoreboard mean / n / milestonePass:
blockers (exact text):
```
