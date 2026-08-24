# Replit from-zero (hard stop — copy entire block)

```
Set up Apex Atlas. Stop the agent the moment acceptance passes.
Do not redesign. Do not rewrite research. Do not debug forever.

REPO
https://github.com/2f22vtd4kr-cloud/BigContacts
Branch main
Tip a80a14b or newer (graph TDZ hooks-before-effects)
API code artifacts/api-server/src/src

LAYOUT
Only API Server workflow for public preview.
PORT 8080 only for API.
API serves desk at / and API at /api/
Do not start Frontend workflow.
Do not point preview at /api

SECRETS ask all names
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

One Redis only. No REDIS_URL_2 to 5. No Whoxy. No Google.
If REDIS_URL needed copy REDIS_URL_1.
DATABASE_URL managed do not ask if present.

ENV
ENABLE_AUTO_PIPELINE=false
INSTALL_PYTHON_OSINT=false
LOG_LEVEL=info
RESEARCH_DEPTH=standard
PORT=8080

INSTALL only
pnpm install
pnpm --filter @workspace/db run push
pnpm --filter @workspace/apex-finder run build
pnpm --filter @workspace/api-server run build
Skip Python OSINT install.
Skip long dependency archaeology after one successful install.

RUN
Kill process on 8080 if needed.
Start API Server only.
Restart API after secrets.

ACCEPTANCE then END immediately
1 / returns Apex Atlas HTML non-blank UI
2 /api/healthz 200 webSearchActive>0 agentic slots>0 integrity not critical
3 REDIS_URL_1 connected or report Redis fail once
4 One POST atlas-stop if status shows running then END
5 Do not smoke launch research unless operator asks
6 Do not investigate ghost jobs beyond one atlas-stop
7 Do not install tools after acceptance
8 One report then END

REPORT
SHA
public URL
healthz
integrity
Redis
desk non-blank yes/no

DO NOT
start Frontend
point preview at /api
burn credits on curl loops
burn credits on React archaeology after one rebuild
claim success on blank page
```
