# Context — living handoff (Apex Atlas / BigContacts)

**Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts · **Branch:** `main`  
**Current tip:** `2f2f53c8` (or newer — always `git pull` + `git log -1`)  
**API build entry:** `artifacts/api-server/src/src` (esbuild). Top-level `src/lib` is a thin scaffold — do not edit it for research logic.  
**Desk package name:** `apex-finder-local` — build with `pnpm --dir artifacts/apex-finder run build` (not `@workspace/apex-finder`).  
**Product:** Apex Atlas research bureau (NOT Steam “Atlas Reactor”, NOT physics ATLAS).

---

## Non-negotiable rules (product law)

These are operator + agent law. **Do not regress.**

### What Apex is
| Rule | Meaning |
|------|---------|
| **AI-driven bureau** | Trained models research like a strong general agent (same class of work as: “find public contact routes for this person”). Tools execute; **models decide**. |
| **Goal** | Real, publicly documented contact routes to HNWIs / principals / operators / orgs — with **exact source URLs**. Never invent people, contacts, or relationships. |
| **Cold start** | Every LLM call is memory-less. **`apex-bureau-orientation.ts`** injects product identity, goal, role, and tool surface into Boss, right-hand, investigators, and dig agents **every time**. |
| **Boss** | **Gemini only** — plan / assign / final card gate. |
| **Right-hand** | **NVIDIA** — free step advice + Reactor live narration (not final-card mix-up). |
| **Dig capacity** | Groq → Mistral → Gemini → NVIDIA failover — **not** the Boss. |
| **Tools** | Serper/Tavily/Exa, visit, Scrapfly/ZenRows, Holehe, Maigret, Sherlock, harvest, domain/RDAP, registries (EDGAR, CH, …). Model **chooses** when to call them. |
| **Card is the answer** | Dig findings **persist + promote** to `entities.phone` / `email` / `linkedin` / `contactOutcome`. Evidence bag is provenance, not the only landing place. **Maximum public surface:** personal preferred; org / IR / notice / related **kept and shown** — never dropped for “privacy.” |
| **Fail-closed** | No synthetic contacts. Trash hosts / asset filenames / school mails rejected as validation — not as “training the model how to research.” |
| **Integrity** | `bureauIntegrity` critical (0 search or 0 dig LLM) → do not pretend research is healthy. Do not claim scoreboard “pass” while critical. |

### What Apex is not
| Forbidden | Why |
|-----------|-----|
| **Force-hop / playbook dig** | `force_*` search machines, fixed “6 dig steps,” GROK-PARITY checklists |
| **Micro-training models** | Ranked prefer lists, IR-agency penalty tables, “local-part must match name,” hard 1-800 reject playbooks in dig objectives |
| **Pipeline as the brain** | OCCRP / OpenSky / CH are **tools/sources**, not a substitute for free model research |
| **Issuer clobber** | EDGAR switchboard must not overwrite `agentic-web` / notice phones |
| **Auto-pipeline by default** | `ENABLE_AUTO_PIPELINE=false` unless operator explicitly enables |
| **Five Redis on free Upstash** | Prefer **one** `REDIS_URL_1` — status polls burn free quota |
| **Frontend on port 8080** | API-only public preview; Frontend collides with API |
| **Domain/IR prefer scoring in dig** | Neutral promote only — never “prefer these domains” scripts |
| **Privacy as empty-card excuse** | “Privacy-hardened” must never mean drop public routes from the card |

### Quality bar (operator expectation)
- Bureau dig must produce **card-quality** routes with source URLs.
- After a live test run, independent research on the **same targets** is the bar: **Apex must meet or beat** that bar (identity + contact route + source URL), not lag empty cards while tools visited IR pages.
- Empty cards after dig that extracted facts = **promote/rehydrate bug**, not a reason to add prefer-list scripts.
- Dig models must act like chat research (Grok-class free investigation). Gates package **honesty** (sourceUrl, org vs personal, dig owns card) — they must **not** script the dig path.

### Replit / deploy law
- **API-only** on **8080**; serves desk at `/` and API at `/api/`.
- Public npm first. Hard stop after acceptance.
- Desk rebuild required for UI tips: `pnpm --dir artifacts/apex-finder run build` then restart API.
- One Redis only. No REDIS_URL_2+ on free tier.
- **Secrets:** agent **shows the flat ask-list and asks the operator**. Never invent, print, or overwrite secrets. Never ask for `DATABASE_URL` (Replit-managed), `WHOXY_*`, or `REDIS_URL_2`…`_5`. One EXA key is enough.
- **Canonical Replit prompt:** `docs/REPLIT_UPDATE_PROMPT_LATEST.md` (one-shot setup + Dig + scoreboard). Prefer latest tip on main over stale SHA floors in older copies.
- If `bureauIntegrity=critical` → report and END dig-for-quality claims; operator fixes Secrets offline.
- Bounded Dig proof: single-target, not discovery-first; **90s ceiling + forced stop** if API freezes (event-loop hang under dig was observed).
- Blank Replit with only starter scaffold (no `artifacts/apex-finder`) is a **wrong project** — do not invent Apex; restore real BigContacts source.

---

## Architecture (roles)

| Role | Model / system | Owns | Must not |
|------|----------------|------|----------|
| **Orchestrator** | Code | Job lifecycle, pause/stop, budgets | Research judgment |
| **Boss** | Gemini | Next case focus, investigator brief (goals) | Browse, invent phones, tool checklists |
| **Right-hand** | NVIDIA | Advice, Reactor narration | Final-card mix-up as dig controller |
| **Discovery agent** | Free dig oriented at *people* | Candidates with basis + sourceUrls | Card promote |
| **Dig (Target Contact Agent)** | Multi-LLM free ReAct | Contact routes for one identity | Scripted hop lists |
| **Tools pool** | Serper/Tavily/Exa, visit, browser, registries, footprint… | Execute when model chooses | Self-fire |
| **Promote / present** | Deterministic code | Card fields + ContactSurface display | Invent values |

**Modes:** single-target dig (proof path) · discovery-first (who then dig) · Case Bureau (must not fight dig on same phone columns).

**Anthropic / ReAct alignment (plan vols 238–247, 264–274):** parallel subagents only for independent facets (discovery lanes), not parallel writers on the same phone; dig = depth on one person; trajectory (DigSpan) is the debugger of record.

---

## Work since prior major handoff (`642be91` → `83ce65f`+)

### Free dig / anti-script
- Force-hop machines removed from agentic dig; `scripts/check-no-force-dig.sh` / `pnpm run check:no-force-dig` must OK.
- Free ReAct: model chooses `web_search` / `visit` / OSINT tools / `done`.
- Soft-retire broad template discovery when discovery agent admits ≥1 person (`APEX_FORCE_TEMPLATE_DISCOVERY=1` to restore).
- Discovery agent: free brief, sourceUrl-backed named people, live steps + DigSpans (`agentName: discovery`).
- Done gates: do not soft-reject forever for “missing related officers.”

### Dig → card integrity
- Promote + `rehydrateEntityCardFromEvidence` after dig.
- Issuer / EDGAR-Phone must not overwrite `agentic-web` / notice sources (`phone-source-priority`, enricher/phase-j/web-osint/deep-web locks).
- Final review must not wipe dig phones with null (`resolveProtectedCardPhone`).
- Outcome honesty: `agentic-web-org` without personal email → `organization_contact`, not fake direct.
- Identity collision module; graph Entity↔Entity name-pair gate; surname bind for multi-token targets.
- Aggregator-only soft-downrank (OSINT two-source practice); notice phones score high on scoreboard.
- Skip MCTS when dig already wrote routes or evidence bag has contacts (single-target + batch).
- Single-target launch: **never** `discoveryFirst` by default (client + server).

### Desk / dig entry points
- Profile + Entities (row + mobile card): **Dig contacts** → Atlas `singleTargetId` (not old MCTS/`web-osint-enrich`).
- Depth selector: fast | standard | deep (`researchDepth` on body + env).
- Stop dig from profile/entities; auto-rehydrate after dig idle; bulk rehydrate on ledger.
- ContactSurface: all presented routes (personal + org chips); empty + evidence CTA.
- Live Desk: DigSpan trajectory, card routes panel, scoreboard strip, integrity-gated “pass.”
- Scheme: pan/zoom/minimap, live-tools mode, lights from real spans (not poster keywords).
- Stale LIVE / “window N of 6” plan language killed; continuous phase progress normalizer.

### Ops / Redis / jobs
- Prefer one permanent Redis; sticky “exhausted” recovery; in-memory job fallback when Redis down.
- Status plane budgets + event-loop yields under dig (API hang under dig was a real failure mode).
- Scoreboard: `/api/ingest/scoreboard-snapshot`, `pnpm run scoreboard:live`, L-code suggestions, COMPARE templates under `docs/comparisons/`.
- `pnpm run check:bureau` = no-force + unit tests (phone priority, rubric, L-code, corroboration).

### Bureau-plan suite
- `docs/bureau-plan/` — multi-volume master plan (00–1800+ range on main; measured growth in tens of thousands of words — **not** a claimed 400k single dump).
- Living law: free dig, max public surface, live scoreboard = product gate, plan size ≠ superiority.
- Grok Files mirror may exist at workspace `bureau-plan/` for operator reading.

### Replit prompt arc (this conversation)
- Failures seen: blank desk, Frontend on 8080, multi-Redis thrash, agent inventing keys, pre-Dig hard-stop, dig freezing event loop, **wrong Replit project** (starter only — no `artifacts/apex-finder`).
- Settled secrets ask-list (flat, no optional/required tiers):

```
REDIS_URL_1
GROQ_API_KEY
GEMINI_API_KEY
NVIDIA_NIM_API_KEY
MISTRAL_API_KEY
HF_TOKEN
SERPER_API_KEY
TAVILY_API_KEY
SERPAPI_KEY
EXA_API_KEY
SCRAPFLY_API_KEY
ZENROWS_API_KEY
COMPANIES_HOUSE_API_KEY
WHOISJSON_API_KEY
```

- Not asked: `DATABASE_URL`, `WHOXY_*`, `REDIS_URL_2`…`_5`. One EXA. Agent asks operator; does not invent/print/overwrite.
- Bounded proof: Dig ≤90s then lock-clear if freeze; Path B EMPTY_DB without long discoveryFirst.
- Canonical file: `docs/REPLIT_UPDATE_PROMPT_LATEST.md` / `docs/REPLIT_UPDATE_PROMPT_2026-08-28.md` lineage.

### Live-run honesty (historical + recent)
- Dig trajectory can be free (model-invented search/visit) while **cards** still show EDGAR-Phone / empty / org over-claim — that is a **promote/outcome** failure, not “Apex is only EDGAR.”
- Independent open-web comparison on same names is the audit; Apex must not lose on firm primary lines when dig visited them.
- Status plane dying mid-run = P0 isolation / stop hung dig.

### Still open
- **Live scoreboard `milestonePass` on Replit** after fixture re-cook — only real product completion gate for dig-desk wave.
- Card identity-bind under multi-name batches (ongoing).
- Discovery quality vs residual template fallback.
- Operator must pull latest main on a **real** BigContacts workspace (not blank starter).
- Rebuild desk after UI tips.

---

## Agent operating notes

- Update this file on meaningful handoffs.
- Never replace free dig with scripted pipelines.
- Comparison research after test runs is mandatory for quality audit.
- Replit agents: one API workflow, flat secrets ask-list, no secret invention, Dig+scoreboard proof with freeze ceiling.
- Implementation > endless plan padding; plan docs support execution, they are not the product.

---

## Quick commands

```bash
git pull origin main && git log -1 --oneline
pnpm run check:no-force-dig
pnpm run check:bureau
pnpm --dir artifacts/apex-finder run build
pnpm --dir artifacts/api-server run build
# health
curl -sS --max-time 5 http://127.0.0.1:8080/api/healthz
# scoreboard
bash scripts/replit-scoreboard-check.sh http://127.0.0.1:8080
```

Canonical launch: `POST /api/ingest/atlas-run` with `CANONICAL_ATLAS_LAUNCH_BODY` (see `docs/RUN_BUREAU.md`). Single-target dig: `singleTargetId` + `discoveryFirst: false`.

---

## Session 2026-08-28 (Grok agent handoff)

- Cloned repo to `/tmp/BigContacts` (workspace FS issues on primary artifacts path; work from here).
- Git user configured: Apex Atlas <apex-atlas@local>.
- Branch: `main` @ `2f2f53c8` — working tree clean at session start.
- PAT-authenticated remote ready for commit + push/merge.
- Operator instruction: update `docs/context.md` after every batch of changes; commit and merge when ready.
- Open gates unchanged: live scoreboard `milestonePass` on Replit after fixture re-cook; card identity-bind; discovery quality; real BigContacts workspace (not starter).
- Next: continue product work per open items / operator direction.


---

## Session 2026-08-28 (Grok continuation — commit/merge ready)

- Re-entered repo at `/tmp/BigContacts` (primary artifacts path has FS I/O issues; clone lives under `/tmp`).
- Confirmed: `main` @ `0e6c87e0`, working tree clean, remote authenticated with provided PAT.
- Git identity set: Apex Atlas <apex-atlas@local>.
- Operator directive: commit + merge capability required; update `docs/context.md` after every batch of changes (obligatory).
- No pending code changes at this handoff — ready for next product direction.
- Open gates unchanged: live scoreboard `milestonePass` on Replit after fixture re-cook; card identity-bind; discovery quality; real BigContacts workspace (not starter).
