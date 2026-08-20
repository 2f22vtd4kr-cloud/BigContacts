# Apex Atlas

**Find the people behind the money — and how to reach them.**

Apex Atlas is an OSINT research desk built to identify decision-makers, owners, and high-net-worth individuals connected to private companies and capital — then surface **real, attributable contact paths** from public sources.

It is designed for operators who need more than a company name and a generic inbox: founders, officers, family successors, and related principals, with enough context to know *who* matters and *how* they can actually be reached.

---

## Run the bureau (precise)

Operators and Replit agents: follow **[docs/RUN_BUREAU.md](docs/RUN_BUREAU.md)** only. Canonical launch is `POST /api/ingest/atlas-run` with `CANONICAL_ATLAS_LAUNCH_BODY` — not ad-hoc startups.

## The problem it solves

Most tools stop at the company.

- Sales databases return a firmographic card and a guessed email pattern.
- Company registries list directors but not how to contact them.
- Classic OSINT frameworks map infrastructure and usernames, not investor reachability.
- Generic AI chat can summarize the web, but it does not run a disciplined, multi-source research pipeline or keep a living ledger of people, roles, and evidence.

If your work depends on **reaching the human who controls or influences capital** — mid-market owners, private-company leadership, family offices, succession-linked principals — those gaps compound quickly.

Apex Atlas is built for that job.

---

## What Apex Atlas does

**1. Starts from the right target**  
Company, person, or public asset trail (including on-chain signals where relevant). Discovery is oriented toward *who is economically important*, not only who appears in a marketing directory.

**2. Researches across public sources in parallel**  
Live web research, company filings, ownership registers, and related public records — combined so one weak source does not define the whole picture.

**3. Builds people, not just companies**  
Named principals with roles, relationships, and succession context where the public record supports it. Related people are first-class, not footnotes.

**4. Separates real contact paths from noise**  
Personal or direct routes are distinguished from shared company inboxes and switchboards. Claims stay tied to sources. Invented or pattern-guessed contacts are not treated as facts.

**5. Keeps a research desk, not a one-off answer**  
Results live in a workspace: entity ledger, relationship graph, live research activity, jobs, and review flows — so investigation can continue across sessions instead of disappearing into a chat scroll.

In short: **discover → attribute people → maximize reachable contacts → keep evidence.**

---

## Who it is for

- Teams researching **private mid-market companies** and their owners or officers  
- Operators who need **attributable outreach paths**, not purchased spray lists  
- Analysts tracing **ownership, succession, and related principals**  
- Anyone comparing “who controls this” with “how do we actually reach them”

It is **not** a mass email database, a CRM, or a replacement for legal counsel on outreach compliance. It is a **public-records research product** for serious contact intelligence.

---

## Closest alternatives — and why they are not the same

| Category | Examples | What they do well | Why they are not Apex Atlas |
|----------|----------|-------------------|-----------------------------|
| **B2B contact databases** | Apollo, Hunter, Lusha, Cognism | Scale, domain email patterns, sales workflows | Built for volume outbound. Weak on private-company ownership trails, succession, and strict “is this really a personal reach path?” discipline. |
| **Website → contact agents** | Tools that scrape About/Team pages into CSVs | Fast extraction from a known site | Usually one page or one domain at a time; little registry graph, little multi-hop ownership, no lasting research desk. |
| **Classic OSINT suites** | Maltego, SpiderFoot, investigator CLIs | Link analysis, infra, username/email footprint | Excellent for investigations broadly; not productized around *investor/operator contact maximizer* outcomes. |
| **Registry browsers** | Companies House, OpenCorporates, OpenOwnership | Authoritative officers and control | Stop at the filing. They do not assemble multi-source contact paths or a working desk around them. |
| **LP / allocator platforms** | Institutional investor intelligence products | Fund and family-office coverage at scale | Different market (allocations and mandates), not mid-market owner/operator reachability. |
| **General AI assistants** | Chat agents with web browse | Flexible ad-hoc research | No durable ledger, no fixed multi-phase pipeline, easy to blur org inboxes with personal contacts or invent plausible details. |

**Apex Atlas sits in a thin band:** public OSINT depth **plus** a desk whose success metric is **attributable people-contacts** for capital-relevant targets. Neighbors exist on every side; the combination is uncommon.

---

## How to think about it

| If you need… | Apex Atlas |
|--------------|------------|
| A million verified work emails for SDR sequences | No — use a sales database |
| A pure graph tool for sanctions or cyber investigations | Partial — registries help; the product goal is different |
| “Who owns this private firm, who is related, and what public contact paths exist?” | **Yes — this is the center of the product** |
| A workspace that keeps people, evidence, and live research runs together | **Yes** |

---

## Repository (engineering)

This monorepo contains the research desk UI, API/job pipeline, shared data layer, and evaluation scripts.

```text
artifacts/apex-finder   → web research desk
artifacts/api-server    → API, orchestration, enrichment
lib/                    → shared client, schema, contracts
scripts/                → holdouts and quality floors
docs/                   → architecture and testing notes
```

Use **pnpm**. Full local runs need the API, database, Redis, and research provider keys. See `docs/ARCHITECTURE.md` and `docs/TESTING.md` for engineering detail.

---

## Principle

**Every contact should be a person you can justify from the public record — not a guess that looks like one.**

That principle is the product.
