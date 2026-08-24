# Context — living handoff (Apex Atlas / BigContacts)

**Repo:** https://github.com/2f22vtd4kr-cloud/BigContacts · **Branch:** `main`  
**Current tip:** `642be91` (on origin)  
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
| **Five Redis on free Upstash** | Prefer **one** `REDIS_URL_1` — status polls burn free quota |
| **Frontend on port 8080** | API-only public preview; Frontend collides with API |
| **Domain/IR prefer scoring in dig** | Neutral promote only (e.g. allow orgish generic emails) — never “prefer these domains” scripts |

### Quality bar (operator expectation)
- Bureau dig must produce **card-quality** routes with source URLs.
- After a live test run, independent research on the **same targets** is the bar: **Apex must meet or beat** that bar (identity + contact route + source URL), not lag empty cards while tools visited IR pages.
- Empty cards after dig that extracted facts = **promote/rehydrate bug**, not a reason to add prefer-list scripts.

### Replit / deploy law
- **API-only** on **8080**; serves desk at `/` and API at `/api/`.
- Public npm first. Hard stop after acceptance.
- Desk rebuild required for UI tips: `pnpm --dir artifacts/apex-finder run build` then restart API.
- One Redis only. No REDIS_URL_2+ on free tier.

---

## Work since last major handoff (→ tip `642be91`)

### Free-AI integrity (do not re-harden)
- Reverts of micro-training / 1-800 / domain prefer scoring when they crept back.
- Target agent → card; `rehydrateEntityCardFromEvidence` after dig; list cache invalidate after promote.
- Neutral promote: orgish generic emails allowed when host is org-like (Congdon IR path).

### Redis / load
- Client polls slowed (atlas ~8s, workspace 45s, status/jobs 30s).
- Health PING cache 60s; contact cache **primary Redis first** (no forced URL_2).
- React Query `staleTime` 15s; workspace countdown only while panel open.

### Graph (Connections)
- TDZ: `useListEntities` / `useGetEntityGraph` **before** effects that read `allEntitiesRaw` (`a80a14b`).
- Normalize entities array; defer force-graph mount; width/height before graphReady effect.

### Reactor UI (still requires desk rebuild on Replit)
- **`642be91`:** kill “window N of 6” plan language; continuous phase bar (not 0–10 dots); Live Desk sole right rail; telemetry only when desk closed; Launch off right rail; scheme dim when desk open.
- **`ff690cd`:** desktop right-rail de-stack (desk vs telemetry vs launch).
- **`952dd33`:** Launch button mobile = desktop oil; solid readable type on phone.
- Stop honesty: cancelled → STOPPED / idle, not FAILED; no fake LIVE after stop.
- Scheme labels: RDAP not WHOXY; no fixed “15 categories” copy.

### Live run observation (Replit `riker` host, 2026-08-24 ~08:31Z)
- Run active through Phase 8; cards promoting with phones on several targets (Icahn, Dolan, Finney, Houssian Joe — `direct_contact_candidate`).
- **After run completes:** re-run independent comparison on **same target names** and update scoreboard below. Apex must not lose to empty/weak cards if dig visited primary sources.

### Still open
- Discovery path can still feel pipeline-shaped in product chrome (scheme map) — UI copy fixed; model dig must stay free ReAct.
- Card identity-bind quality under multi-name batches.
- Operator must **rebuild desk** after UI tips or browser keeps old “of 6” / stacked rail bundle.
- Origin must stay ahead of stale tips (never leave Replit on `84fa075`).

---

## Agent operating notes (this chat)
- Update this file on meaningful handoffs.
- Never replace free dig with scripted “find rich people” pipelines limited so there is no reason to use Apex.
- Comparison research after test runs is mandatory for quality audit.

---

