# Apex Atlas

**Find the people behind the money — and how to reach them.**

Apex Atlas is an OSINT research desk built to identify decision-makers, owners, and high-net-worth individuals connected to private companies and capital, then surface **real, attributable contact paths** from public sources.

It is a model-led research bureau, not a fixed enrichment script: Gemini Boss + Gemini Right-hand provide bounded oversight, a selected **Groq or Mistral Investigator** owns the research trajectory, and deterministic code enforces safety, provenance, identity, persistence and resource limits without secretly prescribing the research path.

## Current engineering state

- **Authoritative branch:** `audit/genuine-five-green-final`
- **Certification:** 5 consecutive complete codebase audits GREEN on the authoritative branch, with an independent prompt-architecture audit. The exact certified SHA is the SHA of the latest successful CI runs; this README intentionally does not hard-code a stale historical SHA.
- The certification is an architecture/regression milestone; it is **not** a claim that Apex has won an external research-quality benchmark.

## Architecture in one view

```
CASE / OBJECTIVE
    ↓
Gemini Boss + Gemini Right-hand
    ↓
Groq OR Mistral Investigator
    ↓
Investigator chooses search / visit / registry / OSINT action
    ↓
validated tool execution
    ↓
observation + provenance
    ↓
claim / identity / contradiction / contact state
    ↓
durable case + evidence graph + event ledger
    ↺ oversight and next Investigator act
```

**Tools are capabilities, not stages.** There is no mandatory identity → organization → contact hop recipe. The Investigator chooses what to investigate next.

## Research-quality program

The next phase is **Apex Research Gauntlet v1**: a 38-case grounded benchmark covering ambiguous identities, sparse footprints, collisions, stale/conflicting contacts, negative findings, misleading sources and multi-pivot investigations.

The benchmark compares complete research systems under matched tasks and resource envelopes. It measures identity accuracy, contact attribution, evidence support, contradiction handling, unsupported claims, false positives, useful pivots and operational efficiency. It deliberately does not reduce the system to a single “smartness” score.

See:

- `docs/context.md` — living architecture and research handoff
- `docs/BUREAU_REACT_ARCHITECTURE.md` — canonical ReAct role law
- `docs/APEX_RESEARCH_GAUNTLET_V1.md` — benchmark protocol
- `benchmarks/research-gauntlet-v1.json` — versioned case registry
- `docs/REPLIT_NEW_ACCOUNT_SETUP.md` — new deployment setup
- `docs/RUN_BUREAU.md` — operational run procedure

## Runtime secret contract

The active research architecture uses exactly these provider/integration secrets:

```text
REDIS_URL_1
GROQ_API_KEY
GEMINI_API_KEY
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

That is **13 active provider/integration secrets**. DeepSeek/NVIDIA is not an active Apex provider path and must not be requested as an Investigator or Right-hand secret.

The separate API/browser security controls are:

```text
APEX_API_AUTH_TOKEN
APEX_OPERATOR_PASSWORD
APEX_SESSION_SECRET
```

They are deployment security controls, not provider keys. Never print or commit secret values. Do not ask for GitHub credentials or `DATABASE_URL` as an operator secret.

## Run the bureau

Use the repository's existing pnpm scripts and canonical API workflow. The canonical application boundary is API port **8080** with the desk at `/` and API at `/api/`.

For deployment/setup, read `docs/REPLIT_NEW_ACCOUNT_SETUP.md` and `docs/RUN_BUREAU.md` before changing runtime configuration.

The research endpoint is the canonical Atlas launch contract, not an ad-hoc startup script.

## Product principle

**Every contact should be a person you can justify from the public record — not a guess that looks like one.**

Architecture proves the bureau can behave that way. The Gauntlet is how we measure whether it actually does.
