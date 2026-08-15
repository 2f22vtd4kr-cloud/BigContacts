# Apex Atlas

**Bureau-first OSINT desk for attributable contacts on mid-market operators and high-net-worth individuals.**

Apex Atlas is not a CRM vanity list and not a generic people-search engine. Its job is to recover **reachable, attributable people-contacts** (owners, officers, founders, key managers) plus ownership/succession evidence so you can reach people who control capital — with **fail-closed** discipline: never invent contacts, never mark org inboxes as personal, always keep source URLs.

---

## What it does

| Capability | Detail |
|------------|--------|
| **Discovery** | Company-first (registries, public surface) and wallet-first (public wallet → fail-closed holder attribution) |
| **Multi-provider research** | Perplexity Sonar, Gemini (Google Search grounding), Tavily, Exa — in parallel, then structured extraction |
| **Contact maximizer** | Personal domain emails, direct phones, roles; org routes (`info@`, `sales@`) kept separate |
| **Registries** | Companies House officers/PSC, OpenOwnership, OCCRP, FAA/asset lanes, foundation filings |
| **Desk UI** | Overview, Entity ledger, Discover, Connections graph, Live reactor, Jobs, Persona review, Field manual |
| **Pipeline** | `POST /api/ingest/atlas-run` — multi-phase job queue (Redis) → enrichment → ledger |

**Non-negotiable rules**

- Never invent emails or phones.
- Never label `info@` / `sales@` / `admin@` as personal contact.
- Every claimed fact needs `sourceUrls` where the claim appears.
- Trash-phone and placeholder-email gates stay on (`jdoe@`, synthetic patterns, HQ switchboards for HNWI personal lines).

---

## Monorepo layout

```
apex-atlas/
├── artifacts/
│   ├── apex-finder/     # Web UI (Vite + React) — research desk
│   ├── api-server/      # Express API, job queue, Atlas orchestrator, enrichers
│   ├── apex-mobile/     # Mobile surface
│   ├── apex-runtime/    # Runtime helpers
│   └── …
├── lib/
│   ├── api-client-react/
│   ├── api-spec/
│   ├── api-zod/
│   └── db/              # Drizzle / Postgres
├── scripts/             # Holdout extractors, floor checks, overnight loops
├── docs/                # Deploy notes, evals, design system
└── pnpm-workspace.yaml
```

Package manager: **pnpm only** (npm/yarn are blocked on install).

---

## Quick start (development)

### Prerequisites

- Node 20+ / pnpm 9+
- Postgres (for ledger)
- Upstash Redis (or compatible) — `REDIS_URL`, `REDIS_URL_1`, `REDIS_URL_2`, …
- Optional research keys: `TAVILY_API_KEY`, `SERPAPI_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, Companies House, Whoxy, etc.

### Install & run

```bash
pnpm install

# API (job queue + atlas-run)
cd artifacts/api-server && pnpm run dev

# UI (separate terminal)
cd artifacts/apex-finder && pnpm run dev
```

Open the desk → **Launch Atlas** (posts to `/api/ingest/atlas-run`).  
Use `?mock=1` on the UI only for offline chrome demos; mock mode does **not** run the pipeline.

### Holdout / capacity tests (no full UI)

```bash
# Same contact-extractor family as production research (bring real keys)
node scripts/holdout-walker-apex-run.mjs
node scripts/check-discovery-stack-floor.mjs
```

Production validation modules live under `artifacts/api-server/src/lib/`:

- `contact-validation.ts` — public email/phone gates  
- `ai-extractor.ts` — LLM prompts + placeholder rejection (`jdoe`, role inboxes, …)  
- `web-enricher.ts` — Phase 0 multi-provider research + scrape  
- `atlas-orchestrator.ts` — full pipeline phases  

Raw regex holdouts **without** those modules are scrape capacity only, not full Atlas capacity.

---

## Architecture (research path)

```
Entity / target
    │
    ▼
Phase 0 search (parallel)
  Perplexity │ Gemini grounded │ Tavily │ Exa
    │
    ▼
HTML / evidence scrape + Groq structure extract
    │
    ▼
Gates: isPlaceholderEmail · isGenericEmailPrefix · looksLikePersonName · trash-phone
    │
    ▼
contact_evidence + person rows (sourceUrls required)
    │
    ▼
Confidence / reachability scores → ledger + reactor
```

HNWI prompts explicitly forbid HQ switchboards as “personal phone” and forbid constructing emails from guessed patterns.

---

## Environment (common)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres |
| `REDIS_URL` | Local/fast cache |
| `REDIS_URL_1` … | Permanent Upstash slots (jobs, contact cache) |
| `TAVILY_API_KEY` | Web research |
| `SERPAPI_KEY` | Google SERP |
| `GEMINI_API_KEY` | Grounded web research |
| `GROQ_API_KEY` | Structure extraction |
| `COMPANIES_HOUSE_API_KEY` | UK officers / PSC |
| `WHOXY_API_KEY` / `WHOISJSON_KEY` | WHOIS / reverse WHOIS |

See `docs/REPLIT_DEPLOY.md` for deploy-oriented notes.

---

## Scripts worth knowing

| Script | Role |
|--------|------|
| `scripts/holdout-*-apex-run.mjs` | Live contact holdouts on named companies |
| `scripts/check-discovery-stack-floor.mjs` | Static floor: required code paths present |
| `scripts/check-trash-phone.mjs` | Trash-phone gate regression |
| `scripts/check-embarrassment-floor.mjs` | Visibility / quality floor |

---

## Product goal

Maximize **attributable personal contacts** for private mid-market and HNWI-adjacent targets.  
Any gap vs a strong general agent on that metric is treated as a product bug, not a philosophy issue.

---

## License & use

Private workspace product. Public-records research only; operators are responsible for lawful use in their jurisdiction.

---

## Status

Active development. UI polish and pipeline hardening in progress. Prefer **api-server + finder** together for real runs; UI-only hosts are for design review.
