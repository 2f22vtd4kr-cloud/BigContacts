# Apex Atlas — new Replit account setup contract

## Repository

Import the existing repository through the connected Replit ↔ GitHub integration:

`https://github.com/2f22vtd4kr-cloud/BigContacts`

Use the reviewed branch `main` only for this engineering review/build. The production/certification branch remains `main` until the reviewed changes are accepted.

Do not ask for a GitHub PAT, `GITHUB_TOKEN`, or any other GitHub credential.

Read `docs/context.md` before modifying, installing or running anything.

## Architecture that must remain intact

Apex has two AI layers only:

- Gemini Boss + Gemini Right-hand for bounded oversight.
- A selected Groq or Mistral Investigator for actual research.

The Investigator owns its research trajectory. Tools are capabilities, not fixed phases. Deterministic code enforces safety, authorization, provenance, identity, persistence and resource limits; it must not secretly substitute a scripted research sequence.

DeepSeek/NVIDIA is not an active Apex provider path and must not be requested as an Investigator or Right-hand secret.

## Fresh-account secret contract

The startup contract is **exactly these 16 names, in this order**. Ask for/configure every one in Replit Secrets. Do not turn setup into conditional provider discovery.

```text
1. REDIS_URL_1
2. GROQ_API_KEY
3. GEMINI_API_KEY
4. MISTRAL_API_KEY
5. HF_TOKEN
6. SERPER_API_KEY
7. TAVILY_API_KEY
8. SERPAPI_KEY
9. EXA_API_KEY
10. SCRAPFLY_API_KEY
11. ZENROWS_API_KEY
12. COMPANIES_HOUSE_API_KEY
13. GEMINI_RIGHT_HAND_API_KEY
14. APEX_API_AUTH_TOKEN
15. APEX_OPERATOR_PASSWORD
16. APEX_SESSION_SECRET
```

Check presence only. Never display, echo, log, commit, or paste secret values into chat.

`DATABASE_URL` is supplied by Replit/Postgres and must not be requested from the operator.

Do not request GitHub credentials, retired DeepSeek/NVIDIA credentials, `WHOISJSON_API_KEY`, `WHOXY_*`, or `REDIS_URL_2`–`REDIS_URL_5`.

Older `docs/bureau-plan/*` secret lists are historical and are not authoritative for fresh-account setup. This file and `docs/APEX_REPLIT_INITIALIZATION_BLUEPRINT.md` are the current contract.

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
