# Apex Atlas — new Replit account setup contract

## Repository

Import the existing repository through the connected Replit ↔ GitHub integration:

`https://github.com/2f22vtd4kr-cloud/BigContacts`

Use the reviewed branch `audit/apex-atlas-very-strong-v1` only for this engineering review/build. The production/certification branch remains `main` until the reviewed changes are accepted.

Do not ask for a GitHub PAT, `GITHUB_TOKEN`, or any other GitHub credential.

Read `docs/context.md` before modifying, installing or running anything.

## Architecture that must remain intact

Apex has two AI layers only:

- Gemini Boss + Gemini Right-hand for bounded oversight.
- A selected Groq or Mistral Investigator for actual research.

The Investigator owns its research trajectory. Tools are capabilities, not fixed phases. Deterministic code enforces safety, authorization, provenance, identity, persistence and resource limits; it must not secretly substitute a scripted research sequence.

DeepSeek/NVIDIA is not an active Apex provider path and must not be requested as an Investigator or Right-hand secret.

## Runtime provider/integration secrets

The active provider/integration contract contains exactly these **13** names:

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

The separate API/browser security boundary uses:

```text
APEX_API_AUTH_TOKEN
APEX_OPERATOR_PASSWORD
APEX_SESSION_SECRET
```

These are deployment security controls, not provider keys. Never print or commit secret values.

Do not ask for GitHub credentials, `DATABASE_URL`, `WHOISJSON_API_KEY`, `WHOXY_*`, `REDIS_URL_2`–`REDIS_URL_5`, or DeepSeek/NVIDIA credentials.

## Install and run

Use the repository's existing pnpm scripts, lockfiles and configuration. Do not scaffold a replacement application.

For first-time Postgres initialization only:

```bash
APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh
```

The helper runs the repository's current schema push and verifies required durable tables. Schema mutation must not remain enabled during ordinary boot.

Run preflight, architecture checks, typecheck, builds, and focused tests. Start the canonical API workflow on port `8080`.

## Very Strong engineering state

The reviewed branch adds:

- evidence-graph cognition with bounded working context;
- information-gain research assessment;
- adaptive discovery portfolio allocation;
- optional independent Investigator trajectories;
- provider-native structured Investigator action outputs;
- source-family/source-class intelligence;
- diagnostic failure signals.

These features are structural research-quality infrastructure. They are not evidence that the application has passed a live empirical research benchmark.

## Research acceptance

Boot success is not research success.

For live research, preserve the complete Investigator trajectory, actual tool observations, provenance, evidence graph, claims, contradictions, contact states and oversight decisions.

The current Research Gauntlet v1 registry is 38 grounded-reviewed cases, version 1.1.1, with ground truth as of 2026-09-18.

## Final report

Report:

- branch;
- exact commit SHA;
- configured secret names only;
- install/preflight/typecheck/build/boot/health results;
- database initialization status;
- live research result and durable evidence identifiers;
- exact blockers.

A successful setup is not evidence that Apex is better than another research system. Research comparisons require matched benchmark runs and the frozen Gauntlet scoring protocol.

## Gemini role-separated credentials

The canonical bureau uses separate Gemini credentials:

- `GEMINI_API_KEY` — Gemini Boss.
- `GEMINI_RIGHT_HAND_API_KEY` — Gemini Right-hand.

There is no fallback from Right-hand to Boss credentials. Never print or expose either secret.
