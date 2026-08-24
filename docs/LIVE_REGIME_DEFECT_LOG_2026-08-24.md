# Live-regime defect log — Apex Atlas

**Captured:** 2026-08-24 (EEST morning / ~06:26–06:31 UTC)  
**Host:** `https://3ecc87b9-dc16-47a4-bcfe-a2e8150f0c36-00-1zlq4opcezhyh.worf.replit.dev`  
**Local tip at time of monitor:** `0325311` (integrity batch) — **deployed UI tip not confirmed equal to local tip**  
**Job observed:** `b4cbb630-c970-49e5-adea-5b01c790a0dd` (atlas-run)  
**Operator stop test:** `POST /api/ingest/atlas-stop` → `status: cancelled` (API honest)

**Purpose:** Single living queue of every problem noticed in live regime (desktop + mobile web + API).  
Use this document to audit, prioritize, fix, and re-verify. Do **not** treat items as optional polish when severity is P0/P1.

**How to use**
1. Reproduce on the same host (or next Replit deploy).
2. Fix in tip order: P0 → P1 → P2.
3. Mark each item **VERIFIED** only after a live re-check (not unit-only).
4. Append new live findings under **Addendum** with timestamp — do not erase history.

---

## Snapshot — what was healthy

| Signal | Observed |
|--------|----------|
| Desk `/` HTML | Non-blank SPA (`Apex Atlas` title, assets load) |
| `GET /api/healthz` | `200`, `status: ok` |
| `bureauIntegrity` | **ok** (empty reasons) |
| Redis | `ok`, PING cache hit |
| `autoPipeline` | `false` |
| Keys chip | **5–6 LIVE** (not “KEYS OFF” while providers configured) |
| Providers with slots | gemini, nvidiaNim, serper, tavily, exa×3, mistral, companiesHouse, scrapfly, zenrows |
| Providers zero (honest) | perplexity `0`, whoxy `0`, groq later `0` (rate-limited) |
| Free dig path | Target Contact Agent + `agentic-web` / Serper / page-fetch with natural queries |
| Stop API | `cancelled` + message “Stopped by operator.” / “Atlas stopped.” |
| UI after stop | Idle / NOMINAL / “Atlas idle” — **not FAILED** |

---

## P0 — Product / integrity lies or broken core surfaces

### LIVE-01 · Dig runs, cards stay empty (primary product failure)

**Severity:** P0  
**Seen:**  
- Entity **Earl E Congdon** (id 3): target contact agent completed; Serper queries; page-fetch on ODFL IR board (`48 contact fact(s) extracted` in bureau log); SEC DEF14A visit; multiple contact-oriented web_search lines.  
- Phase J complete telemetry: `0 direct verified · 0 personal direct candidates · 0 validated vectors · 0 organization contacts · 0 domains resolved`.  
- `GET /api/entities/3` → `email: null`, `phone: null`, `linkedinUrl: null`, `contacts: []`, `contactOutcome: evidence_only` (after earlier `none`).  
- Same empty card fields for **Gordon Gund** (id 1) and **Carl C Icahn** (id 2).

**Why it matters:** Card is the answer. Dig without promote is a desk that works and a product that fails.

**Likely causes (audit, do not guess-fix):**  
1. Extraction yields facts that fail validation / host-score / fail-closed filters.  
2. Promote path (`promoteBureauContactsToEntityCard`) never receives items or skips all.  
3. Phase J disposition zeros out after agentic pass.  
4. IR-page “48 facts” are not structured email/phone/LinkedIn vectors.

**Acceptance:** After one single-target dig on a known public executive (e.g. Congdon / ODFL), card shows at least one attributable public vector (email **or** phone **or** LinkedIn URL) **or** an explicit honest outcome with stored evidence rows explaining zero (not silent empty).

**Re-verify:** `GET /api/entities/{id}` + Profile UI “HOW TO REACH THEM” + ledger columns.

---

### LIVE-02 · Connections / Network graph crash

**Severity:** P0 (surface unusable)  
**Seen (desktop):** Navigate `/network` → ErrorBoundary message:

> Connections view could not not start  
> Cannot access 'E' before initialization  

**Notes:** Typo “could not not”; GraphErrorBoundary is catching (not infinite blank), but graph is dead.  
**Likely:** Temporal dead zone / import order / circular init in graph page or Cytoscape/ForceGraph bootstrap (`E` before init).

**Acceptance:** `/network` renders graph or empty-state (“no relationships yet”) without ErrorBoundary; no TDZ exception in console.

**Re-verify:** Desktop + mobile web `/network` with 0 edges and with ≥1 relationship.

---

### LIVE-03 · Deployed UI tip may lag integrity commits (fixed-plan chrome still visible)

**Severity:** P0 for honesty contract if deploy is stale; P1 if only residual strip copy  
**Seen (desktop Reactor while LIVE):**  
- `ENTITY JOURNEY · PHASE 1/10`  
- `ENTITY FLOW · 1/10`  
- Idle strip still capable of `11 CHECKPOINTS · 10 PHASES` wording after stop  

**Local tip `0325311` / `b0b45ca`:** open-ended phase labels (no `/10` on status strips).  
**Inference:** Replit build may predate UI integrity commits, **or** progress bar component still hardcodes 10 phases.

**Acceptance:** Live desk shows open-ended copy (`PHASE N` or stage name only; no “N of 10 plan”). `git log -1` on Replit matches or exceeds integrity tip; hard refresh shows new assets hash.

**Re-verify:** View-source / network tab asset hashes + Reactor header strings while running and idle.

---

## P1 — Live desk / mobile / research path defects

### LIVE-04 · Mobile desk stuck on “ARMING DESK…” while dig already active

**Severity:** P1  
**Seen:** Mobile `/reactor` showed **ARMING DESK…** / “POWERING RESEARCH LANES” scaffold while:  
- Header already **LIVE** on target (e.g. Earl E Congdon)  
- Stage **TARGET CONTACT AGENT**  
- Bureau logs already had web_search / page-fetch  

**Why it matters:** Operator cannot see tool scenes; looks like the desk is still bootstrapping.

**Acceptance:** Arming ≤ ~2s after first live event; then live scenes (Now/Done) or honest empty live with stage line — never arming for the whole dig.

**Re-verify:** Mobile web during first 60s of a Launch.

---

### LIVE-05 · Mobile “Target N/9” batch language

**Severity:** P1 (plan-language residual)  
**Seen:** `Target 1/9`, `Target 3/9: 🍳: Earl E Congdon` under LIVE header.

**Note:** Batch index from orchestrator is real; UI should not read as fixed dig step plan. Prefer “Target 3 in this run” / open-ended without implying 9 fixed research steps.

**Acceptance:** No “N/9” that can be read as dig plan; batch progress, if shown, labeled as discovery batch index.

---

### LIVE-06 · Phase J reports zero after agentic extraction claimed contact facts

**Severity:** P1 (feeds LIVE-01)  
**Seen:** Bureau `page-fetch` why-text: `page read · 48 contact fact(s) extracted` on ODFL IR URL; later Phase J: all zeros.

**Audit questions:**  
- Are “contact facts” structured fields or raw text counts?  
- Do they enter dig bag / contact_evidence?  
- Does host-score reject IR domain?  
- Does fail-closed drop person-unlinked org numbers?

**Acceptance:** Either vectors land on card/evidence, or bureau log emits an explicit reject reason per dropped fact (auditable).

---

### LIVE-07 · Entity ledger route blank once during session

**Severity:** P1  
**Seen:** Desktop navigation to `/entities` produced a full blank dark frame (no chrome). Overview and Profile continued to work; entity API returned 3 rows.

**Possible:** Client routing/error, transient JS exception, or first-load race.

**Acceptance:** `/entities` always renders table or empty ledger; ErrorBoundary if fail; never pure blank.

**Re-verify:** Hard load `/entities`, client nav from Overview, mobile width.

---

### LIVE-08 · Groq exhausted mid-run (capacity, not a lie — track impact)

**Severity:** P1 (capacity / dig depth)  
**Seen:** `providers.groq` went `1` → `0`; mobile banner: *Groq rate-limited (1 configured; rotating)*. Chip stayed **5 LIVE**. Integrity remained ok.

**Acceptance:** Dig continues on Gemini/Mistral/NVIDIA failover without stalling forever; banner remains dismissible; card quality not solely dependent on Groq.

**Ops note:** Add more `GROQ_API_KEY_*` or rely on non-Groq dig capacity for long discovery batches.

---

### LIVE-09 · Parallel targets / busy log vs single workbench focus

**Severity:** P1 (operator clarity)  
**Seen:** Telemetry and log interleaved Gordon Gund, Carl C Icahn, Earl E Congdon while workbench titled one name. Desktop live desk dense with DONE windows + “no detail text stored.”

**Acceptance:** Live desk prioritizes current targetName; stale other-target events archived; DONE scenes always carry one-line result or “no public vector found.”

---

## P2 — Polish / copy / secondary

### LIVE-10 · Error copy typo on Network boundary

**Severity:** P2  
**Seen:** “Connections view could **not not** start”

**Acceptance:** Single “not”; optional link to ledger only.

---

### LIVE-11 · Profile completeness still 3/10 with empty reach

**Severity:** P2 (expected if LIVE-01 unfixed)  
**Seen:** Congdon profile: Name/Type/Nationality only; “No public email or phone on file”; quality “Thin evidence”; reach “No path.”

**Acceptance:** After successful dig/promote, completeness and reach reflect real vectors.

---

### LIVE-12 · Desktop Reactor still labels “10 PHASES” in idle journey chrome

**Severity:** P2 (related to LIVE-03)  
**Seen after stop:** `ENTITY JOURNEY · 11 CHECKPOINTS · 10 PHASES`

**Acceptance:** Open-ended journey chrome (“OPEN DIG” / stage-based), matching integrity commits.

---

### LIVE-13 · Keys chip oscillated 6 → 5 LIVE

**Severity:** P2  
**Seen:** Overview 6 LIVE; later Reactor/Network 5 LIVE (Groq drop). Not a lie; ensure chip never sticks high after exhaustion without refresh.

**Acceptance:** Chip tracks `/api/system/status` or healthz within one poll interval.

---

### LIVE-14 · Discovery still inventing venue batches while cards empty

**Severity:** P2 (product priority)  
**Seen:** Messages like `[4/9] European venue owners (Monte Carlo, Italian hotels…)` while existing HNWI cards have zero reach vectors.

**Acceptance:** Prefer finishing contact promote on current entities before broad discovery expansion when `RESEARCH_DEPTH=standard` (policy choice — document, don’t silent-change).

---

## Already verified good (do not re-open without new evidence)

| Item | Evidence |
|------|----------|
| Stop → cancelled (API) | POST atlas-stop JSON `status: cancelled` |
| UI not FAILED after stop | Mobile NOMINAL / Atlas idle; desktop NOMINAL / IDLE |
| bureauIntegrity ok | healthz |
| No fake Perplexity LIVE with 0 keys | providers.perplexity = 0; no Perplexity LIVE chrome forced |
| Keys not “OFF” while configured | 5–6 LIVE chip |
| Free dig queries model-owned | Serper titles with natural contact/bio language; “Model-owned dig; card is the answer” |
| Redis PING cache | healthz `redis.cached: true` |
| autoPipeline off | healthz `autoPipeline: false` |

---

## Priority order for the next coding pass

1. **LIVE-01 + LIVE-06** — dig → structured vectors → card promote (or explicit reject reasons).  
2. **LIVE-02** — Network graph TDZ / init crash.  
3. **LIVE-03 + LIVE-12** — confirm deploy tip; open-ended Reactor chrome on live host.  
4. **LIVE-04 + LIVE-05** — mobile arming overstay + batch label honesty.  
5. **LIVE-07** — entities blank frame.  
6. **LIVE-08 / LIVE-09 / LIVE-10+** — capacity, desk focus, polish.

**Do not**
- Add micro-training playbooks (IR penalty tables, ranked prefer objectives, hard 1-800 dig scripts).  
- “Fix” empty cards only by force-hops.  
- Claim success on empty cards because Reactor looked busy.

---

## Reproduction kit

```bash
BASE=https://3ecc87b9-dc16-47a4-bcfe-a2e8150f0c36-00-1zlq4opcezhyh.worf.replit.dev

curl -sS "$BASE/api/healthz" | jq '{status,bureauIntegrity,providers,redis,autoPipeline}'
curl -sS "$BASE/api/ingest/atlas-status" | jq '{status,active,progress,atlasPhase,message,atlasTelemetry}'
curl -sS "$BASE/api/entities?limit=50" | jq '[.[] | {id,name,contactOutcome,email,phone,linkedinUrl,contactConfidence}]'
curl -sS "$BASE/api/entities/3" | jq '{id,name,contactOutcome,email,phone,contacts,notes}'

# Stop honesty
curl -sS -X POST "$BASE/api/ingest/atlas-stop" -H 'Content-Type: application/json' -d '{}'
```

UI paths to click every session: `/` → `/reactor` (desktop + mobile width) → `/entities` → `/profile/{id}` → `/network` → Stop once.

---

## Addendum

_Append new live findings below with UTC timestamp. Do not delete prior entries._

### 2026-08-24T06:31Z — monitor session closed
- Stopped job `b4cbb630-…` after integrity check.  
- Three entities on ledger; zero contact fields filled.  
- Network ErrorBoundary confirmed.  
- Document created: `docs/LIVE_REGIME_DEFECT_LOG_2026-08-24.md`.


### 2026-08-24T06:35Z — desktop Live Desk overlap + mobile Launch noise

**LIVE-15 · Desktop Live Desk overlapping windows (P0 UI)**  
**Seen:** Screenshot — side panel cards stacked/colliding; 2-column grid inside ~400px panel; dim/scale on non-focus cards read as overlap mess; maxScenes=10 overcrowded.  
**Fix (tip this commit):** `BureauOpsStage` `compact` → single-column flex stack, no dim/scale, `maxScenes={4}` on Reactor side panel, `overflowX: hidden`, panel maxWidth.  
**Status:** Fixed in code — re-verify on Replit after rebuild.

**LIVE-16 · Mobile Launch button: tiny type + oil noise (P1)**  
**Seen:** Mobile reactor Launch full-width oil surface; label too small; reads as noise not CTA.  
**Fix (tip this commit):** `h-14` / `text-[15px]` on mobile for primary+reactor; canvas opacity 0.78 on mobile; stronger label drop-shadow; keep oil style (do not replace surface).  
**Status:** Fixed in code — re-verify mobile web after rebuild. Desktop oil style unchanged in structure.


### 2026-08-24T06:41Z — mobile stacked glass + KEYS OFF + Phase 1/10 (screenshot)

**LIVE-17 · Mobile multi-layer glass stack (P0)**  
Workspace status panel used translucent `bg-popover` + light scrim over Reactor → Phase/capacity text ghosted through Launch and live desk.  
**Fix:** Opaque `#0c1220` sheet, fixed mobile position, `z-[70]`/`z-[80]`, dark scrim `bg-[#05070c]/85`.

**LIVE-18 · KEYS OFF while healthz has providers (P0 honesty)**  
Chip preferred system/status under-count before healthz.  
**Fix:** healthz-first count (serper/mistral/nvidiaNim/webSearch/agentic); system/status only adjusts tone.

**LIVE-19 · Phase N/10 in workspace chip panel (P1)**  
`phaseLabel` used `Phase ${phase}/${total}` with total default 10.  
**Fix:** `Phase ${phase}` open-ended only.

**LIVE-20 · Mobile “N steps” plan feel when idle/history (P1)**  
Copy shifted to `open` / `archived` counts.


### 2026-08-24T06:45Z — card quality vs independent research + promote fix

**LIVE-01 deep dive (Congdon / Gund / Icahn)**  
Independent research found public **organization** routes Atlas left off cards:
- Congdon/ODFL: HQ phone 336-889-5000, IR board mail path, odfl.com / ir.odfl.com  
- Icahn/IEP: IR 1-800-255-2737, EDGAR filer phone 305-422-4145  
- Gund: foundation + 14 Nassau St Princeton (13G address)

**Root cause in code:** `promoteBureauContactsToEntityCard` **skipped all orgish generic emails** (`isGenericLocal && orgish → continue`), so company switchboards never landed. Host score under-weighted IR/corporate URLs.

**Fix this tip:** Allow org switchboard emails; boost IR/corporate host scores (odfl.com, ielp.com, /ir., investor.). Outcome remains honest `organization_contact` via existing computeContactOutcome.

**Replit host:** 404 “Run this app” during audit — operator must restart API after pull.

**Do not:** Add ranked prefer playbooks or hard 1-800 dig scripts. Org routes with exact URLs are the product when personal vectors are absent.

### 2026-08-24T06:53Z — Apex vs independent comparison (no prefer-list)

Full scoreboard in `docs/context.md`. Summary: Apex empty cards on Congdon/Gund/Icahn; independent found org routes (ODFL 336-889-5000, FFB 800-683-5555 + info@, IEP IR 1-800-255-2737). Domain prefer scoring reverted (`1b3ce0e`). Gap is dig→structured findings→card, not more host rules.


### 2026-08-24T07:10Z — graph TDZ root cause
**LIVE-02:** `Cannot access 'E' before initialization` on Connections.
Cause in our code: dependency array referenced `width`/`height` before their `const` declaration (temporal dead zone; minifier names it `E`).
Fix tip `d670649`: declare size first, then effect; normalize `allEntities` to array; defer force-graph load.
