# Final pre-Replit review

**SHA:** `42e19bb` (update after this commit)  
**Date:** 2026-08-18  
**Scope:** Full readiness check **without** live Grok comparison runs.  
**Hard rule:** Research architecture (agentic / orchestrator / validation) left intact.

---

## 1. Verdict

| Decision | Scope |
|----------|--------|
| **GO for Replit import + boot** | Monorepo structure, `.replit`, deploy docs, UI offline behaviour, Launch/Stop contract, empty mock seeds |
| **GO for research only after** | Secrets wired → schema → Python OSINT tools → `healthz` green → one short atlas-run → **Stop** (cancel burn) |

This sandbox could not keep a durable Postgres + linked `pnpm` api-server process; Replit supplies `DATABASE_URL` and a normal FS.

---

## 2. Monorepo / import surface

| Path | Present |
|------|---------|
| `package.json` + `pnpm-workspace.yaml` | Yes |
| `.replit` + `replit.md` | Yes |
| `artifacts/apex-finder` (UI) | Yes |
| `artifacts/api-server` (API) | Yes |
| `lib/db` (Drizzle) | Yes |
| Root not sparse-mirror only | Yes — full workspace on `main` |

**Import:** `https://github.com/2f22vtd4kr-cloud/BigContacts` branch **`main`**.

**`.replit` highlights:**
- Nix: `nodejs-20`, `postgresql-16`
- `ENABLE_AUTO_PIPELINE=false` (keep until you intentionally enable continuous runs)
- Parallel workflows: API Server + apex-finder web
- Ports: API **8080**, UI **23695**
- Deployment: application router; production run starts api-server

---

## 3. Research stack integrity (do not “clean up”)

| Module | Role | Review |
|--------|------|--------|
| `agentic-web-research.ts` | ReAct + CONTACT FACTS | Intact |
| `atlas-orchestrator.ts` | 10-phase pipeline | Intact |
| `contact-validation.ts` | Trash / placeholder gates | Intact |
| `bureau-contact-persist` / `presented-contacts` | Persist filters | Intact |
| `routes/atlas.ts` | Launch / Stop / status | Intact |
| Investigator prompts | Grok-is-floor, refuse-done | Intact |

**Do not** refactor these on first Replit boot unless a live job proves a bug.

---

## 4. API contracts the UI depends on

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/healthz` | Boot check |
| POST | `/api/ingest/atlas-run` | Launch (202 + jobId; 409 if running) |
| DELETE | `/api/ingest/atlas-lock` (+ optional jobId) | Stop |
| GET | `/api/ingest/atlas-status` | Launch→Stop UI state |
| POST | `/api/entities/bulk-delete` | Multi-select delete |
| POST | `/api/entities/purge-all` | Clear ledger (typed confirm) |
| DELETE | `/api/entities/:id` | Per-card delete |

UI uses **`readApiJson`** widely so SPA HTML mistaken for JSON does not crash tabs.

**Hard deploy rule:** `/api` must hit api-server (proxy or same-origin SPA). HTML on `/api/*` = broken desk.

---

## 5. UI / product surface (static + prior Vite pass)

| Check | Result |
|-------|--------|
| `MOCK_ENTITIES = []` | Pass — no fake people seed |
| Method chrome (not traffic lights) | Pass |
| Launch on Overview / Reactor / header (non-home) | Pass |
| Launch → Stop via `stopAtlasPipeline` | Pass |
| Clear ledger + bulk delete API | Pass |
| Black/gold system | Pass (recent score/chip gold fixes) |
| Offline banners (status, ledger, overview) | Pass — fail closed, readable |
| Keys OFF / Workspace OFFLINE when API down | Pass |

Prior live Vite screenshots (Overview, Reactor, Ledger, Status, Activity) matched this.

---

## 6. Secrets map (names only — values in Replit Secrets)

**Platform:** `DATABASE_URL` (managed Postgres).

**Redis (5 Upstash + local):**
- `REDIS_URL` → Replit local `redis://localhost:6379` (or omit if only Upstash)
- `REDIS_URL_1` … `REDIS_URL_5`

**LLM / bureau:**
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `NVIDIA_NIM_API_KEY`
- `MISTRAL_API_KEY`
- `HF_TOKEN`

**Search / fetch:**
- `TAVILY_API_KEY`
- `EXA_1`, `EXA_2` (and `EXA_API_KEY` if code reads it)
- `SERPAPI_KEY`
- `SERPER_API_KEY`
- `SCRAPFLY_API_KEY`
- `ZENROWS_API_KEY`
- `COMPANIES_HOUSE_API_KEY`
- `WHOISJSON_API_KEY`

**Ops:**
- `ENABLE_AUTO_PIPELINE=false`

Whoxy is **not** required for boot (legacy). Do not commit secret values.

**PAT (GitHub):** Verified full `repo` (and more) scopes — fine for push/import; not an app runtime secret.

---

## 7. Boot sequence (operator)

1. Import `main` → confirm root `package.json` + workspace packages present.  
2. Add Secrets (section 6).  
3. `pnpm install` (if lockfile proxy issues: install without rewriting product deps).  
4. Drizzle schema push (`lib/db`).  
5. **Install Python OSINT tools** (holehe/maigret/etc.) — treat failure as **blocking**, not “optional warning”.  
6. Start API + UI workflows.  
7. `GET /api/healthz` → 200; Redis connected; providers show keyed slots.  
8. Open UI root (same-origin `/api`).  
9. **Launch** once → job 202 → reactor activity → **Stop** → confirm idle.  
10. Cancel any leftover job so keys are not burned.

---

## 8. Known non-blockers / watch items

| Item | Notes |
|------|--------|
| Dense reactor graph | By design; live desk panel is the primary “now” surface |
| Key pool UI EMPTY until secrets + API restart | Expected |
| Persona / improve loops | Need API; not a cold-boot blocker |
| Graph needs `react-force-graph-2d` | Already in finder deps historically; restore if missing after install |
| SPA on port 80 vs API | Prior Replit sessions needed root SPA + `/api` same origin — verify on first preview |

---

## 9. Explicit non-goals of this review

- No live atlas-run in this document’s environment  
- No Grok vs Apex numeric comparison this pass  
- No research-pipeline refactors  

---

## 10. Go / no-go checklist (print for Replit day)

- [ ] `main` import shows monorepo roots  
- [ ] All section-6 secrets set; auto-pipeline **false**  
- [ ] `pnpm install` completes  
- [ ] Schema applied  
- [ ] Python OSINT tools installed  
- [ ] `healthz` green  
- [ ] UI loads black/gold desk, no fake entities  
- [ ] Launch → running → Stop works once  
- [ ] No continuous burn left on  

**Sign-off:** Ready to **launch on Replit** for boot + first controlled run. Research quality proof remains a short post-boot job, not a rewrite.
