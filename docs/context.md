# Context — living handoff (Apex Atlas / BigContacts)

**Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts · **Branch:** `main`  
**Current tip:** `8c299e9` (poll/Redis/graph TDZ on origin)
**API build entry:** `artifacts/api-server/src/src` (esbuild). Top-level `src/lib` is a thin scaffold — do not edit it for research logic.  
**Desk package name:** `apex-finder-local` — build with `pnpm --dir artifacts/apex-finder run build` (not `@workspace/apex-finder`).  
**Product:** Apex Atlas research bureau (NOT Steam “Atlas Reactor”, NOT physics ATLAS).

---

## Non-negotiable rules (product law)

These are operator + agent law. Do not regress.

### What Apex is
| Rule | Meaning |
|------|---------|
| **AI-driven bureau** | Trained models research like a strong general agent (e.g. “do one cycle of what Apex does”). Tools execute; models decide. |
| **Goal** | Real, publicly documented contact routes to HNWIs / principals / operators / orgs — with **exact source URLs**. Never invent people, contacts, or relationships. |
| **Cold start** | Every LLM call is memory-less. **`apex-bureau-orientation.ts`** injects product identity, goal, role, and tool surface into Boss, right-hand, investigators, and dig agents **every time**. |
| **Boss** | **Gemini only** — plan / assign / final card gate. |
| **Right-hand** | **NVIDIA** — free step advice + Reactor live narration (not final-card mix-up). |
| **Dig capacity** | Groq → Mistral → Gemini → NVIDIA failover — **not** the Boss. |
| **Tools** | Serper/Tavily/Exa, visit, Scrapfly/ZenRows, Holehe, Maigret, Sherlock, harvest, domain/RDAP, registries (EDGAR, CH, …). Model **chooses** when to use them. **No Whoxy.** |
| **Discovery ≠ dig** | Discovery admits targets. Dig researches a locked person. Discovery must not block forever on pre-run cross-ref theater. |
| **Card is the answer** | Dig findings **persist + promote** to `entities.phone` / `email` / `linkedin` / `contactOutcome`. Evidence bag is provenance, not the only landing place. |
| **Fail-closed** | No synthetic contacts. Trash hosts / asset filenames / school mails rejected as validation — not as “training the model how to research.” |
| **Integrity** | `bureauIntegrity` critical (0 search or 0 dig LLM) → do not pretend research is healthy. |

### What Apex is not
| Forbidden | Why |
|-----------|-----|
| **Force-hop / playbook dig** | `force_*` search machines, fixed “6 dig steps,” GROK-PARITY checklists |
| **Micro-training models** | Ranked prefer lists, IR-agency penalty tables, “local-part must match name,” hard 1-800 reject playbooks in dig objectives |
| **Pipeline as the brain** | OCCRP / OpenSky / CH are **tools/sources**, not a substitute for free model research |
| **Issuer clobber** | EDGAR switchboard must not overwrite `agentic-web` phones |
| **Auto-pipeline by default** | `ENABLE_AUTO_PIPELINE=false` unless operator explicitly enables |
| **Five Redis on free Upstash** | Prefer **one** `REDIS_URL_1` — status polls burned 500k commands on empty data |
| **Frontend on port 8080** | API-only public preview; Frontend collides with API |

### Free research contract
- **Agentic ReAct:** model chooses every `web_search` / `visit` / OSINT tool / `done`.
- **Target contact agent:** runs first per person; competing parallel digs **skip** when the card is already filled.
- **Done:** soft-reject only on pure no-op (0 search, 0 visit, 0 findings). Auto-extracted CONTACT FACTS count.
- **Adaptive:** Gemini Boss → NVIDIA right-hand → capacity fallback → **stop** (no rules dig ladder).
- **Det recovery:** only when **all** dig LLMs fail a step.
- **Golden standard** = evidence quality bar (primary sources, exact URLs) — **not** a mandate to re-add force templates.

### Replit ops (hard-won)
| Rule | Detail |
|------|--------|
| Preview | **`/`** desk from API `dist` — never preview **`/api`** |
| Workflow | **API Server only** on **8080** for public desk |
| Build desk | `pnpm --dir artifacts/apex-finder run build` |
| Build API | `pnpm --dir artifacts/api-server run build` |
| npm | Prefer **public registry.npmjs.org** first (Replit proxy times out) |
| After secrets | **Continue** install → build → run — do not stop |
| After acceptance | **END** agent — no curl loops, no React archaeology |
| Launch gate | `bureauIntegrity` not critical; Redis connected; stop zombies first |

---

## Since last context update (2026-08-22 evening → 2026-08-23)

### Research / bureau
| Tip | Change |
|-----|--------|
| `ee28ca1` | **Reverted** dig micro-training (name-match email boost, IR-agency penalties, ranked prefer objective) |
| `717e00d` | **Reverted** hard 1-800 reject playbook — model judgment |
| `7efcea8`+ | Target contact agent owns dig → card; skip parallel AI OSINT / secondary dig when card ready |
| `04bfbba` | **Phase 0 hang:** skip OCCRP/OpenSky/CH pre-run when **ledger empty**; 45s timeout per Phase 0 sub-task; OpenSky loads aviation assets first (no global ADS-B if none) |
| `5bcb494` | School/k12/edu email reject (Nelson High collision); status Redis caches; type floor |
| `20c850e` | Redis key TTLs (contact cache 90d) for eviction-friendly keys |
| `eb87ebf` | healthz Redis **PING cache** (30s ok) — stop burning free-tier commands |
| Live tests | Tang Yan / S Joseph Moore / Klein: free dig **can** run; card quality still the scoreboard (collision/IR/org paths) |

### UI / Reactor
| Tip | Change |
|-----|--------|
| `b1f27ca` | Stop “Window N of 6” / fixed dig step-count language |
| `cb3c250` / `37153c4` / `b402fbd` | Readable type floor; collapsible desktop nav; full UX audit items |
| `c26a664` | Scheme labels **13–15px** + scale floor **0.82**; Live Desk **closed when idle**; edge nav **ghost until mouse near left edge** |
| `43234fe` | Live Desk **single-column** compact; mobile Launch **readable type** on oil |
| `fd50650` | Kill mobile **glass stack**; healthz-first keys; **Phase N** not N/10 |
| `51d7beb` / `7c25f6c` | Replit: API-only workflow; no auto-resume when pipeline off; skip Python OSINT unless flagged |

### Docs / plans
| Doc | Purpose |
|-----|---------|
| `docs/POST_TEST_BUG_PLAN.md` | Idle+researching, step counts, collision cards, garbage email |
| `docs/LIVE_TEST_OBSERVATIONS_2026-08-23.md` | Phase 0 stuck + Reactor UI notes |
| `docs/UX_FULL_AUDIT.md` / `FINAL_OVERALL_AUDIT.md` | Desk audit |
| `docs/REPLIT_FROM_ZERO_PROMPT.md` | From-zero agent prompt (keep tip current) |

### Still open (honest)
| Gap | Notes |
|-----|--------|
| **Discovery still pipeline-shaped** | Atlas Phase 1 uses shuffled broad categories + registry batches — not fully Boss-led “choose next HNWI surface like a free agent.” Dig is freer than discovery. |
| **Card quality** | Dig can run (Serper/visit) and still leave **empty cards** if extraction/promote filters strip org routes. 2026-08-24 live: Congdon/Gund/Icahn = evidence_only, no phone/email. Independent research finds **org-route** public vectors (ODFL HQ 336-889-5000, IEP IR 1-800-255-2737, Gund foundation Princeton address). Promote must land org switchboard as `organization_contact`, not discard generics. |
| **Desk honesty** | UI tips `43234fe`/`fd50650` fix glass stack, KEYS OFF, Phase N/10 — **must rebuild on Replit**. Host was down (404 “Run this app”) mid-session. |
| **Network graph** | LIVE-02: `Cannot access 'E' before initialization` on `/network`. |

### Apex test run vs independent research (2026-08-24) — same targets

**Method**
- **Apex:** last Replit dig (agentic-web + target-contact-agent) on Congdon / Gund / Icahn; cards left empty / `evidence_only`.
- **This chat (Grok):** open web search only — same public web surface, no private data, no invention.

**Scoreboard (honest)**

| Dimension | Apex last run | Independent (this chat) | Winner |
|-----------|---------------|-------------------------|--------|
| **Earl E Congdon identity** | Known as ODFL-linked | Chairman Emeritus & Senior Advisor ODFL; retired board Jan 2021; 8-K + IR bio | Tie (identity) |
| **Congdon contact route** | Card empty | HQ **(336) 889-5000** (SEC 8-K registrant phone); board mail: Corporate Secretary, 500 Old Dominion Way, Thomasville NC 27360; IR site ir.odfl.com | **Independent** |
| **Gordon Gund identity** | Named | Blind VC; FFB co-founder/Chair Emeritus; Gund Investment Corp, Princeton; Align/Kellogg interests | Tie |
| **Gund contact route** | Card empty | FFB: **info@FightingBlindness.org**, **(800) 683-5555**, 6925 Oakland Mills Rd #701 Columbia MD; Gund listed FFB board/Chair Emeritus | **Independent** |
| **Carl C Icahn identity** | Named | Controls ~86% IEP; Sunny Isles Beach HQ | Tie |
| **Icahn contact route** | Card empty | IEP IR **1.800.255.2737**; HQ **(305) 422-4100**; EDGAR ICAHN CARL C **305-422-4145**; 16690 Collins Ave PH-1 | **Independent** |
| **Source discipline** | Dig visited IR/news (prior logs: 48 facts extract on ODFL) | Exact primary URLs (SEC, ir.odfl.com, ielp.com, fightingblindness.org) | Independent used fewer steps but landed routes |
| **Card as answer** | Fail — empty phone/email | Would score `organization_contact` with org phones + URLs | **Independent** |

**What this does *not* mean**
- Do not encode ODFL/IEP/FFB into promote prefer lists (reverted `1b3ce0e`).
- Free dig is still correct design: model chooses tools; card must receive what dig already saw.

**Structural gap (fix without playbooks)**
1. Dig can **visit** primary pages and still leave **0 structured findings** on the card if extraction/model `done` payload is thin.
2. Promote had a **neutral bug** (drop all org-scope generic emails) — fixed; domain prefer scores **removed**.
3. Next honest work: ensure auto-extracted CONTACT FACTS from visited pages always reach `persistBureauContactsForEntity` (already intended) and outcome is not stuck `none` when org phone/email exists — no ranked search scripts.

**Operator**
- Replit was 404 mid-audit; restart API on `1b3ce0e`+, rebuild desk, one target dig, score card vs table above.


### Key modules
| Path | Role |
|------|------|
| `target-contact-agent.ts` | Dig → persist → promote → outcome |
| `agentic-web-research.ts` | Free ReAct + multi-LLM + model-chosen tools |
| `bureau-contact-persist.ts` | Evidence + promote + rehydrate |
| `atlas-orchestrator.ts` | Launch phases; target agent early; Phase 0 skip if empty |
| `apex-bureau-orientation.ts` | Cold-start context every LLM role |
| `POST /api/entities/rehydrate-contacts` | Evidence → cards without re-dig |
| `POST /api/ingest/atlas-stop` | Stop stuck runs |

### Operator boot
```bash
git pull origin main   # c26a664 or newer
pnpm --dir artifacts/apex-finder run build
pnpm --dir artifacts/api-server run build
# restart API only (8080 serves desk + /api)
# Stop stuck job → one Launch when integrity ok
```

### Related
- Post-test queue: **docs/POST_TEST_BUG_PLAN.md**
- Architecture: **docs/BUREAU_REACT_ARCHITECTURE.md**
- Live notes: **docs/LIVE_TEST_OBSERVATIONS_2026-08-23.md**

---


### Tip chain (target agent + card — 2026-08-22 evening)
| Commit | Point |
|--------|--------|
| `ee28ca1` | **Reverted** micro-training (name-match / IR penalty / ranked prefer lists) |
| `407fb7d` | *(reverted by ee28ca1)* brief preference ranking experiment |
| `7efcea8` | Single target-agent dig per entity (no double ReAct) |
| `e1d03ef` | **feat:** `runTargetContactAgent` + early enrich stage + chat-style objective |
| `d28e597` | Always rehydrate dig evidence onto cards after secondary/enrich |
| `fd7f85a` | Zombie auto-clear (>90m); `POST /api/ingest/atlas-stop` |
| `67da81b` | Host-scored dig phones; `POST /api/entities/rehydrate-contacts` |
| `48acae2` | Promote merges contact_evidence; protect agentic phones from EDGAR |
| `f49b7c5` | UI: keys/LIVE sync; lazy graph; honest status |
| `f16d96e` | Status banner only lists live providers; graph ErrorBoundary |

### Tip chain (free research — earlier 2026-08-22)
| Commit | Point |
|--------|--------|
| `586fc86`+ | **Reactor:** right-hand live adaptive narration; desk scenes desktop+mobile |
| latest | **registry_search** + **domain_lookup** as model-chosen tools; free investigator prompt
| `a4c1345` / `d99c151` | footprint tools; wallet seeds; budget-exit salvage
| `42e3134` | deep-web Bing seed queries
| `77ad67f` | Soft right-hand primary-source guidance (no "force" language)
| `c15c711` | Boss adaptive brief is free move (no AVAILABLE TOOLS menu) |
| `aa392b8` / `f55e604` | Adaptive rules path **stop-only** — no dig ladder |
| `0eb33d3` / `fcafa0b` | Adaptive ladder marked legacy stop/budget |
| `7eb69a5` | **Deleted** force_* gap-fills (~838 lines) from agentic loop |
| `7bc9dc6` | Done only rejected on pure no-op |
| `073bba6` | Adaptive: Groq free step before rules; soft Boss checklist |
| `15744d6` | Agentic path seeds slimmed; det recovery simplified |
| `80802aa` / `5f81341` | Shared + web-enricher query menus → seed-only |
| `0184ac7` / `c483877` | deep-web / enrichEntityOsint platform scripts stripped |
| `2b6cf78` | Adaptive last resort **stops** (no rules dig ladder) |
| `4456b1b` | footprint / social-discovery / Mistral: plain name seeds |
| `f22653b` | Contact path crawls slimmed; investigator guide de-scripted |
| `6a9f54b` | **Zero** “Grok is the floor” in `src` Boss/right-hand prompts |
| `5cb6949` | ai-extractor fixed lane keyword playbooks removed |
| `e4efa55` / `aa55e20` / `05bfc01` | Scaffold `src/lib` aligned seed-only; runtime det recovery |
| `0de2a59` | Trajectory no longer matches `force_*`; discovery bait softened |
| `3ae7fcc` | Golden standard = **evidence quality bar**, not force-hop mandate |
| `e0be24d`–`92273c9` | bag-attach rename; residual Grok-centric comments stripped |
| `1d137cd` / `4bc3bf7` | **docs/context.md** — free research path written as canonical handoff |
| `2a3661a` | RUN_BUREAU + stage2 docs aligned with free path |
| `fcafa0b` | Adaptive rules ladder marked legacy (stop/budget only) |

### Earlier integrity tips (still relevant)
| Commit | Point |
|--------|--------|
| `d6c3e9a` | Runtime llmStep **Groq → Mistral → Gemini → NVIDIA** |
| `f8b3997` | **FINDINGS SO FAR** in step prompt |
| `d3af833` / `c72d8c2` | Soft done; accept bag findings |
| `0aebbb4` | Free ReAct step budget raised (historical force floor removed later) |
| `23d965c` / `a07fbe6` | SERP: **Serper → Tavily → Exa → DDG** |
| `02759c3` | Off dead Llama 3.3 |

### Why single-agent digs used to beat the bureau
Force-hops and GROK-PARITY checklists ran **before/instead of** free ReAct, burned budget, and rejected valid `done` / bag findings.  
**Now:** multi-LLM free ReAct owns the dig; tools extract on visited HTML; Boss plans without numbered search scripts.

### Boot gate (do not research until green)
1. Pull **latest `main`** (free research path in this file)
2. Secrets: `SERPER_API_KEY` + `GROQ_API_KEY` minimum; `TAVILY` + `EXA_*` + Gemini + NVIDIA + Mistral preferred
3. `RESEARCH_DEPTH=standard` (or `deep`) for parity smokes — `fast` under-digs
4. `GET /api/healthz` → `bureauIntegrity` = **ok**
5. Smoke the same brief you would give any strong general agent — expect **model-invented** queries in trajectory, not `force_*` lines

### Philosophy (do not regress)
- **Final card review = Gemini Boss primary, NVIDIA right-hand secondary, Groq capacity fallback.**
- **LLMs research freely:** invent queries, visit primary pages, pivot. No force-hop / refuse-done / platform `site:` playbooks in the dig path.
- **Tools extract; models decide.** CONTACT FACTS / proxy / IR regex on fetched HTML is tool output, not a substitute for free ReAct.
- **Golden standard** (`docs/evals/GOLDEN_STANDARD_CASE_REFERENCE.md`) = quality bar (primary sources, exact URLs, no invention) — **not** a mandate to re-add force_* templates.
- **Discovery bait** (`broad-discovery` / `discovery-source-mixer`) finds *new* market targets; it is not the locked-entity dig script.
- **Do not re-introduce** `force_company_search`, `force_related_search`, `force_org_email_search`, refuse-done loops, or “Grok is the floor” prompt mandates.
- **Wallet-first seeds** stay thin (`"addr"` only); agentic invents the attribution dig.

### Canonical bureau run
See **docs/RUN_BUREAU.md**. "Run Apex Atlas / bureau" = POST `/api/ingest/atlas-run` with `CANONICAL_ATLAS_LAUNCH_BODY` (`atlas-launch-defaults.ts`). UI + `scripts/run-bureau.sh` match. ENABLE_AUTO_PIPELINE stays false unless explicitly requested.

### Prompt philosophy (2026-08-20)
Agentic loop is ReAct, not a playbook. Do not micro-manage trained models with checklists or force-hop done-gates. Place models + tools correctly; let them research. Deterministic extractors on visited HTML are tool output, not model training.

### Correction (2026-08-20)
Comparing a stripped agentic-only script to full Grok Agent was invalid.
Full Apex = multi-LLM ReAct + Boss/Gemini + Serper/Tavily/Exa + Scrapfly/ZenRows + Maigret/Sherlock/Holehe + EDGAR + registries.
Losing to one model is a severity bug. Agentic IR/related extraction + soft done so public IR surface is not left on the table.

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


**Tip: pull latest main (free multi-LLM ReAct; no force-visit machine; soft stagnation).

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

### Correction (2026-08-24) — no script hardening
Domain/IR prefer scores (odfl.com, ielp.com, path heuristics) were **reverted**. That class of change is micro-hardening, not free dig.
**Kept:** one neutral bug fix — do not drop organization-scope emails solely because the local-part is generic (`info@`, `ir@`). Model + extraction decide what is a contact; promote must not erase org switchboards by default.

### 2026-08-24 rehydrate proof
`POST /api/entities/rehydrate-contacts` on live → **Earl E Congdon**: phone `+13368895000`, email `investor.relations@odfl.com`, outcome `organization_contact`.
Evidence existed; card was empty until rehydrate. Gund/Icahn still empty (no durable evidence rows).
Lesson: dig→evidence without promote/rehydrate leaves blank cards — not a reason to add prefer-list scripts.

### Graph TDZ (2026-08-24)
`Cannot access 'E' before initialization` on Connections: effect deps referenced `allEntitiesRaw` before `useListEntities` declared. Fix `a80a14b` (on origin). Replit must pull past `84fa075`.
