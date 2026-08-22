# Pre-Replit GO — Apex Atlas

**Branch:** `main`  
**Pull tip:** latest `main` (multi-stage audit: free ReAct, orientation, integrity gate, fail-closed salvage, browser_fetch metrics)

## Ready when

1. Import `https://github.com/2f22vtd4kr-cloud/BigContacts` → **`main`**
2. Secrets set (below)
3. `pnpm install` + Drizzle schema applied
4. API + desk workflows running
5. `GET /api/healthz` → **`bureauIntegrity": "ok"`**
6. One bounded Launch → Stop smoke

## Roles (do not confuse)

| Role | Provider |
|------|----------|
| Boss | **Gemini** (`GEMINI_API_KEY` or `GEMINI_KEY`) |
| Right-hand | **NVIDIA** (`NVIDIA_NIM_API_KEY` / `NVIDIA_API_KEY`) |
| Dig capacity | Groq / Mistral / Gemini / NVIDIA failover — **not** Boss |

## Secrets

**Must have**
- `DATABASE_URL`
- `REDIS_URL_1` … `REDIS_URL_5` (Upstash)
- `REDIS_URL=redis://localhost:6379` (or `.replit` default)
- `GEMINI_API_KEY` (Boss)
- `NVIDIA_NIM_API_KEY` (right-hand)
- `GROQ_API_KEY` (dig + capacity fallback)
- `SERPER_API_KEY` (primary SERP; also `_2` / `_3` / `SERPER_KEY`)

**Strongly recommended**
- `TAVILY_API_KEY`, `EXA_1` / `EXA_2`
- `MISTRAL_API_KEY` (or `MISTRAL_KEY`)
- `SCRAPFLY_API_KEY`, `ZENROWS_API_KEY`
- `COMPANIES_HOUSE_API_KEY`
- `WHOXY_API_KEY` (or `WHOXY_KEY` / `Whoxy_Key`)
- `WHOISJSON_API_KEY`, `HF_TOKEN`

**Flags**
- `ENABLE_AUTO_PIPELINE=false`
- `RESEARCH_DEPTH=standard`

## Boot

1. `git pull origin main`
2. Restart **API Server** after any secret change
3. Confirm healthz: search live, `gemini`+`nvidiaNim`, `bureauIntegrity=ok`
4. Launch Atlas (desk or `POST /api/ingest/atlas-run`)
5. Reactor: model-chosen tools, not `force_*` lines
6. Stop when smoke is enough

## Product contract on this tip

- Free ReAct dig; full OSINT tool surface (model-chosen)
- Session orientation every Boss / right-hand / investigator / dig call
- Adaptive: Gemini Boss → NVIDIA free assign → capacity fallback → stop
- Final review: Gemini → NVIDIA final-card → capacity fallback
- Fail-closed contacts (http(s) sources); salvage requires page URL
- Scripts only if **all** dig LLMs fail a step
- Dig loop honors operator cancel between steps (partial findings kept)
