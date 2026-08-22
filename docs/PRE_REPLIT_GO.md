# Pre-Replit GO — Apex Atlas

**Branch:** `main`  
**Pull tip:** latest `main` (after final pre-Replit fixes: right-hand free assign ≠ final-review; target-locked Boss goals not numbered script)

## Ready when

1. Repo imported from `https://github.com/2f22vtd4kr-cloud/BigContacts` → `main`
2. Secrets set (see below)
3. `pnpm install` + DB schema applied
4. API + desk workflows running
5. `GET /api/healthz` → `bureauIntegrity` **ok**
6. One bounded Launch → Stop smoke

## Secrets (Replit Secrets UI)

**Must have**
- `DATABASE_URL` (Replit Postgres)
- `REDIS_URL_1` … `REDIS_URL_5` (Upstash TCP URLs)
- `REDIS_URL` = `redis://localhost:6379` (or leave `.replit` default)
- `GEMINI_API_KEY` — Boss
- `NVIDIA_NIM_API_KEY` — right-hand
- `GROQ_API_KEY` — dig capacity + fallback only (not Boss)
- `SERPER_API_KEY` — primary web search

**Strongly recommended**
- `TAVILY_API_KEY`, `EXA_1` / `EXA_2` (or `EXA_API_KEY`)
- `MISTRAL_API_KEY`
- `SCRAPFLY_API_KEY`, `ZENROWS_API_KEY`
- `COMPANIES_HOUSE_API_KEY`
- `WHOXY_API_KEY` (or `WHOXY_KEY` / `Whoxy_Key`)
- `HF_TOKEN`, `WHOISJSON_API_KEY`

**Flags**
- `ENABLE_AUTO_PIPELINE=false`
- `RESEARCH_DEPTH=standard` (parity digs; use `fast` only for bulk cost)

## Boot order

1. `git pull origin main`
2. Restart **API Server** after any secret change
3. Confirm healthz / status: search live + agentic LLM slots + Boss/right-hand keys
4. Launch Atlas (UI or `POST /api/ingest/atlas-run` with canonical body — see `docs/RUN_BUREAU.md`)
5. Watch reactor trajectory: model-chosen tools, not `force_*` lines
6. Stop when smoke is enough

## Do not

- Compare research quality while `bureauIntegrity` is critical
- Treat Groq as Boss (Boss = Gemini; right-hand = NVIDIA)
- Re-introduce force-hop / refuse-done dig scripts

## Product state on this tip

- Free ReAct dig; OSINT tools model-chosen
- Session orientation on Boss / right-hand / investigators / dig
- Adaptive: Gemini → NVIDIA → capacity fallback → stop
- Final review: Gemini → NVIDIA → capacity fallback → deterministic
