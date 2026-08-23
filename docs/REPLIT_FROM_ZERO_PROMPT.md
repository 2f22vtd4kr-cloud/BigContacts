# Replit from-zero prompt (copy when ready — not auto-sent)

**Do not use until operator pastes into a new Replit.**

```
Set up Apex Atlas on this Replit from zero.
Do not redesign UI. Do not rewrite research.
Stop the agent as soon as public desk is non-blank and healthz is ok.

REPO
https://github.com/2f22vtd4kr-cloud/BigContacts
Branch: main
Tip: latest main
API entry: artifacts/api-server/src/src

CRITICAL REPLIT LAYOUT
- ONLY run the API Server workflow for preview.
- API owns PORT 8080 and serves the built desk at / and /api/* under the same origin.
- Do NOT start the Frontend workflow for the public preview (it collides on PORT if env is shared).
- Optional local Vite: PORT=23695 only — never 8080.
- Public preview MUST open / — never /api.

REQUIRED PATHS
package.json
pnpm-workspace.yaml
artifacts/apex-finder
artifacts/api-server
lib/db

SECRETS — ask for ALL of these names
REDIS_URL_1
GROQ_API_KEY
GEMINI_API_KEY
NVIDIA_NIM_API_KEY
SERPER_API_KEY
TAVILY_API_KEY
EXA_API_KEY
EXA_API_KEY_2
SERPAPI_API_KEY
SCRAPFLY_API_KEY
ZENROWS_API_KEY
COMPANIES_HOUSE_API_KEY
WHOISJSON_API_KEY
MISTRAL_API_KEY
HF_TOKEN

Exactly ONE Redis. No REDIS_URL_2..5. No Whoxy. No Google.
DATABASE_URL is Replit managed.
If code needs REDIS_URL: copy REDIS_URL_1.

ENV
ENABLE_AUTO_PIPELINE=false
LOG_LEVEL=info
RESEARCH_DEPTH=standard
PORT=8080

INSTALL
1. git checkout main; tip must be latest
2. pnpm install
3. pnpm --filter @workspace/db run push
4. pnpm --filter @workspace/apex-finder run build
   Confirm dist/public/index.html uses /assets/*.js not /src/main.tsx
5. Build API: pnpm --filter @workspace/api-server run build

RUN
1. Start ONLY API Server on 8080 (serves desk + API)
2. Kill any orphan process on 8080 before start (fuser -k 8080/tcp or equivalent)
3. Restart API after secrets

ACCEPTANCE THEN STOP
1. Public URL / returns Apex Atlas HTML and NON-BLANK UI (nav or Launch visible)
2. /api/healthz 200; REDIS_URL_1 ok; webSearchActive>0; agentic slots>0; bureauIntegrity not critical
3. No fake people on cold desk
4. Optional one smoke: atlas-run 202 then Stop 200
5. Do not leave research running

If blank UI after one rebuild: report and END. Do not burn quota debugging React forever.

FINAL REPORT
SHA, public URL, healthz, Redis, desk non-blank yes/no

DO NOT start Frontend workflow for preview.
DO NOT point preview at /api.
```
