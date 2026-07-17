# ApexFinder Pro

Enterprise OSINT and HNWI intelligence platform — identifies, scores, and builds warm-introduction paths to high-net-worth investors via graph analysis, Bayesian inference, and MCTS autonomous research.

---

## Master Prompt (permanent — read every session)

> "Of course there are many more places to use as data source — like Forbes, business registers, private clubs of old Ferraris, private gentleman clubs, luxury hunting of cheetahs in Africa and so on. We aim at maximum effectiveness which means we don't need company secretary's phone or public relations email addresses you know. We aim at getting as close to the body as possible of potential investors themselves and not people working for them. That's one of the main pillars of our backend algorithms and way of thinking about it. And, of course, a fucking stunning web app visually! Maybe, later we will sell it for subscription cause it's a no-brainer that such tool correctly and fully developed, that can always fetch new data and learn as it goes — is an 'imba' and people would buy it for big money but for now we develop it just for our personal use. Let's go. We don't need any external AI — you will do the job instead. Here we have model named Fable 5 in High effort mode — use it instead and remember it for future repo imports in Replit so I won't have to note it ever again."

**Core design pillars extracted from master prompt:**
1. **Get close to the body** — algorithms must weight paths that lead to PERSONAL contact with the HNWI (personal WhatsApp, direct phone, private introduction), not their staff/PR/company secretary.
2. **Diverse data sources** — Forbes lists, business registers, private clubs (Ferrari/Riva del Garda, old-car clubs), gentleman's clubs (Boodle's, Pratt's, Circolo della Caccia), luxury hunting operators (Kenya PHs, Laikipia), yacht clubs/marinas, superyacht brokers, aviation FBOs.
3. **Visually stunning** — "Palantir meets Bloomberg" dark obsidian (`#0B0F19`), neon green (`#10B981`) for live signals, electric blue (`#3B82F6`) for graph connections.
4. **No external AI APIs** — AI features implemented as sophisticated server-side TypeScript logic. Built-in Fable 5 model is the intelligence layer.
5. **Personal use first, subscription later** — build for max capability, not demo polish.

---

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/apex-finder run dev` — run the frontend (port 23695)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (Replit-managed, auto-provided)
- Required env: `REDIS_URL` — local Redis (`redis://localhost:6379`, ephemeral API cache)
- Required secret: `REDIS_URL_1` — Upstash TCP URL (permanent dedup, job state, HNWI index)
- Optional secret: `SESSION_SECRET` — used as admin token fallback for protected ingest ops

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite, Wouter (routing), Tailwind CSS, Shadcn/ui
- API: Express 5 (port 8080, path prefix `/api`)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)
- Maps: Leaflet + react-leaflet
- Graph: react-force-graph-2d (force-directed)

## Where things live

| Path | Purpose |
|------|---------|
| `artifacts/apex-finder/src/` | React frontend |
| `artifacts/apex-finder/src/pages/` | Dashboard, Graph, MCTS Terminal, CRM, Entities |
| `artifacts/apex-finder/src/components/layout.tsx` | Sidebar nav layout |
| `artifacts/apex-finder/src/lib/utils.tsx` | `cn`, `ScoreBadge`, `formatCurrency` — **single source of truth** |
| `artifacts/api-server/src/routes/` | Express route handlers |
| `artifacts/api-server/src/lib/` | Core logic: Bayesian, Graph, MCTS, Pitch, Mock data |
| `lib/db/src/schema/` | Drizzle schema (entities, assets, relationships, research_sessions) |
| `lib/api-spec/openapi.yaml` | OpenAPI contract — source of truth for all API shapes |
| `lib/api-client-react/src/generated/` | Auto-generated React Query hooks (do not edit) |
| `lib/api-zod/src/generated/` | Auto-generated Zod validators (do not edit) |

## Architecture decisions

- **"Get close to the body" scoring** — Bayesian scorer weights contact proximity (personal phone/WhatsApp > gatekeeper with direct access > company address). Surfaced as a `proximityScore` in entity metadata.
- **MCTS warmth model** — warmth decreases for HNWI direct, increases for Gatekeepers with confirmed personal contact channels. The algorithm prefers paths that end in personal WhatsApp/Signal of someone with private access.
- **Registry-first, social-second** — data sourcing prioritises public registries (Catasto, HMLR, IMO, Companies House, FAA) then cross-references club memberships / hunting operators / marina slips to find personal gatekeepers.
- **Mock data is production-quality** — the seeded dataset (Lorenzo Castellani, Edward Fitzwilliam-Holt, etc.) uses real registry patterns and believable personal contact chains. The app behaves identically with real data.
- **No external AI** — all "AI" is TypeScript: Bayesian log-odds updates, UCT-formula MCTS, template-driven pitch generation tuned per gatekeeper type. Future: Fable 5 integration for dynamic pitch personalisation.

## Product

Five tabs in the sidebar:
1. **Intelligence HQ** — Leaflet map of all geolocated assets + Live Signals hot-lead feed + 5-stat bar (Entities / Assets / Western HNWIs / Signal Avg / Hot Leads) + Western HNWI Engine panel (select target count, hit INGEST, watch live progress bar)
2. **Network Graph** — Force-directed graph of entity relationships; navigate to any entity via `/graph?entity=<id>`
3. **MCTS Terminal** — Live simulation log of the Monte Carlo search finding the optimal approach path
4. **Pipeline CRM** — Kanban from Lead Gen → Closed; AI pitch generation per session
5. **Entity Ledger** — Full registry: type chips (HNWI/Gatekeeper/Corp/Trust), proximity filter (any / 4+ / 7+ / 9+), CSV export, proximity score badge inline, color-coded type icons

### Western HNWI Engine
- Trigger: `POST /api/ingest/western-hnwi` (body: `{ targetCount, batchSize?, clearDedup? }`)
- Poll: `GET /api/ingest/job/:jobId` → `{ status, progress, inserted, skipped, errors, log[] }`
- Status: `GET /api/ingest/status` → dedupCount + HNWI count + active job
- Reset dedup: `DELETE /api/ingest/dedup`
- Country pools: US 35%, UK 18%, CH 10%, DE 9%, FR 7%, AU 6%, CA 6%, NO 4%, NL 3%, NZ 2%
- Wealth tiers: Billionaire ($1B+, 5%) → Ultra-HNWI ($100M–$1B, 15%) → Very High ($30M–$100M, 30%) → Standard ($5M–$30M, 50%)
- Dedup: Upstash Redis SET `apex:dedup:hnwi` — fingerprint = name+nationality+tier; re-runs skip already-seen records

### HNWI Search API
- `POST /api/search/hnwi` — filters: `countries[]`, `assetTypes[]`, `minScore`, `maxScore`, `minNetWorth`, `proximityMin`, `hotOnly`, `limit`, `offset`; results cached 30 s
- `GET /api/search/hnwi/facets` — available nationalities, asset types, proximity levels; cached 5 min

## User preferences

- Visually stunning above all — Palantir/Bloomberg aesthetic, dark obsidian, neon signals
- "Get close to the body" is the core philosophy — surface personal contact paths, not company contacts
- No external AI APIs — TypeScript logic only (Fable 5 is the built-in model to use)
- Save progress to replit.md after every significant implementation step
- Maximum effectiveness: personal phones, WhatsApp, Signal > company emails > PR contacts (last resort / useless)

## Gotchas

- **Fresh environment / first boot:** run `pnpm --filter @workspace/db run push` before starting the API server. Without it the server starts but every API route fails with "relation does not exist". The `scripts/post-merge.sh` handles this automatically after task merges.
- **Lib packages must be built before typechecking artifacts:** run `pnpm run typecheck:libs` (or `pnpm run build`) from the workspace root first. The frontend and API server reference `lib/*/dist/index.d.ts` which only exists after a build.
- **Mock seed is idempotent:** the server seeds mock data on every startup; it safely skips if data already exists.
- **`cn` helper lives in `@/lib/utils`** — do NOT redefine it inline in other files (`layout.tsx` had a duplicate; it has been removed).
- **Graph page uses `?entity=<id>` query param** — link to `/graph?entity=5` to open any entity's network directly.
- **React 19 `useRef` requires initial value** — `useRef<T>()` is invalid; use `useRef<T | undefined>(undefined)`.

## Session log (most recent first)

### Session 4 — Western HNWI Engine + Entity Ledger upgrades + Field Manual
- Dual Redis architecture: local ioredis (`REDIS_URL` → `redis://localhost:6379`) for API cache; Upstash (`REDIS_URL_1`) for permanent dedup/job state
- `connectPermanentRedis()` wired into server startup; both clients confirmed connected on boot
- `lib/western-hnwi-ingestion.ts` — generates realistic Western HNWI records (10 country pools, 4 wealth tiers, Bayesian scores, proximity 1–10, contact vectors, club memberships, assets)
- `lib/job-queue.ts` — Redis-backed background job tracker (createJob / updateJob / appendJobLog / getJob / getJobLog / dedup helpers)
- `routes/ingest.ts` — rewrote with `POST /ingest/western-hnwi` (fire-and-forget, no auth), `GET /ingest/job/:jobId`, `GET /ingest/status`, `DELETE /ingest/dedup`, `POST /ingest/faa`, `POST /ingest/extend`
- `routes/search.ts` — new file: `POST /search/hnwi` (7 filter params, 30 s cache), `GET /search/hnwi/facets` (5 min cache)
- `routes/dashboard.ts` — added `westernHnwiCount` to `/dashboard/stats` (JSON metadata LIKE query)
- `pages/dashboard.tsx` — 5-stat bar (Entities / Assets / **Western HNWIs** / Signal Avg / Hot Leads); `IngestionPanel` in right sidebar with target selector, progress bar, live log toggle, auto-refresh on completion
- `pages/entities.tsx` — proximity filter dropdown (any / 4+ / 7+ / 9+), type chip filters, CSV export (toolbar + footer), proximity score badge inline in rows, color-coded type icons (UserCheck / Building2 / Briefcase / Shield)
- `pages/manual.tsx` — updated Field Manual: Level II expanded with proximity scale table + Entity Ledger filter docs; new **Level V — MASS INGEST** covers engine workflow, country distribution bar chart, wealth tiers, dedup system, dashboard stats bar diagram

### Session 3 — Spacing tightened, SEC EDGAR live source added
- All page headers reduced: `p-6` → `px-6 py-3` across Dashboard stats bar, CRM header, Entity Ledger header
- CRM kanban gutter reduced: `p-6` → `p-4`
- Entity table cells: `px-6 py-4` → `px-4 py-3` (fits more rows on screen)
- Entity empty state: `py-12` → `py-8`
- MCTS Terminal button area: `p-4` + `py-3` → `p-3` + `py-2`
- Added **SEC EDGAR** as third live data source (free, no key): searches SC 13D/G (large shareholders >5%) and DEF 14A (directors/executives) filings since 2018. Available in Entity Ledger → LIVE INTEL dropdown as "SEC EDGAR (US Large Holders & Directors, Free)"
- Live registry routes now accept `"sec-edgar"` in addition to `"opencorporates"` and `"companies-house"`
- Artifact workflows re-registered after GitHub import; managed workflows now drive all four services

### Session 2 — Master prompt implementation, graph navigation, pitch engine
- Saved master prompt permanently to replit.md
- Fixed duplicate `cn` in `layout.tsx`, `dashboard.tsx`, `research.tsx` — all now import from `@/lib/utils`
- Graph page: entity selector dropdown (search/filter all entities), reads `?entity=N` from URL, "Set as Target" from node panel
- Dashboard "View Network" links now route to `/graph?entity=<entityId>`
- Pitch generator completely rewritten: gatekeeper classification (Geometra/Safari PH/Yacht Broker/Club/Family Office), Italian-language template for geometri, seasonal timing advice (safari Oct–Nov pre-season), commission structure by type, APEX INTELLIGENCE BRIEF block
- Mock data: replaced all placeholder phone numbers with realistic ones; enriched gatekeeper metadata with approach vectors and seasonal windows

### Session 1 — Setup and baseline
- Fixed React 19 `useRef` type error in `graph.tsx`
- Built lib packages, pushed DB schema, seeded mock data
- Both workflows running (API server port 8080, frontend port 23695)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- OpenAPI spec at `lib/api-spec/openapi.yaml` is the single source of truth — run codegen after changes
