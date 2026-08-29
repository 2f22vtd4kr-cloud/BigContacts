# Run Apex Atlas research / bureau — precise procedure

This is the **only** meaning of “Run Apex Atlas”, “Start the bureau”, “Launch research”, or Replit instructions that say to run Atlas.

Do **not** invent alternate startups, random scripts, or partial pipelines.

**Canonical path on Replit (Aug 2026+):** paste **one** prompt — `docs/REPLIT_UPDATE_PROMPT_LATEST.md` — into **Agent inside the BigContacts Replit App / project** (project runtime, not a detached chat).

---

## 0. Product law (do not regress)

- Dig is **free ReAct**: models invent queries and choose actions; tools execute.
- Never add `force_*` hops, GROK-PARITY, ranked prefer-lists, or scripted research playbooks.
- Never invent people, contacts, or URLs. Contacts need real `http(s)` source URLs.
- `bureauIntegrity=critical` → do not claim quality; fix secrets and restart API.
- Scoreboard **proof** = **single-target Dig** (`singleTargetId`), depth `standard`, **not** discovery-first bulk.

---

## 1. Runtime prerequisites (once per app)

1. **Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts · `main` · tip **`42b36b0` or newer** (prefer latest).
2. **Platform:** Replit **App / project** (not legacy “Repl” naming). Funded account with credits.
3. **Postgres:** Provided by Replit (Database tool / default app DB). `DATABASE_URL` is **injected**. Never ask the operator to attach Postgres or paste a Postgres URL.
4. **Redis:** Operator supplies **Upstash** (or equivalent) as Secret `REDIS_URL_1` or `REDIS_URL`.
5. **One API workflow** on `PORT=8080`. Public `/` = desk; `/api` = API. Do not run Frontend as the product entry.
6. **Workflow env (not secrets):**
   ```
   ENABLE_AUTO_PIPELINE=false
   INSTALL_PYTHON_OSINT=false
   PORT=8080
   APEX_SKIP_SEMANTIC=1
   CI=true
   RESEARCH_DEPTH=standard
   NODE_OPTIONS=--max-old-space-size=1536
   ```
7. **Secrets** (names only — never print values):

   **Minimum:** `REDIS_URL_1` (Upstash), dig LLM (`GROQ_API_KEY` / Gemini / Mistral / NVIDIA), search (`SERPER` / `TAVILY` / `EXA`).

   **Full:** `REDIS_URL_1`, `GROQ_API_KEY`, `GEMINI_API_KEY`, `NVIDIA_NIM_API_KEY`, `MISTRAL_API_KEY`, `HF_TOKEN`, `SERPER_API_KEY`, `TAVILY_API_KEY`, `SERPAPI_KEY`, `EXA_API_KEY`, `SCRAPFLY_API_KEY`, `ZENROWS_API_KEY`, `COMPANIES_HOUSE_API_KEY`, `WHOISJSON_API_KEY`

   Aliases: `REDIS_URL`↔`REDIS_URL_1`, `EXA_1`↔`EXA_API_KEY`.  
   Never ask for `DATABASE_URL`, `WHOXY_*`, or `REDIS_URL_2`–`_5`.

8. **Install / build / boot** — see `docs/REPLIT_UPDATE_PROMPT_LATEST.md` (OOM-safe pnpm, lockfile proxy-host rewrite if needed, desk + API build, checks, `replit-boot.sh`, healthz).

---

## 2. Canonical research launch

```http
POST /api/ingest/atlas-run
Content-Type: application/json
```

**Full bureau:** `CANONICAL_ATLAS_LAUNCH_BODY` from `artifacts/api-server/src/src/lib/atlas-launch-defaults.ts`.

**Single-target Dig (scoreboard proof):**
```json
{
  "singleTargetId": 12345,
  "runResearch": true,
  "researchDepth": "standard",
  "targetTimeoutMs": 420000
}
```

Poll `GET /api/ingest/atlas-status` until idle. Rehydrate if needed.  
Scoreboard: `bash scripts/replit-scoreboard-check.sh http://127.0.0.1:8080`

**Empty ledger:** tiny discovery-first seed (1–3 targets) → **stop** → single-target Dig. Never invent entities. Redis quota issues → new Upstash URL in Secrets + API restart.

**Stop:** `DELETE /api/ingest/atlas-lock`

---

## 3. What this is NOT

| Do not | Why |
|--------|-----|
| Ask for DATABASE_URL / “attach Postgres” | Platform injects DB |
| `ENABLE_AUTO_PIPELINE=true` unless asked | Not a one-shot bureau run |
| Discovery-first as scoreboard proof | Proof is single-target Dig |
| Fake people for demos | Corrupts ledger |
| Second app mid-setup | Stay on the GitHub-imported App |
| Detached Agent chat without project env | No injected Postgres / wrong runtime |

---

## 4. Quick verify

```bash
git log -1 --oneline
pnpm run check:no-force-dig && pnpm run check:free-react
curl -sS http://127.0.0.1:8080/api/healthz
bash scripts/replit-scoreboard-check.sh http://127.0.0.1:8080
```
