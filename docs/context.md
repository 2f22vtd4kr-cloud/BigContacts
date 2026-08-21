# Context — living handoff (Apex Atlas / BigContacts)

**Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts · **Branch:** `main`  
**Product:** Apex Atlas research bureau (NOT Steam “Atlas Reactor”, NOT physics ATLAS).

## Prep for next Replit run (2026-08-21)

**Current tip:** pending — FREE_REACT=6 + NVIDIA model list  
**Prior tip:** `23d965c` — Exa chain + gate early forceVisit starvation

### Tip chain (bureau research integrity)
| Commit | Point |
|--------|--------|
| `02759c3` | apex-runtime agentic off dead Llama 3.3; GROQ_CHAT_MODELS rotation |
| `ebf53c8` | runtime groq-models.ts shared list |
| `00eded5` | Overnight script off Llama 3.3 70B |
| *(this)* | FREE_REACT_STEPS=5; MAX_ITER 20; force-hops deferred; pass default 18 |

### Why single Grok previously beat the bureau
Force-hop blocks ran *before* free ReAct each iteration and burned the 12–14 step budget.
Models never got enough free turns to dig. Fix: first 5 steps are free multi-LLM ReAct only;
force-hops fill gaps after. Keys (Serper + Groq + Tavily/Exa + browsers) must be set or
bureauIntegrity goes critical and you are comparing a crippled desk to a full agent.

### Philosophy (do not regress)
- **No LLM funneling** — ReAct, not GROK-PARITY playbooks / force-hops.
- **Tool-side facts** — SEC notice phones, Form 3/4 addresses, deceased probe = extractors, not model babysitting.
- **Losing to one web agent on public SEC surface = severity bug.**
- **LLMs decide relatedness and card content** — no forced playbooks; fail-closed admission only on exact evidence values.

### Known gaps still open
1. **Re-cook path** — documented: `POST /api/ingest/atlas-run` with `{ "singleTargetId": <id> }` re-runs full-circle (incl. EDGAR notice-phone boost). See `docs/RUN_BUREAU.md` §7. Or delete stale card + rediscover.
2. Desktop reactor density (graph + inspector + scene cards) — still usable but can feel busy.
3. Mobile header a11y may concatenate chip labels; visual chips already use shortLabel + · + DB.
4. Perplexity optional (0 keys OK); healthz-backed — never paint LIVE with 0 slots.
5. Full monorepo boot in ephemeral sandbox is unreliable — **Replit is acceptance environment**.

### Replit secrets (exact names the code reads)
| Secret | Required for parity |
|--------|---------------------|
| `REDIS_URL_1` … `REDIS_URL_5` | Yes (5 permanent Upstash slots) |
| `GROQ_API_KEY` | Yes — preferred ReAct lane |
| `SERPER_API_KEY` | Yes — agentic SERP (without it, integrity → critical) |
| `GEMINI_API_KEY` | Strongly recommended (Boss + agentic fallback) |
| `MISTRAL_API_KEY` | Recommended agentic fallback |
| `NVIDIA_NIM_API_KEY` or `NVIDIA_API_KEY` | Recommended agentic fallback |
| `TAVILY_API_KEY` | Recommended (broad discovery / integrity web count) |
| `EXA_API_KEY` or `EXA_1` + `EXA_2` | Recommended |
| `SCRAPFLY_API_KEY` | Recommended browser escalate |
| `ZENROWS_API_KEY` | Recommended browser escalate |
| `COMPANIES_HOUSE_API_KEY` | UK surface |
| `WHOISJSON_API_KEY` | Domain surface |
| `HF_TOKEN` | Python/deep tools |
| `DATABASE_URL` | Managed Postgres |
| `ENABLE_AUTO_PIPELINE` | `false` |

Optional: `SERPAPI_API_KEY`, `PERPLEXITY_API_KEY` (0 keys OK — never paint LIVE).  
Public URL must serve desk HTML; API `/api/*`; dist at `apex-finder/dist/public`.

### Boot gate (do not research until green)
1. `GET /api/health` or status page — `bureauIntegrity` = **ok**
2. Serper + ≥1 agentic LLM slot configured
3. Only then smoke a hard target vs the same brief in plain Grok


### Research parity checklist (vs single Grok agent)
1. Pull tip ≥ `23d965c` (prefer latest main).
2. Secrets: SERPER + TAVILY + EXA + GROQ minimum; Gemini/Mistral/NVIDIA preferred.
3. Scrapfly or ZenRows for CF/social shells.
4. Status: `bureauIntegrity=ok` (Serper counted + ≥1 agentic LLM slot).
5. Smoke the same brief you would give plain Grok; compare contact surface, not UI polish.
6. Re-cook stale cards: `POST /api/ingest/atlas-run` with `{ "singleTargetId": <id> }`.


### Canonical run
`docs/RUN_BUREAU.md` · POST `/api/ingest/atlas-run` with `CANONICAL_ATLAS_LAUNCH_BODY`.  
Pause/Resume/Stop: atlas-pause, atlas-resume, DELETE atlas-lock.

### Acceptance checklist (next clean Replit boot)
1. Pull tip, set secrets, `ENABLE_AUTO_PIPELINE=false`.
2. Clear ledger (or delete stale cards that still hold issuer switchboard phones).
3. Bounded discovery-first smoke → Gund / Feinberg / Pearl-class targets.
4. Confirm notice-line phones land as `EDGAR-Notice-Phone` / direct_contact_candidate.
5. Reactor: plain spoken "Now:" steps, no "PAUSED 7s", no fake Perplexity LIVE, spaced header Pause/Resume.
6. Launch CTA: gasoline-spill iridescent, readable etched type, no heavy drop-shadow.

---


### LLM card promotion (2026-08-21)
Final target review is LLM-controlled: the model evaluates whether findings are related to the HNWI (contacts, addresses, roles, related orgs) and writes cardSummary, roleHeadline, and relatedDescriptions. Adjudication still fail-closed (exact values only from candidates/evidence — no invention). Tip: 4684c92.

### Canonical bureau run
See **docs/RUN_BUREAU.md**. "Run Apex Atlas / bureau" = POST `/api/ingest/atlas-run` with `CANONICAL_ATLAS_LAUNCH_BODY` (`atlas-launch-defaults.ts`). UI + `scripts/run-bureau.sh` match. ENABLE_AUTO_PIPELINE stays false unless explicitly requested.

### Prompt philosophy (2026-08-20)
Agentic loop is ReAct, not a playbook. Do not micro-manage trained models with GROK-PARITY checklists or force-hop done-gates. Place models + tools correctly; let them research. Deterministic extractors on visited HTML are tool output, not model training.

### Correction (2026-08-20)
Comparing a stripped agentic-only script to full Grok Agent was invalid.
Full Apex = multi-LLM ReAct + Boss/Gemini + Serper/Tavily/Exa + Scrapfly/ZenRows + Maigret/Sherlock/Holehe + EDGAR + registries.
Losing to one model is a severity bug. Agentic IR/related extraction + done-gate tightened so public IR surface cannot be left on the table.

# Context — living handoff


### Local comparison 2026-08-20 (new Groq key)
Standalone agentic lane (post model migration): Ian McDonald / Bright Minds and Eric Ashleman / IDEX.
Apex ≥ plain; Ashleman Apex wins on company email provenance + address + SEC. See docs/comparisons/COMPARE_2026-08-20_NEW_TARGETS.md.
Monorepo full boot still blocked by ephemeral sandbox (pnpm mid-install reset).

## Session 2026-08-20 (bureau integrity + multi-LLM failover)

### Groq model migration (2026-08-20)
Groq decommissioned **Llama 3.3 70B Versatile** on **2026-08-16**. This key only serves:
`openai/gpt-oss-120b`, `qwen/qwen3.6-27b`, `openai/gpt-oss-20b` (+ compound/whisper).
Canonical list: `artifacts/api-server/src/src/lib/groq-models.ts`. All hard-coded
`llama-3.3-70b-versatile` call sites migrated. Primary = GPT OSS 120B; fallbacks = Qwen3.6 27B, GPT OSS 20B.

- **- **Serper** counts toward webSearchActive (agentic SERP primary). `/api/system/status` includes `lanesHonesty` + `bureauIntegrity`.
Deterministic recovery:** if all agentic LLMs fail mid-loop, SERP+visit+proxy extract still run (no silent empty bureau).
- **System status** page shows the same integrity panel as the global banner.


**Tip:** `main` — multi-LLM agentic failover + bureau integrity banner (this commit).

### Why Apex "lost" vs Replit/Grok Agent (not a month of regressions)
1. **Groq model hard-coded** to `llama-3.3-70b-versatile` which this API key cannot use → agentic ReAct control plane dead. Fixed: model fallback + **Mistral + Gemini + NVIDIA** chain (`agentic-web-research.ts`).
2. **Visit loop** did not structure SEC proxy role/related people → zero findings. Fixed: `findingsFromProxyPage`, skip repeat visits, DEF14A URL rank 1, `edgar-identity-boost`.
3. **180s target timeout** → `timeout_review` before tools finished. Fixed: 420s.
4. **Duplicates / domain pollution** — DB name dedupe + sanitizeValue.

### Architecture reminder (Apex = agent on steroids)
- Agentic ReAct (multi-LLM) + forced SERP/visit + EDGAR/proxy deterministic extract + registries + domain surface + fail-closed admission.
- If that stack is **misconfigured**, Apex can look *worse* than a plain Grok/Perplexity/Replit agent. That is a **bureau integrity critical**, not an acceptable product state.

### Operator signal
- `lanesHonesty.bureauIntegrity`: `ok` | `degraded` | `critical`
- Reasons when web search = 0, agentic LLM slots = 0, or last agentic step failed all providers
- UI: `BureauIntegrityBanner` under header (dismissible) → System status / Reactor

### Keys / Replit
- 5 Redis, 2 Exa; ENABLE_AUTO_PIPELINE=false; no fake seed data
- Redeploy tip, clear ledger, one bounded run, re-score CT-001

### Commits this arc
- `61da994` edgar boost + timeout + dedupe
- `9ed5788` reactor story/links feed
- `f8bb80a` Groq model fallback
- `4c002e6` proxy extract + visit rank
- `b038e5c` Gemini 2.5 denylist
- *(this)* multi-LLM agentic + bureau integrity UI

---


(See also docs/archive/Context.md for full history.)
