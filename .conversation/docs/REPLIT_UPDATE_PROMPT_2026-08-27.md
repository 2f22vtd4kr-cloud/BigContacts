# Replit update + live scoreboard test (2026-08-27) — tip 53d72d0+

Paste the block below into the Replit agent / shell operator. Hard stop at acceptance. No redesign. No force-hop dig scripts.

```
Update and smoke-test Apex Atlas from GitHub main tip 53d72d0 or newer.

REPO
https://github.com/2f22vtd4kr-cloud/BigContacts
Branch: main
Tip required: 53d72d0 or newer (git log -1 --oneline)

LAYOUT
- One workflow only: API Server
- PORT=8080
- Desk HTML at /
- API at /api/
- Do NOT start a separate Frontend workflow
- Public preview URL must open / (desk), never /api alone

GIT
git fetch origin main
git checkout main
git pull origin main
git log -1 --oneline
# Must be 53d72d0 or later. If stuck on older SHA, STOP and report.

ENV (Replit Secrets — presence only; never print secret values)
ENABLE_AUTO_PIPELINE=false
INSTALL_PYTHON_OSINT=false
PORT=8080
APEX_SKIP_SEMANTIC=1
NODE_OPTIONS=--max-old-space-size=2048
CI=true
DATABASE_URL=set
REDIS_URL or REDIS_URL_1=set (prefer one primary Redis; extras optional)
Search: SERPER_API_KEY and/or TAVILY_API_KEY and/or EXA_API_KEY
Dig LLM: GROQ_API_KEY and/or GEMINI_API_KEY and/or MISTRAL_API_KEY (and NVIDIA if used)
Optional: SCRAPFLY_API_KEY / ZENROWS_API_KEY for JS pages

PREFLIGHT (optional)
node scripts/replit-preflight.mjs

BUILD
pnpm install --no-frozen-lockfile
pnpm --filter @workspace/db run push
pnpm --dir artifacts/apex-finder run build
pnpm --dir artifacts/api-server run build
test -f artifacts/apex-finder/dist/public/index.html

VERIFY FREE DIG
pnpm run check:no-force-dig
# Must print OK (no force_* dig controllers)

RUN
bash scripts/replit-boot.sh
# or: pnpm --filter @workspace/api-server run start  after build

HEALTH
curl -sS http://127.0.0.1:8080/api/healthz | head -c 2000
# Need: ok-ish response, redis ok, bureauIntegrity not "critical"
# If integrity is critical: fix search+LLM secrets and RESTART API — do not claim dig quality.

DESK
Open public URL /
Hard refresh
Confirm: Entities / Profile / Reactor load (non-blank)
Confirm Dig contacts / Stop visible on a profile or entities row

LIVE SCOREBOARD TEST (product proof — not optional if keys are live)
1. ENABLE_AUTO_PIPELINE stays false
2. Pick 8–12 real entity ids on this host (mix: issuer-trap, org-only, thin, easy if available)
3. For EACH id: Dig contacts (single-target) depth=standard — NOT discoveryFirst
4. Wait GET /api/ingest/atlas-status until idle; note jobId
5. Optional: POST /api/entities/rehydrate-contacts {"limit":50}
6. bash scripts/replit-scoreboard-check.sh https://YOUR_PUBLIC_HOST
   # or: pnpm run scoreboard:live https://YOUR_PUBLIC_HOST
7. Record: tip SHA, integrity, mean, n, milestonePass, any suggestedLcode on weak rows

PASS (all required)
- tip 53d72d0+
- desk non-blank at /
- healthz bureauIntegrity != critical
- check-no-force-dig OK
- Dig contacts starts a job (202) and reaches idle
- scoreboard snapshot returns JSON with mean / milestonePass / rows
- Prefer: free dig spans visible (search/visit) during dig

FAIL / STOP CONDITIONS
- tip older than 53d72d0
- integrity critical with keys missing
- force_* appears in dig trajectory or check-no-force-dig fails
- blank desk after rebuild
- claiming milestonePass without snapshot JSON

DO NOT
- redesign UI or research architecture
- add force hop lists / prefer-list dig scripts
- enable auto pipeline
- burn credits on endless curl loops after acceptance
- Launch discovery-first multi-target as the scoreboard proof path
- invent entity data

REPORT (one message then END)
tip SHA:
public URL:
healthz integrity:
check-no-force-dig:
desk non-blank: yes/no
Dig smoke jobId (one target):
scoreboard mean / n / milestonePass:
worst L-codes if any:
```
