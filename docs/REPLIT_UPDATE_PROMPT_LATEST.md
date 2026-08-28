# Replit update + live scoreboard test — tip 07478d4+

Based on the 2026-08-27 operator prompt from this chat. Updated only for current tip + master plan: free dig, card is the answer, scoreboard proof, **Secrets operator-owned (agent never lists, prints, or fixes keys)**.

Paste the block below. Hard stop at acceptance. No redesign. No force-hop dig scripts.

```
Update and smoke-test Apex Atlas from GitHub main tip 07478d4 or newer.

REPO
https://github.com/2f22vtd4kr-cloud/BigContacts
Branch: main
Tip required: 07478d4 or newer (git log -1 --oneline)

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
# Must be 07478d4 or later. If stuck on older SHA, STOP and report.

ENV / FLAGS (safe to set as workflow env — not Secrets shopping)
ENABLE_AUTO_PIPELINE=false
INSTALL_PYTHON_OSINT=false
PORT=8080
APEX_SKIP_SEMANTIC=1
NODE_OPTIONS=--max-old-space-size=2048
CI=true

SECRETS
- Operator-owned. Do NOT add, edit, delete, rename, list, or print Replit Secrets.
- Do NOT invent or paste placeholder API keys.
- If bureauIntegrity is critical after boot: report and END. Operator fixes Secrets offline and restarts API. Do not claim dig quality while critical.

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
ENABLE_AUTO_PIPELINE=false bash scripts/replit-boot.sh

HEALTH
curl -sS http://127.0.0.1:8080/api/healthz | head -c 2000
# Report bureauIntegrity only (ok | degraded | critical). No secret names or values.
# Need: response ok-ish, redis ok, bureauIntegrity not critical — else END.

DESK
Open public URL /
Hard refresh
Confirm: Entities / Profile / Reactor load (non-blank)
Confirm Dig contacts / Stop visible on a profile or entities row

LIVE SCOREBOARD TEST (product proof — only if integrity is not critical)
1. ENABLE_AUTO_PIPELINE stays false
2. Pick 8–12 real entity ids on this host (mix: issuer-trap, org-only, thin, easy if available)
3. For EACH id: Dig contacts (single-target) depth=standard — NOT discoveryFirst
4. Wait GET /api/ingest/atlas-status until idle; note jobId
5. Optional: POST /api/entities/rehydrate-contacts {"limit":50}
6. bash scripts/replit-scoreboard-check.sh https://YOUR_PUBLIC_HOST
   # or: pnpm run scoreboard:live https://YOUR_PUBLIC_HOST
7. Record: tip SHA, integrity, mean, n, milestonePass, any suggestedLcode on weak rows

PASS (all required)
- tip 07478d4+
- desk non-blank at /
- healthz bureauIntegrity != critical
- check-no-force-dig OK
- Dig contacts starts a job and reaches idle
- scoreboard snapshot returns JSON with mean / milestonePass / rows
- Prefer: free dig spans visible (search/visit) during dig

FAIL / STOP CONDITIONS
- tip older than 07478d4
- integrity critical (do not touch Secrets — operator only)
- force_* appears in dig trajectory or check-no-force-dig fails
- blank desk after rebuild
- claiming milestonePass without snapshot JSON

DO NOT
- redesign UI or research architecture
- add force hop lists / prefer-list dig scripts
- enable auto pipeline
- touch or print Secrets
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
