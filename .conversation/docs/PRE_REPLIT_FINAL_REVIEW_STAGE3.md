# Apex Atlas — Final Review · Stage 3

**Depends on:**  
- Stage 1 — UI/routes/setup (`docs/PRE_REPLIT_FINAL_REVIEW.md`)  
- Stage 2 — pipeline, comparison, go/no-go (`docs/PRE_REPLIT_FINAL_REVIEW_STAGE2.md`) → **S2-J = Go**

**Stage 3 focus:** *first production-shaped deploy and what must stay true after it* — Replit boot acceptance, public URL truth, first real research on the hosted desk, observability, rollback, and the ongoing quality floor so the product does not rot the week after launch.

**Not Stage 3:** redesigning the desk mid-boot; burning quota on prompt experiments; treating “optional” Python tools as acceptable.

Record:
- Stage 2 pass SHA: ________
- Stage 3 deploy SHA: ________
- Replit URL(s): ________

---

## Stage 3 map

| Block | Name | Exit |
|-------|------|------|
| S3-A | Replit boot acceptance | Import → healthz → UI on public URL |
| S3-B | Public surface truth | Same-origin API; mobile not blank |
| S3-C | First hosted research run | Launch → live → Stop on Replit |
| S3-D | Hosted ledger mutations | Delete / bulk on real DB |
| S3-E | Provider & capacity truth | Status matches secrets actually set |
| S3-F | Observability & logs | Can diagnose a failed run without guesswork |
| S3-G | Rollback & recovery | Known path back to last good SHA |
| S3-H | Post-deploy quality floor | Weekly checks that block silent regression |
| S3-I | Product acceptance (operator) | Non-engineer can complete one job |
| S3-J | Stage 3 closeout | Ship note + open P1/P2 only |

---

## S3-A — Replit boot acceptance

### A1 Import
- [ ] Repo: `https://github.com/2f22vtd4kr-cloud/BigContacts` · branch `main` · SHA from S2-J
- [ ] Root contains `package.json`, `pnpm-workspace.yaml`, `artifacts/apex-finder`, `artifacts/api-server`, `lib/db`
- [ ] **Not** sparse (`artifacts/` + `docs/` only)

### A2 Secrets (names only in prompt; values in Replit Secrets)
Required set (no tiers, no “recommended”):
- `REDIS_URL_1` … `REDIS_URL_5`
- `EXA_1`, `EXA_2`
- `GROQ_API_KEY`, `TAVILY_API_KEY`, `SERPAPI_KEY`, `SERPER_API_KEY`
- `GEMINI_API_KEY`, `NVIDIA_NIM_API_KEY`, `MISTRAL_API_KEY`, `HF_TOKEN`
- `SCRAPFLY_API_KEY`, `ZENROWS_API_KEY`
- `COMPANIES_HOUSE_API_KEY`, `WHOISJSON_API_KEY`
- `ENABLE_AUTO_PIPELINE=false`
- `DATABASE_URL` — Replit managed if provided by platform

### A3 Install & process
- [ ] `pnpm install` completes (lockfile metadata fix only if needed — no dependency invention)
- [ ] Schema push succeeds
- [ ] `scripts/install-python-tools.sh` (or documented equivalent) **succeeds** — holehe/maigret/sherlock importable
- [ ] API on `8080`, UI on `23695` (or documented pins)
- [ ] Vite `/api` proxy in dev; production public URL serves SPA **and** `/api/*` from same origin

### A4 Hard fail
| Symptom | Action |
|---------|--------|
| Sparse import | Stop; fix GitHub main; new session |
| Python “non-blocking warning” | Treat as **fail**; install until green |
| healthz not 200 JSON | Stop; fix Redis/DB/env |
| Blank public URL | Fix SPA mount + routing before any research |

---

## S3-B — Public surface truth

On the **no-port / public** Replit URL and on Preview:

| Check | Pass |
|-------|------|
| `/` renders Overview | Not API JSON, not blank |
| `/api/healthz` same origin | 200 JSON |
| Mobile phone open | UI visible (not empty shell) |
| Hard refresh | Still SPA routes (`/reactor`, `/profiles`) |
| Console | No storm of `/api` 404 HTML |

**Screenshots (hosted):** `s3-b-overview-d`, `s3-b-overview-m`, `s3-b-healthz` (response or status page).

---

## S3-C — First hosted research run

1. Confirm auto-pipeline **off**.
2. Launch Apex Atlas from hosted UI.
3. UI shows running + **Stop**.
4. Reactor shows method-aware live steps (not idle forever).
5. Stop once; confirm lock cleared; can Launch again.
6. Cancel any accidental long burn if only validating boot.

**Pass:** full control loop on Replit, not only local Vite.  
**Fail:** job starts but UI never reflects it; or Stop missing; or provider burn with no events.

**Screenshots:** `s3-c-running`, `s3-c-reactor`, `s3-c-stopped`.

---

## S3-D — Hosted ledger mutations

On Replit DB (prefer empty or disposable):
- [ ] Expand mobile card → Delete one row (if any from smoke run)
- [ ] Bulk select → Delete
- [ ] Clear ledger only if acceptable — typed `DELETE ALL ENTITIES`
- [ ] Reload: stays empty / consistent

**Fail:** UI says deleted, row returns; or purge without phrase.

---

## S3-E — Provider & capacity truth

`/status` (and healthz) must match Secrets:
- [ ] Five Redis slots represented correctly (configured vs active)
- [ ] Two Exa keys visible as configured when set
- [ ] Missing optional legacy keys (e.g. WHOXY) **not** required for green research
- [ ] Zero active search + zero LLM ≠ “ready to research”

---

## S3-F — Observability & logs

Operator can answer without guessing:
1. Is a job active? (jobs page / atlas-status)
2. Which provider failed last? (logs / status degraded)
3. Did Redis accept the job id?
4. Did the run stop from UI Stop?

**Minimum log hygiene**
- [ ] No full API keys in log lines
- [ ] Job id present on start/complete/fail
- [ ] Python tool failures explicit if footprint lane runs

---

## S3-G — Rollback & recovery

Document in review log:
| Item | Value |
|------|--------|
| Last known good SHA | |
| Replit: how to pin/redeploy that SHA | |
| DB: backup or accept wipe for dev | |
| Redis: job lock clear command / `DELETE atlas-lock` | |

**Drill (once):** pretend bad deploy → redeploy previous SHA → healthz green.

---

## S3-H — Post-deploy quality floor (ongoing)

Run on a cadence (e.g. weekly or before any big demo):

| Check | Method |
|-------|--------|
| Empty cold boot | Fresh view: no demo people |
| Launch/Stop | One short smoke job |
| Trash sample | Spot-check latest contacts |
| Traffic lights | Still absent on reactor |
| Comparison sample | Optional: one fair target vs Grok if research quality drifts |
| Git main | Still full workspace, not sparse |

Any fail → treat as regression P0/P1; do not “fix only on Replit” without `main` commit.

---

## S3-I — Product acceptance (operator POV)

Hand the hosted URL to someone who did not build it (or simulate):

| Task | Success |
|------|---------|
| Open desk | Understands Overview in &lt; 30s |
| Launch research | Finds Launch; sees running |
| Watch reactor | Understands something is searching/fetching/extracting |
| Open ledger | Sees people/companies or honest empty |
| Stop run | Finds Stop |
| Delete a row | Mobile or desktop without asking eng |

If they need a 20-minute explanation to Launch, Stage 1 copy/IA is not done — **P1** before calling the product “shipped”.

---

## S3-J — Stage 3 closeout

### Ship note (template)
```
Apex Atlas hosted acceptance
SHA: ...
URL: ...
healthz: OK
Launch/Stop: OK
Reactor live: OK
Ledger mutate: OK
Python tools: OK
Auto-pipeline: OFF
Open P1: ...
Open P2: ...
```

### Allowed after closeout
- Real research usage
- Measured UI polish on `main` with screenshots
- Provider capacity adds (more Redis/Exa) via Secrets only

### Not allowed after closeout without new review
- Re-enabling mass auto-pipeline without budget controls
- Shipping synthetic seed data “for demo”
- Replit-only hacks not committed to `main`

---

## Stage 3 screenshot index

```
screenshots/final-review/stage3/
  s3-b-overview-d.png
  s3-b-overview-m.png
  s3-c-running.png
  s3-c-reactor.png
  s3-c-stopped.png
  s3-d-ledger.png
  s3-e-status.png
```

---

## How the three stages fit

| Stage | Question |
|-------|----------|
| **1** | Can we run and see a coherent black/gold desk on every route? |
| **2** | Does research quality, deletes, and fair comparison justify deploy? |
| **3** | Does the **hosted** product boot, run, stop, and stay operable without eng babysitting? |

---

## After Stage 3

Product is in **operated** state, not “prompt theater”.  
Next work is normal product iteration on `main` + Secrets — not another from-zero Replit philosophy rewrite unless import architecture changes.
