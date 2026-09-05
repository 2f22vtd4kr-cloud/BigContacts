# UI audit — Kirk Replit host (FULL PASS · 2026-08-24)

**URL:** https://d331280b-90c4-4117-afb3-0a8f166443d9-00-390ihneix8ipx.kirk.replit.dev  
**Repo tip at audit:** `d890b85` / app behavior matches desk on tip `2c591ce`+  
**Viewports:** Desktop **1920×900**, Mobile **750×1624**  
**Routes covered:** `/`, `/reactor`, `/profiles`, `/network`, `/search`, `/status`, `/manual`, `/jobs`, `/data-sources`, `/osint-tools`, `/research`, `/improvements`, `/duplicates`, `/discover` (404), redirects (`/deep-search`, `/graph`, `/entities`, `/ledger`)  
**Atlas:** idle · empty ledger · integrity ok · Redis ok · 11 LIVE keys chip · auto-pipeline false  

This replaces the short first-pass note. Every major desk surface was opened on desktop and mobile.

---

## Severity

| Tag | Meaning |
|-----|---------|
| **P0** | Broken, overlapping, unreadable, or infinite load |
| **P1** | Clear layout/copy bug; daily friction |
| **P2** | Polish / product-language drift |
| **OK** | Acceptable for cold empty desk |

---

## 1. Shell / navigation (all pages)

| ID | Sev | Viewport | Issue |
|----|-----|----------|--------|
| UI-K00 | OK | both | Global header: READY · DB 1/1 · 11 LIVE honest; Launch chip not clipped on mobile |
| UI-K01 | P2 | both | Hero / jobs / research still say **pipeline** while product law is free AI dig |
| UI-K02 | P1 | both | **`/discover` is 404** (Page not found). Nav uses `/search`. Need redirect `/discover` → `/search` |
| UI-K03 | P2 | both | 404 chrome still titles page **“Overview”** while body says not found |
| UI-K04 | P2 | desktop | Sidebar “WORKSPACE SETTINGS” section long; ok but dense on short laptop heights |

---

## 2. Overview `/`

| ID | Sev | Viewport | Issue |
|----|-----|----------|--------|
| UI-K10 | OK | both | Launch gradient CTA readable; stats zeros correct |
| UI-K11 | P2 | both | Copy: “public-records **pipeline**” |
| UI-K12 | P2 | desktop | Empty priority block is a large dead zone (only @ icon) |

---

## 3. Reactor `/reactor`

| ID | Sev | Viewport | Issue |
|----|-----|----------|--------|
| UI-K20 | **P1** | desktop | **Scheme node text truncated mid-word** (`FAA REGIS_`, `EDGAR / S_`, `UK LAND R_`, `OCCRP ALE_`, `RDAP / WH_`, `GEMINI Boss · grou_`, `PRAC ENGINE Planner - Analy_`, …). Boxes too narrow vs letter-spacing |
| UI-K21 | **P1** | desktop | Header band crowded: title + Launch + OPEN DIG track + NOMINAL + ENTITY FLOW + stats |
| UI-K22 | P2 | desktop | **LIVE DESK ON** while Atlas **idle** — reads as “live” when nothing is running |
| UI-K23 | P2 | desktop | Scheme still looks like a **fixed pipeline map** (conflicts with free-ReAct messaging) |
| UI-K24 | OK | mobile | Idle: NOMINAL / Atlas idle / standby — honest |
| UI-K25 | P2 | mobile | **HIST** truncated (History) |
| UI-K26 | P2 | desktop | Right lime scrollbar gutter looks like permanent chrome |

---

## 4. Entity ledger `/profiles`

| ID | Sev | Viewport | Issue |
|----|-----|----------|--------|
| UI-K30 | OK | both | Empty state clear; no fake rows |
| UI-K31 | **P1** | mobile | Filter chips stack; ROUTE row + type filters fight empty state; **Gatek** truncated |
| UI-K32 | P2 | desktop | Single-line filter toolbar very dense (will break ~1280px / tablet) |
| UI-K33 | P2 | mobile | FAB `+` near empty-state CTAs |
| UI-K34 | P2 | both | Empty copy mentions “Data Sources” inconsistently vs Discover |

---

## 5. Connections `/network` — worst visual bug

| ID | Sev | Viewport | Issue |
|----|-----|----------|--------|
| UI-K40 | **P0** | **both** | **Double empty-state overlay:** “No people on the graph yet” **and** “NO ENTITIES YET” (or second “No people…”) **stacked on top of each other**; body copy interleaves from two blocks |
| UI-K41 | **P0** | **both** | **Buttons stacked/overlapping:** Open ledger + Data sources + Live reactor + Discover in one illegible cluster |
| UI-K42 | P1 | both | Toolbar **Entity #0** meaningless on empty desk |
| UI-K43 | OK | desktop | No TDZ crash on cold load this pass |

**Root cause (code):** `graph.tsx` renders both `allEntities.length === 0` empty UI **and** `gData.nodes.length === 0` empty UI simultaneously.

---

## 6. Discover `/search`

| ID | Sev | Viewport | Issue |
|----|-----|----------|--------|
| UI-K50 | OK | both | Search UI loads; suggestion chips readable |
| UI-K51 | P2 | mobile | Placeholder truncates (“in Texa”) |
| UI-K52 | P2 | desktop | Suggestion chips overflow horizontally without obvious scroll affordance |
| UI-K53 | P2 | both | SEARCH button looks disabled/grey until query — OK pattern, but easy to miss |

---

## 7. System status `/status`

| ID | Sev | Viewport | Issue |
|----|-----|----------|--------|
| UI-K60 | OK | both | Perplexity EMPTY honest; Groq/Gemini/Tavily/Exa live |
| UI-K61 | **P1** | desktop | **Key pool cards missing titles** on some tiles (blank header, only “1 KEY CONFIGURED / 1 live now”) — layout grid broken for serper/mistral/nvidia-style rows |
| UI-K62 | P2 | both | Label **“Groq LLaMA”** outdated (multi-model dig) |
| UI-K63 | P2 | both | Chip “11 LIVE” vs banner “8 AI pool slots” — confusing dual counts (search tools vs LLM pools) |

---

## 8. Field manual `/manual`

| ID | Sev | Viewport | Issue |
|----|-----|----------|--------|
| UI-K70 | OK | both | Readable accordion; product rules visible |
| UI-K71 | P2 | mobile | Long prose OK; search sections works |

---

## 9. Workspace activity `/jobs`

| ID | Sev | Viewport | Issue |
|----|-----|----------|--------|
| UI-K80 | OK | both | Idle messaging clear |
| UI-K81 | P2 | both | Heavy **pipeline jobs / ingestors** language vs Launch-first bureau |
| UI-K82 | P2 | mobile | Tabs (RUNNING / AVAILABLE / AI / DUPLICATES) horizontal crush |
| UI-K83 | P2 | desktop | Idle task chip cloud is dense but usable |

---

## 10. Data sources `/data-sources`

| ID | Sev | Viewport | Issue |
|----|-----|----------|--------|
| UI-K90 | OK | desktop | Registry matrix table readable |
| UI-K91 | P2 | mobile | Subtitle truncates (“in the shuf…”) |
| UI-K92 | P2 | both | “Random mix / shuffled into discovery” reinforces pipeline-discovery framing |

---

## 11. Source directory `/osint-tools`

| ID | Sev | Viewport | Issue |
|----|-----|----------|--------|
| UI-K100 | **P0** | desktop | **Stuck loading forever:** “Loading… tomvaillant/osint-tool-database · HuggingFace” + spinner; never resolved after multi-second wait. Blank main pane. |
| UI-K101 | P1 | both | No timeout / error / offline fallback UI |

---

## 12. Research terminal `/research`

| ID | Sev | Viewport | Issue |
|----|-----|----------|--------|
| UI-K110 | **P1** | both | Page chrome title says **“Overview / Evidence workspace”** while this is the **intel terminal** — wrong page identity |
| UI-K111 | **P1** | both | Copy: **“5-ALGORITHM PIPELINE” / “PIPELINE ARCHITECTURE”** — contradicts free-ReAct / card-is-answer product law |
| UI-K112 | P2 | desktop | Split layout OK empty; terminal aesthetic fine |
| UI-K113 | P2 | mobile | Stacked target + terminal workable |

---

## 13. Persona review `/improvements`

| ID | Sev | Viewport | Issue |
|----|-----|----------|--------|
| UI-K120 | OK | desktop | Empty state clear |
| UI-K121 | P2 | desktop | Header typo-ish: “11 personas **analyse** entities…” (grammar) |
| UI-K122 | P2 | desktop | Three lime CTAs in header (Run loop / Apply safe fixes / Clean duplicates) compete for hierarchy |

---

## 14. Duplicate review `/duplicates`

| ID | Sev | Viewport | Issue |
|----|-----|----------|--------|
| UI-K130 | OK | mobile | Empty success state clear |
| UI-K131 | P2 | mobile | Full-width Refresh button oversized vs content |

---

## 15. Product-language / architecture drift (cross-app)

| ID | Sev | Issue |
|----|-----|--------|
| UI-K140 | P1 | Multiple surfaces teach **pipeline / 5-algorithm / fixed scheme steps** while dig is free ReAct |
| UI-K141 | P2 | Inconsistent verbs: Open Search / Discover / Load registries / Data sources / Open live reactor |
| UI-K142 | P2 | Field manual is closer to product law than Overview/Reactor/Research chrome |

---

## 16. What is working

- Cold desk boots; integrity ok; Redis ok  
- No fake LIVE dig feed while idle  
- Perplexity not shown as LIVE without keys  
- Mobile Launch not left-edge clipped  
- Ledger does not invent demo people  
- Manual, Discover search shell, Data sources table, Duplicates empty state are usable  

---

## Fix priority (implementation order)

1. **UI-K40 / UI-K41** — single Connections empty state; one button row (P0)  
2. **UI-K100 / UI-K101** — Source directory load timeout + error state (P0)  
3. **UI-K02** — redirect `/discover` → `/search` (P0)  
4. **UI-K20** — scheme node typography fit (P1)  
5. **UI-K61** — status key-pool card titles (P1)  
6. **UI-K110 / UI-K111** — research page title + kill 5-algorithm pipeline chrome (P1)  
7. **UI-K31 / UI-K21** — mobile ledger filters + reactor header density (P1)  
8. **UI-K01 / UI-K140** — pipeline wording pass (P2)

---

*Full visual pass: all primary routes × desktop + mobile. Tablet inferred from density issues at 1280-class widths.*

---

## Pass 3 — continued review (scroll / below-fold / re-check) · same host

**Time:** 2026-08-24 continued  
**Note:** Nested `overflow-y-auto` main panes mean automation scrollY on the document often stays 0; findings below combine viewport captures, page-height metadata, and source inspection.

### Status `/status` (re-check)

| ID | Sev | Finding |
|----|-----|---------|
| UI-K61b | **P1** | Confirmed: **3+ key-pool cards have blank titles** (only “1 KEY CONFIGURED / 1 live now”). Visual grid shows titled Groq/Perplexity/Gemini/Tavily/Exa then **untitled** cards in the same AI Engine grid. |
| UI-K61c | P1 | Source: `PROVIDER_LABELS` only maps `groq|perplexity|gemini|tavily|exa`. If `aiProviders` includes extra keys (serper/mistral/nvidia), cards render **without labels**. |
| UI-K61d | P2 | `status.tsx` structure looks **fragile** — integrity block sits inside the provider grid open tag; ProviderCard title line references `PROVIDER_LABELS[name]` in a split fragment (maintain carefully). |
| UI-K63b | P2 | Mobile status: “8 AI pool slots live” list includes serper·mistral·nvidia in the banner while AI Engine cards are a different set — dual taxonomy still confusing. |
| UI-K64 | P2 | Open Research Lane badge **INCOMPLETE** while individual HF/Serper/Mistral show READY — mixed honesty signals. |
| UI-K65 | P2 | Bounded smolagents adapter row shows **unavailable** with long Qwen/Mistral notes — easy to misread as dig LLM failure. |

### Overview below fold

| ID | Sev | Finding |
|----|-----|---------|
| UI-K12b | P2 | Page height ~1296 on 900 viewport — priority section is a large empty dashed card with only a green @ glyph and truncated “i…” under the fold. Dead space for cold desk. |
| UI-K13 | P2 | “View all profiles →” present with zero entities — OK but leads to empty ledger. |

### Data sources below fold

| ID | Sev | Finding |
|----|-----|---------|
| UI-K93 | P2 | Page height ~1982 — long registry table continues past first screen; desktop table is usable; no sticky header observed for REGISTRY / JURISDICTION columns while scrolling (operator friction on long lists). |
| UI-K94 | P2 | Many registries marked **private research active** vs **production reviewed** — fine for operators, dense for first-time users. |

### Workspace activity `/jobs`

| ID | Sev | Finding |
|----|-----|---------|
| UI-K84 | P2 | Idle task chips (16) are a single cloud with no category headers in the RUNNING tab empty state — hard to scan. |
| UI-K85 | P2 | “0s ago” refresh stamp looks broken/stale when idle. |

### Connections (mobile re-confirm)

| ID | Sev | Finding |
|----|-----|---------|
| UI-K40b | **P0** | Reconfirmed mobile: **“No people on the graph yet”** overlaid on **“NO ENTITIES YET”** (or second line) with mixed body text and **four buttons fused** (Open ledger / Data sources / Live reactor / Discover). |

### Source directory

| ID | Sev | Finding |
|----|-----|---------|
| UI-K100b | **P0** | Still hangs on HuggingFace load with no timeout UI after multi-second wait (prior pass). |

### Product-language tally (this pass)

Surfaces still teaching **pipeline** over free dig:
- Overview hero
- Jobs subtitle (“Pipeline jobs · ingestors…”)
- Research terminal (“5-ALGORITHM PIPELINE” / “PIPELINE ARCHITECTURE”)
- Reactor fixed scheme layers

Field manual remains the closest to bureau / free-dig truth.

### Automation limits (honesty)

- Document `scrollY` stayed 0 on several nested-scroll pages; below-fold notes use `page height` + partial captures.
- No live dig was started (operator did not request Launch) — live Reactor / Live Desk behavior under load not re-audited this pass.
- Tablet width (~768–1024) not separately emulated; density issues on ledger filters + status grids are expected to worsen there.

### Updated fix queue (unchanged top)

1. Connections double empty state (UI-K40)  
2. Source directory hang (UI-K100)  
3. `/discover` redirect (UI-K02)  
4. Status untitled provider cards (UI-K61)  
5. Scheme node truncation (UI-K20)  
6. Research page title + pipeline chrome (UI-K110/111)  
7. Pipeline wording pass (UI-K140)


---

## Pass 4 — click-through + design solutions (2026-08-24)

Focus: surfaces that look **bad, dense, or outdated**, with **concrete redesign ideas** (not only bug IDs).

---

### A. Connections empty state (worst visual debt)

**What looks bad:** Two messages stacked (“No people…” / “NO ENTITIES YET”), interleaved body copy, four CTAs fused into two overlapping buttons.

**Design solution:**
1. **Single empty state only** when `entities.length === 0`.
2. Hierarchy:
   - Icon (network, muted)
   - Title: **No people on the graph yet**
   - One line: Launch Atlas or open the ledger so relationships can appear.
   - **Primary CTA:** Launch Apex Atlas (palette gradient)
   - **Secondary:** Open ledger · Discover (outline)
3. Hide target dropdown / zoom / filter chrome until ≥1 entity exists — or disable with tooltip “Needs people first”.
4. Legend (HNWI/Corp/…) only when nodes exist.

---

### B. Reactor scheme (looks like 2019 “pipeline dashboard”)

**What looks bad:** Mid-word truncation, spaghetti edges, fixed multi-layer pipeline story, header overcrowded, “LIVE DESK ON” while idle.

**Design solutions:**
1. **Node cards:** wider min-width, `font-size: 11px`, `letter-spacing: 0.02em`, two-line clamp with ellipsis — never mid-glyph underscore look.
2. **Idle mode simplification:** when Atlas is idle, show a **compact tool palette** (search · dig · registries · synthesis) instead of the full spaghetti map; expand full map only when a dig is live or user toggles “Show full map”.
3. **Header strip:** one row — [Status pill NOMINAL/LIVE] [Launch / Pause·Stop] [optional progress]. Move ENTITIES/HOT LEADS/ASSETS to a slim secondary strip or Live Desk.
4. Rename **LIVE DESK ON** → **Live Desk** (toggle), default **off** when idle.
5. Product copy: replace “OPEN DIG · STANDBY” pipeline track with **“Free dig · model chooses tools”** or hide track until running.

---

### C. Entity ledger filters (power-user soup)

**What looks bad:** One horizontal strip with type chips, star/hidden, LIVE INTEL, CLEAR LEDGER, ADD, plus second ROUTE/QUALITY row — empty table below.

**Design solutions:**
1. **Empty desk:** collapse filters entirely; only search + primary “Launch” / “Discover”.
2. **With data:** 
   - Row 1: Search + type segmented control (All / Person / Company)
   - Row 2: “Filters” button → sheet/popover (route, quality, hot, billionaires)
3. Move **Clear ledger** into overflow menu (⋯) — destructive, not peer of Search.
4. Mobile: sticky search; chips in horizontal scroll with fade edges; no dual “ALL” lime pills.

---

### D. Workspace activity / Jobs (pipeline era)

**What looks bad:** “Pipeline jobs · ingestors…”; 16 grey idle chips under RUNNING; “0s ago”; Trigger a task competes with Launch.

**Design solutions:**
1. Rebrand page to **Workspace activity** fully — drop “pipeline” from subtitle.
2. **Running tab empty:** only the idle banner + **Launch Apex Atlas** primary (not a chip cloud).
3. Move the 16 tasks exclusively under **Available tasks** as a **categorized card grid** (Discovery / Enrichment / Review), not a tag cloud on Running.
4. Replace “0s ago” with **Last refreshed** only when a poll happened, or hide until first refresh.
5. Deprioritize one-off ingestors vs Launch — secondary “Manual tasks” disclosure.

---

### E. Discover / Search (sparse + registry-first)

**What looks bad:** Huge empty center; SEARCH looks dead-grey; suggestion chips overflow; still “public surface / registries” framing.

**Design solutions:**
1. Elevate query: large input + **always-visible primary Search** (lime/teal gradient when query non-empty; muted when empty — but not looking broken).
2. Suggestion chips: wrap to 2 rows max or horizontal scroll with chevron.
3. Empty state CTA order: **Search example query** · Launch Atlas · (optional) Load registries as tertiary.
4. Copy: “Find people and companies — ranked by contact quality” (not registry lecture).

---

### F. System status (confusing honesty)

**What looks bad:** Blank-title cards; “11 LIVE” vs “8 AI pool slots”; Open Research INCOMPLETE vs READY tiles; Groq LLaMA name.

**Design solutions:**
1. **Two clear sections only:**
   - **Dig LLMs** (Groq, Mistral, Gemini, NVIDIA) — each named card
   - **Search tools** (Serper, Tavily, Exa, Scrapfly…)
2. Header chip: **Dig ready** / **Search ready** counts, not a single “11 LIVE” that mixes categories.
3. Fix labels for every card; never render a pool without `PROVIDER_LABELS[key]`.
4. Open Research: one badge — Ready / Partial / Offline — with missing pieces listed once.
5. Rename Groq LLaMA → **Groq**.

---

### G. Research terminal `/research` (wrong identity)

**What looks bad:** Titled “Overview / Evidence workspace”; “5-ALGORITHM PIPELINE”; terminal cosplay.

**Design solutions:**
1. Page title: **Intel terminal** or **Evidence dig**.
2. Kill “5-algorithm pipeline” panel → **How dig works:** model chooses search → visit → tools → card.
3. Keep terminal aesthetic optional (power users); default a cleaner step log list.
4. Mobile: target select full width; run button sticky bottom.

---

### H. Overview home (hero OK, below-fold dead)

**What looks bad:** Pipeline copy; priority section empty dashed void.

**Design solutions:**
1. Hero: “Run live research — discovery, dig, contacts. Only real findings land here.”
2. Below fold when empty: **Get started** card with 3 steps (Launch · Watch Reactor · Open ledger) instead of empty priority profiles.
3. When populated: priority list as now.

---

### I. Source directory (broken experience)

**What looks bad:** Infinite HuggingFace spinner, blank canvas.

**Design solutions:**
1. **Timeout 8s** → error card: “Could not load OSINT directory” + Retry + link to Field manual.
2. Ship a **local curated subset** of tools so the page is never blank offline.
3. Skeleton loaders, not a lone spinner in a void.

---

### J. Global chrome / IA

**What looks outdated or noisy:**
- Dual Launch (header chip + page CTAs) — keep header Launch, page CTAs contextual.
- Sidebar “Workspace settings” dump (status, data sources, source dir, persona, duplicates, jobs) feels like admin leftovers.

**Design solutions:**
1. Group sidebar: **Desk** (Overview, Ledger, Discover, Connections, Reactor) · **Ops** (Status, Activity) · **Reference** (Manual, Data sources) · collapse Persona/Duplicates under Ops.
2. Consistent button roles: Primary = Launch only; Secondary = outline; Danger = coral Stop/Clear.
3. `/discover` → redirect `/search`; 404 page title = “Not found”, not “Overview”.

---

### Priority if implementing design (after P0 bugs)

| Order | Item | Why |
|------|------|-----|
| 1 | Connections single empty state | Unreadable today |
| 2 | Source directory timeout + fallback | Broken page |
| 3 | Status named cards + dig vs search split | Honesty / trust |
| 4 | Reactor idle simplification + node type | Looks oldest |
| 5 | Ledger filter collapse when empty | Mobile/desktop density |
| 6 | Jobs: chips off Running tab; no pipeline subtitle | Product clarity |
| 7 | Research title + kill 5-algorithm chrome | Messaging |
| 8 | Overview empty below-fold | First impression |

