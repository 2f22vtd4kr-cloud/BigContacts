# Replit — one-shot setup + dig scoreboard

Paste the fenced block into the Replit agent. Do everything in order. One report at the end. No redesign.

```
Apex Atlas — full setup in one pass. Then END.

REPO
https://github.com/2f22vtd4kr-cloud/BigContacts
branch main
git fetch origin main && git checkout main && git pull origin main
git log -1 --oneline
Need tip 2b72fca or newer. Older → STOP, report SHA only.

LAYOUT (fixed)
• One workflow only: API Server
• PORT=8080
• Public preview = / (desk HTML)
• API = /api/
• Do NOT start Frontend / apex-finder dev server
• Do NOT open /api as the app

FLAGS (set on the workflow — not provider secrets)
ENABLE_AUTO_PIPELINE=false
INSTALL_PYTHON_OSINT=false
PORT=8080
APEX_SKIP_SEMANTIC=1
NODE_OPTIONS=--max-old-space-size=2048
CI=true
RESEARCH_DEPTH=standard

SECRETS — SHOW THIS LIST AND ASK THE OPERATOR
Do not invent values. Do not print existing values. Do not overwrite a secret unless the operator says so.
Do not ask for DATABASE_URL (Replit Postgres injects it).
Do not ask for WHOXY. Do not ask for REDIS_URL_2 / _3 / _4 / _5.
One EXA key is enough.

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

Aliases (operator may already use these — count as the same slot, do not demand duplicates):
REDIS_URL ↔ REDIS_URL_1
EXA_1 ↔ EXA_API_KEY

Wait until the operator confirms the list is set (or explicitly continues with gaps). Then proceed.

BUILD
pnpm install --no-frozen-lockfile
pnpm --filter @workspace/db run push
pnpm --dir artifacts/apex-finder run build
test -f artifacts/apex-finder/dist/public/index.html || (echo "DESK BUILD FAILED" && exit 1)
pnpm --dir artifacts/api-server run build
pnpm run check:no-force-dig
# Must print OK

RUN
ENABLE_AUTO_PIPELINE=false bash scripts/replit-boot.sh

HEALTH
curl -sS http://127.0.0.1:8080/api/healthz
Report only: status, redis, bureauIntegrity (ok|degraded|critical).
Never print secret values.
If bureauIntegrity is critical → report and END. Operator fixes Secrets offline; do not invent keys.

DESK
Open public URL /
Hard refresh
Confirm non-blank desk (Entities / Profile / Reactor).
Confirm Dig contacts and Stop are visible.

PRODUCT TEST (only if integrity is not critical)
1. Pick one existing entity id on this database.
2. Dig contacts · depth standard · single-target · NOT discovery-first.
3. Wait GET /api/ingest/atlas-status until idle. Note jobId.
4. POST /api/entities/rehydrate-contacts {"entityId": <id>} if the card still looks empty.
5. bash scripts/replit-scoreboard-check.sh http://127.0.0.1:8080
6. If that works and integrity still ok, optionally Dig 7–11 more mixed fixtures the same way and re-run scoreboard.

PASS
• tip 2b72fca+
• desk non-blank at /
• check-no-force-dig OK
• bureauIntegrity not critical
• Dig reached idle with a jobId
• scoreboard printed mean / n / milestonePass

DO NOT
• redesign UI or research
• add force-hop / prefer-list dig scripts
• enable auto pipeline
• start Frontend workflow
• invent, list-dump, or print secret values
• ask DATABASE_URL, WHOXY, or REDIS_URL_2+
• use discovery-first as the scoreboard proof
• burn credits on endless curl loops after acceptance

REPORT (one message) then END
tip SHA:
public URL:
secrets list shown to operator: yes/no
integrity:
no-force-dig:
desk non-blank: yes/no
jobId:
scoreboard mean / n / milestonePass:
card/evidence note:
```
