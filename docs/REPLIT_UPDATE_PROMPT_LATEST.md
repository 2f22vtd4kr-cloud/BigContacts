# Replit update + live scoreboard test

Pre–master-plan key set (FINAL_PRE_REPLIT_REVIEW §6 + 08-24 one-Redis rule): **one Redis**, **no WHOXY**, no required/optional tiers — ask the full list below.

Paste the block. Hard stop at acceptance. No redesign. No force-hop dig scripts.

```
Update and smoke-test Apex Atlas from GitHub main tip 79f20eb or newer.

REPO
https://github.com/2f22vtd4kr-cloud/BigContacts
Branch: main
Tip required: 79f20eb or newer (git log -1 --oneline)

LAYOUT
Only API Server workflow. PORT 8080. Desk at /. API at /api/. No Frontend workflow.

GIT
git fetch origin main && git checkout main && git pull origin main
git log -1 --oneline
Must be 79f20eb or newer. If older: STOP and report.

FLAGS
ENABLE_AUTO_PIPELINE=false
INSTALL_PYTHON_OSINT=false
PORT=8080
APEX_SKIP_SEMANTIC=1
NODE_OPTIONS=--max-old-space-size=2048
CI=true
RESEARCH_DEPTH=standard

SECRETS — ASK OPERATOR FOR THIS FULL SET (Replit Secrets UI)
One flat list. Do not invent values. Do not print values. Do not mark any of these optional.
Do NOT ask for WHOXY. Do NOT ask for REDIS_URL_2 / _3 / _4 / _5.

DATABASE_URL
REDIS_URL_1
GROQ_API_KEY
GEMINI_API_KEY
NVIDIA_NIM_API_KEY
MISTRAL_API_KEY
HF_TOKEN
SERPER_API_KEY
TAVILY_API_KEY
SERPAPI_KEY
EXA_1
EXA_2
SCRAPFLY_API_KEY
ZENROWS_API_KEY
COMPANIES_HOUSE_API_KEY
WHOISJSON_API_KEY

Notes (still not optional tiers — aliases only):
- REDIS_URL may be used instead of REDIS_URL_1 if that is how the host is wired (still one Redis only).
- EXA_API_KEY is fine if the operator uses that name instead of EXA_1 / EXA_2.
- Never WHOXY. Never multi-Redis slots on free tier.

BUILD
pnpm install --no-frozen-lockfile
pnpm --filter @workspace/db run push
pnpm --dir artifacts/apex-finder run build
pnpm --dir artifacts/api-server run build
test -f artifacts/apex-finder/dist/public/index.html

VERIFY FREE DIG
pnpm run check:no-force-dig

RUN
ENABLE_AUTO_PIPELINE=false bash scripts/replit-boot.sh

HEALTH
curl -sS http://127.0.0.1:8080/api/healthz | head -c 2000
Report bureauIntegrity (ok|degraded|critical). Never print secret values.
If critical after operator confirmed the set: report and END.

DESK
Open public URL / · hard refresh · non-blank Entities/Profile.
Confirm Dig contacts / Stop visible.

LIVE SCOREBOARD TEST (only if integrity is not critical)
1. ENABLE_AUTO_PIPELINE stays false
2. Pick 8–12 real entity ids (issuer-trap, org-only, thin, easy if available)
3. For each: Dig contacts single-target depth=standard — NOT discoveryFirst
4. Wait atlas-status idle; note jobId
5. Optional: POST /api/entities/rehydrate-contacts {"limit":50}
6. bash scripts/replit-scoreboard-check.sh https://YOUR_PUBLIC_HOST
7. Record tip SHA, integrity, mean, n, milestonePass, L-codes on weak rows

PASS
tip new enough · desk non-blank · integrity not critical · no-force-dig OK · Dig idle · scoreboard JSON printed

DO NOT
redesign · force-hop dig scripts · auto pipeline · Frontend workflow · WHOXY · REDIS_URL_2+ · invent/print secrets · discovery-first as proof · endless curl loops

REPORT then END
tip SHA:
public URL:
secrets list shown (full set above): yes/no
integrity:
no-force-dig:
desk:
jobId:
scoreboard mean/n/milestonePass:
L-codes:
```
