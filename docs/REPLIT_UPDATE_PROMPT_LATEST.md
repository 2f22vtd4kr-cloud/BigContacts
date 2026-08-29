# Replit — one-shot setup + Dig scoreboard

**This is the only Replit Agent prompt.**  

**Before pasting:** new/fresh Replit account → **Create Repl from GitHub** → `https://github.com/2f22vtd4kr-cloud/BigContacts` · branch `main` → attach **PostgreSQL** → put secrets in **Secrets** → open **Agent inside that Repl** (not a detached chat) → paste the fenced block below.

```
Apex Atlas — execute end-to-end in THIS Repl only. One report at the end. No redesign. END when done.

═══════════════════════════════════════
IDENTITY
═══════════════════════════════════════
Repo: https://github.com/2f22vtd4kr-cloud/BigContacts
Branch: main
Tip floor: 42b36b0 or newer (Batch 10+ build repair; prefer latest main)
Product: AI free-ReAct OSINT desk for real public contact routes to HNWIs / principals / operators.
Law: models invent queries and choose tools; tools execute. NEVER force_* hops, GROK-PARITY, prefer-lists, or scripted dig playbooks. NEVER invent people, contacts, or URLs.

═══════════════════════════════════════
HARD RULES
═══════════════════════════════════════
• Work ONLY in this Repl — do NOT create a second project mid-run
• API Server workflow ONLY on PORT=8080 — do NOT start Frontend
• ENABLE_AUTO_PIPELINE=false always unless operator explicitly says otherwise
• NEVER ask for / invent / print DATABASE_URL (Replit Postgres injects it)
• NEVER ask for WHOXY or REDIS_URL_2–_5
• NEVER print secret values
• NEVER invent entities or contacts
• Scoreboard PROOF = single-target Dig (standard) — NOT discovery-first bulk
• If bureauIntegrity=critical → report and END (operator fixes secrets offline)
• If Redis quota exhausted → tell operator to replace REDIS_URL_1, restart API, re-check healthz

═══════════════════════════════════════
STEP 0 — TIP
═══════════════════════════════════════
git fetch origin main && git checkout main && git pull origin main
git log -1 --oneline
git remote -v
If tip older than 42b36b0 → STOP, report SHA only.

═══════════════════════════════════════
STEP 1 — WORKFLOW ENV (not secrets)
═══════════════════════════════════════
API Server only:
  PORT=8080
  ENABLE_AUTO_PIPELINE=false
  INSTALL_PYTHON_OSINT=false
  APEX_SKIP_SEMANTIC=1
  CI=true
  RESEARCH_DEPTH=standard
  NODE_OPTIONS=--max-old-space-size=1536

═══════════════════════════════════════
STEP 2 — SECRETS
═══════════════════════════════════════
Show this list. Operator fills Replit Secrets. Do not invent or print values. Wait for confirmation.

MINIMUM (non-critical integrity needs all three classes):
  REDIS_URL_1          (or REDIS_URL)
  GROQ_API_KEY         (or GEMINI / MISTRAL / NVIDIA_NIM)
  SERPER_API_KEY       (or TAVILY_API_KEY or EXA_API_KEY)

FULL (fill what operator has):
  REDIS_URL_1
  GROQ_API_KEY
  GEMINI_API_KEY
  NVIDIA_NIM_API_KEY
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

Aliases OK: REDIS_URL↔REDIS_URL_1 · EXA_1↔EXA_API_KEY

═══════════════════════════════════════
STEP 3 — INSTALL (OOM + firewall safe)
═══════════════════════════════════════
export NODE_OPTIONS=--max-old-space-size=1536
export NPM_CONFIG_REGISTRY=https://registry.npmjs.org
export npm_config_registry=https://registry.npmjs.org
pnpm config set registry https://registry.npmjs.org
pnpm config set network-timeout 600000

# If lockfile tarball URLs use internal proxy IP (e.g. http://35.245.43.102/npm/...),
# rewrite ONLY those hosts → https://registry.npmjs.org/ (keep package names, versions, integrity).
# Example:
#   python3 -c "from pathlib import Path;import re;p=Path('pnpm-lock.yaml');s=p.read_text();s2=re.sub(r'https?://35\\.245\\.43\\.102(?:/npm)?/?','https://registry.npmjs.org/',s);s2=s2.replace('https://registry.npmjs.org//','https://registry.npmjs.org/');p.write_text(s2) if s2!=s else None"

pnpm install --no-frozen-lockfile --registry=https://registry.npmjs.org \
  --child-concurrency 1 --network-concurrency 1 --fetch-retries 5 --fetch-timeout 600000

If exit 137 (OOM): retry once same flags. Do NOT strip dependencies.
If lockfile was emptied by mistake: git checkout HEAD -- pnpm-lock.yaml (or latest non-empty commit on main). Do NOT restore internal-proxy lockfile.
After successful install: do NOT re-fight lockfile diffs — continue.

═══════════════════════════════════════
STEP 4 — DB + BUILDS + PRODUCT LAW
═══════════════════════════════════════
pnpm --filter @workspace/db run push
pnpm --dir artifacts/apex-finder run build
test -f artifacts/apex-finder/dist/public/index.html || (echo DESK_BUILD_FAILED && exit 1)
pnpm --dir artifacts/api-server run build
pnpm run check:no-force-dig
pnpm run check:free-react
Both checks must OK.

═══════════════════════════════════════
STEP 5 — BOOT + HEALTH
═══════════════════════════════════════
ENABLE_AUTO_PIPELINE=false RESEARCH_DEPTH=standard bash scripts/replit-boot.sh
# Keep API on 8080. Desk is served at /.

curl -sS http://127.0.0.1:8080/api/healthz
Report ONLY: status, redis, bureauIntegrity (ok|degraded|critical). Never print secrets.
If critical → END.
If redis down / quota exhausted → operator replaces REDIS_URL_1, restart API workflow, re-curl healthz.

═══════════════════════════════════════
STEP 6 — PREVIEW
═══════════════════════════════════════
Open this Repl’s public URL at /
Hard refresh. Confirm non-blank desk: Entities / Profile / Reactor, Dig contacts visible.
Old “ApexFinder Pro” artifacts are NOT current.

═══════════════════════════════════════
STEP 7 — SEED IF LEDGER EMPTY
═══════════════════════════════════════
GET /api/entities?limit=5
If empty: ONE tiny discovery-first seed only — then STOP as soon as ≥1 entity exists.

POST /api/ingest/atlas-run
Content-Type: application/json
{
  "discoveryFirst": true,
  "targetCount": 3,
  "researchLimit": 3,
  "runResearch": true,
  "skipFaa": true,
  "broadCategories": 1,
  "batchSize": 10,
  "phaseJBatchSize": 5,
  "targetTimeoutMs": 180000,
  "researchDepth": "standard"
}

Poll GET /api/ingest/atlas-status.
When ≥1 entity exists OR job idle: DELETE /api/ingest/atlas-lock
Do NOT leave discovery running forever. Do NOT start a second job while 409.
If discovery blocks the API event loop: restart API Server workflow once, then continue from entities list.

═══════════════════════════════════════
STEP 8 — PROOF DIG (required)
═══════════════════════════════════════
Pick a real entityId from the ledger.

POST /api/ingest/atlas-run
{
  "singleTargetId": <id>,
  "runResearch": true,
  "researchDepth": "standard",
  "targetTimeoutMs": 420000
}

Poll GET /api/ingest/atlas-status until idle (completed/cancelled/failed). Note jobId.
If card empty but dig wrote evidence:
  POST /api/entities/rehydrate-contacts {"entityId": <id>}

bash scripts/replit-scoreboard-check.sh http://127.0.0.1:8080

What success looks like (product):
• Trajectory shows model-chosen web_search / visit / OSINT tools / done — not force_* lines
• Contacts on card or evidence have real source URLs
• Org inboxes stay organization scope
• Scoreboard prints mean / n / milestonePass

═══════════════════════════════════════
PASS CRITERIA
═══════════════════════════════════════
• tip 42b36b0+
• install + desk build + api build OK
• no-force-dig OK · free-react OK
• desk non-blank at /
• bureauIntegrity not critical
• ≥1 real entity
• Dig reached idle with jobId
• scoreboard mean / n / milestonePass printed

═══════════════════════════════════════
REPORT (one message) then END
═══════════════════════════════════════
tip SHA:
public URL:
secrets configured: yes/no (no values)
install OK:
desk index.html:
api build OK:
no-force-dig:
free-react:
healthz integrity:
redis:
desk non-blank:
entityId:
jobId:
scoreboard mean / n / milestonePass:
blockers (exact error text if any):
```
