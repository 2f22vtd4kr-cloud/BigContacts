# Apex Atlas — Pre-Replit Final Review Plan

**Purpose:** One systematic, multi-angle pass over the entire product before the next Replit deploy.  
**Rule:** Real running app only. No mockups, no generated “looks like UI” images. Screenshots from Vite (desktop + mobile viewport).  
**Tip of record:** track `main` SHA at review start and end.

---

## 0. Environment setup (must complete first)

### 0.1 Monorepo
```bash
git clone https://github.com/2f22vtd4kr-cloud/BigContacts.git
cd BigContacts
git checkout main && git pull origin main
# confirm root has: package.json, pnpm-workspace.yaml, artifacts/apex-finder, artifacts/api-server, lib/db
```

### 0.2 Dependencies
```bash
pnpm install
# If frozen lockfile fails: regenerate lockfile *metadata only*, do not invent product deps
```

### 0.3 Secrets (local `.env` for API — never commit)
| Variable | Role |
|----------|------|
| `DATABASE_URL` | Postgres |
| `REDIS_URL_1` … `REDIS_URL_5` | Job queue / cache (5) |
| `GROQ_API_KEY` | LLM |
| `TAVILY_API_KEY` | Search |
| `SERPAPI_KEY` / `SERPER_API_KEY` | Search |
| `EXA_1` / `EXA_2` | Search (2) |
| `GEMINI_API_KEY` | LLM |
| `NVIDIA_NIM_API_KEY` | LLM |
| `MISTRAL_API_KEY` | LLM |
| `HF_TOKEN` | Models |
| `SCRAPFLY_API_KEY` / `ZENROWS_API_KEY` | Fetch |
| `COMPANIES_HOUSE_API_KEY` | Registry |
| `WHOISJSON_API_KEY` | Domain |
| `ENABLE_AUTO_PIPELINE=false` | No mass background burn |

### 0.4 Database + Python tools
```bash
pnpm --filter @workspace/db exec drizzle-kit push   # or project’s documented schema push
bash scripts/install-python-tools.sh                 # holehe / maigret / sherlock if used
```

### 0.5 Vite + API (dual process)
```bash
# Terminal A — API
cd artifacts/api-server && pnpm dev   # expect :8080

# Terminal B — UI
cd artifacts/apex-finder && pnpm dev  # expect :23695
```

**Required Vite proxy** (if missing, add before review):
```ts
server: {
  proxy: {
    '/api': { target: 'http://127.0.0.1:8080', changeOrigin: true },
  },
}
```

### 0.6 Health gates before screenshots
- `GET http://127.0.0.1:8080/api/healthz` → 200 JSON (Redis + providers)
- Open `http://127.0.0.1:23695/` → Overview renders, not blank
- Network tab: `/api/*` from UI hits API, not 404 HTML

### 0.7 Screenshot protocol
| ID | Viewport | Device scale |
|----|----------|--------------|
| D | 1440×900 | 1 |
| M | 390×844 | 2 |

Save under `screenshots/final-review/{NN}-{route}-{d|m}.png`.  
After each batch: open images, note defects, fix or log — do not mark “pass” on unreviewed files.

---

## 1. Review axes (every surface judged on all)

1. **Visual / design system** — black `#050505` + gold `#eab308`; no toxic cyan/amber leftovers; hairlines; no double headers; no buttons-in-buttons; press feedback  
2. **Layout / density** — no crop at edges; safe-area mobile; scroll where needed; no empty “offline-looking” when healthy  
3. **Interaction** — Launch / Stop states; single Launch control logic; delete confirms; filters; deep links  
4. **Content honesty** — zero fake people/companies; empty states truthful; URLs only if real  
5. **A11y** — focus visible; target size; `aria-live` for live desk; reduced-motion  
6. **API contract** — JSON not HTML; error banners; health reflects real keys  
7. **OSINT pipeline** — fail-closed contacts; trash gates; method-aware reactor chrome  
8. **Ops / deploy** — secrets mapping; ports; SPA on public URL; Python tools present  

---

## 2. Route inventory (screenshot + checklist each)

| # | Route | Name | Desktop | Mobile | Priority |
|---|-------|------|---------|--------|----------|
| 01 | `/` | Overview | D+M | P0 |
| 02 | `/reactor` | Intelligence Reactor | D+M | P0 |
| 03 | `/reactor` live/arming | Live desk states | D+M | P0 |
| 04 | `/profiles` | Entity ledger | D+M | P0 |
| 05 | `/profiles` expanded card | Mobile delete/star/hide | M | P0 |
| 06 | `/search` | Discover | D+M | P1 |
| 07 | `/network` | Connections graph | D+M | P1 |
| 08 | `/jobs` | Workspace activity | D+M | P1 |
| 09 | `/status` | System status | D+M | P0 |
| 10 | `/data-sources` | Data sources | D+M | P1 |
| 11 | `/osint-tools` | Source directory | D+M | P2 |
| 12 | `/improvements` | Persona review | D+M | P2 |
| 13 | `/duplicates` | Duplicate review | D+M | P2 |
| 14 | `/manual` | Field manual | D+M | P2 |
| 15 | `/research` | Research terminal | D+M | P1 |
| 16 | `/profile/:id` | Profile (if any real id) | D+M | P1 |
| 17 | 404 | Not found | D | P2 |
| 18 | Shell | Sidebar + header keys + Launch/Stop | D+M | P0 |

Aliases to verify redirect only (no separate design): `/entities`→`/profiles`, `/graph`→`/network`, `/deep-search`→`/search`, `/ledger`→`/profiles`.

---

## 3. Phase A — Shell & design system

**Pass criteria**
- [ ] One logo mark; not crushed into corner (safe-area + padding)
- [ ] Sidebar: soft boundary (no harsh white rule)
- [ ] Header: workspace/provider status visible; horizontal scroll on mobile if needed
- [ ] Launch Atlas: one logical control per context; when running shows **Stop**, not second Launch
- [ ] No dual page titles (desk title + page H1 fighting)
- [ ] Gold tokens consistent (primary, borders, chips)

**Screenshots:** shell idle D/M; shell running (if job active) D/M.

---

## 4. Phase B — Overview (`/`)

- [ ] Hero copy plain language
- [ ] Primary CTA Launch works (202 job)
- [ ] Empty desk honest (no Griffin / demo face)
- [ ] Secondary links not nested hollow chips
- [ ] Mobile CTA stack not cropped

---

## 5. Phase C — Reactor (`/reactor`) — highest scrutiny

### C1 Visual language
- [ ] **No** macOS red/yellow/green traffic lights
- [ ] Method tiles: Search / Fetch / Extract / Domain / Footprint / Bureau
- [ ] LIVE / DONE / FAIL status only
- [ ] URL bar only when real URL exists

### C2 Live step list density
- [ ] No duplicate Now/Done rows
- [ ] Compact scene card on mobile
- [ ] Step strip one-line chips
- [ ] Live scene cap sensible (≤6 live buffer)
- [ ] Step list scrollable; **Live** jumps to current
- [ ] Stop research control reachable

### C3 States to capture
| State | How |
|-------|-----|
| Idle | No job |
| Arming | Just after Launch |
| Live steps | During atlas-run |
| Empty live | Live but no events yet |
| History | Hist toggle |
| Done | After job completes |

---

## 6. Phase D — Entity ledger (`/profiles`)

- [ ] Empty state: no demo rows
- [ ] Filters (type / starred / hidden) gold-filled when active
- [ ] Desktop row: delete / star / hide
- [ ] Mobile expand: Profile, Network, Research, **Delete**, Star, Hide
- [ ] Bulk select → CSV / Research / **Delete**
- [ ] **Clear ledger** → type `DELETE ALL ENTITIES`
- [ ] API: `DELETE /entities/:id`, `POST /entities/bulk-delete`, `POST /entities/purge-all`

---

## 7. Phase E — Discover, Network, Research, Jobs

| Page | Checks |
|------|--------|
| `/search` | Search UI; no crash if API down; offline banner |
| `/network` | Graph loads or honest empty; no mock people when not `?mock=1` |
| `/research` | Terminal usable; no invented targets |
| `/jobs` | Idle copy clear; job rows if any; cancel/stop where applicable |

---

## 8. Phase F — Status & data plane

- [ ] `/status` lists configured providers (Redis count, Exa, search, LLM)
- [ ] Inactive keys shown as missing, not “healthy”
- [ ] `/data-sources` and `/osint-tools` explain pools vs tools
- [ ] Python OSINT tools: install script success ≠ optional warning left unfixed on Replit

---

## 9. Phase G — Admin / quality surfaces

- [ ] `/duplicates` merge flow safe
- [ ] `/improvements` persona = server job queue, not client magic commit
- [ ] `/manual` matches real product (job queue section, no stale jargon)

---

## 10. Phase H — API & pipeline (non-UI)

```bash
curl -s localhost:8080/api/healthz | jq .
curl -s -X POST localhost:8080/api/ingest/atlas-run -H 'content-type: application/json' -d '{}' 
# expect 202 + job id; then cancel if only smoke-testing
curl -s -X DELETE localhost:8080/api/ingest/atlas-lock
```

**Contact quality**
- [ ] `isTrashPhone` / `isPlaceholderEmail` / `isTrashContactValue` still on write paths
- [ ] Org inbox never labeled Personal
- [ ] No vanity `name.com` synthesis

**Floor scripts (if present)**
```bash
node scripts/check-trash-phone.mjs
node scripts/check-visibility-floor.mjs
# holdout extract only if keys + policy allow
```

---

## 11. Phase I — Mobile-only bug hunt

For every P0/P1 route at 390×844:
- [ ] No horizontal page scroll (except intentional chip rails)
- [ ] Sticky headers don’t obscure focus
- [ ] Tap targets ≥ 40px where primary
- [ ] Bottom content not under home indicator

---

## 12. Phase J — Cross-cutting bug classes (regression list)

| Bug class | Still forbidden |
|-----------|-----------------|
| Fake seed people | Never on cold boot |
| Double Launch | One control + Stop when running |
| Traffic-light chrome | Method chrome only |
| Unreadable text | Light-on-light / white-on-tan |
| Harsh white sidebar | Soft gold/ambient only |
| API HTML crash | `readApiJson` + offline UI |
| Extra secrets in prompt | No GOOGLE/WHOXY required |
| Sparse GitHub main | Root workspace files present |

---

## 13. Phase K — Competitor / product POV (written, not screenshot)

Answer in review notes:
1. What does Apex do that Apollo/Hunter/registry browsers/chat agents do not?
2. Where can a cold Grok Agent still beat Apex on one target? (treat as P0 pipeline bug)
3. Is the desk operable by a non-engineer in 5 minutes?

---

## 14. Defect workflow

1. Log: `route | viewport | severity | evidence screenshot | expected`
2. Fix on branch/`main` with real commit (no one-line theater)
3. Re-screenshot only the affected surface
4. Severity: **P0** blocks Replit · **P1** same day · **P2** backlog

---

## 15. Exit criteria (Replit allowed only when all true)

- [ ] All P0 checklist items checked with screenshots on disk
- [ ] `main` pushed; SHA recorded
- [ ] healthz green locally with real Redis + ≥1 search + ≥1 LLM key
- [ ] Launch → running → Stop verified once
- [ ] Ledger empty on fresh DB; delete/purge verified once
- [ ] No traffic lights; method chrome confirmed on reactor
- [ ] Mobile P0 routes reviewed at 390×844
- [ ] Replit prompt updated to match this SHA + secret **names only** (5 Redis, 2 Exa)

---

## 16. Suggested schedule

| Block | Duration | Focus |
|-------|----------|--------|
| 0 Setup | 30–45 min | Install, proxy, healthz |
| A–B Shell + Overview | 45 min | |
| C Reactor | 90 min | All states + density |
| D Ledger | 60 min | CRUD + purge |
| E–G Other routes | 90 min | |
| H Pipeline | 45 min | API + gates |
| I Mobile sweep | 60 min | |
| J–K Notes + fixes | 60–120 min | |
| Final screenshot pack | 30 min | |

**Total:** ~1–1.5 working days for an honest pass, not a skim.

---

## 17. Artifact layout

```
screenshots/final-review/
  01-overview-d.png
  01-overview-m.png
  02-reactor-idle-d.png
  ...
docs/PRE_REPLIT_FINAL_REVIEW.md    # this plan
docs/PRE_REPLIT_REVIEW_LOG.md      # filled during execution (defects + SHAs)
```

---

## 18. After the plan executes

Only then: generate the **ultimate Replit Agent prompt** (import `main`, ask secret names, ports 8080/23695, proxy + SPA, Python tools required, `ENABLE_AUTO_PIPELINE=false`).

---

## Next: Stage 2

Runtime, pipeline, comparison, and go/no-go: [`docs/PRE_REPLIT_FINAL_REVIEW_STAGE2.md`](./PRE_REPLIT_FINAL_REVIEW_STAGE2.md)

Also: Stage 3 (hosted): [`docs/PRE_REPLIT_FINAL_REVIEW_STAGE3.md`](./PRE_REPLIT_FINAL_REVIEW_STAGE3.md)
