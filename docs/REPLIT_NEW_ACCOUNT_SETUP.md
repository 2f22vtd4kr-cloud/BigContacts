# Apex Atlas — new Replit account setup contract

## Repository

Import the existing repository through the connected Replit ↔ GitHub integration:

`https://github.com/2f22vtd4kr-cloud/BigContacts`

Use the authoritative branch `audit/genuine-five-green-final` for the current engineering/certification state unless the operator explicitly selects another reviewed branch.

Do not ask for a GitHub PAT, `GITHUB_TOKEN`, or any other GitHub credential. Read `docs/context.md` completely before modifying, installing or running anything.

## Architecture that must remain intact

Apex has two AI layers only:

- Gemini Boss + Gemini Right-hand for bounded oversight.
- A selected Groq or Mistral Investigator for actual research.

The Investigator owns its research trajectory. Tools are capabilities, not fixed phases. Deterministic code enforces safety, authorization, provenance, identity, persistence and resource limits; it must not secretly substitute a scripted research sequence.

DeepSeek/NVIDIA is not an active Apex provider path and must not be requested as an Investigator or Right-hand secret.

## Runtime provider/integration secrets

The active provider/integration contract contains exactly these **13** names after WHOIS retirement:

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
GEMINI_RIGHT_HAND_API_KEY
```

`REDIS_URL` and `EXA_1` are compatibility aliases, not additional operator asks.

The separate API/browser security boundary uses:

```text
APEX_API_AUTH_TOKEN
APEX_OPERATOR_PASSWORD
APEX_SESSION_SECRET
```

These are deployment security controls, not provider keys. Never print or commit secret values.

Do not ask for GitHub credentials, `DATABASE_URL`, `WHOISJSON_API_KEY`, `WHOXY_*`, `REDIS_URL_2`–`REDIS_URL_5`, or DeepSeek/NVIDIA credentials. WHOIS is retired from Apex.

## Install and run

Use the repository's existing pnpm scripts, lockfiles and configuration. Do not scaffold a replacement application.

Replit Postgres is platform-managed. A first-time schema initialization may use the repository's explicit `APEX_ALLOW_SCHEMA_PUSH=true` procedure; schema mutation must not remain enabled during ordinary replica boot.

Run the existing preflight, architecture checks, typecheck and build. Start the canonical API workflow on port `8080`. Fix genuine failures at root cause; never weaken tests or architecture checks to obtain green output.

## Research acceptance

Boot success is not research success.

For live research, preserve the complete Investigator trajectory, actual tool observations, provenance, evidence graph, claims, contradictions, contact states and oversight decisions. Do not seed known URLs or manufacture evidence.

The next research-quality phase is **Apex Research Gauntlet v1**. Its protocol is in `docs/APEX_RESEARCH_GAUNTLET_V1.md`; its versioned registry is in `benchmarks/research-gauntlet-v1.json`.

## Final report

Report branch, exact commit SHA, configured secret names only, install/preflight/typecheck/build/boot/health results, database initialization status if applicable, and exact blockers.

A successful setup is not evidence that Apex is better than another research system. Research-system comparisons require matched benchmark runs and the frozen Gauntlet scoring protocol.


## Apex Gemini role-separated credentials

The canonical Apex Bureau uses separate Gemini credentials by role:

- `GEMINI_API_KEY` — Gemini Boss.
- `GEMINI_RIGHT_HAND_API_KEY` — Gemini Right-hand Advisor; there is no fallback to the Boss credential.

Keep both secrets configured in environments that execute the canonical Bureau or the empirical campaign. Never print or expose either secret in logs, reports, screenshots, or client-side code.
