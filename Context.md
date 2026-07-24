# ApexFinder Pro — Session Context

> **ABSOLUTE RULE — no exceptions:**
> 1. Read `replit.md` AND `Context.md` at the start of every session (especially after any GitHub import).
> 2. Update `Context.md` after every meaningful iteration — update Current State + append to Iteration Log.
> 3. Update `replit.md` whenever env vars, DB counts, schema, or phases change.
> 4. Both files must be committed to the repo as part of any task that changes project state.

---

## Current State (2026-07-24 — latest import setup complete) — Core workflows healthy, auto-ingestion active

### Environment
- **Replit PostgreSQL** connected — `DATABASE_URL` set automatically ✅
- **Local Redis** running on `redis://localhost:6379` — workflow `Redis` running ✅
- **SESSION_SECRET** — ✅ Set
- **REDIS_URL** — ✅ Set (local Redis, env var `redis://localhost:6379`)
- **Upstash Redis (`REDIS_URL_1`)** — ✅ Set (permanent dedup set)
- **Upstash Redis (`REDIS_URL_2`)** — ✅ Set (permanent contact cache)
- **COMPANIES_HOUSE_API_KEY** — ✅ Set

### Workflows running
| Workflow | Status |
|---|---|
| Redis | ✅ Running (port 6379) |
| artifacts/api-server: API Server | ✅ Running (port 8080) |
| artifacts/apex-finder: web | ✅ Running (port 23695) |

### Post-import setup (2026-07-24, latest import)
1. `pnpm install` — all packages installed (22.3s, pnpm v10.26.1)
2. `pnpm --filter @workspace/db run push` — schema applied to fresh PostgreSQL DB (`[✓] Changes applied`)
3. All 4 artifacts registered via verifyAndReplaceArtifactToml (api-server, apex-finder, apex-mobile, mockup-sandbox)
4. Canonical artifact-managed Redis, API, and web workflows started
5. `/api/healthz` → `{"status":"ok","redis":{"status":"ok","latencyMs":1}}` ✅
6. Browser preview verified — ApexFinder dashboard loads at the root preview path
7. `REDIS_URL_1`, `REDIS_URL_2`, and `COMPANIES_HOUSE_API_KEY` confirmed as Replit Secrets; both Upstash slots connected on API startup
8. Fresh database detected on API startup; stale job locks/dedup state cleared and auto-ingestion started

### Measured live state (2026-07-24 10:49 UTC)
- Entities: **0 at initial post-schema check** | Assets: **0 at initial post-schema check** | Relationships: **0**
- Contact evidence: **not yet measured** — cache restoration is enabled through Upstash slot 2
- Research sessions: **0 at initial check**
- Active background work: Western HNWI ingestion and broad discovery; semantic engine loading
- Honest assessment: **app is running and auto-ingestion is active; counts will populate as background jobs complete**.

### Phase I — Road to 9/10 (implemented 2026-07-23)
All 4 Phase I items implemented and live. Build clean (esbuild ⚡ 1183ms). All 3 new endpoints verified returning 200:
- **I1** `resolveBeneficialOwner()` in `in-house-enricher.ts` — FAA LLC → person before enrichment (EDGAR EFTS + OpenCorporates)
- **I2** semantic-dedup threshold 0.93→0.87 + token overlap guard + `POST /api/relationships/name-exact-dedup` (strength 0.95, cross-registry exact matches)
- **I3-A** `POST /api/relationships/auto-detect-edgar-coinvestor` — EDGAR_CO_INVESTOR edges (HNWI/Gatekeeper co-shareholders, strength 0.75)
- **I3-B** `POST /api/relationships/foundation-colleagues` — FOUNDATION_COLLEAGUE edges (shared IRS 990 foundation name, strength 0.85)
- **I4** `enrichmentTier()` classifier — Tier 2 (FAA individuals) skips Wikidata/Wikipedia/ORCID/GitHub to focus budget on DDG-LinkedIn/DNS/RDAP
- Startup triggers added: edgar-coinvestor at 305s, name-exact-dedup at 310s, foundation-colleagues at 425s
- **Same-source duplicate review** — `GET /api/entities/same-source-name-clusters` groups exact names within normalized registries; `/duplicates` has a separate review-only tab and preserves manual merge/dismiss behavior
- Duplicate candidate token indexing now deduplicates tokens per entity, preventing self-pairs from repeated words in one name

### Iteration Log
| Date | Summary |
|---|---|
| 2026-07-23 | Fresh import boot: pnpm install, DB schema push, all 3 workflows running, cold-start ingestion auto-started |
| 2026-07-23 | All Upstash secrets restored; API Server restarted with both slots confirmed live |
| 2026-07-23 | Import setup completed: locked dependencies restored, Drizzle schema applied, artifact-managed API/Web workflows restarted, endpoint checks and browser preview passed; live ingestion is active |
| 2026-07-23 | Phase I (road to 9/10) fully implemented: I1 beneficial owner resolution, I2 dedup tuning, I3 warm-path edges, I4 tiered enrichment |
| 2026-07-23 | Same-source duplicate review implemented: new cluster endpoint and `/duplicates` tab verified against live data; duplicate candidate self-pair regression fixed; API smoke tests 14/14 passed; API/Web production builds passed |
| 2026-07-24 | Fresh import boot: pnpm install (20.4s), DB schema push ([✓] Changes applied), Redis+API+Web workflows restarted, /api/healthz → ok (latencyMs:0), all 3 secrets set (REDIS_URL_1/2, COMPANIES_HOUSE_API_KEY), cold-start ingestion auto-started |
| 2026-07-24 | Imported project setup verified: API health and web root return 200; artifact registration was restored and ApexFinder preview screenshot verified |
| 2026-07-24 | Imported project setup completed: frozen-lockfile dependencies restored, schema applied, canonical artifact workflows registered and running, duplicate legacy workflows removed, secrets confirmed, and fresh API/web preview verified |
| 2026-07-24 | Second import setup: pnpm install (16s), all secrets added (REDIS_URL_1, REDIS_URL_2, COMPANIES_HOUSE_API_KEY), schema pushed to fresh DB, API+web confirmed healthy; database is empty — ingestion needed to populate data |
| 2026-07-24 | Live-process bar redesign completed: replaced Lucide-icon ticker (broken clipping loop) with custom SVG glyph stream — 16 hand-coded glyphs (wikipedia, browser, github, dns, plane, registry, property, company, graph, etc.), icons move faster than explanatory text, seamless -50% loop on duplicated track, edge mask fade, process-specific glyphs+phrases for all 11 job types, desktop+mobile verified with 3 live jobs |
| 2026-07-24 | Live maintenance continued after setup: 28,000 entities, 28,000 assets, 642 contactable profiles, and 12,716 hot leads measured; relationships and research sessions remain pending |
| 2026-07-24 | Ran EDGAR issuer backfill and deterministic relationship passes: 228,362 CORPORATE_SERIES, 2,236 PROPERTY_AREA_PEER, 26 GEOGRAPHIC_PEER, 11 EDGAR_CO_INVESTOR, and 12 EDGAR_CO_SHAREHOLDER edges |
| 2026-07-24 | Restored 693 cached contacts; measured 936 contactable profiles, 343 emails, 613 phones, 100 EDGAR entities, 95 issuer-covered; API/web health and preview verified |
| 2026-07-24 | Fixed in-house enrichment state handling so website/address-only evidence remains eligible for later contact enrichment; corrected build and restarted API successfully |
| 2026-07-24 | Improved dashboard live-process bars with process-specific explainer marquees, icon trails, fading edges, mobile stacking, and reduced-motion support; frontend build and canonical workflows verified |
| 2026-07-24 | Fourth import setup: pnpm install (22.3s), schema pushed, all 4 artifacts registered, Redis+API+Web workflows running, /api/healthz ok; 32,002 entities from FAA+HMLR auto-ingestion; REDIS_URL_1/2 and COMPANIES_HOUSE_API_KEY not yet set |
| 2026-07-24 | All 3 missing secrets added (REDIS_URL_1, REDIS_URL_2, COMPANIES_HOUSE_API_KEY); API restarted — both Upstash slots confirmed live; 32,102 entities, 5 contactable profiles restored from cache; setup fully complete |
| 2026-07-24 | Fifth import setup: pnpm install (25.4s), Redis workflow started, schema pushed ([✓] Changes applied), all 4 artifacts re-registered via verifyAndReplaceArtifactToml, OutreachAssistant missing import fixed in router.tsx, API/web workflows running, /api/healthz ok (redis latencyMs:2), dashboard verified at 11,150 profiles; REDIS_URL_1, REDIS_URL_2, COMPANIES_HOUSE_API_KEY all set |
| 2026-07-24 | Latest import setup: requested and confirmed REDIS_URL_1, REDIS_URL_2, and COMPANIES_HOUSE_API_KEY through secure secrets flow; restored dependencies, pushed schema, registered all four artifacts, restarted Redis/API/web, verified API health and browser dashboard, and confirmed cold-start auto-ingestion is active |

---

## Previous State (2026-07-23 — GitHub import recovery) — All core workflows running, ingestion auto-started

### Environment
- **Replit PostgreSQL** connected — `DATABASE_URL` set automatically ✅
- **Local Redis** running on `redis://localhost:6379` — workflow `Redis` running ✅
- **SESSION_SECRET** — ✅ Set
- **REDIS_URL** — ✅ Set (local Redis)
- **Upstash Redis (`REDIS_URL_1`)** — ✅ Set (permanent dedup set)
- **Upstash Redis (`REDIS_URL_2`)** — ✅ Set (permanent contact cache)
- **COMPANIES_HOUSE_API_KEY** — ✅ Set

### Workflows running
| Workflow | Status |
|---|---|
| Redis | ✅ Running (port 6379) |
| API Server | ✅ Running (port 8080) |
| ApexFinder Web | ✅ Running (port 23695) |

### Post-import recovery + comprehensive audit (2026-07-23)

#### Recovery steps
1. `pnpm install` — all 1,229 packages installed
2. `pnpm --filter @workspace/db run push` — schema applied to fresh PostgreSQL DB
3. All three Upstash secrets restored (REDIS_URL_1, REDIS_URL_2, COMPANIES_HOUSE_API_KEY)
4. API Server and ApexFinder Web restarted — both Upstash slots confirmed live on boot
5. FAA + Western HNWI + broad-discovery auto-started on cold boot
6. 729 contactable entities restored from Upstash contact cache (slot 2) on boot

#### Bugs fixed this session
1. **research.tsx line 426** — user-facing terminal placeholder said "L4 MCTS Deep Path Exploration"; fixed to "L4 UCT Deep Path Exploration (120 rollouts)". MCTS is L4's internal algorithm; the system is Hybrid Research.
2. **ingest-enrichment.ts foundation-filings route** — `rows` SELECT was missing `phone`, `linkedinUrl`, `twitterHandle`, `instagramHandle`, `telegramHandle` columns, causing `computeContactConfidence` to receive `undefined` for all social signals and undercount confidence. Fixed: all 5 columns added to the select.

#### Full codebase audit — confirmed working ✅
- **Pipeline order**: web-first ✅ — broad-discovery fires at 15s, social-discovery at 45s, messenger at 60s, Hybrid Research at 90s, registries at 180s+
- **RECURRING_JOBS scheduler**: active at 46min mark — broad-discovery (30min), deep-web OSINT (30min), social-discovery (30min), Hybrid Engine re-score (2h), messenger-discovery (4h), registry re-verification (6h), persona loop (24h)
- **social-discovery.ts**: exists, routes exist, confidence correctly uses `computeContactConfidence` → `update.contactConfidence` ✅
- **messenger-discovery.ts**: exists, routes exist, confidence correctly uses `newConfidence` ✅
- **foundation-filings.ts**: exists, routes exist, confidence correctly uses `computeContactConfidence` ✅ (row select bug fixed above)
- **SKIP_DOMAINS**: does NOT block linkedin/twitter/instagram ✅ — social media routed to dedicated module
- **contact-validation.ts**: `isValidPublicEmail`, `sanitizePublicEmail` exist with full blocklist ✅
- **computeContactConfidence**: accepts all signal fields (email +35, phone +25, linkedin +15, telegram +12, twitter +8, instagram +5, address +5) ✅
- **Phase H DB columns**: linkedinUrl, twitterHandle, instagramHandle, telegramHandle, personalWebsite, foundationName all present in schema ✅
- **No user-facing MCTS strings**: all remaining MCTS references are internal code comments, variable names, or import statements ✅
- **ingest-pipeline.ts**: no "bulk-mcts" references ✅ — confirmed "bulk-hybrid-research" throughout
- **jobs.tsx**: no "bulk-mcts" references ✅

#### Test suite run — verified
- **Persona Loop**: 100 entities processed, 226 suggestions, 0 errors ✅
- **Hybrid Research bulk**: 300/300 sessions, 0 errors ✅
- **API health**: Redis latency 1ms, all endpoints responding ✅
- **Both Upstash slots**: connected on every restart ✅

#### Live DB state at end of session
- Entities: 32,101 | Assets: 32,100 | Relationships: 230,692
- Hot leads: 14,808 | Contactable: 729 | Research sessions: 624
- Persona suggestions: 226 (82 high, 84 medium, 60 low priority)
- FAA ingestor: running (cold-boot auto-start) | Western HNWI: running | Broad discovery: completed
- Deep Web OSINT: running (startup pipeline phase 1)

---

## Previous State (2026-07-23 — full audit + bug-fix pass) — All workflows running, ingestion active

### Environment
- **Replit PostgreSQL** connected — `DATABASE_URL` set automatically
- **Local Redis** running on `redis://localhost:6379` — workflow `Redis` running ✅
- **SESSION_SECRET** — ✅ Set
- **Upstash Redis (`REDIS_URL_1`)** — ✅ Set (permanent dedup set)
- **Upstash Redis (`REDIS_URL_2`)** — ✅ Set (permanent contact cache)
- **COMPANIES_HOUSE_API_KEY** — ✅ Set

### Workflows running
| Workflow | Status |
|---|---|
| Redis | ✅ Running (port 6379) |
| API Server | ✅ Running (port 8080) |
| ApexFinder Web | ✅ Running (port 23695) |

### What was verified and fixed this session (2026-07-23 — comprehensive audit)

**Codebase audit results — all Phase H features confirmed present:**
- ✅ Pipeline IS web-first: deep-web-osint at 15s, social-discovery at 45s, messenger at 60s, then Hybrid Engine at 90s, registries at 180s, graph at 240s, deep enrichment at 360s
- ✅ Recurring scheduler (RECURRING_JOBS / setInterval) active at 46-min mark — 7 persistent jobs (broad discovery, deep web, social, Hybrid Engine, messenger, registry, persona loop)
- ✅ All Phase H DB columns present: linkedinUrl, linkedinHeadline, twitterHandle, twitterBio, instagramHandle, telegramHandle, telegramBio, personalWebsite, foundationName
- ✅ All 3 enrichment modules exist and are routed: social-discovery.ts, messenger-discovery.ts, foundation-filings.ts
- ✅ SKIP_DOMAINS in web-enricher.ts does NOT block social media
- ✅ contactConfidence awards points for twitter (+8), instagram (+5), telegram (+12)
- ✅ Cold-start retry logic: 3 attempts with 10s intervals before aborting
- ✅ No "mcts" references in startup.ts phases or recurring scheduler labels

**Bugs found and fixed:**
1. **deep-web-osint.ts SKIP_DOMAINS** — still blocked linkedin/twitter/x/instagram even though social-discovery handles them. Fixed: removed social media from SKIP_DOMAINS, kept only search engines, e-commerce, encyclopaedias, gov registries.
2. **ingest-pipeline.ts line 345** — catalog entry `id: "bulk-mcts"` still present. Fixed → `bulk-hybrid-research`.
3. **jobs.tsx line 38** — UI job definition `id: "bulk-mcts"`. Fixed → `bulk-hybrid-research`.
4. **outreach.tsx** — 3 user-facing strings said "MCTS research session" / "MCTS investigation". Fixed → "Hybrid Research session" / "Hybrid Research investigation".
5. **profile.tsx** — "MCTS winning path" in Outreach Assistant description. Fixed → "Hybrid Research winning path".
6. **manual.tsx** — "MCTS Research Session" in Field Manual. Fixed → "Hybrid Research Session" with 5-layer description.
7. **data-sources.tsx** — "MCTS path scoring" in Semantic Embedding description. Fixed → "Hybrid Research path scoring".
8. **ingest-enrichment.ts social-discovery** — `contactCacheSet` used `result.confidence` (module-internal 0–100 signal) instead of `update.contactConfidence` (recomputed from all signals). Fixed.
9. **ingest-enrichment.ts messenger-discovery** — same wrong confidence in cache write. Fixed → uses `newConfidence`.
10. **ingest-enrichment.ts foundation-filings** — MISSING `computeContactConfidence` call entirely; contactConfidence never updated after foundation enrichment. Fixed: computes from all signals including new email/address, saves to DB and cache.

**Functional tests run:**
- Persona Loop (50 entities): ✅ 223 suggestions, 0 errors
- Hybrid Research bulk (300 entities): ✅ 300/300, 0 errors, 300 sessions
- API Server build: ✅ clean
- Frontend production build: ✅ clean

**Active ingestion at time of writing:**
- FAA: ✅ done (20,032 records, 30,000 dedup-skipped)
- Land Registry PPD: running (~8,750+ inserted, targeting 50,000)
- Western HNWI: running
- Deep-web OSINT: running (hot leads pass)
- Social discovery, Messenger discovery: running (from maintenance pipeline)

**Live DB at last check:** 44,901+ entities, 230,693 relationships, 738 contactable, 844 research sessions

---

## Previous State (2026-07-23 — pipeline recovery verified) — Redis + canonical API + Web running

### Environment
- **Replit PostgreSQL** connected — `DATABASE_URL` set automatically
- **Local Redis** running on `redis://localhost:6379` — workflow `Redis` running ✅
- **SESSION_SECRET** — ✅ Set
- **Upstash Redis (`REDIS_URL_1`)** — ✅ Set (permanent dedup set)
- **Upstash Redis (`REDIS_URL_2`)** — ✅ Set (permanent contact cache)
- **COMPANIES_HOUSE_API_KEY** — ✅ Set

### Workflows running
| Workflow | Status |
|---|---|
| Redis | ✅ Running (port 6379) |
| API Server | ✅ Running (port 8080) |
| ApexFinder Web | ✅ Running (port 23695) |

> **Verified pipeline recovery (2026-07-23):** canonical artifact workflows are running and `/api/healthz` returns Redis `ok`. Live database state: **81,528 entities, 80,305 assets, 264,253 relationships, 16,305 hot leads, 767 contactable entities, 600 research sessions**. FAA and HMLR jobs completed with 0 errors. Deep-web OSINT remains active as a background enrichment pass; its records are validated by a shared public-email sanitizer.

> **Contact filtering completion note (2026-07-23):** Finished the interrupted contactability UI/UX task. Entity Ledger contact filtering is now server-side and paginated, so it no longer stops at the old 500-row client-side cap or checks nonexistent `contactEmail`/`contactPhone` fields. Added Any Contact, Email, Phone, WhatsApp, Telegram, and Instagram filters to desktop and mobile, documented the query contract in OpenAPI, and regenerated the typed React/Zod clients. Web/API builds and frontend typecheck pass. Filter requests reach the API correctly; this fresh import's PostgreSQL schema has now been applied and dashboard/entity endpoints are responding normally.

> **Persona loop completion note (2026-07-23):** The original live run completed successfully for 100 real HNWI/Gatekeeper entities with **1,180 suggestions and 0 errors** (644 high / 241 medium / 295 low). After the pipeline recovery and enrichment stages, a fresh 100-entity run also reached `done` with **489 suggestions and 0 errors**. The database currently contains **1,669 improvement logs across all 8 deterministic personas**.

> **Hybrid Research verification note (2026-07-23):** Two fresh scheduled bulk passes reached `done`, each with **300/300 sessions created and 0 errors**, for **600 persisted `Pitch Generated` research sessions**. Sample sessions contain non-empty winning paths, MCTS/UCT steps, path scores, and generated outreach pitches. The stale queued `bulk-mcts` lock is repaired on startup and stale queued jobs are superseded by the bulk route.

> **Contact-data integrity note (2026-07-23):** A shared validator now rejects search-engine diagnostics and placeholder/privacy relay addresses across web and in-house enrichers. Boot sanitation removed **55 invalid PostgreSQL emails and 31 invalid cached entries**; the known `error-lite@duckduckgo.com` residue is gone. Contact confidence is recomputed without the invalid email, while valid phone and LinkedIn evidence is preserved.

### What was done this session (2026-07-23 — post-import setup)

1. **Dependencies restored** (`pnpm install`) — lockfile satisfied in 22s; the imported web and API services build and start successfully.
2. **DB schema pushed** (`pnpm --filter @workspace/db run push`) — schema applied to fresh Replit PostgreSQL; entity count queries now succeed.
3. **Workflows restarted** — Redis ✅, API Server ✅, ApexFinder Web ✅ all running.
4. **Cold-start auto-recovery triggered** — empty DB detected; server auto-started FAA, HMLR, broad discovery, and Western HNWI ingestion.
5. **Secrets restored** — REDIS_URL_1 and REDIS_URL_2 are set for persistent dedup/contact caching, and COMPANIES_HOUSE_API_KEY is set for optional Companies House enrichment. DATABASE_URL and SESSION_SECRET are present.

> **Import state (2026-07-23):** All three core workflows are running under artifact-managed workflows. The existing Drizzle schema is applied to the fresh PostgreSQL database, both persistent Redis slots connect successfully, and health, dashboard, hot-lead, and ingestion-job endpoints have been verified at HTTP 200. The database starts empty after import and is being populated by live public-registry ingestion.

### What was done this session (2026-07-23 — mobile UX fixes + star/hide/MCTS rename)

**5 targeted fixes + 2 new features — all graduated directly to production:**

1. **Mobile dashboard stats bar removed** (`dashboard.tsx`): `StatsBar` was rendering on mobile AND desktop, causing two conflicting stat areas (top bar showed "0 Active Research" while the green banner showed 3 jobs). Fixed by wrapping `<StatsBar />` in `<div className="hidden md:block">` — mobile now uses only `MobileStatTiles` + `MobileOperationsBanner` which have correct live job counts.

2. **"Active Research" → "Active Tasks"** (`dashboard.tsx`): Desktop StatsBar "Active Research" tile now reads `jobs.length` from `useJobPoll()` instead of `activeResearchSessions` from the DB stats endpoint. Correctly reflects live running background tasks. Link goes to `/jobs`.

3. **"MCTS Bulk Research" → "Hybrid Research"** (`ingest-pipeline.ts` line 345): The job label shown in the mobile "RESEARCH ACTIVE" banner and all job lists now says "Hybrid Research" instead of "MCTS Bulk Research".

4. **DB schema** (`lib/db/src/schema/entities.ts`): Added `isStarred boolean DEFAULT false` and `isHidden boolean DEFAULT false` columns. Schema pushed (`[✓] Changes applied`).

5. **Star + Hide API endpoints** (`routes/entities.ts`):
   - `PATCH /api/entities/:id/star` — toggles `isStarred`, clears entity list cache
   - `PATCH /api/entities/:id/hide` — toggles `isHidden`, clears entity list cache
   - `GET /api/entities` default view now excludes `isHidden=true` entities; `?starred=true` returns only starred; `?hidden=true` returns only hidden.
   - Hot leads (`routes/dashboard.ts`): `GET /dashboard/hot-leads` now filters `isHidden = false` so hidden profiles never appear in the priority queue.

6. **Entity Ledger — view mode tabs** (`entities.tsx`):
   - Desktop: "All / Starred / Hidden" pill tabs added to the toolbar (before the Live Intel button)
   - Mobile: "All / ★ Starred / ◌ Hidden" row added above type filter chips
   - View mode drives the API query (`?starred=true` / `?hidden=true`)

7. **Entity Ledger — Star/Hide buttons** (`entities.tsx`):
   - Desktop table: Star (⭐) and Hide (👁) icons appear in the per-row hover action group alongside Profile/Network/Research/Delete
   - Mobile card (expanded): 3-column action grid → 5-column with Star and Hide/Unhide buttons
   - Optimistic UI: local state updates immediately on click; API call fires in background; hidden entities removed from default view instantly

**Verified:** Production build passes. PATCH star/hide endpoints return `{id, isStarred}` / `{id, isHidden}` as expected.

> **Current import verification note (2026-07-23):** Fresh dependencies were restored from the lockfile. The web server returns HTTP 200 and `/api/healthz` reports Redis healthy; both Upstash Redis connections also initialize successfully. Dashboard data endpoints currently fail because PostgreSQL is unavailable in this imported workspace; do not interpret that as an empty database. The three configured workflows are running. The screenshot helper could not resolve the web preview because the imported artifact registry is empty, although the web server itself responds successfully. The production web build passes. Typecheck still reports pre-existing imported-project errors in shared UI typings/generated client declarations and the optional Expo artifact.

> **Responsive polish verification note (2026-07-23):** Mobile dashboard now mounts the full activity/context strip and keeps it visible during PostgreSQL outages; the entity ledger distinguishes loading, unavailable, and genuinely empty states; profile tabs use compact horizontally scrollable mobile labels and remain sticky while browsing; deep search uses a shorter mobile explanation and stacked pipeline/results layout; mobile menu controls meet touch-target sizing. Desktop dashboard remains the full two-column command center. ApexFinder production build passes. Browser/API 500s are still the known PostgreSQL-unavailable condition; Redis and `/api/ingest/jobs` remain healthy.

> **Mobile navigation note (2026-07-23):** Removed the mobile bottom navigation bar and its reserved 60px content padding. Mobile navigation now uses only the existing hamburger-triggered side menu; desktop navigation is unchanged.

### What was done this session (2026-07-23 — re-import #51 nav + UX fixes)

1. **Nav reordered** (`layout.tsx`): Intel HQ → Entity Ledger → Search → Network Graph → Intel Terminal → CRM Pipeline → Outreach, then collapsible "Tools & Admin" (Persona Loop, Data Sources, OSINT Tools, Duplicates, Background Jobs, Field Manual). Footer → "Phase G · v0.3".
2. **Router secondary routes** (`router.tsx`): /improvements, /data-sources, /osint-tools, /duplicates exposed directly instead of `/_` prefixes.
3. **BackgroundActivityCard** (`dashboard.tsx`): upgraded from one-liner ticker to live panel — polls /api/ingest/jobs every 15s, shows each running job name + progress bar (up to 3 visible).
4. **"Avg Signal" → "Wealth Signal"** in stats bar — clearly distinct from the Access score concept.
5. **Profile dual badges** (`profile.tsx`): Access and Wealth badges now side-by-side with clear "Access" / "Wealth" labels instead of stacked with a single "HNWI Signal" caption.
6. **Profile CRM link** fixed: `/crm` → `/pipeline` (direct route, no redirect needed).
7. **All 4 artifacts registered** + secrets set (REDIS_URL_1, REDIS_URL_2, COMPANIES_HOUSE_API_KEY).

### What was done this session (2026-07-23 — Research Command Center frontend)

1. **Canvas design direction**: extracted the real dashboard into the mockup sandbox and created one responsive Research Command Center direction. Desktop and mobile previews are live on Canvas; the mockup keeps the Atlas dark emerald/blue language while foregrounding contactability and visible research progress.
2. **Dashboard hierarchy** (`artifacts/apex-finder/src/pages/dashboard.tsx`): replaced the map-first Intel HQ with a responsive Best Next Contacts queue and Background Activity rail. Access/contactability is primary; wealth, assets, and registry context are secondary.
3. **Live research visibility**: the dashboard polls `/api/ingest/jobs` every 5 seconds, showing queued/running task labels, progress, messages, completed results, retry state, and a real `/jobs` activity link. Mobile uses a horizontal activity feed before the contact queue.
4. **Production navigation and states**: lead cards link to real profile/network routes, show only contact evidence available from the API contract, remove manual target-count ingestion controls from the dashboard, and preserve a compact global context section.
5. **Verification**: ApexFinder production build passes; dashboard-specific TypeScript is clean. Existing typecheck failures remain in shared `button-group.tsx` and `calendar.tsx`. PostgreSQL-backed dashboard requests still return 500 in this import, so the new UI renders an explicit recoverable unavailable-data state rather than an unexplained empty database.

### What was done this session (2026-07-23 — re-import #51 nav restore)

1. **Nav reordered and restored** (`layout.tsx`): renamed mainNav items to correct Atlas labels (Intel HQ, Entity Ledger, Search, Network Graph, Intel Terminal, CRM Pipeline, Outreach). Added "Tools & Admin" collapsible section (Persona Loop, Data Sources, OSINT Tools, Duplicates, Background Jobs, Field Manual). Footer updated to "Phase G · v0.3".
2. **Router secondary routes restored** (`router.tsx`): `/improvements`, `/data-sources`, `/osint-tools`, `/duplicates` exposed directly instead of `/_` prefixes. Legacy redirects updated (/intel→/research, /ledger→/profiles).
3. **All 4 artifacts registered** via verifyAndReplaceArtifactToml — platform auto-detected api-server, apex-mobile, mockup-sandbox. Artifact-managed workflows are now canonical.
4. **Secrets set**: REDIS_URL_1, REDIS_URL_2, COMPANIES_HOUSE_API_KEY all confirmed.

> **Root cause of missing UI changes:** previous sessions' layout/router changes were never committed to GitHub. Only Context.md docs were pushed. On each import, origin/main is the source of truth. Fix: commit code changes before ending each session.

### What was done this session (2026-07-23 — access-first UX and live task visibility)

1. **Access Score separated from wealth signal**: added a contactability-first `accessScore` based on public contact evidence, confidence, and directness. The existing Bayesian score remains labeled as signal context and is no longer presented as reachability.
2. **Lead ranking corrected**: dashboard hot leads are ranked by Access Score, with wealth/registry signal retained as supporting context.
3. **User-facing hierarchy improved**: dashboard/jobs language now prioritizes profiles, discovery, enrichment, running tasks, and AI suggestions over internal ingestion jargon. Existing dark emerald/blue Atlas styling and routes are preserved.
4. **Responsive affordances retained**: desktop and mobile cards, task progress, active-task states, data attributes, and profile/list score badges were kept aligned.
5. **Workflow recovery**: restored `API Server` and `ApexFinder Web` project workflows in `.replit` so the imported project can be previewed alongside Redis.

> **Import #40 note (2026-07-22):** pnpm install (~18s). DB schema pushed (`[✓] Changes applied`). No port conflicts on startup. API Server ✅ + Web Frontend ✅ running via managed workflows. API /healthz → `{"status":"ok","redis":{"status":"ok","latencyMs":1}}`. DB empty at boot → cold-start auto-recovery triggered FAA + HMLR + Western HNWI ingestion.
> **Port conflict fix (if needed):** kill -9 $(lsof -ti:8080 -ti:23695) then restart `API Server` and `Web Frontend`.
> **Recurring import gotcha:** `manual.tsx` has smart/curly quotes in JSX string props (lines ~984-986). Each import may re-introduce this bug if the file reverts from git. Fix: change outer quote delimiter to single-quotes on those lines.

### Database (2026-07-22 — re-import #46, post-Apex Atlas session)
- **Entities**: 33,100 (FAA + HMLR + EDGAR — auto-ingested on cold start)
- **Relationships**: 229k+ (cluster + co-filer + semantic dedup edges)
- **Hot Leads**: 15,811
- **Contactable**: 180 (in-house enricher running continuously)
- **Wealth Tiers**: Ultra >$100M: 7,392 · Very $30-100M: 4,016 · HNW: 24,568 · Unknown: 1,100
- **Research Sessions**: many (MCTS bulk-run has run multiple passes)

### What was done this session (2026-07-22 — UI/UX overhaul: clickable stats, score labels, nav reorder, manual Intel HQ)

**5 targeted UX fixes across 5 files — no backend changes, all live via Vite HMR:**

1. **`utils.tsx`**: ScoreBadge now shows "Reach 82" instead of a bare number — users immediately understand what the score means. Tooltip: "how reachable this person is".
2. **`dashboard.tsx`**: Hot Leads and Contactable stat tiles are now clickable Links (→ /entities?hot=1 and /entities?contactable=1). "W-HNWIs" → "HNWI Profiles". "Signal Avg" → "Avg Reach". "Live Signals" → "Top Hot Leads". "View all →" link added to panel header. Each lead card is now a full Link to the profile page (not just the footer buttons).
3. **`entities.tsx`**: URL param filtering — `?hot=1` and `?contactable=1` now activate a filter mode with a colored banner and clear button. Loads 500 records when filtering so the list is complete.
4. **`layout.tsx`**: Nav reordered to match investigation workflow (HQ → Ledger → Search → Graph → Terminal → CRM → [Tools & Admin separator] → Persona Loop → Data Sources → OSINT Tools → Duplicates → Field Manual). Group label "Tools & Admin" added.
5. **`manual.tsx`**: Level I renamed "INTEL HQ" (was "BASICS"). Content completely rewritten to explain Intelligence HQ — stat tiles, Reach Score scale, Top Hot Leads panel, daily workflow steps. LEVELS sidebar titles updated to match sidebar nav order.

### What was done this session (re-import #44 — Phase 2 Mobile Pass + Phase 3 Field Manual — 2026-07-22)

**Direct source-file changes across 4 files — no canvas, no sandbox. All changes survive re-imports.**

Changes made:
- `manual.tsx`: Fixed "5th signal" → "4th signal" in Level III (semantic embedding is the 4th, not 5th signal); "5-layer search" heading → "4-signal search"; pin label updated to match. Fixed "Phase 9 — In-House OSINT Enricher" → "Phase F" (correct phase naming). Updated persona count "6" → "8" in 3 places (Level I nav list, Level VII intro, Level VII pin); replaced stale 6-persona FeatureGrid with accurate 8-persona grid (Data Engineer, Data Analyst, Intel Systems Analyst, Business Engineer, UX Designer, Architect, Data Integrity Auditor, Hybrid Architecture Auditor). Added missing `Palette` icon import.
- `osint-tools.tsx`: Pagination control now mobile-safe — page count text hidden on mobile (`hidden sm:block`), compact `{page}/{totalPages}` shown instead; page number buttons reduced to 3 (always fits 390px); `flex-wrap` on button row.
- `data-sources.tsx`: All 15 action button rows now mobile-safe — added `gap-3 min-w-0 line-clamp-2` to description spans, wrapped buttons in `flex-shrink-0` divs so they never get pushed off-screen. Descriptions trimmed to be concise.

**Confirmed clean:**
- All 11 pages mobile-safe at 390px: desktop-only tables/toolbars are `hidden md:flex`; profile contact bar uses `flex-wrap` + `max-w-[220px] sm:max-w-none`; graph entity selector is `absolute left-3 right-3` (full-width on mobile).
- API Server + Web Frontend both running, /healthz → OK.
- Maintenance pipeline running: 279 contact cache entries restoring, embeddings computing, persona loop sweeping.

**Next session:**
- No further mobile or Field Manual work needed — both phases complete.
- Optional: screenshot verification pass if desired.

---

### What was done this session (re-import #42 — UI/UX Polish Pass 1 — 2026-07-22)

**Direct source-file polish across 14 files — no canvas, no sandbox. All changes committed to git.**

Changes made:
- `layout.tsx`: Updated version label `v0.2 · 32.5k entities` → `Phase G · v0.3`
- `dashboard.tsx`: Removed `ring-2 ring-inset ring-amber-500/20` inconsistency from Hot Leads card; changed signal text from `truncate` → `line-clamp-2` in both desktop and mobile signal panels
- `crm.tsx`: Added `overflow-x-auto` to desktop Kanban board container for mid-size screens
- `research.tsx`: Added `break-words` to MCTS reasoning text div; added `sm:min-w-[140px]` to algorithm pipeline stage cards
- `deep-search.tsx`: `truncate` → `line-clamp-1` on entity name h3 in search results
- `graph.tsx`: Added `max-w-[90vw]` to desktop floating toolbar to prevent overflow
- `improvements.tsx`: `bg-muted/30` → `bg-primary/5 border border-primary/10` for action taken block; persona grid `grid-cols-2 md:grid-cols-3 lg:grid-cols-6` → `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6`
- `osint-tools.tsx`: Category chips scrollable on mobile (`overflow-x-auto flex-nowrap sm:flex-wrap`); scroll-to-top on pagination change
- `entities.tsx`: Live Intel slide-over width `w-[380px]` → `w-[min(380px,100vw)]` for full mobile coverage
- `profile.tsx`: Source Ledger table `min-w-[600px]` prevents column squash on mobile; MCTS steps `max-h-40` → `max-h-80`; removed `line-through` on missing completeness fields (replaced with `opacity-40`)
- `duplicates.tsx`: Entity comparison panel stacks vertically on mobile (`flex-col md:flex-row`)
- `data-sources.tsx`: Status message text hidden on mobile (`hidden sm:inline`) to prevent button overflow

**Phase plan for next session:**
- Phase 2: Full mobile pass (screenshot all 11 pages at 390px, fix remaining layout breaks)
- Phase 3: Field Manual — verify all level content is accurate, update data counts

---

### What was done this session (re-import #36 — Phase G nav link + session resume — 2026-07-22)

Added missing OSINT Tools sidebar nav link (`Telescope` icon, `/osint-tools`) between Data Sources and Field Manual in `artifacts/apex-finder/src/components/layout.tsx`. This was the one incomplete piece from the prior session — the page (331 lines), router entry, and API backend were all already built. Page loads 8,000 tools with category chips, search, and pagination. Phase G now fully visible and navigable.

---

### What was done this session (re-import #35 — Phase G complete — 2026-07-22)

**Phase G — Semantic Intelligence Layer fully implemented and deployed:**

1. **G1 semantic engine** (`lib/semantic-engine.ts`) — all-MiniLM-L6-v2 ONNX, 384-dim, warms up on boot, loads Redis cache, exports `getAllEmbeddings()` for cross-module use
2. **Hybrid search signal 4** (`lib/hybrid-search.ts`) — 4-signal RRF now includes true sentence embeddings; activates when ≥100 embeddings cached
3. **`POST /api/ingest/compute-embeddings`** — fixed: raised batchSize cap 2k→50k, added `offset` param, skips already-cached entities when `force=false`; startup triggers at 4 min + 32 min
4. **`GET /api/search/embedding-status`** — returns `{modelLoaded, cacheSize, model, dimensions}`
5. **G2 web OSINT enricher** (`lib/web-osint-enricher.ts`) — DuckDuckGo + EDGAR + GLEIF + OpenCorporates, wired to `POST /api/ingest/web-osint-enrich`
6. **G2b semantic entity resolution** (`routes/relationships.ts`) — `POST /api/relationships/semantic-dedup`: groups entities by normalised registry prefix (faa/edgar/hmlr/brreg/ch), compares cross-registry pairs cosine>0.93, creates LIKELY_SAME_PERSON edges; startup triggers at 8 min + 34 min; compared 1.7M pairs on first run
7. **G5 OSINT tools directory** (`routes/osint-tools.ts`) — 4,400+ categorised tools from tomvaillant/osint-tool-database (HuggingFace), 21 categories, 24h Redis cache
8. **Data Sources page** — Phase G section (violet) with Semantic Embedding Engine + OSINT Tools Directory cards; ComputeEmbeddingsButton (live cache counter) + SemanticDedupButton in controls panel
9. **Phase G chapter** in `improvements.md` — full investigation summary, integration decisions, per-item status
10. **`improvements.md`** — Phase G added as new chapter covering G1–G6

**Verified endpoints:**
- `GET /api/search/embedding-status` → `{modelLoaded:true, cacheSize:5391}`
- `POST /api/relationships/semantic-dedup` → compared 1,746,938 pairs (faa:5045, hmlr:342, edgar:4); 0 edges (correct — EDGAR only has 4 embeddings so far)
- `GET /api/osint-tools/categories` → 4,400 tools, 21 categories ✅

### What was done this session (re-import #31 — Deep Web OSINT — 2026-07-22)

**Deep Web OSINT Enricher built and deployed (additive — does not replace existing tools):**

1. **`artifacts/api-server/src/lib/deep-web-osint.ts`** — new module (~350 lines):
   - 12 rotating real browser User-Agent signatures (Chrome/Firefox/Safari/Edge on Win/Mac/Linux)
   - Dual search engines: DuckDuckGo HTML (`html.duckduckgo.com/html`) + Bing HTML (`bing.com/search`)
   - 4–7 context-aware query templates per entity using ALL available metadata:
     N-number (FAA aircraft), company name (EDGAR/CH), location, filing type, asset type
   - Follows top 3 non-social result URLs → scrapes actual pages for mailto: hrefs
   - Cross-validation scoring: same email in N independent sources → confidence (42/62/78/88)
   - Results mirror to Upstash slot 2 (REDIS_URL_2) — survives DB resets

2. **Route: `POST /api/ingest/deep-web-osint`** (new, in ingest.ts)
   - `batchSize`, `hotOnly`, `force` params; same job/poll pattern as other enrichers
   - `DELETE /api/ingest/deep-web-osint-lock` for ghost lock cleanup

3. **`startup.ts`** — two new auto-triggers:
   - 35 min: deep web OSINT pass 1 — hot leads (bayesianScore ≥ 0.5), batchSize 500
   - 45 min: deep web OSINT pass 2 — all HNWI/Gatekeeper, batchSize 1000
   Runs AFTER all in-house enricher passes (25min) so structured DBs exhausted first

4. **UI**: "Deep Web OSINT" button (cyan) added to Data Sources controls panel
   Polls job progress, shows live count of entities found

5. **Secrets** — all 3 set: REDIS_URL_1 ✅ REDIS_URL_2 ✅ COMPANIES_HOUSE_API_KEY ✅

6. **Route verified**: `POST /api/ingest/deep-web-osint` → jobId confirmed live

### What was done this session (re-import #30 — improvements.md audit + Phase F — 2026-07-22)

**Improvements.md full audit and Phase F implementation:**

1. **Audited all phases A–E** — all items already implemented in codebase (B2, B3, C1–C3, D1–D2, D3, E1, E3, E4). Updated all status markers to ✅ 2026-07-22.

2. **F1: Wikidata associate seeding** — `POST /api/relationships/seed-wikidata-associates` existed but was never auto-triggered. Added startup trigger at **360s (6 min)**, fires after in-house EDGAR enricher so Wikidata hits exist before SPARQL queries run. Creates `FAMILY_OF` / `KNOWN_ASSOCIATE` edges.

3. **F2: Pitch backfill auto-trigger** — `POST /api/research/backfill-pitches` existed but never scheduled. Added startup trigger at **660s (11 min)**, fires after MCTS pass 2 (8 min). Retries placeholder pitches.

4. **F4: Populate-notes auto-trigger** — `POST /api/ingest/populate-notes` existed but never scheduled. Added startup trigger at **110s**. Auto-fills entity notes from top asset description for entities with blank notes — improves BM25 recall.

5. **Added Phase F** to improvements.md (F1–F5) covering Wikidata seeding, pitch backfill, wealth tier segmentation, notes auto-populate, and MCTS gatekeeper routing bias.

6. **All 3 secrets confirmed** — REDIS_URL_1, REDIS_URL_2, COMPANIES_HOUSE_API_KEY set via secure form.

---

### What was done this session (re-import #24 — app review completion — 2026-07-21)

**Completed the interrupted app review from previous session:**

1. **`avgBayesianScore` type bug fixed** — `artifacts/api-server/src/routes/dashboard.ts` line 227: PostgreSQL `avg()` returns a numeric string; wrapped in `parseFloat(String(...))` so the API now returns a proper JS number. Verified: `typeof avgBayesianScore === "number"`.

2. **Profile score labeling confirmed correct** — Previous session's fix is in the code:
   - `ScoreBadge` in header shows `(bayesianScore * 100).toFixed(0)`, labeled "HNWI Signal" ✅
   - Contact confidence badge shows `{conf}% contact data` with tooltip "separate from HNWI Signal score" ✅
   - Confidence breakdown panel shows "Overall Confidence" (0-100 integer) with circular gauge ✅
   - No label confusion remaining.

3. **Code review of all 12 pages** — clean on: dashboard, entities, profile, graph, research, crm, data-sources, improvements, duplicates, manual, deep-search. No blocking bugs found beyond #1 above.

4. **Confirmed non-issues:**
   - `marker-blue/emerald/amber` CSS classes → defined in `src/index.css` ✅
   - Graph defaulting to entity ID 1 → entity 1 exists (Etos Air Llc) ✅
   - ScoreBadge 0-1 scale → correct ✅
   - FAA body param `maxRecords` → matches API ✅

5. **Screenshot verification note** — Vite HMR WebSocket prevents automated `networkidle` screenshots in dev mode. Both services verified working via curl (port 80 proxy → 200, port 23695 → 200, port 8080 → 200). All API endpoints returning correct data.

### What was done this session (re-import #22, session 2 — 2026-07-21)

**Redis contact cache layer — enrichment now survives DB resets:**

1. **`artifacts/api-server/src/lib/redis.ts`** — Added slot-2-specific contact cache helpers:
   - `getContactCacheClient()` — returns `_permanentClients[1]` (REDIS_URL_2) with slot-1 fallback
   - `contactCacheSet(stableKey, data)` — writes `CachedContact` JSON to Redis, no TTL (permanent)
   - `contactCacheGet(stableKey)` — reads a single entry
   - `contactCacheScanAll()` — full scan of `contact:v1:*` keys (used by startup restore)
   - `contactCacheCount()` — counts cache entries
   - Stable key format: `contact:v1:{sourceRegistries[0]}` (e.g. `contact:v1:edgar:cik123`) — derived from source data, stable across GitHub imports

2. **`artifacts/api-server/src/routes/ingest.ts`** — After every enrichment DB write, also mirrors to Redis slot 2. Derives stable key from `entity.sourceRegistries[0]`; falls back to `name:{name}` if no registry ID.

3. **`artifacts/api-server/src/lib/startup.ts`** — Two new maintenance steps (run before isHot sync on every boot):
   - **Step 0a: Redis → PostgreSQL restore** — scans slot 2 for `contact:v1:*` keys, matches each entity by sourceRegistries pattern, backfills contact fields if entity currently has none
   - **Step 0b: PostgreSQL → Redis backfill** — reads all entities with contact data from PostgreSQL and writes to slot 2 if not already cached; captures enrichments done before Redis mirroring was deployed

4. **Enrichment run results** (2026-07-21):
   - 89 entities backfilled from PostgreSQL → Redis on first boot after deploy
   - 26+ new entities enriched with new Redis-mirroring code (enricher still running)
   - **Total: 114 entities with contact data** (email/phone/LinkedIn in PostgreSQL + mirrored to Redis)
   - Redis slot 2 now has 115+ `contact:v1:` entries — permanent, survives imports

### What was done this session (re-import #22 — 2026-07-21)

**Standard re-import setup:**
1. `pnpm install` — fresh install, completed in ~15s
2. `pnpm --filter @workspace/db run push` — schema applied (additive, no changes)
3. Redis workflow started ✅
4. API Server (manual) started ✅ — port 8080
5. Web Frontend (manual) started ✅ — port 23695
6. Cold-start auto-recovery detected empty DB → FAA (30k) + HMLR (2k) auto-ingested; Western HNWI background job started
7. All 4 artifacts re-registered (apex-finder via verifyAndReplaceArtifactToml; api-server, apex-mobile, mockup-sandbox auto-detected by platform)
8. API healthy: /healthz ✅ · /dashboard/stats ✅ (32,000 entities, 32,000 assets, 7,454 hot leads)

### What was done this session (re-import #21 — 2026-07-21)

**improvements.md — all 6 remaining ⬜ items implemented:**

1. **Expanded relationship-building pipeline in `startup.ts`** — replaced the single 15s cluster trigger with a full 5-step pipeline on every populated-DB boot:
   - 15s: `auto-detect-clusters` (CORPORATE_SERIES edges)
   - 20s: `auto-detect` (KNOWN_ASSOCIATE from shared addresses)
   - 25s: `auto-detect-edgar-cofilers` (EDGAR_CO_FILER edges)
   - 30s: `auto-detect-ch-codirectors` (SHARED_DIRECTOR edges — gated on CH API key)
   - 35s: `seed-edgar-associates` (KNOWN_ASSOCIATE from live EDGAR EFTS)
   - Fixes: "L1 graph traversal blind" + "Isolated node — no relationships mapped"

2. **CH enrichment auto-trigger** — `POST /api/ingest/companies-house-enrich` at 90s (batchSize: 200, gated on CH API key). Fixes: "Hot lead real-data pipeline incomplete — enrichment pending".

3. **OCCRP enrichment auto-trigger** — `POST /api/ingest/occrp` at 150s (batchSize: 300). Fixes: "Single source — corroboration needed".

4. **Extracted `trigger()` helper** in `startup.ts` — replaces 4 copies of the same fetch/log/catch boilerplate. All 9 scheduled triggers now use it.

5. **improvements.md** — all 6 remaining ⬜ items marked ✅ (19/19 patterns now addressed).

---

### What was done this session (re-import #20, session 2 — 2026-07-21)

**Startup.ts performance + auto-trigger improvements (improvements.md batch):**

1. **Steps 4, 5, 7 rewritten** — all previously did sequential awaited DB writes per entity (bottleneck: 11,878 writes in step 5, 32,000 in step 4). Now collect all updates first, then write in parallel chunks (100 for step 4, 50 for steps 5 & 7). Boot results: step 4 synced 32,000 liveSource markers, step 5 populated 2,000 sparse notes, step 7 cleared 0 needsEnrichment flags — all ran in parallel and logged correctly.

2. **Bulk MCTS auto-trigger scaled** — `batchSize: 60` → `batchSize: 200` at 45s. Second pass added at 8 min (another 200). `bulk-mcts` added to INGESTOR_TYPES for ghost cleanup on boot (first boot had 409 from stale ghost — fixed next boot).

3. **In-house enricher auto-trigger added** — fires at 120s: `POST /api/ingest/in-house-enrich` batchSize: 500. `in-house-enrich` added to INGESTOR_TYPES.

4. **Cluster detection** — 228,828 new CORPORATE_SERIES edges created at 15s trigger (2,085 clusters). 100 EDGAR StockHolding assets created by step 6.

5. **improvements.md** — 8 new ✅ items: all MCTS cold-session patterns, sparse notes patterns, zero-contact-vector patterns marked done.

### What was done this session (re-import #17, Session 2 — 2026-07-21)

**5 improvements from improvements.md implemented:**

1. **Startup auto-maintenance** (`artifacts/api-server/src/lib/startup.ts`):
   - When DB is populated on boot, runs 4 background tasks: isHot sync, entity reclassification, FAA coordinate backfill, liveSource provenance marker backfill
   - Result this boot: 7,432 hot flags synced, 22,807 Corp + 581 Trust reclassified, 64 FAA assets checked (already geocoded)

2. **New Duplicate Entity Review page** (`artifacts/apex-finder/src/pages/duplicates.tsx` + nav):
   - Route: `/duplicates` · Nav item: "Duplicates" (Copy icon)
   - Token-similarity algorithm detects pairs sharing ≥2 significant name tokens across all 32k entities
   - Each pair shows entity cards with type badge + Bayesian score, swap-direction button, Merge + Dismiss actions
   - **Merge endpoint** (`POST /api/entities/:id/merge/:targetId`): reassigns assets + relationships from target to primary, merges sourceRegistries/metadata/notes, deletes target, clears cache
   - **Candidates endpoint** (`GET /api/entities/duplicate-candidates`): returns top 200 pairs sorted by token overlap — registered BEFORE `:id` route to avoid Express routing conflict
   - 200 real candidates found immediately (Wells Fargo variants, series LLC families, etc.)

3. **isHot flag auto-sync** — already covered in (1) above

4. **Entity type reclassification** — already covered in (1) above

5. **liveSource provenance backfill** — already covered in (1) above

### What was done this session (re-import #6, Session 1 — 2026-07-20)

**1. Field Manual mobile view fixes:**
- Fixed 5-step workflow grid: replaced inline `borderRight` with responsive Tailwind `border-b md:border-b-0 md:border-r` — items now stack cleanly as vertical cards on mobile
- Fixed Level IV edge types grid: changed `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` — was too narrow (185px columns) on 390px screens
- Updated Level VIII enrichers list: replaced "Hunter.io + Apollo.io (email/LinkedIn — paid)" with "In-House OSINT (Wikidata · Gravatar · GitHub · pattern gen)"
- Updated Level VIII Hunter/Apollo callout → describes the in-house engine
- Updated Level X contact confidence scoring text → references In-House Enricher instead of Hunter/Apollo
- All changes hot-reloaded via Vite HMR

**2. In-House OSINT Enrichment Engine (replaces Hunter.io + Apollo):**
- New file: `artifacts/api-server/src/lib/in-house-enricher.ts`
  - **Source 1: Wikidata SPARQL** — structured data for public figures (email, website, LinkedIn URL)
  - **Source 2: Wikipedia API** — article extract scraping for email/LinkedIn
  - **Source 3: GitHub API** — search by full name, extract public profile email (60 req/hr, no auth)
  - **Source 4: Email pattern generation + Gravatar MD5 verification** — generates first.last/flast/f.last/etc. patterns, verifies each against Gravatar hash (200 = confirmed email)
  - **Source 5: Company domain resolver + DNS MX validation** — company name → .com heuristic, validates with `dns.resolveMx`
  - **Source 6: RDAP domain contact** — ICANN RDAP registrant email for corporate domains
  - **Source 7: ProPublica 990 Finder** — US nonprofit executive contacts + website scrape
- New route: `POST /api/ingest/in-house-enrich` (batchSize, force, entityIds params; same job/poll pattern as web-osint-enrich)
- New route: `DELETE /api/ingest/in-house-enrich-lock` — manual ghost-lock clear
- Updated `data-sources.tsx`:
  - Phase 9 source definition: replaced "Hunter.io + Apollo.io" card with "In-House OSINT Enricher" (green, free-tier, no paid API)
  - Added `InHouseEnrichButton` component (polls job progress, same UX as `WebOsintButton`)
  - Added quick-action button row in the controls panel
  - Updated Phase 9 section heading: "Commercial Enrichment" → "In-House OSINT Engine"
- Verified endpoint works: `POST /api/ingest/in-house-enrich` → returns jobId, runs in background, job completes cleanly

**Re-import setup:**
- pnpm install (fresh), db schema push, secrets set (SESSION_SECRET, REDIS_URL_1, COMPANIES_HOUSE_API_KEY)
- Workflows: Redis ✅ · API Server ✅ (manual workflow) · Web Frontend ✅ (manual workflow)
- Note: managed artifact workflows (artifacts/api-server: API Server, etc.) also registered but not started — manual "API Server" and "Web Frontend" workflows are the active ones
- DB already had 32,600 entities from prior session (cold-start auto-recovery detected populated DB)

### Next unlock to reach 9.2
Run **IN-HOUSE ENRICH** on HNWI/Gatekeeper entities — Wikidata SPARQL will hit well-known public figures; Gravatar verification will confirm email patterns for executives with corporate domains. Contactable count: 0 → target ~200+ with in-house engine alone.

### What's new this session (2026-07-20 — second re-import)

**5 improvements built:**
1. **Auto-pitch / Critic synthesis enriched** — `POST /research/run` now calls `orchestrate()` (full Planner→Retriever→Analyst→Critic) and builds a rich `critiqueNote` from the top-3 ranked candidates with reasoning. Pitch generation wrapped in try-catch (always creates session, never 500s). File: `artifacts/api-server/src/routes/research.ts`.
2. **CH company officers button** — `ChOfficersButton` in data-sources.tsx. Polls job at `/api/ingest/job/:jobId`. Triggers `POST /api/ingest/ch-company-officers` (background job enriching all Corporation entities with officer lists stored in `metadata.chOfficers`).
3. **CH co-director edges button** — `ChCodirectorsButton` calls `POST /api/relationships/auto-detect-ch-codirectors`. Builds `SHARED_DIRECTOR` edges between entities that share a common CH officer.
4. **Populate notes button** — `PopulateNotesButton` calls `POST /api/ingest/populate-notes`. Enriches entity notes from filing metadata (formType, fileDate, companyName, orgnr, CH directors, nationality, location).
5. **EDGAR stock assets button** — `EdgarStockButton` calls `POST /api/ingest/create-edgar-stock-assets`. Creates `StockHolding` asset records for SEC EDGAR large-shareholder entities with no assets yet.

**New persona added:**
6. **Data Integrity Auditor** (`data_integrity_auditor`) — 7th persona in `persona-engine.ts`. Enforces the zero-synthetic-data rule. Checks: synthetic flags in metadata, missing provenance, placeholder names, fake emails/phones, synthetic asset identifiers, enrichment-pending hot leads, missing liveSource markers. Color: red `#EF4444`. Run 3 confirmed: **0 synthetic violations** across 300 entities — data purity rule is being respected.

**Data operations run this session (all via API, not UI buttons):**
- POST /ingest/create-edgar-stock-assets → 2,053 StockHolding assets created
- POST /ingest/populate-notes → 35,856 entities enriched (paginated, 2k/page)
- POST /ingest/sync-hot-flags → 17,161 hot leads
- POST /ingest/reclassify-entity-types → 24,144 Corp, 690 Trust, 11,022 HNWI
- POST /relationships/auto-detect-clusters → 229,282 edges across 2,096 clusters
- POST /ingest/companies-house-enrich → 50 entities enriched (contactConfidence only; key not set)
- 40 research sessions (MCTS+Critic+Pitch) on top HNWI + Trust hot leads

**Bugs fixed:**
- OOM crash from 10 parallel research sessions → `--max-old-space-size=3072` in node start
- `req.body` undefined on CH officers POST → nullish coalesce `?? {}`
- populate-notes loading 35k rows → paginated loop (2k/page)
- `sql not defined` in co-directors → added sql to drizzle-orm import

### What's pending
- **Ingest data**: Run FAA (`POST /api/ingest/faa`), HMLR (`POST /api/ingest/land-registry`), Western HNWI (`POST /api/ingest/western-hnwi`) to populate entities and assets. Optionally clear Upstash dedup first.
- **COMPANIES_HOUSE_API_KEY**: Set this secret in Replit to enable CH officer address lookups. Without it, the enricher still recomputes `contactConfidence` for all entities.
- **REDIS_URL_1**: Set this Upstash secret to persist dedup across restarts.

---

## Phase 3 — MCTS & Outreach Upgrade (2026-07-20) ✅ COMPLETE

### What was built

1. **MCTS contact scoring** (`graph-engine.ts`, `mcts-agent.ts`): `contactConfidence`, `contactEmail`, `contactPhone` added to `GraphVertex`, `EntityRow`, `PathStep`; `evaluateWarmth()` gives +0.15 UCT bonus for nodes with confidence ≥ 50 and +0.10 for any known email/phone; winning path now carries all three fields; HNWI reasoning line reports direct contact status.
2. **MCTS Terminal — path step detail** (`research.tsx`): New `PathNodeContact` sub-component renders a confidence bar + clickable `mailto:`/`tel:` links inside every path node card (mobile stack + desktop horizontal). New `CopyBriefButton` component generates a formatted plain-text outreach brief from the full path and copies it to clipboard.
3. **Pitch generator real contacts** (`pitch-generator.ts`, `research.ts`): `PitchContext.targetEntity` gains `contactEmail` + `contactPhone`; `intelBlock()` emits `CONTACT:` and `PHONE:` lines when present; `research.ts` pitch route now passes entity contact fields into the generation context.
4. **CRM notes + follow-up date + Export PDF** (`crm.tsx`): Desktop session detail panel now has a notes textarea and follow-up date picker — saved to `research_sessions.notes` and `research_sessions.followUpDate` via a direct PATCH to the existing status route (route accepts these extra fields regardless of Zod schema). "Export as PDF" opens a `window.open()` formatted print view with all three pitch sections. `selectSession()` pre-fills notes/date on open.
5. **DB schema** (`research_sessions.ts`): Added `notes text` and `followUpDate date` columns; `pnpm --filter @workspace/db run push` applied.
6. **Mobile approach — tabbed pitch modal** (`approach.tsx`): `PitchModal` replaced with a three-tab version (Initial / Follow-Up / Intro Script) that parses the stored JSON sequence; each tab shows its section in a `ScrollView`; header gains a Share icon button and a footer **SHARE THIS PITCH** button both wired to `Share.share()`; `SelectionContext.PathStep` updated with the new contact fields.

---

## Iteration Log

| Date | What changed |
|---|---|
| 2026-07-23 | **Mobile navigation simplification**: removed the bottom bar menu and its reserved viewport space, leaving the hamburger side menu as the only mobile navigation. Verified at 390×844; production build passes and the web workflow is running. |
| 2026-07-23 | **Responsive mobile polish pass**: mounted the approved activity/context feed in the mobile dashboard, removed duplicate mobile job polling, added explicit Entity Ledger loading/unavailable/empty states, tightened mobile profile tabs and touch targets, simplified Deep Search mobile copy and stacked its pipeline/results layout, restarted the web workflow, verified 390px mobile and 1440px desktop screenshots, and confirmed the production build passes. |
| 2026-07-23 | **Research Command Center frontend**: extracted and live-previewed one responsive Canvas direction, graduated the hierarchy into the production dashboard, added 5-second live activity polling with progress/results and `/jobs` navigation, made contactability the primary queue signal, demoted map/wealth context, removed dashboard manual-ingestion controls, and added explicit PostgreSQL-unavailable fallback states. Production build passes; shared UI typecheck errors remain pre-existing. |
| 2026-07-23 | **Imported project setup**: restored pnpm dependencies from the lockfile; confirmed SESSION_SECRET, REDIS_URL_1, REDIS_URL_2, and COMPANIES_HOUSE_API_KEY are set; started Redis, API Server, and ApexFinder Web. API `/api/healthz` and web HTTP checks pass, production web build passes. PostgreSQL is unavailable in this workspace, and existing frontend/mobile typecheck errors remain documented above. |
| 2026-07-23 | **Contact-channel filtering completed**: finished the interrupted Entity Ledger fix by moving Any Contact, Email, Phone, WhatsApp, Telegram, and Instagram filtering server-side with blank-value guards; added desktop/mobile channel chips; removed the client-side dataset cap and stale field checks; updated OpenAPI and regenerated React/Zod clients. Web build, API build, frontend typecheck, shared-library typecheck, and diff checks pass. PostgreSQL remains the only runtime blocker for live entity responses in this import. |
| 2026-07-23 | **Persona loop review**: attempted a bounded live persona run and reviewed the `/improvements` page from an operator perspective. PostgreSQL failed on the initial entities query, so the run, stats, and logs all return 500. Redis/API health and the web shell are healthy, but the UI leaks an HTML-to-JSON parse error instead of explaining database unavailability. No persona results were invented. |
| 2026-07-23 | **Persona loop recovered and completed**: PostgreSQL was reachable but had no project tables, so the existing Drizzle schema was pushed; stale dedup state was cleared only because the repaired DB was empty; FAA, HMLR, and Western HNWI real ingestion restarted. Persona loop completed for 100 HNWI/Gatekeeper entities with 1,180 suggestions and 0 errors (644 high / 241 medium / 295 low). Updated stale Persona Loop copy from 6 AI agents to 8 deterministic personas. |
| 2026-07-23 | **Full real-data pipeline recovery verified**: canonical API/web workflows restarted; stale queued Hybrid Research locks now clear on restart; live state reached 81,528 entities / 80,305 assets / 264,253 relationships / 767 contactable / 600 research sessions. Two 300-target Hybrid Research passes and a fresh 100-target Persona Loop pass reached `done` with 0 errors. Added shared public-email validation plus boot-time PostgreSQL/Redis sanitation, removing 55 invalid DB emails and 31 invalid cache entries. |
| 2026-07-23 | Re-import #49: pnpm install, db schema push, artifact-managed workflows started (ports 8080/23695), 4 improvements implemented (broad-discovery engine, cold-start inversion, recurring scheduler rotation, weighted contact confidence) |
| 2026-07-23 | Re-import #48: pnpm install, db schema push, all workflows started, cold-start auto-recovery triggered |
| 2026-07-23 | Phase H complete (H1–H5 in one session): pipeline inverted (web-first), recurring scheduler, 3 new enrichment modules (social/messenger/foundation), 9 new schema columns, 8-vector contact panel UI, SKIP_DOMAINS fix |

| Date | What changed |
|---|---|
| 2026-07-22 | **Re-import #45 setup**: pnpm install (~20s), DB schema pushed (`[✓] Changes applied`). Redis ✅ · API Server ✅ (port 8080) · Web Frontend ✅ (port 23695). SESSION_SECRET ✅. DB empty → cold-start auto-recovery triggered FAA + HMLR + Western HNWI ingestion. API healthy: /healthz `{"status":"ok","redis":{"status":"ok","latencyMs":5}}`. |
| 2026-07-22 | **Re-import #34 setup**: pnpm install (~16s), DB schema pushed. Redis ✅ · artifacts/api-server: API Server ✅ (port 8080) · artifacts/apex-finder: web ✅ (port 23695). SESSION_SECRET ✅ · REDIS_URL_1 ✅ · REDIS_URL_2 ✅ · COMPANIES_HOUSE_API_KEY ✅. Port conflict resolved (killed old manual workflow PIDs). DB: 32,100 entities / 32,100 assets / 14,811 hot leads / 62 contactable (contact cache restore running). API healthy: /healthz `{"status":"ok","redis":{"status":"ok","latencyMs":0}}`. |
| 2026-07-22 | **Re-import #33 setup + 3 bug fixes**: pnpm install (~20s), DB schema pushed. Redis ✅ · API Server ✅ (port 8080) · Web Frontend ✅ (port 23695). Secrets set: REDIS_URL_1 ✅ REDIS_URL_2 ✅ COMPANIES_HOUSE_API_KEY ✅. All 4 artifacts re-registered. DB empty → FAA 30k + HMLR 2k auto-ingested. **Fixes:** (1) Graph `useGetEntityGraph(0)` 404 on init — added `enabled: targetId > 0`; (2) `/api/pipeline/status` timing out (O(n×m) NOT EXISTS correlated subqueries over 32k×231k) — replaced with aggregate UNION subqueries, now <100ms; (3) Persona simulation re-run: 529 suggestions / 50 entities. Pipeline Status panel now rendering in Data Sources with live counts. Contactable: 75 and growing (in-house enricher running). |
| 2026-07-22 | **Re-import #32 setup**: pnpm install (~19s), DB schema pushed (no changes — `[✓] Changes applied`). Redis ✅ · API Server ✅ (port 8080) · Web Frontend ✅ (port 23695). SESSION_SECRET ✅. DB had 32,000 entities / 32,000 assets / 7,453 hot leads from cold-start auto-recovery. API healthy: /healthz `{"status":"ok","redis":{"status":"ok","latencyMs":1}}`. Contactable: 0 (contact cache restore running in background if REDIS_URL_2 set). |
| 2026-07-22 | **Re-import #31 setup**: pnpm install (~13s), DB schema pushed (no changes). Redis ✅ · API Server ✅ (port 8080) · Web Frontend ✅ (port 23695). SESSION_SECRET ✅. DB had 32,000 entities / 32,000 assets / 7,453 hot leads from cold-start auto-recovery. API healthy: /healthz `{"status":"ok","redis":{"status":"ok","latencyMs":1}}`. Contactable: 0 (contact cache restore running in background if REDIS_URL_2 set). |
| 2026-07-22 | **Re-import #28 setup**: pnpm install (~17s), DB schema pushed. Redis ✅ · artifacts/api-server: API Server ✅ (port 8080) · artifacts/apex-finder: web ✅ (port 23695). SESSION_SECRET ✅ · REDIS_URL_1 ⚠️ NOT SET · REDIS_URL_2 ⚠️ NOT SET · COMPANIES_HOUSE_API_KEY ⚠️ NOT SET. DB empty at boot → FAA 30k + HMLR 2k auto-ingested; Western HNWI running in background. API healthy: 32k entities · 32k assets · 7,454 hot leads. |
| 2026-07-22 | **BRREG enricher fix**: `address` field added to `InHouseEnrichResult`; `result.address` initialised to null in orchestrator; persisted to `meta["bizLocation"]` in `processEntity`; included in `hasSignal` check so BRREG address-only hits are no longer silently dropped. Memory updated. |
| 2026-07-22 | **Re-import #27 setup**: pnpm install (~16s), DB schema pushed. Redis ✅ · artifacts/api-server: API Server ✅ (port 8080) · artifacts/apex-finder: web ✅ (port 23695). SESSION_SECRET ✅ · REDIS_URL_1 ✅ (upstash-1 ready) · REDIS_URL_2 ✅ (upstash-2 ready) · COMPANIES_HOUSE_API_KEY ✅. DB empty at boot → FAA 30k + HMLR 2k auto-ingested; Western HNWI running in background. Port conflict resolved after artifact workflows registered (killed old PIDs on 8080/23695). Fully operational. |
| 2026-07-21 | **Re-import #26 setup**: pnpm install, DB schema pushed. Redis ✅ · API Server ✅ (port 8080) · Web Frontend ✅ (port 23695). SESSION_SECRET ✅ · REDIS_URL_1 ✅ · REDIS_URL_2 ✅ · COMPANIES_HOUSE_API_KEY ✅. DB empty at boot → FAA 30k + HMLR 2k auto-ingested; Western HNWI running in background. Upstash slot 1 (dedup) + slot 2 (contact cache) both connected on restart. |
| 2026-07-21 | **Re-import #25 setup**: pnpm install, DB schema pushed. Redis ✅ · artifacts/api-server: API Server ✅ (port 8080) · artifacts/apex-finder: web ✅ (port 23695). SESSION_SECRET ✅. REDIS_URL_1/REDIS_URL_2 not confirmed set (contact cache count=0 at boot). DB retained 32,100 entities — cold-start maintenance ran (7,346 hot flags, 22,774 Corp + 581 Trust reclassified). Port conflict resolved: killed old manual API Server/Web Frontend, started managed artifact workflows. |
| 2026-07-21 | **Redis contact cache (Phase 10)**: `REDIS_URL_2` (Upstash slot 2) now stores permanent contact cache (`contact:v1:{stableKey}`). Enricher mirrors to Redis after every DB write. Startup runs restore (Redis→PG) + backfill (PG→Redis) on every boot. On first boot: 89 entities backfilled from PG → Redis; enricher run added 27+ more. Total: **114+ entities with contact data**, 115+ Redis entries. Enricher auto-trigger at 120s was blocked (409) by manual job already running; persona loop passes 1 & 2 auto-fired; Hybrid Research bulk run pass 3 blocked (409). |
| 2026-07-22 | **Apex Atlas Refactor (re-import #46)**: Brand rename ApexFinder → **Apex Atlas**. Sidebar rewritten as 3-tier collapsible (Main/Workspace/System). Router: /search /profiles /network /pipeline /outreach /jobs added; old routes redirect. Dashboard: IngestionPanel removed, BackgroundActivityCard added, `<a>`-inside-`<a>` fixed via HotLeadCard sub-component. New page: **jobs.tsx** — 4-tab (Live Activity / Sources / Persona Loop / Duplicates) consolidating data-sources + improvements + duplicates. New page: **outreach.tsx** — 4-step Outreach Assistant. API: GET /api/ingest/jobs endpoint added (20 job types, polls Redis job queue). hunter-enricher.ts deleted; POST /ingest/hunter-enrich returns 410. API Server rebuild clean (build 944ms). App healthy: 33,100 entities, 15,811 hot leads, 180 contactable. |
| 2026-07-22 | **Re-import #37 setup**: pnpm install (~22s), DB schema pushed. Redis ✅ · artifacts/api-server: API Server ✅ (port 8080) · artifacts/apex-finder: web ✅ (port 23695). SESSION_SECRET ✅ · REDIS_URL_1 ✅ · REDIS_URL_2 ✅ · COMPANIES_HOUSE_API_KEY not set. All 4 artifacts re-registered. DB: 32,100 entities / 32,100 assets / 14,811 hot leads (cold-start auto-recovery). API healthy: /healthz `{"status":"ok","redis":{"status":"ok","latencyMs":1}}`. |
| 2026-07-22 | **Re-import #36 setup**: pnpm install (~17s). DB schema pushed (`[✓] Changes applied`). All 4 artifacts re-registered (verifyAndReplaceArtifactToml). Port conflict on 8080/23695 resolved (kill -9). Managed workflows started: Redis ✅ · artifacts/api-server: API Server ✅ (port 8080) · artifacts/apex-finder: web ✅ (port 23695). SESSION_SECRET ✅ · REDIS_URL_1 ✅ · REDIS_URL_2 ✅ · COMPANIES_HOUSE_API_KEY — check secrets panel. DB populated: 32,100 entities (cold-start auto-recovery). API /healthz → `{"status":"ok","redis":{"status":"ok","latencyMs":0}}`. App screenshot verified. |
| 2026-07-21 | **Re-import #22 setup**: pnpm install, DB schema pushed, Redis ✅, API Server ✅ (manual, port 8080), Web Frontend ✅ (manual, port 23695). SESSION_SECRET ✅. REDIS_URL_1 ⚠️ NOT SET · COMPANIES_HOUSE_API_KEY ⚠️ NOT SET. Cold-start auto-ingested FAA (30k) + HMLR (2k); Western HNWI running in background. All 4 artifacts registered. API healthy: 32,000 entities · 32,000 assets · 7,454 hot leads. |
| 2026-07-21 | **Re-import #21 setup**: pnpm install, DB schema pushed, all 4 artifacts re-registered (verifyAndReplaceArtifactToml). Redis ✅ · API Server ✅ (manual, port 8080) · Web Frontend ✅ (manual, port 23695). SESSION_SECRET ✅. REDIS_URL_1 ⚠️ NOT SET · COMPANIES_HOUSE_API_KEY ⚠️ NOT SET. DB had ~2,000 entities (Western HNWI partial from prior boot); FAA auto-ingest failed (no cached ZIP); Western HNWI running in background. API healthy: /healthz ✅ · /dashboard/stats ✅. |
| 2026-07-21 | **Re-import #18 setup**: pnpm install, DB schema pushed, all 4 artifacts re-registered (verifyAndReplaceArtifactToml). Redis ✅ · artifacts/api-server: API Server ✅ (port 8080) · artifacts/apex-finder: web ✅ (port 23695). SESSION_SECRET ✅. REDIS_URL_1 ⚠️ NOT SET · COMPANIES_HOUSE_API_KEY ⚠️ NOT SET. DB retained 32,000 entities — cold-start maintenance ran (7,262 hot flags, 22,748 Corp + 581 Trust reclassified). API healthy. |
| 2026-07-21 | **Re-import #15 setup**: pnpm install, DB schema pushed. Redis ✅ · API Server ✅ (manual workflow, port 8080) · Web Frontend ✅ (manual workflow, port 23695). SESSION_SECRET ✅. REDIS_URL_1 ⚠️ NOT SET · COMPANIES_HOUSE_API_KEY ⚠️ NOT SET. DB retained 32,000 entities + 32,000 assets from prior session — FAA auto-ingestion kicked off (dedup empty). API healthy: /healthz ✅ · /dashboard/stats ✅. |
| 2026-07-22 | **Re-import #22 setup**: pnpm install ✅, DB schema pushed ✅, all 4 artifacts re-registered (verifyAndReplaceArtifactToml) ✅. Port conflict resolved (killed orphaned PIDs on 8080/23695). Managed workflows running: Redis ✅ · artifacts/api-server: API Server ✅ · artifacts/apex-finder: web ✅. DB auto-recovered: 32,000 entities (FAA 30k + LR 2k), 14,711 hot leads. SESSION_SECRET ✅. Missing secrets: REDIS_URL_1, REDIS_URL_2, COMPANIES_HOUSE_API_KEY (graceful degradation active — dedup/contact cache/CH enricher offline until set). App loads and dashboard is live. |
| 2026-07-21 | **Re-import #11 setup + Persona Run 6**: pnpm install, DB schema pushed, all 4 artifacts registered. Redis ✅ · artifacts/api-server: API Server ✅ · artifacts/apex-finder: web ✅. SESSION_SECRET ✅ · REDIS_URL_1 ✅ · COMPANIES_HOUSE_API_KEY ✅. Western HNWI auto-ingested (100 entities). isHot sync run → 100 hot leads. Persona run 6 complete: 1,392 suggestions / 100 entities, 13.92 avg, 0 errors. App rating: **4.5/10** (cold start — code architecture ~8/10, data gap is entire deficit). improvements.md updated with full Run 6 breakdown + ops checklist. |
| 2026-07-21 | **Re-import #10 setup**: pnpm install, DB schema pushed, all 4 artifacts re-registered (verifyAndReplaceArtifactToml). Managed workflows started: Redis ✅ · artifacts/api-server: API Server ✅ · artifacts/apex-finder: web ✅. DB retained 32,100 entities — cold-start auto-recovery skipped ingestion. SESSION_SECRET ✅ · REDIS_URL_1 ✅ · COMPANIES_HOUSE_API_KEY ✅. |
| 2026-07-21 | **Re-import #9 setup**: pnpm install, DB schema pushed, all 4 artifacts re-registered. Redis ✅ · API Server ✅ · Web Frontend ✅. SESSION_SECRET ✅ · REDIS_URL_1 ✅ (Upstash connected) · COMPANIES_HOUSE_API_KEY ✅. DB retained 32,200 entities — cold-start skipped auto-ingestion. |
| 2026-07-21 | **Re-import #8 setup**: pnpm install, DB schema pushed, all 4 artifacts re-registered (verifyAndReplaceArtifactToml). Artifact-managed workflows started: Redis ✅ · artifacts/api-server: API Server ✅ · artifacts/apex-finder: web ✅. DB retained 32,100 entities from prior session — cold-start auto-recovery skipped ingestion. SESSION_SECRET ✅ · REDIS_URL_1 ✅ (Upstash connected) · COMPANIES_HOUSE_API_KEY ✅. All 4 artifact-managed workflows running. In-house enrichment pass 1 complete (49/100 EDGAR entities enriched: Ansari LinkedIn+phone cc=60, Icahn/Slim/Thiel/33 others phones cc=30-40). MCTS run on 7 top targets (Ansari 0.577, Leeds 0.486, Kim 0.494, Icahn 0.474, Slim 0.444, Thiel 0.44, Zhang 0.416). 7346 hot flags, 229259 relationship edges, 31622 notes enriched, entity reclassification done (22767 Corp / 8748 HNWI / 585 Trust). FAA enrichment pass 2 running (500 FAA entities). |
| 2026-07-23 | **Full audit + 2 bug fixes (post-import #51)**: (1) `research.tsx` terminal placeholder read "L4 MCTS Deep Path Exploration" — corrected to "L4 UCT Deep Path Exploration (120 rollouts)". UCT is the user-visible selection policy; MCTS is the internal algorithm name only. Full grep confirmed zero remaining user-facing MCTS strings. (2) `ingest-enrichment.ts` foundation-filings route — `db.select()` missing `phone`, `linkedinUrl`, `twitterHandle`, `instagramHandle`, `telegramHandle`; all 5 added so `computeContactConfidence` no longer receives undefined for social signals and writes systematically low scores. Audit confirmed all other systems correct: pipeline order web-first ✅, RECURRING_JOBS scheduler 7 jobs ✅, all Phase H modules exist and route correctly ✅, SKIP_DOMAINS not blocking social media ✅, contact-validation blocklist present ✅. Tests: Persona Loop 100 entities 226 suggestions 0 errors ✅; Hybrid Research bulk 300/300 0 errors ✅. Live state: 32,101 entities · 230,692 relationships · 729 contactable · 834 research sessions · 14,808 hot leads. Honest rating: **7.5/10** — architecture strong; contact hit rate (2.3%) and graph edge quality (mostly CORPORATE_SERIES, not warm-path introductions) are the two remaining gaps to close. See improvements.md Phase I. Commit 23941c6. |
| 2026-07-23 | **Re-import #50 setup**: pnpm install, DB schema pushed, all 4 artifacts re-registered (verifyAndReplaceArtifactToml), old manual workflows removed, artifact-managed workflows started (artifacts/api-server: API Server + artifacts/apex-finder: web). Fixed `trigger` scoping bug in startup.ts — moved function to module level as `triggerHttp`, removing stale inner duplicate. Port conflict resolved (kill -9). App loads: 18,700 profiles, 4,035 hot leads. Auto-ingestion running (FAA + HMLR + Western HNWI). |
| 2026-07-20 | **Post-import setup + relationship graph**: secrets set (REDIS_URL_1, COMPANIES_HOUSE_API_KEY), artifact-managed workflows restored, schema pushed, FAA 30k + LR 2k ingested, Western HNWI restarted (5k target), hot flags synced (14,814), name-clustering endpoint built (113,946 CORPORATE_SERIES edges), CH enrichment running. |
| 2026-07-20 | **Hybrid architecture correction + 4 operational steps**: (1) Entity reclassification ran — 22,741→Corp, 585→Trust, 8,674 remain HNWI. (2) CH enricher started (500 entities, addresses added). (3) Relationship auto-detect ran — 0 found (FAA addresses are unique; need different signal). (4) MCTS run on top 5 hot leads — sessions 1–5 created, path scores 0.415–0.488. Code: algorithmPipeline in research.ts now labels L1–L5; persona-engine layer numbering corrected (MCTS=L4); research.tsx HYBRID_PIPELINE string updated; improvements.md Core Hybrid Architecture section added. |
| 2026-07-23 | Access-first frontend pass: added server/client `accessScore` contract and contactability-first dashboard ranking; changed visible badges from misleading Reach labels to Access/Signal; simplified dashboard and background-task copy; restored API Server and ApexFinder Web workflows. Web/API smoke checks passed, but this import's PostgreSQL connection was unavailable so populated-data screenshots could not be captured. |
| 2026-07-23 | Imported-project setup: securely confirmed `REDIS_URL_1`, `REDIS_URL_2`, and `COMPANIES_HOUSE_API_KEY`; restored dependencies from the lockfile; started Redis, API Server, and ApexFinder Web; API health and web HTTP checks passed. Artifact-registry screenshot resolution remains unavailable in this import. |
| 2026-07-23 | UI/UX polish pass: added `formatEntityName` (ALL CAPS → title case) + `formatSignal` (strips verbose SEC "Source:/Filing type:" prefix) to utils.tsx. Applied formatEntityName across all 7 name display locations: dashboard, entities, profile, graph dropdown, research, duplicates. Fixed graph single-node blob — added "No connections mapped yet" overlay when nodes=1 and links=0 instead of showing lone giant circle. Graph Corp color fix (Corp → blue) was already in place from prior session. |
| 2026-07-23 | GitHub import re-setup (#23): pnpm install ✅, DB schema pushed ✅, REDIS_URL already set ✅. All 4 artifacts re-registered via verifyAndReplaceArtifactToml. Workflows running: Redis, API Server (8080), apex-finder web (23695). App loads — 32,000 profiles, 7,453 hot leads. Cold-start auto-ingestion fired (FAA + Western HNWI background job running). |
| 2026-07-20 | **Sim run (post-import)**: 6 persona batches × 50 entities = 300 entities. 2,376 suggestions (1,284 high / 498 medium / 594 low). Top flags: 100% zero contact vectors, 100% isolated nodes (0 relationships), 100% no MCTS sessions. App rating updated: **6.0/10** (up from 5.2 baseline). All 5 code phases complete; gap is purely operational — trigger CH enricher + relationship auto-detect + entity reclassification. improvements.md updated with full breakdown. |
| 2026-07-19 | GitHub import re-setup: pnpm install, DB schema pushed, REDIS_URL set, REDIS_URL_1 (Upstash) set and verified connected (`[upstash-1] Redis ready`). Workflows running: Redis, API Server (port 8080), apex-finder web (port 23695). App loads. DB empty — needs ingestion. |
| 2026-07-19 | Fresh GitHub import. Environment bootstrapped. DB empty. Upstash not connected. |
| 2026-07-19 | REDIS_URL_1 (Upstash) set and verified connected (`[upstash-1] Redis ready`). Dedup now persists across restarts. Ready for ingestion. |
| 2026-07-19 | Synthetic data purge: removed Math.random() jitter from graph path score (graph.ts), removed hardcoded "James"/"Captain" name fallbacks (pitch-generator.ts), replaced random skeleton widths with fixed value (sidebar.tsx). Added scripts/check-no-synthetic-data.sh — bans faker libs, Math.random() outside MCTS, lorem ipsum, seeding functions. Wired into post-merge.sh so every future merge is checked automatically. |
| 2026-07-19 | Ingestion run: FAA ✅ 12,902 inserted (37,110 deduped from prior Upstash session). LR ✅ 50,000 inserted (50,000 deduped). Western HNWI 🔄 running in background (~600+ so far, SEC EDGAR rate-limited). Dashboard live: ~63,500 entities, ~62,900 assets, 5,151 hot leads. |
| 2026-07-19 | Replaced MCTS Expert persona with Intel Systems Analyst (`intel_systems_analyst`). New persona covers the full hybrid stack: MCTS path coverage (Layer 1), hybrid search signal coverage / BM25+RRF anchors (Layer 2), agent orchestration pipeline completeness / Planner→Retriever→Analyst→Critic (Layer 3), Bayesian-UCB convergence / score-frozen detection (Layer 4). Updated persona-engine.ts, improvements.tsx, improvement_logs.ts schema comment. |
| 2026-07-19 | GitHub import re-setup: pnpm install, DB schema pushed, all 4 artifacts re-registered (verifyAndReplaceArtifactToml), API server + apex-finder web workflows running. Dashboard loads. DB empty — needs re-ingestion. |
| 2026-07-19 | REDIS_URL_1 (Upstash) set and verified connected (`[upstash-1] Redis ready`). Dedup state from prior sessions is live. Ready for ingestion. |
