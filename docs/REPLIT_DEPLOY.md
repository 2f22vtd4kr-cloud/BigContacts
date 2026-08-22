# Apex Atlas — Replit Deployment Guide

**Product:** Bureau-first OSINT desk for reachable, attributable contacts on mid-market operators and HNWIs.  
**Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Stack:** pnpm monorepo — `artifacts/api-server` (Express) + `artifacts/apex-finder` (React/Vite) + `lib/db` (Postgres/Drizzle) + Redis (local + Upstash permanent).

---

## 1. Architecture (deploy must match this)

```
Browser (apex-finder)
    │  POST /api/ingest/atlas-run   ← Launch Apex Atlas button
    │  GET  /api/ingest/atlas-status
    │  GET  /api/healthz
    ▼
api-server (always-on process)
    │  job queue + locks
    ▼
Redis permanent (Upstash REDIS_URL_1…_5)  +  optional local REDIS_URL
    ▼
Postgres (DATABASE_URL) — entities, contacts, evidence, improvement_logs
```

**Hard rule:** Static UI alone cannot run the pipeline. `/api` must proxy to api-server. If the UI gets HTML for `/api/*`, you will see `Unexpected token '<'` JSON errors.

**Launch control:** Overview hero + header + Reactor call `POST /api/ingest/atlas-run` then route to `/reactor`.

---

## 2. Replit project wiring

Existing `.replit` runs **parallel** workflows:

| Workflow | What |
|----------|------|
| **Redis** | `redis-server --port 6379` (local cache) |
| **API Server** | api-server on `PORT` (8080 typical) |
| **web** | apex-finder Vite / production preview |

**Deployment target:** `autoscale` + `router = application`.

**Safe defaults already in `.replit` `[userenv.shared]`:**
- `ENABLE_AUTO_PIPELINE=false` — do not flip on until operator explicitly wants continuous runs
- `REDIS_URL=redis://localhost:6379`
- `RESEARCH_DEPTH=standard` for research-parity smokes vs a single Grok agent (`fast` is bulk-cheap and can under-dig)

After changing **any** secret: **restart API Server** so provider slot counts refresh (`/api/healthz`).

**Research integrity (do not skip):**
1. Pull latest `main` (free ReAct + full OSINT tool surface + session orientation). See `docs/PRE_REPLIT_GO.md`.
2. Secrets must include **SERPER_API_KEY** + **GROQ_API_KEY** minimum; Tavily, Exa, Gemini, Mistral, NVIDIA, Scrapfly/ZenRows strongly recommended.
3. Set `RESEARCH_DEPTH=standard` (or `deep`) for head-to-head vs plain Grok — `fast` is for bulk cost control.
4. Open status / `GET /api/healthz` — `bureauIntegrity` must be **ok** before Launch.
5. Stale cards: re-cook with `POST /api/ingest/atlas-run` `{ "singleTargetId": <id> }`.


---

## 3. Secrets checklist (Replit Secrets UI)

Map **one secret name → one value**. Never commit values to git.

### Required for boot
| Secret | Purpose |
|--------|---------|
| `DATABASE_URL` | Postgres connection (Replit Postgres or external) |
| `REDIS_URL` | Local/ephemeral cache — usually `redis://localhost:6379` on Replit |
| `REDIS_URL_1` | Upstash permanent #1 (jobs, locks, HNWI index) |
| `REDIS_URL_2` | Upstash #2 (contact cache preferred) |
| `REDIS_URL_3` … `REDIS_URL_5` | Failover when quota exhausted |

### LLM / bureau (Boss + right hand + extract)
| Secret | Purpose |
|--------|---------|
| `GROQ_API_KEY` | Primary fast LLM (also `GROQ_API_KEY_2`… if multi) |
| `GEMINI_API_KEY` | Gemini Boss (add `GEMINI_API_KEY_2`… for rotation) |
| `NVIDIA_NIM_API_KEY` | zAI / NIM case reasoning (right hand) |
| `MISTRAL_API_KEY` | Mistral web-search lane |
| `HF_TOKEN` | Hugging Face / deep research tools |

### Search & web surface
| Secret | Purpose |
|--------|---------|
| `TAVILY_API_KEY` | SERP / discovery (also `_1`… slots) |
| `EXA_API_KEY` / keys as coded | Semantic search |
| `SERPER_API_KEY` | **Critical** — primary agentic ReAct SERP (also python/Maigret) |
| `SCRAPFLY_API_KEY` | JS-rendered page fetch |
| `ZENROWS_API_KEY` | Alternate fetch |
| `WHOISJSON_API_KEY` or `WHOISJSON_KEY` | Domain WHOIS |
| `WHOXY_API_KEY` | Reverse WHOIS |
| `COMPANIES_HOUSE_API_KEY` | UK registry |

### Optional / advanced
| Secret | Purpose |
|--------|---------|
| `PLAYWRIGHT_ENABLED` | `true` only if browser hop is configured |
| `BROWSERLESS_TOKEN` / `BROWSERLESS_CONTENT_URL` | Remote browser |
| `LOG_LEVEL` | `info` default |
| `ENABLE_AUTO_PIPELINE` | **keep `false`** until intentional |

**Operator keys** (paste into Replit Secrets from session handoff; do not put in commits): PAT is for GitHub only — not a Replit runtime secret unless you use deploy-from-git automation.

---

## 4. Backend readiness (pre-flight)

On a running Replit after secrets + restart:

```bash
# Health — providers must show non-zero for groq/gemini/tavily/exa when keys are set
curl -s http://127.0.0.1:8080/api/healthz | jq .

# Expect:
#   status: ok
#   redis.status: ok (or permanent slots connected)
#   registryShallowRisk: false  when Tavily/Exa/Perplexity slots active
#   autoPipeline: false

# Launch pipeline (same as UI button)
curl -s -X POST http://127.0.0.1:8080/api/ingest/atlas-run \
  -H 'content-type: application/json' \
  -d '{"discoveryFirst":true,"researchLimit":5,"skipFaa":true}' | jq .

# Poll
curl -s http://127.0.0.1:8080/api/ingest/atlas-status | jq .
```

**DB schema:**
```bash
pnpm --filter @workspace/db run push
```

**Floors (when tree complete):**
```bash
node scripts/check-trash-phone.mjs
node scripts/check-visibility-floor.mjs
```

---

## 5. Product posture on Replit

1. **Launch Apex Atlas** is the primary control — Overview, header, Reactor.
2. Persona / Duplicate / Jobs tabs need the same `/api` proxy; they enqueue **server** jobs, not browser LLMs.
3. **Apply safe fixes** only mutates allow-listed entity state in Postgres — not git commits.
4. Fail-closed: no invented contacts; org inboxes never Personal; trash-phone gate on.
5. Grok public-surface parity is the **floor**; maximize attributable people-contacts above it.

---

## 6. Common failure modes

| Symptom | Cause | Fix |
|---------|--------|-----|
| `Unexpected token '<'` in UI | `/api` returned HTML | Proxy `/api` → api-server; ensure API workflow is running |
| `registryShallowRisk: true` | No Tavily/Exa/Perplexity | Add secrets + **restart API** |
| Launch 409 | Atlas already running | Open Reactor; or clear lock via API when stuck |
| Jobs idle forever | Redis permanent down / quota | Check REDIS_URL_1…_5; rotate exhausted Upstash DBs |
| Empty DB forever | Never launched / no ingest | Launch Atlas or controlled registry ingest |

---

## 7. Deploy order (operator)

1. Import/sync GitHub `main` into Replit (`llhdeunvad/Wait-Instructions` or current Repl).
2. Provision Postgres → set `DATABASE_URL`.
3. Paste all secrets from §3.
4. Start **Project** workflow (Redis + API + web).
5. `pnpm --filter @workspace/db run push`.
6. `curl /api/healthz` until providers look healthy.
7. UI: **Launch Apex Atlas** → Reactor watch.
8. Keep `ENABLE_AUTO_PIPELINE=false` unless you explicitly want continuous pipeline.

---

*Last aligned with tip including Launch CTA (`4bddba9`) and handoff (`e46c66e`). Update this doc when env names change in code.*
