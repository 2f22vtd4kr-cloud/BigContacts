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
1. **Intelligence HQ** — Leaflet map of all geolocated assets + Live Signals hot-lead feed
2. **Network Graph** — Force-directed graph of entity relationships; navigate to any entity via `/graph?entity=<id>`
3. **MCTS Terminal** — Live simulation log of the Monte Carlo search finding the optimal approach path
4. **Pipeline CRM** — Kanban from Lead Gen → Closed; AI pitch generation per session
5. **Entity Ledger** — Full registry of all tracked entities, sortable by Bayesian score

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

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- OpenAPI spec at `lib/api-spec/openapi.yaml` is the single source of truth — run codegen after changes
