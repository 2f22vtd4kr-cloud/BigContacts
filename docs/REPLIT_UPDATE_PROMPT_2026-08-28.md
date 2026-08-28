# Replit — single prompt (use this one only)

**Problems this kills (from operator chat):** blank desk · preview on `/api` · Frontend workflow · auto-pipeline · multi-Redis thrash · hard-stop *before* Dig · graph-TDZ acceptance theater · force-hop dig · pass claims without scoreboard · stale tip in docs.

Paste **only** the fenced block. Do not also run FROM_ZERO / 08-24 prompts.

```
Apex Atlas Replit — pull, boot, one Dig, scoreboard. Then END.

REPO https://github.com/2f22vtd4kr-cloud/BigContacts  branch main
git fetch origin main && git checkout main && git pull origin main
git log -1 --oneline
# Need tip 27d722a or newer. If older: STOP, report SHA.

LAYOUT (non-negotiable)
• One workflow: API Server only · PORT=8080
• Preview opens / (desk HTML). Never treat /api as the app.
• Do NOT start Frontend / apex-finder dev server.

SECRETS
ENABLE_AUTO_PIPELINE=false
PORT=8080
APEX_SKIP_SEMANTIC=1
DATABASE_URL set
One Redis: REDIS_URL_1 or REDIS_URL (extras optional, not required)
≥1 search key: SERPER_API_KEY or TAVILY_API_KEY or EXA_API_KEY
≥1 dig LLM: GROQ_API_KEY or GEMINI_API_KEY or MISTRAL_API_KEY
Never print secret values.

BUILD + RUN
pnpm install --no-frozen-lockfile
pnpm --filter @workspace/db run push
pnpm --dir artifacts/apex-finder run build
test -f artifacts/apex-finder/dist/public/index.html || exit 1
pnpm --dir artifacts/api-server run build
pnpm run check:no-force-dig
bash scripts/replit-boot.sh

HEALTH (after restart)
curl -sS http://127.0.0.1:8080/api/healthz
If bureauIntegrity=critical → fix keys, restart API, re-check. Do not Dig for quality claims while critical.

DESK
Open public URL / · hard refresh · non-blank Entities/Profile.

TEST (required — this is the product)
1. Pick one real entity id that already exists on this DB.
2. Profile or Entities → Dig contacts · depth standard · NOT discovery-first.
3. Wait idle (GET /api/ingest/atlas-status). Note jobId.
4. Confirm card or ContactSurface changed OR evidence rehydrate:
   POST /api/entities/rehydrate-contacts {"entityId":ID}
5. bash scripts/replit-scoreboard-check.sh http://127.0.0.1:8080
6. Optional second–eighth fixtures only if step 1–5 worked and integrity ok.

PASS
tip ≥27d722a · desk non-blank · check-no-force-dig OK · integrity not critical · Dig reached idle · scoreboard JSON returned (mean/n/milestonePass printed)

FAIL → report and END (do not redesign)
blank desk · tip too old · force_* in check · integrity critical after keys checked · Dig never starts · preview pointed at /api

DO NOT
redesign · add force-hop / prefer-list dig scripts · enable auto pipeline · start Frontend · burn credits on curl loops · claim milestonePass without snapshot · discovery-first as the test

REPORT one block then END
SHA:
URL:
integrity:
no-force-dig:
desk:
jobId:
scoreboard mean/n/milestonePass:
card/evidence note:
```
