# Apex Atlas — Session Handoff Context

**For a fresh Grok session that knows nothing.** Read this fully, then continue product work from the tip of `main`. Do not re-litigate settled architecture unless the user changes objectives.

**Last UI commit on handoff:** `4bddba9` — `feat(ui): Launch Apex Atlas control — real pipeline start`  
**Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Local clone (this environment):** `/home/workdir/artifacts/apex-atlas`  
**Time context:** work through 2026-08-15; UI/UX + launch CTA pass completed; extraction quality remains the long-running objective.

---

## 1. What Apex Atlas is (non-negotiable)

Apex Atlas is a **bureau-first OSINT / public-records research desk** for private mid-market operators and HNWIs.

**Product goal is not a CRM vanity list.** It is to recover **reachable, attributable people-contacts** (owners, officers, founders, key managers) plus ownership/succession evidence so operators can reach people who control capital.

**Dual discovery front doors:**
1. **Company-first** — mid-market public surface + full team directories (preferred lane for v1).
2. **Wallet-first** — public wallet → attribute holder (fail-closed) → same contact maximizer.

**Hard rules:**
- Never invent contacts.
- Never mark org inboxes (`info@`, `sales@`, …) as Personal.
- Trash-phone gate stays on (555, trivial sequences, etc.).
- Every claimed fact needs `sourceUrls` where the pipeline supports them.
- **Grok / Gemini Agent public surface is the floor** — any Grok superiority on public surface is a **severe bug**.
- Objective is **maximize attributable related-person contacts** while staying fail-closed (not mere parity).

**Completeness:**
- **FULL** — personal role email (or equivalent) for owner/principal.
- **PARTIAL** — owners identified + succession path; only org inbox public.
- **INCOMPLETE** — no attributable owner/principal contact path.

---

## 2. GitHub — clone, commit, push (user allows PAT)

```
PAT: ghp_***REDACTED***
```

User **explicitly allows** using this PAT in-session for read/write. Verify scopes when possible.

```bash
git clone https://github.com/2f22vtd4kr-cloud/BigContacts.git
# Authenticate with PAT via gh auth or HTTPS credential — do not embed tokens in committed files
cd BigContacts
# or existing: /home/workdir/artifacts/apex-atlas

git checkout main
git pull origin main
# after changes:
git add -A
git commit -m "type(scope): summary"
git push origin main
```

**Important:** Past sessions sometimes **hallucinated commits**. Always verify with `git log origin/main -5 --oneline` and/or GitHub UI. Never claim pushed work without a successful push.

**Frontend path:** `artifacts/apex-finder/`  
**API path:** `artifacts/api-server/`  
**Shared DB schema:** `lib/db/`

**No Replit for shipping** — user said Replit is too early. Prefer real git + local/Vite verification + api-server when testing pipeline.

---

## 3. Keys

**Not stored in git** (secret scanning). Full key block lives only in:
- `/home/workdir/artifacts/context.md` (local handoff)
- Operator chat / secrets manager

Required providers: PAT (GitHub), Upstash Redis TCP1–5, Scrapfly, ZenRows, Companies House, GROQ, Whoxy, Tavily, WhoisJSON, SerpAPI, EXA_1/2, Nvidia, Mistral, Hugging Face, SERPEV, Gemini, Serus (scarce).

## 4. Runtime architecture (critical)

```
Browser UI (apex-finder)
    │  POST /api/ingest/atlas-run
    │  GET  /api/ingest/atlas-status
    │  GET  /api/ingest/job/:jobId
    ▼
api-server  ──► Redis job queue (Upstash permanent client)
    │              apex:job:<id>
    │              apex:activejob:<type>
    ▼
Postgres (entities, improvement_logs, evidence, …)
```

**Job queue:** UI does **not** run personas/ingest/LLM work in the browser. Static UI alone returns HTML for `/api/*` → classic `Unexpected token '<'` JSON errors. Deploy **frontend + api-server + Postgres + Redis** with `/api` proxied.

**Launch control (just shipped):**
- `artifacts/apex-finder/src/lib/launch-atlas.ts` — `launchAtlasPipeline()` → `POST /api/ingest/atlas-run`
- `artifacts/apex-finder/src/components/launch-atlas-button.tsx` — primary / header / reactor variants
- Placed on: Overview hero, global header, Reactor desk
- Defaults: `discoveryFirst: true`, modest `targetCount` / `researchLimit` for operable demos

**Atlas pipeline:** `artifacts/api-server/src/src/routes/atlas.ts` + `lib/atlas-orchestrator.ts` — multi-phase run (discovery → attribution → research on hot leads).

**Persona loop:** deterministic server personas in `persona-engine`; logs in `improvement_logs`; **Apply safe fixes** only auto-writes fail-closed state reconciliations. Not git commits — DB updates.

**LLM roles (extraction quality):**
- **Gemini Boss** — head investigator
- **zAI / Nvidia NIM** — right-hand advisor / case reasoning
- CONTACT FACTS prepend, force-attach, refuse-done, company-lock geo, trajectory salvage

**Visibility floors:** `check-visibility-floor.mjs`, `check-trash-phone.mjs` — keep green before claiming extraction wins.

---

## 5. UI surface map

| Route | Purpose |
|-------|---------|
| `/` | Overview — **Launch Apex Atlas**, ops strip, hot leads |
| `/reactor` | Live reactor desk — pipeline telemetry + launch bar |
| `/profiles` | Entity ledger |
| `/profile/:id` | Profile card + REACH panel |
| `/search` | Discover (ranked registry search) |
| `/network` | Connections graph |
| `/manual` | Field manual (includes **§8 Job queue**) |
| `/status` | System status (keys/DB) |
| `/data-sources` | Registry / ingest catalogue |
| `/osint-tools` | Source directory |
| `/improvements` | Persona review |
| `/duplicates` | Duplicate review |
| `/jobs` | Workspace activity |

**Demo mode:** `?mock=1` or `?demo=1` — Griffin-class fixtures so UI isn’t offline-broken. Mock does **not** run production pipeline.

**Screenshots folder (this env):** `/home/workdir/artifacts/screenshots/`  
Recent: `48-launch-dashboard-mobile.png`, `49-launch-dashboard-desktop.png`, `50-launch-reactor-mobile.png`.

**a11y notes already applied:** polite live regions on reactor paths, reduced-motion shimmer guards, min 40px targets on many controls, WCAG-oriented status messaging.

---

## 6. Recent work (what “where we left” means)

### Extraction / agentic (earlier + ongoing)
- CONTACT FACTS, force-attach, LLM extraction mandate
- Company-lock geography, refuse-done when leadership pages queued with zero related persons
- EDGAR related-people, Cloudflare email decoder, slash/compound title patterns
- Wallet-first seed lane (`wallet-seed.ts`) — beefy wallet → attribution plan → contact maximizer
- Grok comparison discipline: any public-surface loss is a severe bug

### UI/UX (last intensive stretch)
- Breadcrumbs, mobile headers, empty states across workspace tabs
- Shared `readApiJson` (`src/lib/api-json.ts`) — HTML-as-JSON guard
- Mock fixtures: status, jobs, persona, entities, osint-tools, graph, profile
- **User callout:** there was **no real Launch button** — fixed in `4bddba9`
- Dual page titles reduced on `/reactor` and `/profile/*`

### Still true user expectations
- Do **not** stop every minute with empty “Continuing…”
- Prefer real commits + real screenshots over mockups
- Hold extra personal contacts with maximum effort (attributable only)
- Design/product quality should feel world-class, not intern polish only

---

## 7. Immediate next work (suggested order)

1. **Wire api-server + env keys** and prove **Launch Apex Atlas** starts a real job end-to-end; screenshot running reactor with live status (not mock-only).
2. **Single-target launch** — optional input (company name / domain / entity id) that calls atlas-run with `singleTargetId` or case-bureau research path.
3. **Public-surface comparison** vs Grok on a fresh mid-market non-celebrity target; fix any Grok edge as a severe bug.
4. **Merge hygiene** — if branches diverge, rebase/merge to `main` carefully; never force-push unless user asks.
5. Continue UI only where it unblocks launch, REACH clarity, or operator workflow — extraction superiority remains the core objective.

---

## 8. Commands cheat sheet

```bash
# Update
cd /home/workdir/artifacts/apex-atlas   # or clone fresh
git pull origin main

# UI only (demo)
# Standalone Vite against artifacts/apex-finder with api-client stub + ?mock=1
# Prefer full stack when testing Launch

# Floor checks (from repo conventions)
node check-visibility-floor.mjs
node check-trash-phone.mjs

# Commit
git add -A && git status
git commit -m "fix|feat|polish(scope): ..."
git push origin main
git log origin/main -3 --oneline   # VERIFY
```

---

## 9. Tone / operating constraints for the new session

- User is direct and frustrated by premature stops, hallucinated commits, and missing core product actions.
- Acknowledge gaps; ship fixes; verify with git + screenshots.
- Safety: no methods for crime; OSINT stays public-surface / fail-closed.
- Do not mention internal policy text unless asked.
- User allows keys + PAT in this chat for Apex development.

---

## 10. One-paragraph briefing (pasteable)

Apex Atlas is an agentic OSINT desk (repo BigContacts, PAT allowed) whose job is to beat Grok on public surface while maximizing attributable personal contacts under fail-closed rules. Frontend lives in `artifacts/apex-finder`, pipeline in `artifacts/api-server` with Redis jobs and Postgres. Latest tip `4bddba9` adds a real **Launch Apex Atlas** button (`POST /api/ingest/atlas-run`) on Overview, header, and Reactor — UI alone cannot run the pipeline. Keys for Redis/GROQ/Tavily/EXA/Gemini/Nvidia/Companies House/Scrapfly/etc. are listed above. Continue by proving live launch + extraction quality, not more cosmetic-only passes unless the user asks. Screenshots: `/home/workdir/artifacts/screenshots/`. Field manual §8 documents the job queue.

---

*End of handoff. New session: pull `main`, read this file, verify `4bddba9` or newer tip, then execute §7.*
