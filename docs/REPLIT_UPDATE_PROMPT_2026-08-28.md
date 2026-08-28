# Replit — single prompt (use this one only)

**Secrets law (operator chat):** The agent must **never** add, edit, delete, rename, print, or “fix” Replit Secrets. Keys are operator-owned. If integrity is critical, **report and END** — do not touch Secrets.

Paste **only** the fenced block.

```
Apex Atlas Replit — pull, build desk, boot, one Dig, scoreboard. Then END.

SECRETS (read carefully)
• Do NOT open, edit, add, remove, or print any Replit Secret.
• Do NOT invent API keys or paste placeholder keys.
• Do NOT run preflight in a way that rewrites env.
• Flags only (safe): ENABLE_AUTO_PIPELINE=false  PORT=8080  APEX_SKIP_SEMANTIC=1
• If /api/healthz shows bureauIntegrity=critical → report that and END. Operator fixes Secrets offline. Do not Dig for quality while critical.

REPO
https://github.com/2f22vtd4kr-cloud/BigContacts  branch main
git fetch origin main && git checkout main && git pull origin main
git log -1 --oneline
Need tip 0580fd8 or newer. Older → STOP, report SHA.

LAYOUT
• One workflow: API Server · PORT=8080
• Preview = / (desk). Never /api as the app.
• Do NOT start Frontend workflow.

BUILD + RUN
pnpm install --no-frozen-lockfile
pnpm --filter @workspace/db run push
pnpm --dir artifacts/apex-finder run build
test -f artifacts/apex-finder/dist/public/index.html || exit 1
pnpm --dir artifacts/api-server run build
pnpm run check:no-force-dig
ENABLE_AUTO_PIPELINE=false bash scripts/replit-boot.sh

HEALTH
curl -sS http://127.0.0.1:8080/api/healthz
Report bureauIntegrity only (ok | degraded | critical). No secret names, no secret values.
If critical → END with report. Do not modify Secrets.

DESK
Open public URL / · hard refresh · non-blank UI.

TEST (only if integrity is not critical)
1. One existing entity id on this DB.
2. Dig contacts · depth standard · not discovery-first.
3. Wait atlas-status idle · note jobId.
4. Optional: POST /api/entities/rehydrate-contacts {"entityId":ID}
5. bash scripts/replit-scoreboard-check.sh http://127.0.0.1:8080

PASS
tip new enough · desk non-blank · no-force-dig OK · integrity not critical · Dig idle · scoreboard JSON printed

FAIL → report END (no redesign, no secret edits)
blank desk · tip old · force_* · integrity critical · Dig never starts · preview on /api

DO NOT
touch Secrets · print keys · redesign · force-hop dig scripts · auto pipeline · Frontend workflow · discovery-first as the test · claim milestonePass without snapshot

REPORT then END
SHA:
URL:
integrity: (ok|degraded|critical)
no-force-dig:
desk:
jobId: (or skipped_because_critical)
scoreboard mean/n/milestonePass: (or skipped)
```
