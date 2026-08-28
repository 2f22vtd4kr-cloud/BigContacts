# Replit update + live scoreboard test — tip a69b751+

Paste the block below. Hard stop at acceptance. No redesign. No force-hop dig scripts.

```
Update and smoke-test Apex Atlas from GitHub main tip a69b751 or newer.

REPO
https://github.com/2f22vtd4kr-cloud/BigContacts
Branch: main
Tip required: a69b751 or newer (git log -1 --oneline)

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
# Must be a69b751 or later. If stuck on older SHA, STOP and report.

FLAGS (workflow env — safe)
ENABLE_AUTO_PIPELINE=false
INSTALL_PYTHON_OSINT=false
PORT=8080
APEX_SKIP_SEMANTIC=1
NODE_OPTIONS=--max-old-space-size=2048
CI=true

SECRETS — ASK THE OPERATOR (Replit Secrets UI)
Before build/boot, show this list and ask the operator which are already set.
Do NOT invent values. Do NOT print existing secret values. Do NOT overwrite a secret the operator did not ask you to change.

Required for boot:
- DATABASE_URL
- REDIS_URL_1   (or REDIS_URL — one Redis is enough)

Required for dig quality (else bureauIntegrity=critical; do not claim dig quality):
- At least one search: SERPER_API_KEY  and/or  TAVILY_API_KEY  and/or  EXA_API_KEY
- At least one dig LLM: GROQ_API_KEY  and/or  GEMINI_API_KEY  and/or  MISTRAL_API_KEY
  (NVIDIA_NIM_API_KEY also counts if that is what the operator uses)

Optional (JS-heavy pages / registries — only if operator provides):
- SCRAPFLY_API_KEY or ZENROWS_API_KEY
- WHOISJSON_API_KEY / WHOXY_API_KEY / COMPANIES_HOUSE_API_KEY

If any Required are missing: stop and ask the operator to add them in Secrets, then continue after they confirm. Never paste placeholder keys.

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
# Report bureauIntegrity only (ok | degraded | critical). Never print secret values.
# If critical after operator confirmed keys: report and END — do not invent keys.

DESK
Open public URL /
Hard refresh
Confirm: Entities / Profile / Reactor load (non-blank)
Confirm Dig contacts / Stop visible on a profile or entities row

LIVE SCOREBOARD TEST (only if integrity is not critical)
1. ENABLE_AUTO_PIPELINE stays false
2. Pick 8–12 real entity ids on this host (mix: issuer-trap, org-only, thin, easy if available)
3. For EACH id: Dig contacts (single-target) depth=standard — NOT discoveryFirst
4. Wait GET /api/ingest/atlas-status until idle; note jobId
5. Optional: POST /api/entities/rehydrate-contacts {"limit":50}
6. bash scripts/replit-scoreboard-check.sh https://YOUR_PUBLIC_HOST
7. Record: tip SHA, integrity, mean, n, milestonePass, any suggestedLcode on weak rows

PASS
- tip a69b751+
- desk non-blank at /
- bureauIntegrity != critical
- check-no-force-dig OK
- Dig contacts reaches idle
- scoreboard JSON with mean / milestonePass / rows

FAIL / STOP
- tip too old · integrity critical · force_* · blank desk · claim pass without snapshot

DO NOT
- redesign · force-hop dig scripts · auto pipeline · Frontend workflow
- invent or print secret values · overwrite secrets without operator OK
- discovery-first as the scoreboard proof · endless curl loops

REPORT (one message then END)
tip SHA:
public URL:
secrets asked / operator confirmed: yes/no
healthz integrity:
check-no-force-dig:
desk non-blank: yes/no
Dig smoke jobId:
scoreboard mean / n / milestonePass:
worst L-codes if any:
```
