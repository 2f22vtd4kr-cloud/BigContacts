# UI audit — Kirk Replit host (2026-08-24)

**URL:** https://d331280b-90c4-4117-afb3-0a8f166443d9-00-390ihneix8ipx.kirk.replit.dev  
**Repo tip at audit:** `2c591ce` (origin/main)  
**Method:** live `healthz` + desktop (1920×900) and mobile (750×1624) screenshots of Overview, Reactor, Entity ledger, Connections, Discover path, Status  
**Atlas state:** idle · entities `[]` · cold desk · `bureauIntegrity: ok` · Redis ok · `webSearchActive: 4` · `agenticLlmSlots: 4` · keys chip **11 LIVE** · auto-pipeline **false**

---

## Severity legend

| Tag | Meaning |
|-----|---------|
| **P0** | Broken path, unreadable, or overlapping content |
| **P1** | Clear layout/copy bug; hurts daily use |
| **P2** | Polish / consistency |
| **OK** | Looks correct for cold desk |

---

## Health / honesty (API)

| Check | Result | Notes |
|-------|--------|--------|
| GET `/` | 200 HTML | Desk loads |
| `bureauIntegrity` | ok | Search + dig LLM slots live |
| Redis | ok (cached PING) | |
| Atlas | idle | No fake LIVE run |
| Entities | empty array | Expected cold desk |
| Perplexity | 0 keys | Correctly EMPTY on Status |
| Keys chip | **11 LIVE** | Honest vs healthz (not KEYS OFF) |

---

## Overview (`/`)

### Desktop — mostly OK
- Hero, Launch CTA (lime gradient), Reactor / Discover secondary buttons readable.
- Stats row 0 / 0 / 0 / 0 correct for empty ledger.
- Sidebar + READY · DB 1/1 · 11 LIVE clear.

### Mobile — mostly OK
- Launch full-width, readable white type on gradient — **not** clipped “ch Atlas”.
- Header: home · READY · 11 LIVE · menu — usable.
- Quick links 2×2 grid OK.

### Issues
| ID | Sev | Issue |
|----|-----|--------|
| UI-K01 | P2 | Hero copy still says **“public-records pipeline”** — product law is free AI dig / bureau, not pipeline branding. |
| UI-K02 | P2 | Empty priority section shows generic @ icon only; fine for cold desk, could add one-line CTA. |

---

## Reactor (`/reactor`)

### Desktop
| ID | Sev | Issue |
|----|-----|--------|
| UI-K10 | P1 | **Scheme node labels still truncated mid-word** (`FAA REGIS_`, `EDGAR / S_`, `UK LAND R_`, `OCCRP ALE_`, `RDAP / WH_`, `GEMINI Boss · grou_`, etc.). Ellipsis exists but boxes too narrow / letter-spacing still eats width. |
| UI-K11 | P1 | **Header chrome dense:** Launch sits in header but **OPEN DIG · STANDBY** progress track runs under/through the Launch control area; stats row + workbench + NOMINAL compete for one band. |
| UI-K12 | P2 | **LIVE DESK ON** control visible while Atlas is **idle** — ambiguous (desk available vs desk “live”). Prefer “Live Desk” / closed when idle. |
| UI-K13 | P2 | Scheme still reads as a **fixed multi-layer pipeline map** (REGISTRIES → DISCOVERY → AI ANALYSIS …). Product law: dig is free ReAct; chrome should not imply a mandatory step script. |
| UI-K14 | P2 | Right edge vertical lime scrollbar strip looks like a permanent UI chrome element. |

### Mobile Reactor
| ID | Sev | Issue |
|----|-----|--------|
| UI-K20 | OK | Idle state: NOMINAL · Atlas idle · standby copy — honest. |
| UI-K21 | OK | Launch full-width gradient — readable. |
| UI-K22 | P2 | **HIST** label truncated (should be “History” or icon-only with aria-label). |
| UI-K23 | P2 | Large empty dashed panel is correct for idle but feels sparse; OK until first dig. |

---

## Entity ledger (`/profiles`)

### Desktop
| ID | Sev | Issue |
|----|-----|--------|
| UI-K30 | OK | Empty state clear; Open Search / Reactor CTAs. |
| UI-K31 | P2 | Filter chip row is **very dense** on one line (route + quality + Hot + Billionaires + CLEAR LEDGER + ADD). Risk of overflow on 1280px and tablet. |
| UI-K32 | P2 | Empty-state text references **“Data Sources”** — nav item may not match that label (Discover / search). |

### Mobile
| ID | Sev | Issue |
|----|-----|--------|
| UI-K40 | OK | Launch chip not clipped; READY / 11 LIVE visible. |
| UI-K41 | P1 | **Filter rows stack and compete with empty state**; ROUTE chips partially obscured / horizontal scroll unclear. |
| UI-K42 | P2 | FAB `+` overlaps content area; standard pattern but close to empty-state CTAs on short screens. |
| UI-K43 | P2 | Type filters (Person / Company / …) horizontal scroll — **Gatek** truncated. |

---

## Connections (`/network`)

| ID | Sev | Issue |
|----|-----|--------|
| UI-K50 | **P0** | **Double empty-state overlay:** two messages stack/collide — “No people in the graph yet” appears **twice** (overlapping), with mixed subcopy (“Open the ledger…” / “Load registries or run Discover…”). Code path: `allEntities.length === 0` block **and** `gData.nodes.length === 0` block both render. |
| UI-K51 | P1 | Empty-state **buttons overlap / stack** (“Open ledger” / “Data sources” / “Live reactor” / “Discover”) in one messy cluster. |
| UI-K52 | P2 | Toolbar “Entity #0” is meaningless on empty desk. |
| UI-K53 | OK | Graph TDZ crash **not** observed on this cold load (previous LIVE-02). |

---

## Discover / Search

| ID | Sev | Issue |
|----|-----|--------|
| UI-K60 | **P0** | Direct URL **`/discover` → Page not found**. Nav correctly uses **`/search`**, but any bookmark or external “Discover” link to `/discover` breaks. Should redirect `/discover` → `/search`. |
| UI-K61 | P2 | 404 page title still says **“Overview”** in the desk chrome while body says Page not found — confusing. |

---

## Status (`/status`, mobile sampled)

| ID | Sev | Issue |
|----|-----|--------|
| UI-K70 | OK | Groq / Gemini / Tavily live; **Perplexity EMPTY** honest. |
| UI-K71 | P2 | Pool label **“Groq LLaMA”** is outdated (models are multi; not necessarily Llama). |
| UI-K72 | P2 | Header Launch + READY + 11 LIVE still tight on narrow phones. |

---

## Cross-cutting

| ID | Sev | Issue |
|----|-----|--------|
| UI-K80 | P2 | Copy mix: “pipeline” / “Data Sources” / “Open Search” vs product language (Launch / free dig / card). |
| UI-K81 | P2 | Tablet (~768–1024) not separately automated here; expect ledger filter density (UI-K31) and Reactor header density (UI-K11) to worsen. |
| UI-K82 | OK | Cold desk does **not** show fake LIVE feed or Perplexity LIVE with 0 keys. |
| UI-K83 | OK | Mobile Launch no longer left-edge clipped on Overview / ledger / reactor idle. |

---

## Suggested fix order

1. **UI-K50 / UI-K51** — single Connections empty state; one button row.  
2. **UI-K60** — redirect `/discover` → `/search`.  
3. **UI-K10** — widen nodes or further cut letter-spacing / font so scheme labels don’t read as `REGIS_`.  
4. **UI-K11 / UI-K12** — Reactor header density; Live Desk control idle labeling.  
5. **UI-K41 / UI-K31** — ledger filters collapse on mobile/tablet.  
6. **UI-K01 / UI-K80** — pipeline wording → bureau / free dig language.

---

## What looked good

- Desk boots cold with integrity ok and honest key counts.  
- Overview + mobile Launch gradient readable.  
- Idle Reactor mobile honesty (NOMINAL / Atlas idle).  
- No glass stack / KEYS OFF lie on this host.  
- Entity ledger empty state messaging is clear (no fake people).

---

*Audit only — implementation tracked separately against IDs above.*
