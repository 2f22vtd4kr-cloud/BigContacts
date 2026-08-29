# Replit — one-shot setup + Dig scoreboard (Aug 2026+)

**This is the only Agent prompt.**

**Before pasting (operator):**
1. Funded Replit account (credits available)
2. Create / open a **Replit App (project)** from GitHub: `https://github.com/2f22vtd4kr-cloud/BigContacts` · branch `main`
3. **Postgres:** Replit provides the app database by default (Database tool / Agent). `DATABASE_URL` is injected into the app environment. **Do not** ask the operator to “attach Postgres” or paste a Postgres URL.
4. **Redis:** operator puts **Upstash** (or equivalent) in Secrets as `REDIS_URL_1` or `REDIS_URL`
5. Other API keys in **Secrets**
6. Open **Agent inside this App/project** (project runtime — not a detached chat) → paste the fenced block

```
Apex Atlas — execute end-to-end in THIS Replit App only. One report at the end. No redesign. END when done.

═══════════════════════════════════════
IDENTITY
═══════════════════════════════════════
Repo: https://github.com/2f22vtd4kr-cloud/BigContacts
Branch: main
Tip floor: 42b36b0 or newer (prefer latest main; Batch 10+ API build repair)
Product: AI free-ReAct OSINT desk — real public contact routes to HNWIs / principals / operators.
Law: models invent queries and choose tools; tools execute. NEVER force_* hops, GROK-PARITY, prefer-lists, or scripted dig playbooks. NEVER invent people, contacts, or URLs.

═══════════════════════════════════════
PLATFORM (Replit Aug 2026+)
═══════════════════════════════════════
• This is a Replit App / project — do not say “Repl” or create a second app mid-run
• Postgres is platform-provided (DATABASE_URL injected). NEVER ask for DATABASE_URL. NEVER ask operator to “attach Postgres.” If DB missing, use Database tool / ask platform to provision — do not invent a connection string
• Redis is operator-supplied (Upstash): REDIS_URL_1 or REDIS_URL in Secrets only
• Agent must run in this app’s project runtime (Shell/workflow), not a conversation sandbox without env

═══════════════════════════════════════
HARD RULES
═══════════════════════════════════════
• API Server workflow ONLY on PORT=8080 — do NOT start Frontend / separate Vite preview as the product
• ENABLE_AUTO_PIPELINE=false unless operator explicitly says otherwise
• NEVER ask for WHOXY or REDIS_URL_2–_5
• NEVER print secret values
• NEVER invent entities or contacts
• Scoreboard PROOF = single-target Dig (standard) — NOT discovery-first bulk
• If bureauIntegrity=critical → report and END (operator fixes Secrets offline)
• If Redis quota exhausted → operator replaces REDIS_URL_1 (new Upstash DB), restart API, re-check healthz

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
Show this list. Operator fills Secrets. Do not invent or print values. Wait for confirmation.

MINIMUM (three classes for non-critical integrity):
  REDIS_URL_1          ← Upstash Redis URL (or REDIS_URL)
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

Aliases OK: REDIS_URL↔REDIS_URL_1, EXA_1↔EXA_API_KEY
Do NOT list DATABASE_URL here. Postgres is not an operator secret.

═══════════════════════════════════════
STEP 3 — INSTALL (OOM + firewall safe)
═══════════════════════════════════════
export NODE_OPTIONS=--max-old-space-size=1536
export NPM_CONFIG_REGISTRY=https://registry.npmjs.org
pnpm config set registry https://registry.npmjs.org
pnpm config set network-timeout 600000

# If pnpm-lock.yaml tarball URLs use internal proxy (e.g. http://35.245.43.102/npm/...),
# rewrite ONLY those hosts to https://registry.npmjs.org/ (keep package names, versions, integrity).

pnpm install --no-frozen-lockfile --registry=https://registry.npmjs.org \
  --child-concurrency 1 --network-concurrency 1 --fetch-retries 5 --fetch-timeout 600000

If exit 137: retry once same flags.
If lockfile emptied by mistake: git checkout HEAD -- pnpm-lock.yaml (or latest non-empty commit).
Do NOT strip dependencies. After successful install, do NOT restore a firewall-proxy lockfile.

═══════════════════════════════════════
STEP 4 — DB + BUILDS
═══════════════════════════════════════
# Uses injected DATABASE_URL — if push fails with missing DB, use Replit Database tool / platform Postgres (do not ask operator for a URL)
pnpm --filter @workspace/db run push
pnpm --dir artifacts/apex-finder run build
test -f artifacts/apex-finder/dist/public/index.html || (echo DESK_BUILD_FAILED && exit 1)
pnpm --dir artifacts/api-server run build
pnpm run check:no-force-dig
pnpm run check:free-react

═══════════════════════════════════════
STEP 5 — BOOT + HEALTH
═══════════════════════════════════════
ENABLE_AUTO_PIPELINE=false RESEARCH_DEPTH=standard bash scripts/replit-boot.sh
curl -sS http://127.0.0.1:8080/api/healthz
Report only: status, redis, bureauIntegrity.
If critical → END.
If redis down / quota exhausted → operator replaces Upstash REDIS_URL_1; restart API; re-curl healthz.

═══════════════════════════════════════
STEP 6 — PREVIEW
═══════════════════════════════════════
Open this App’s public URL at /
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

Poll GET /api/ingest/atlas-status until idle. Note jobId.
If card empty but dig wrote evidence:
  POST /api/entities/rehydrate-contacts {"entityId": <id>}

bash scripts/replit-scoreboard-check.sh http://127.0.0.1:8080

What success looks like:
• Trajectory shows model-chosen web_search / visit / OSINT tools / done — not force_* lines
• Contacts on card or evidence have real source URLs
• Org inboxes stay organization scope
• Scoreboard prints mean / n / milestonePass

═══════════════════════════════════════
PASS CRITERIA
═══════════════════════════════════════
• tip 42b36b0+
• install + desk + api build OK
• no-force-dig OK · free-react OK
• desk non-blank at /
• bureauIntegrity not critical
• redis connected (operator Upstash)
• ≥1 real entity
• Dig idle with jobId
• scoreboard mean / n / milestonePass

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
