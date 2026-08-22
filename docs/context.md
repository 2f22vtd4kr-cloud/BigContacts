# Context — living handoff (Apex Atlas / BigContacts)

**Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts · **Branch:** `main`  
**API build entry:** `artifacts/api-server/src/src` (esbuild). Top-level `src/lib` is a thin scaffold — do not edit it for research logic.  
**Product:** Apex Atlas research bureau (NOT Steam “Atlas Reactor”, NOT physics ATLAS).

## Prep for next Replit run (2026-08-22)

**Current tip:** Atlas secondary dig passes `jobId` so each ReAct step hits job log + bureau-events + right-hand narration.

### Reactor Live Desk (desktop + mobile)
- **Who narrates:** right-hand (NVIDIA), **not** Boss — Boss stays on orchestration.
- **What:** short adaptive under-the-hood prose (1–2 sentences) per research step; rate-limited, non-blocking.
- **Where:** violet **“Right-hand · live”** on each tool scene; narration folds onto Google / browser / SERP / registry / footprint chrome.
- **Desktop:** Live Desk grid + step rail shows **RH** pip when narration is present.
- **Mobile:** same scenes via swipeable workstage; sticky narration strip while scrolling the tool window.
- **Data:** `publishBureauEvent` → `scheduleBureauLiveNarration` → `BUREAU|` log lines → Reactor `parseAtlasEventLog` → `BureauOpsStage`.
- **Requires:** `NVIDIA_NIM_API_KEY` (or alias) for narration; tool chrome still works without it.

### What “free research” means (non-negotiable)
- **Agentic ReAct:** the model chooses every `web_search` / `visit` / `done`. No `force_*` gap-fill machine.
- **Done:** only soft-rejected on pure no-op (zero searches, visits, and findings). Auto-extracted CONTACT FACTS count.
- **Adaptive director:** Gemini Boss → NVIDIA right-hand → capacity fallback → **stop**. Rules path is stop-only (no dig ladder).
- **OSINT lanes:** thin **seed** queries only (`"name"`, `"name" "company"`, geo) — not LinkedIn/BBB/Facebook/SEC menus.
- **Path crawls:** `/contact` `/about` `/team` only — not multilingual path playbooks.
- **Prompts:** no “Grok is the floor”, no refuse-done, no force-related-people mandates.
- **Bag attach:** recovered org emails/phones stay visible on company rows (`bag-attach`) — that is UI visibility, not a research script.
- **Det recovery:** only when **all** chat LLMs fail — one plain name search + optional visit.
- **API build entry:** `artifacts/api-server/src/src` (esbuild). Outer `src/lib` is scaffold; keep it seed-only so tests do not re-teach old scripts.

### Tip chain (free research — 2026-08-22)
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
