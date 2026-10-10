# Apex Atlas — new Replit account setup contract

## Repository

Import the existing repository through the connected Replit ↔ GitHub integration:

`https://github.com/2f22vtd4kr-cloud/BigContacts`

Use the reviewed branch `main` only for this engineering review/build. The production/certification branch remains `main` until the reviewed changes are accepted.

Do not ask for a GitHub PAT, `GITHUB_TOKEN`, or any other GitHub credential.

Read `docs/context.md` before modifying, installing or running anything.

## Architecture that must remain intact

Apex has two oversight roles plus one Investigator lane:

- Groq Boss for case direction and Investigator capability selection.
- Groq Right-hand for bounded independent oversight.
- A selected Groq Investigator capability for actual model-owned research.

The Investigator owns its research trajectory. Tools are capabilities, not fixed phases. Deterministic code enforces safety, provenance, identity, persistence and resource limits; it must not secretly substitute a scripted research sequence.

Gemini, Mistral, and DeepSeek/NVIDIA are not active canonical control-plane or Investigator adapters and must not be requested as active Apex capabilities.

## Active provider secret contract

The repository preflight checks these active provider/integration names:

```
COMPANIES_HOUSE_API_KEY
EXA_API_KEY
GROQ_BOSS_API_KEY
GROQ_RIGHT_HAND_API_KEY
GROQ_INVESTIGATOR_API_KEY
HF_TOKEN
GROQ_INVESTIGATOR_API_KEY_1
REDIS_URL_1
SCRAPFLY_API_KEY
SERPAPI_KEY
SERPER_API_KEY
TAVILY_API_KEY
ZENROWS_API_KEY
```

Additional numbered Groq Boss, Right-hand, and Investigator credential slots are optional runtime capabilities. Investigator slots are independently selectable; for example `groq-investigator-1` maps to `GROQ_INVESTIGATOR_API_KEY`, `groq-investigator-2` maps to `GROQ_INVESTIGATOR_API_KEY_1`, through `groq-investigator-6` mapping to `GROQ_INVESTIGATOR_API_KEY_5`.

Never silently rotate an explicitly selected Investigator capability to another credential.

Check presence only. Never display, echo, log, commit, or paste secret values into chat.

`DATABASE_URL` is supplied by Postgres/platform infrastructure and must not be requested from the operator.

Do not request GitHub credentials, retired Gemini/Mistral/DeepSeek/NVIDIA control-plane credentials, WHOIS/WHOXY credentials, or other retired secrets.

## Operator authentication — intentionally disabled

For the current Replit deployment, app-level operator sign-in and bearer-token authentication are intentionally disabled. The desk opens directly and operational API routes do not require an operator session, password, or bearer token. Replit preflight does not require operator-auth secrets.

This is an explicit deployment choice, not a claim that the API is protected: anyone who can reach the deployment URL can call its operational endpoints. Do not expose this deployment to an untrusted public audience.

Disabling the operator-auth gate does not disable the canonical research workflow, active-job lock, provider-role/quota rules, provenance, identity, evidence/admission, cancellation, or durable persistence guards.

## Install and run

Use the repository's existing pnpm scripts, lockfiles and configuration. Do not scaffold a replacement application.

For first-time Postgres initialization only:

```bash
APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh
```

The helper runs the repository's current schema push, durable hardening migration `001`, contact-outcome migration `002`, and review-only candidate taxonomy migration `003`, then verifies the required durable tables. Migration `003` reclassifies only rows with the canonical discovery review-only markers; malformed/legacy metadata is left untouched. Schema mutation must not remain enabled during ordinary boot.

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
