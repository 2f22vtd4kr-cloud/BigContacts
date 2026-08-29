# Run Apex Atlas research / bureau — precise procedure

This is the **only** meaning of:

- “Run Apex Atlas”
- “Start the bureau”
- “Launch research”
- Replit instructions that say to run Atlas

Do **not** invent alternate startups, random scripts, or partial pipelines.

**Canonical operator path on Replit:**
1. Create Repl **from GitHub** (`2f22vtd4kr-cloud/BigContacts`, `main`) on an account **with credits**.
2. Attach Postgres · set Secrets · open Agent **inside that Repl**.
3. Paste **one** prompt — the fenced block in `docs/REPLIT_UPDATE_PROMPT_LATEST.md`.

Everything below is the same procedure expanded for humans and Shell. Do not run from a detached chat sandbox.

---

## 0. Product law (do not regress)

- Dig is **free ReAct**: models invent queries and choose actions; tools execute.
- Never add `force_*` hops, GROK-PARITY, ranked prefer-lists, or scripted research playbooks.
- Never invent people, contacts, or URLs. Contacts need real `http(s)` source URLs.
- `bureauIntegrity=critical` → do not claim quality; fix secrets and restart API.
- Scoreboard **proof** = **single-target Dig** (`singleTargetId`), depth `standard`, **not** discovery-first bulk.

---

## 1. Runtime prerequisites (once per workspace)

1. **Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts · branch `main` · tip **`42b36b0` or newer** (Batch 10 build repair).
2. **Postgres** attached to the Repl. `DATABASE_URL` is injected by Replit — **never** ask for it, paste it, or store it as a Secret.
3. **One workflow only:** API Server on `PORT=8080`. Do **not** start Frontend / apex-finder dev server. Public `/` = desk; `/api` = API.
4. **Workflow env (not secrets):**
   ```
   ENABLE_AUTO_PIPELINE=false
   INSTALL_PYTHON_OSINT=false
   PORT=8080
   APEX_SKIP_SEMANTIC=1
   CI=true
   RESEARCH_DEPTH=standard
   NODE_OPTIONS=--max-old-space-size=1536
   ```
5. **Secrets** (Replit Secrets UI — never print values):

   **Minimum for non-critical integrity**
   - Redis: `REDIS_URL_1` or `REDIS_URL`
   - Search (≥1): `SERPER_API_KEY` / `TAVILY_API_KEY` / `EXA_API_KEY`
   - Dig LLM (≥1): `GROQ_API_KEY` / `GEMINI_API_KEY` / `MISTRAL_API_KEY` / `NVIDIA_NIM_API_KEY`

   **Full list**
   `REDIS_URL_1`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `NVIDIA_NIM_API_KEY`, `MISTRAL_API_KEY`, `HF_TOKEN`, `SERPER_API_KEY`, `TAVILY_API_KEY`, `SERPAPI_KEY`, `EXA_API_KEY`, `SCRAPFLY_API_KEY`, `ZENROWS_API_KEY`, `COMPANIES_HOUSE_API_KEY`, `WHOISJSON_API_KEY`

   Aliases: `REDIS_URL`↔`REDIS_URL_1`, `EXA_1`↔`EXA_API_KEY`.  
   Do **not** ask for `WHOXY_*` or `REDIS_URL_2`–`_5`.

6. **Install (OOM-safe; Replit-hardened)**
   ```bash
   git fetch origin main && git checkout main && git pull origin main
   git log -1 --oneline   # must be 42b36b0+

   export NODE_OPTIONS=--max-old-space-size=1536
   export NPM_CONFIG_REGISTRY=https://registry.npmjs.org
   pnpm config set registry https://registry.npmjs.org
   pnpm config set network-timeout 600000

   # If lockfile tarball URLs point at an internal proxy (e.g. http://35.245.43.102/npm/...),
   # rewrite ONLY those hosts to https://registry.npmjs.org/ — do not change package names/versions.
   # Then:
   pnpm install --no-frozen-lockfile --registry=https://registry.npmjs.org \
     --child-concurrency 1 --network-concurrency 1 --fetch-retries 5 --fetch-timeout 600000
   ```
   Exit 137 = OOM → retry once with same flags. Do not strip dependencies.

7. **Schema + builds**
   ```bash
   pnpm --filter @workspace/db run push
   pnpm --dir artifacts/apex-finder run build
   test -f artifacts/apex-finder/dist/public/index.html
   pnpm --dir artifacts/api-server run build
   pnpm run check:no-force-dig
   pnpm run check:free-react
   ```

8. **Boot**
   ```bash
   ENABLE_AUTO_PIPELINE=false RESEARCH_DEPTH=standard bash scripts/replit-boot.sh
   curl -sS http://127.0.0.1:8080/api/healthz
   ```
   Report only: status, redis, `bureauIntegrity`. If **critical** → stop; fix secrets offline; restart API.

9. **Preview**  
   This Repl’s public URL at **`/`** (hard refresh). Desk must be non-blank (Entities / Profile / Reactor, Dig contacts).  
   Old “ApexFinder Pro” artifacts are **not** current.

---

## 2. Canonical research launch

**HTTP only:**

```http
POST /api/ingest/atlas-run
Content-Type: application/json
```

**Full bureau** body = `CANONICAL_ATLAS_LAUNCH_BODY` from  
`artifacts/api-server/src/src/lib/atlas-launch-defaults.ts`.

**Single-target Dig (scoreboard proof):**

```json
{
  "singleTargetId": 12345,
  "runResearch": true,
  "researchDepth": "standard",
  "targetTimeoutMs": 420000
}
```

- Forces `discoveryFirst: false` for that id.
- Expected: `202` + `jobId`. Already running → `409` (do not start a second job).
- Poll `GET /api/ingest/atlas-status` until idle.
- Empty card after dig: `POST /api/entities/rehydrate-contacts` `{"entityId": 12345}`.
- Scoreboard: `bash scripts/replit-scoreboard-check.sh http://127.0.0.1:8080`

**Empty ledger:** run a **tiny** discovery-first seed only to create 1–3 entities (`targetCount`/`researchLimit` small, `skipFaa: true`), then **stop** (`DELETE /api/ingest/atlas-lock`) and run single-target Dig on a real id. Never invent entities or contacts. If Redis reports **quota exhausted**, replace `REDIS_URL_1` and restart API before digging.

**Shell helper:** `./scripts/run-bureau.sh` (canonical body).  
**UI:** Launch Apex Atlas → same body via `launchAtlasPipeline()`.

---

## 3. While running

- Monitor: `GET /api/ingest/atlas-status` and Reactor desk.
- Architecture: discovery → identity/registries → **agentic free ReAct dig** → OSINT tools → Phase J / contact persist → ledger.
- Boss plans; dig models choose tool actions — not a fixed hop script.

---

## 4. Stop

```http
DELETE /api/ingest/atlas-lock
```

Or UI **Stop**. Optional `?jobId=<uuid>`.

---

## 5. What this is NOT

| Do not | Why |
|--------|-----|
| `ENABLE_AUTO_PIPELINE=true` unless asked | Continuous mass cycles ≠ one bureau run |
| POST empty/random bodies | Use canonical or documented single-target body |
| Discovery-first as scoreboard proof | Proof is single-target Dig |
| Seed fake people for demos | Corrupts ledger |
| Second atlas-run while 409 | Single active pipeline |
| Ask for DATABASE_URL / WHOXY / REDIS_URL_2+ | Not operator Secrets |
| Create a second Repl mid-setup | Stay on the GitHub-imported BigContacts Repl |
| Run only from detached Agent chat | Needs project Shell/workflow with injected Postgres |

---

## 6. Quick verify

```bash
git log -1 --oneline
pnpm run check:no-force-dig
pnpm run check:free-react
curl -sS http://127.0.0.1:8080/api/healthz
bash scripts/replit-scoreboard-check.sh http://127.0.0.1:8080
```
