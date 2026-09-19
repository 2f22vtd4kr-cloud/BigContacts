# Apex Atlas — precise deployment and bureau run procedure

This is the canonical operational meaning of “Run Apex Atlas”, “Start the bureau”, or “Launch research”.

**Authoritative engineering branch:** `audit/genuine-five-green-final`  
**Living context:** `docs/context.md`  
**Research benchmark:** `docs/APEX_RESEARCH_GAUNTLET_V1.md`

## 0. Product law

- Dig is **free ReAct**: the Investigator invents queries and chooses actions.
- Tools execute capabilities selected by the Investigator; they are not a hidden fixed sequence.
- Never add `force_*` hops, GROK-PARITY, ranked prefer-lists, or scripted research playbooks.
- Never invent people, contacts, relationships or URLs.
- Contact claims require actual source-backed provenance.
- Boot/build success is not research success.
- Tool/provider failures remain failures and are reported honestly.

## 1. Runtime prerequisites

1. Import the GitHub repository through the connected integration; do not ask for GitHub credentials.
2. Read `docs/context.md`.
3. Use the platform-managed Postgres and canonical Redis configuration.
4. Run one API workflow on `PORT=8080`; desk at `/`, API at `/api/`.
5. Keep `ENABLE_AUTO_PIPELINE=false` unless the documented deployment explicitly requires otherwise.
6. Request only the 13 active provider/integration secrets documented in `docs/REPLIT_NEW_ACCOUNT_SETUP.md`.
7. Provision API/browser authentication controls separately when protected access is enabled.
8. Run the repository preflight and full existing checks before claiming readiness.

## 2. Canonical research launch

Use the repository's canonical Atlas launch/API contract. Do not substitute ad-hoc scripts or a scripted research path.

A canonical run must show:

```
Gemini oversight
  → Groq/Mistral Investigator
  → model-selected action
  → actual tool execution
  → observation + provenance
  → claim / identity / contradiction / contact state
  → durable event/evidence graph
  → Right-hand + Boss review
  ↺ next Investigator act
```

Poll the canonical job-status endpoint until terminal state and preserve the run identifiers. A completed job without a valid trajectory/evidence record is not a successful research result.

## 3. Research-quality evaluation

Use **Apex Research Gauntlet v1** for empirical quality evaluation. It requires frozen case definitions, blind/repeated runs, matched baselines and deterministic scoring. Do not infer system superiority from model names, architecture diagrams or CI status.

## 4. What this is NOT

| Do not | Why |
|---|---|
| Ask for GitHub credentials | GitHub integration handles repository access |
| Ask for DATABASE_URL as an operator secret | Postgres is platform-managed |
| Add a second app | Stay on the imported application |
| Fake people or contacts | Corrupts the evidence ledger |
| Treat snippets/LLM prose as proof | Attribution requires source-backed observation |
| Disable checks for green output | Hides defects |
| Treat CI green as research-quality proof | Structural correctness and research quality are separate |

## 5. Quick verification

```bash
git log -1 --oneline
node scripts/replit-preflight.mjs
pnpm run check:no-force-dig
pnpm run check:free-react
pnpm run check:discovery-quality
pnpm run check:agentic-runtime
pnpm run check:agentic-timeout
pnpm run check:provider-role-docs
curl -sS http://127.0.0.1:8080/api/healthz
```
