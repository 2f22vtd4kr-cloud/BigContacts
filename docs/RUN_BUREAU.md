# Run Apex Atlas research / bureau — precise procedure

This is the **only** meaning of:

- “Run Apex Atlas”
- “Start the bureau”
- “Launch research”
- Replit instructions that say to run Atlas

Do **not** invent alternate startups, random scripts, or partial pipelines.

---

## 1. Runtime prerequisites (once per workspace)

1. Branch: `main` at the requested tip commit.
2. Secrets present (names only — values in Replit Secrets):
   - `REDIS_URL` or `REDIS_URL_1`…`REDIS_URL_5` (5 permanent slots)
   - `GROQ_API_KEY`
   - `GEMINI_API_KEY` (Boss)
   - At least one of: `SERPER_API_KEY`, `TAVILY_API_KEY`, `EXA_API_KEY` / `EXA_1` / `EXA_2`
   - Optional but part of full bureau: `MISTRAL_API_KEY`, `NVIDIA_NIM_API_KEY`, `SCRAPFLY_API_KEY`, `ZENROWS_API_KEY`, `COMPANIES_HOUSE_API_KEY`, `HF_TOKEN`
3. Environment:
   - `ENABLE_AUTO_PIPELINE=false` unless the operator explicitly wants continuous mass cycles
   - `DATABASE_URL` = managed Postgres (Replit provides)
4. Install: `pnpm install` (lockfile recovery only if proxy timeout — do not change product deps).
5. Schema: Drizzle push from `lib/db`.
6. Processes:
   - API on **8080**
   - Apex Finder UI on its configured port; **public root serves the desk**; `/api/*` proxies to API
7. Health gate (must pass before research):
   - `GET /api/healthz` → 200
   - Redis connected
   - `lanesHonesty.bureauIntegrity` is not `critical` (or operator acknowledges degraded)

---

## 2. Canonical launch (the research command)

**HTTP only:**

```http
POST /api/ingest/atlas-run
Content-Type: application/json
```

**Body** = `CANONICAL_ATLAS_LAUNCH_BODY` from  
`artifacts/api-server/src/src/lib/atlas-launch-defaults.ts`:

```json
{
  "discoveryFirst": true,
  "targetCount": 50,
  "researchLimit": 10,
  "runResearch": true,
  "hotLeadsOnly": false,
  "skipFaa": true,
  "broadCategories": 3,
  "batchSize": 50,
  "phaseJBatchSize": 10,
  "targetTimeoutMs": 420000
}
```

**Expected response:** `202` with `{ "jobId": "<uuid>", ... }`  
**If already running:** `409` with existing `jobId` — do not start a second pipeline.

**Shell helper (same body):**

```bash
./scripts/run-bureau.sh
# or: ./scripts/run-bureau.sh http://localhost:8080
```

**UI:** Launch Apex Atlas button → same body via `launchAtlasPipeline()` in  
`artifacts/apex-finder/src/lib/launch-atlas.ts`.

---

## 3. While running

- Monitor: `GET /api/ingest/atlas-status` and Reactor desk.
- Architecture in play: discovery → identity/registries → agentic web (multi-LLM ReAct + tools) → OSINT tools (Maigret/Sherlock/Holehe when installed) → Phase J / contact persist → ledger.
- Boss (Gemini) plans/monitors where wired; investigators use tools — **not** a single-model chat session.

---

## 4. Stop

```http
DELETE /api/ingest/atlas-lock
```

Optional: `?jobId=<uuid>`

Or UI **Stop** control (same endpoint).

---

## 5. What this is NOT

| Do not | Why |
|--------|-----|
| Set `ENABLE_AUTO_PIPELINE=true` unless asked | Continuous mass cycles ≠ one bureau run |
| POST empty/random bodies | Defaults must match canonical |
| Run only Phase J / only ingest | Incomplete bureau |
| Seed fake people for demos as “research” | Corrupts ledger |
| Start a second atlas-run while 409 | Single active pipeline |

---

## 6. Replit agent one-liner

After import + secrets + install + schema + both services healthy:

> POST `/api/ingest/atlas-run` with the canonical JSON body above.  
> Poll `/api/ingest/atlas-status` until inactive or operator stops via `DELETE /api/ingest/atlas-lock`.  
> Do not change the body shape or invent another entrypoint.

