# Apex Atlas

**Find the people behind the money — and how to reach them.**

Apex Atlas is an OSINT research desk built to identify decision-makers, owners, and high-net-worth individuals connected to private companies and capital — then surface **real, attributable contact paths** from public sources.

It is designed for operators who need more than a company name and a generic inbox: founders, officers, family successors, and related principals, with enough context to know *who* matters and *how* they can actually be reached.

---

## New Replit account setup

**Repository:** `https://github.com/2f22vtd4kr-cloud/BigContacts`  
**Branch:** `main`

1. Import this existing repository through the connected Replit ↔ GitHub integration.
2. Do **not** ask for a GitHub PAT, `GITHUB_TOKEN`, or any GitHub credential. GitHub access is handled by the connected integration.
3. Before changing, installing, or running anything, read `docs/context.md` completely. It is the living development and architecture handoff.
4. Use the repository's existing package manager, lockfiles, scripts, and configuration. Do not scaffold a replacement application or redesign Apex during setup.
5. Replit Postgres is platform-managed. Do **not** ask the operator for `DATABASE_URL` or a Postgres connection string.
6. Configure exactly the operator runtime secret set documented below and in `docs/REPLIT_NEW_ACCOUNT_SETUP.md`.
7. Run the existing preflight, checks, builds, and boot flow. Fix real failures at the root cause; do not weaken tests or bypass architecture checks to obtain green output.

### Canonical operator secret names

The new-account operator secret list contains exactly these 14 names:

```text
REDIS_URL_1
GROQ_API_KEY
GEMINI_API_KEY
NVIDIA_NIM_API_KEY
MISTRAL_API_KEY
HF_TOKEN
SERPER_API_KEY
TAVILY_API_KEY
SERPAPI_KEY
EXA_API_KEY
SCRAPFLY_API_KEY
ZENROWS_API_KEY
COMPANIES_HOUSE_API_KEY
WHOISJSON_API_KEY
```

Important mappings: the operator's Redis/Upstash URL goes in `REDIS_URL_1`; the Hugging Face token goes in `HF_TOKEN`; NVIDIA uses `NVIDIA_NIM_API_KEY`; Exa uses `EXA_API_KEY`. `REDIS_URL` and `EXA_1` are compatibility aliases, not additional operator asks. Do not ask for `DATABASE_URL`, `WHOXY_*`, `REDIS_URL_2`–`REDIS_URL_5`, or duplicate GitHub credentials.

Never print or commit secret values.

**Detailed new-account setup contract:** `docs/REPLIT_NEW_ACCOUNT_SETUP.md`  
**Living development context:** `docs/context.md`  
**Operational run procedure:** `docs/RUN_BUREAU.md`

---

## Run the bureau (precise)

**One path only:**

| Who | What to do |
|-----|------------|
| **Replit** | Import this GitHub repo into the connected Replit App/project, read `docs/context.md`, configure the canonical runtime Secrets, then follow `docs/REPLIT_NEW_ACCOUNT_SETUP.md` and `docs/RUN_BUREAU.md`. |
| **Operators / Shell** | Follow **[docs/RUN_BUREAU.md](docs/RUN_BUREAU.md)** only. |
| **Research command** | `POST /api/ingest/atlas-run` using the repository's canonical launch contract — not ad-hoc scripted startups. |

**Requirements in short**

- Current `main` tip; prefer latest
- API Server only on port **8080** (desk at `/`, API at `/api/`)
- `ENABLE_AUTO_PIPELINE=false`
- **Postgres:** Replit platform-managed (`DATABASE_URL` is not an operator secret)
- **Redis:** operator Upstash URL as `REDIS_URL_1`
- Canonical 14 runtime keys listed above
- Dig is **free ReAct**: no force-hop scripts, no invented people or contacts
- Living handoff: **[docs/context.md](docs/context.md)**

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

## Repository (engineering)

```text
artifacts/apex-finder   → web research desk
artifacts/api-server    → API, orchestration, free-ReAct Dig
lib/                    → shared client, schema, contracts
scripts/                → quality floors, regression guards, Replit boot
docs/                   → context and operational setup/run contracts
```

Use **pnpm**. Full runs need the API, database, Redis, and research provider keys.

---

## Principle

**Every contact should be a person you can justify from the public record — not a guess that looks like one.**

That principle is the product.
