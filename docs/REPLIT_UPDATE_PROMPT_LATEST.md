# Replit update + live scoreboard test — tip 5422b02+

Paste the block below. Hard stop at acceptance. No redesign. No force-hop dig scripts.

**Secrets law:** Ask the operator for the **full set** below. No “required vs optional” tiers — a partial desk is not a full bureau. Do not invent values. Do not print existing secret values. Do not overwrite a secret unless the operator tells you to.

```
Update and smoke-test Apex Atlas from GitHub main tip 5422b02 or newer.

REPO
https://github.com/2f22vtd4kr-cloud/BigContacts
Branch: main
Tip required: 5422b02 or newer (git log -1 --oneline)

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
# Must be 5422b02 or later. If stuck on older SHA, STOP and report.

FLAGS (workflow env — not API provider secrets)
ENABLE_AUTO_PIPELINE=false
INSTALL_PYTHON_OSINT=false
PORT=8080
APEX_SKIP_SEMANTIC=1
NODE_OPTIONS=--max-old-space-size=2048
CI=true
RESEARCH_DEPTH=standard

SECRETS — ASK OPERATOR FOR THE FULL SET (Replit Secrets UI)
Show this entire list. Ask the operator to confirm each name is set (or they deliberately skip and accept a thinner bureau).
Do NOT invent values. Do NOT print secret values. Do NOT call some keys optional.

DATABASE_URL
REDIS_URL
REDIS_URL_1
REDIS_URL_2
REDIS_URL_3
REDIS_URL_4
REDIS_URL_5
GEMINI_API_KEY
NVIDIA_NIM_API_KEY
GROQ_API_KEY
MISTRAL_API_KEY
SERPER_API_KEY
TAVILY_API_KEY
EXA_API_KEY
EXA_1
EXA_2
SCRAPFLY_API_KEY
ZENROWS_API_KEY
WHOISJSON_API_KEY
WHOXY_API_KEY
COMPANIES_HOUSE_API_KEY
HF_TOKEN

Also accept alternate names the product already reads if the operator uses them instead of the primary name:
SERPER_API_KEY_2, SERPER_API_KEY_3, SERPER_KEY
GROQ_API_KEY_2 (and further slots if present)
GEMINI_API_KEY_2, GEMINI_KEY
MISTRAL_KEY
NVIDIA_API_KEY
WHOISJSON_KEY, WHOXY_KEY
TAVILY_API_KEY_1 (and further slots if present)

If the operator has not finished the full set: stop and wait for them. Do not paste placeholders.

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
# If critical: report and END unless operator already confirmed keys and wants a retry after their fix + restart.

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
- tip 5422b02+
- desk non-blank at /
- bureauIntegrity != critical
- check-no-force-dig OK
- Dig contacts reaches idle
- scoreboard JSON with mean / milestonePass / rows

FAIL / STOP
- tip too old · integrity critical · force_* · blank desk · claim pass without snapshot · inventing secret values

DO NOT
- redesign · force-hop dig scripts · auto pipeline · Frontend workflow
- invent or print secret values · rank secrets as optional vs required
- discovery-first as the scoreboard proof · endless curl loops

REPORT (one message then END)
tip SHA:
public URL:
full secrets list shown to operator: yes/no
healthz integrity:
check-no-force-dig:
desk non-blank: yes/no
Dig smoke jobId:
scoreboard mean / n / milestonePass:
worst L-codes if any:
```
