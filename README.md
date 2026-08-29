# Apex Atlas

**Find the people behind the money — and how to reach them.**

Apex Atlas is an OSINT research desk built to identify decision-makers, owners, and high-net-worth individuals connected to private companies and capital — then surface **real, attributable contact paths** from public sources.

It is designed for operators who need more than a company name and a generic inbox: founders, officers, family successors, and related principals, with enough context to know *who* matters and *how* they can actually be reached.

---

## Run the bureau (precise)

**One path only. Do not invent alternate startups.**

| Who | What to do |
|-----|------------|
| **Replit (preferred)** | New/fresh account → Create Repl **from this GitHub repo** (`main`) → attach **Postgres** → Secrets → open **Agent inside that Repl** → paste the fenced block in **[docs/REPLIT_UPDATE_PROMPT_LATEST.md](docs/REPLIT_UPDATE_PROMPT_LATEST.md)**. That single paste is install → build → boot → seed if empty → single-target Dig → scoreboard. |
| **Operators / Shell** | **[docs/RUN_BUREAU.md](docs/RUN_BUREAU.md)** only (same procedure expanded). |
| **Research command** | `POST /api/ingest/atlas-run` with canonical body or `singleTargetId` Dig body — not ad-hoc scripts. |

Living handoff: **[docs/context.md](docs/context.md)**. Tip floor: **42b36b0+**.

**Requirements in short**

- Tip `main` at **42b36b0+** (Batch 10 API build repair)
- API Server only on port **8080** (desk at `/`, API at `/api/`)
- `ENABLE_AUTO_PIPELINE=false`
- Secrets: Redis + search + dig LLM (never `DATABASE_URL` as a Secret — Replit injects it)
- Dig is **free ReAct** (no force-hop scripts). Scoreboard proof = **single-target Dig**, not discovery-first bulk
- Living handoff: **[docs/context.md](docs/context.md)**

```bash
# After secrets + Postgres (see RUN_BUREAU.md for full Replit hardening)
git pull origin main && git log -1 --oneline
pnpm install --registry=https://registry.npmjs.org --child-concurrency 1
pnpm --filter @workspace/db run push
pnpm --dir artifacts/apex-finder run build
pnpm --dir artifacts/api-server run build
pnpm run check:no-force-dig && pnpm run check:free-react
ENABLE_AUTO_PIPELINE=false bash scripts/replit-boot.sh
curl -sS http://127.0.0.1:8080/api/healthz
```

---

## The problem it solves

Most tools stop at the company.

- Sales databases return a firmographic card and a guessed email pattern.
- Company registries list directors but not how to contact them.
- Classic OSINT frameworks map infrastructure and usernames, not investor reachability.
- Generic AI chat can summarize the web, but it does not run a disciplined, multi-source research desk or keep a living ledger of people, roles, and evidence.

If your work depends on **reaching the human who controls or influences capital** — mid-market owners, private-company leadership, family offices, succession-linked principals — those gaps compound quickly.

Apex Atlas is built for that job.

---

## What Apex Atlas does

**1. Starts from the right target**  
Company, person, or public asset trail. Discovery is oriented toward *who is economically important*.

**2. Researches across public sources**  
Live web research and public records — models choose search/visit/OSINT tools (free ReAct), not a fixed hop script.

**3. Builds people, not just companies**  
Named principals with roles and relationships where the public record supports it.

**4. Separates real contact paths from noise**  
Claims stay tied to source URLs. Invented or pattern-guessed contacts are not treated as facts.

**5. Keeps a research desk**  
Entity ledger, relationship graph, live research activity, jobs, and review flows.

In short: **discover → attribute people → maximize reachable contacts → keep evidence.**

---

## Who it is for

- Teams researching **private mid-market companies** and their owners or officers  
- Operators who need **attributable outreach paths**, not purchased spray lists  
- Analysts tracing **ownership, succession, and related principals**

It is **not** a mass email database, a CRM, or a replacement for legal counsel on outreach compliance. It is a **public-records research product** for serious contact intelligence.

---

## Closest alternatives — and why they are not the same

| Category | Examples | Why they are not Apex Atlas |
|----------|----------|-----------------------------|
| **B2B contact databases** | Apollo, Hunter, Lusha | Volume outbound; weak on private ownership trails and strict personal-route discipline |
| **Website → contact agents** | Single-site scrapers | Little multi-hop ownership; no lasting research desk |
| **Classic OSINT suites** | Maltego, SpiderFoot | Broad investigation; not productized around investor/operator contact maximizer outcomes |
| **Registry browsers** | Companies House, OpenCorporates | Stop at the filing |
| **General AI assistants** | Chat agents with browse | No durable ledger; easy to blur org inboxes with personal contacts |

**Apex Atlas sits in a thin band:** public OSINT depth **plus** a desk whose success metric is **attributable people-contacts** for capital-relevant targets.

---

## Repository (engineering)

```text
artifacts/apex-finder   → web research desk (build → dist/public, served by API)
artifacts/api-server    → API, orchestration, free-ReAct dig
lib/                    → shared client, schema, contracts
scripts/                → quality floors, scoreboard, Replit boot
docs/                   → RUN_BUREAU.md, context.md, REPLIT_UPDATE_PROMPT_LATEST.md
```

Use **pnpm**. Full runs need the API, database, Redis, and research provider keys.

---

## Principle

**Every contact should be a person you can justify from the public record — not a guess that looks like one.**

That principle is the product.

## About

Repository for [https://replit.com/@llhdeunvad/Wait-Instructions](https://replit.com/@llhdeunvad/Wait-Instructions)
