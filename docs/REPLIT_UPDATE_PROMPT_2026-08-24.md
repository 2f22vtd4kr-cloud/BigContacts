# Replit update prompt (2026-08-24) — tip a80a14b+

Paste entire block. Hard stop at acceptance. No redesign. No research launch unless asked.

```
Update Apex Atlas from GitHub main tip a80a14b or newer.

CRITICAL: If git log -1 is still 84fa075, origin is stale — the graph TDZ fix is NOT on that tip.
Pull until: git log -1 --oneline shows a80a14b or later.
If pull stays on 84fa075, STOP and tell operator to push local main to origin.

REPO https://github.com/2f22vtd4kr-cloud/BigContacts branch main

LAYOUT
Only API Server workflow. PORT 8080. Desk at /. API at /api/. No Frontend workflow.

GIT
git fetch origin main && git checkout main && git pull origin main
git log -1 --oneline
Must be a80a14b or newer.

ENV
ENABLE_AUTO_PIPELINE=false
INSTALL_PYTHON_OSINT=false
PORT=8080
One Redis only: REDIS_URL_1 (or REDIS_URL). No REDIS_URL_2+.

BUILD
pnpm install
pnpm --filter @workspace/db run push
pnpm --dir artifacts/apex-finder run build
pnpm --dir artifacts/api-server run build

RUN
Start API Server only on 8080.
GET / = desk HTML
GET /api/healthz = ok, redis ok, bureauIntegrity not critical

GRAPH FIX IN THIS TIP
Connections TDZ: useListEntities/useGetEntityGraph declared BEFORE effects that read allEntitiesRaw.
Also: width/height before graphReady effect; allEntities normalized to array.

ACCEPTANCE — stop when all true
1. tip a80a14b+
2. / loads desk
3. /api/healthz ok
4. /network does NOT show "Cannot access E before initialization" (hard refresh)
5. Keys not false KEYS OFF when providers live
6. One Redis only; auto pipeline false

DO NOT redesign, add prefer-list dig scripts, multi Redis, Frontend on 8080, or full bureau launch.
END. Report tip SHA + healthz one line + /network ok/fail.
```
