# Live UI audit — Kirk host · 2026-08-24 ~14:30 EEST

**URL:** https://d331280b-90c4-4117-afb3-0a8f166443d9-00-390ihneix8ipx.kirk.replit.dev/  
**Repo tip deployed (or near):** `93e2ded` header fix + `cc6180e` mobile ledger empty  
**Viewports:** Desktop 1920×900 · Mobile 750×1624  
**State:** Cold desk · entities 0 · Redis **not_connected** → WARN · DB 0/1 · 11 LIVE keys · integrity ok  

---

## What improved (verified live)

| Area | Result |
|------|--------|
| Mobile header | **☰ left · Launch · WARN · 11 LIVE** fits; no Launch-over-chips collision on Profiles/Search |
| Overview mobile | No header Launch (route `/`) · full-width body Launch OK |
| Mobile ledger empty | Filter soup **gone** · single empty card · Launch / Discover / Reactor stacked cleanly |
| Reactor desktop | New free-dig scheme layout is live (DIG CORE / SEARCH·VISIT / TOOLS / OUTCOME) |
| Reactor mobile idle | NOMINAL · Atlas idle · standby empty — readable |

---

## Still broken / bad (priority)

### P0 — must fix

| ID | Where | Issue |
|----|--------|--------|
| **LIVE-01** | `/network` desktop **and** mobile | **Double empty state still present.** “No people on the graph yet” stacked over “NO ENTITIES YET”; body copy interleaved; **Open ledger / Data sources / Live reactor / Discover** fused into overlapping button clusters. Same bug reported in prior audits — **not fixed on host.** |
| **LIVE-02** | Host infra | **Redis not connected** → WARN · DB 0/1 while keys show 11 LIVE. UI is honest; desk cache layer is down. Fix `REDIS_URL_1` + restart API. |
| **LIVE-03** | `/status` desktop | **Blank-title key cards** still (row with only “1 KEY CONFIGURED / 1 live now”). Provider labels missing for extra pool slots. |

### P1 — clear visual debt

| ID | Where | Issue |
|----|--------|--------|
| **LIVE-10** | Reactor desktop scheme | Node **labels still truncated** mid-word (`Person · company · que_`, `Dig capacit_`, `Boss · judg_`, `OPEN_`, `Maigret · H_`, etc.). Layout structure is better; typography still fails. |
| **LIVE-11** | Reactor desktop header | Crowded: title + Launch + FREE DIG track + NOMINAL + ENTITY FLOW + LIVE DESK ON. |
| **LIVE-12** | `/profiles` **desktop** empty | Full filter toolbar still shown (type / route / quality / Clear ledger) over empty table — mobile was fixed; **desktop was not.** |
| **LIVE-13** | Overview hero | Still says **“public-records pipeline”** — product is free dig. |
| **LIVE-14** | Discover mobile | Placeholder truncates (“in Texa”); SEARCH button looks disabled grey until query. |

### P2 — polish

| ID | Where | Issue |
|----|--------|--------|
| **LIVE-20** | Connections | Toolbar shows **Entity #0** with empty graph — meaningless. |
| **LIVE-21** | Connections | Legend visible with zero nodes. |
| **LIVE-22** | Status | “8 AI pool slots” vs header “11 LIVE”; Open Research **INCOMPLETE** while HF/Serper/Mistral READY. |
| **LIVE-23** | Overview | Large empty priority dashed block below fold. |

---

## Route checklist (this pass)

| Route | Desktop | Mobile |
|-------|---------|--------|
| `/` Overview | OK layout; pipeline copy | OK header; Launch full width |
| `/profiles` | Empty + **filter soup remains** | **Empty fixed** |
| `/reactor` | Free-dig map live; **truncation** | Idle OK |
| `/network` | **P0 double empty** | **P0 double empty** |
| `/search` | (not re-shot desktop) | OK shell; trunc placeholder |
| `/status` | **Blank cards** | (not re-shot) |

Not re-audited this pass: `/osint-tools`, `/jobs`, `/research`, `/manual`, live dig run.

---

## Recommended fix order (do these, don’t re-audit the same bugs)

1. **Connections single empty state** (LIVE-01) — one message, one CTA row  
2. **Status provider titles** (LIVE-03)  
3. **Scheme node text fit** (LIVE-10) — wider nodes or smaller tracking / 2-line clamp  
4. **Desktop ledger: hide filters when empty** (LIVE-12) — same rule as mobile  
5. **Overview copy** (LIVE-13)  
6. **Redis** (LIVE-02) — ops, not UI  

---

*Captured from live Kirk URL with desktop + mobile screenshots. No pretend-fixed items.*
