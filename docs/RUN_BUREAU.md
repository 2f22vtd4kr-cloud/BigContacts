# Apex Atlas — precise deployment and bureau run procedure

**Updated:** 2026-09-20  
**Reviewed development branch:** `audit/apex-atlas-very-strong-v1`  
**Production/certification branch:** `audit/genuine-five-green-final`  
**Living context:** `docs/context.md`

## 0. Product law

- Dig is **free ReAct**: the Investigator invents queries and chooses actions.
- Tools are capabilities selected by the Investigator; they are not a hidden fixed sequence.
- Never add `force_*` hops, ranked prefer-lists, or scripted research playbooks.
- Never invent people, contacts, relationships, wealth, or URLs.
- Contact claims require actual source-backed provenance.
- Boot/build success is not research success.
- Tool/provider failures remain failures and are reported honestly.
- Unknown/insufficient evidence is a valid terminal research outcome.

## 1. Runtime prerequisites

1. Import the GitHub repository through the connected integration; do not ask for GitHub credentials.
2. Read `docs/context.md`.
3. Use the platform-managed Postgres and canonical Redis configuration.
4. Run one API workflow on `PORT=8080`; desk at `/`, API at `/api/`.
5. Keep `ENABLE_AUTO_PIPELINE=false` unless the documented deployment explicitly requires otherwise.
6. Request only the 13 active provider/integration secrets documented in `docs/REPLIT_NEW_ACCOUNT_SETUP.md`.
7. Provision the three API/browser authentication controls separately when protected access is enabled.
8. Run preflight, architecture checks, typecheck, builds, and focused tests before claiming readiness.

## 2. First-time schema initialization

Apex intentionally fails closed if the durable provenance schema is missing.

For first-time initialization only:

```bash
APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh
```

The helper verifies required durable tables after the repository's current Drizzle schema push.

Do **not** leave `APEX_ALLOW_SCHEMA_PUSH=true` enabled for ordinary runtime boot.

## 3. Canonical research launch

A canonical run is:

```
Gemini Boss
  → Investigator selection
  → Groq/Mistral Investigator
  → model-selected action
  → validated tool execution
  → observation + provenance
  → evidence graph / contact / contradiction state
  → Gemini Right-hand review
  → Boss disposition
  ↺ next Investigator act
```

The Investigator can choose search, page retrieval, browser escalation, registries, domain inspection, footprint tools, disproof, revisits, or stopping. The runtime does not impose a fixed order.

Poll the canonical job-status endpoint until terminal state and preserve the job/run identifiers. A completed job without valid durable trajectory/evidence is not a successful research result.

## 4. Very Strong research controls

The current reviewed branch additionally includes:

- bounded evidence-graph cognitive context;
- information-gain action assessment;
- adaptive discovery portfolios;
- optional independent Investigator trajectories;
- structured Investigator action outputs;
- source-family/source-class intelligence;
- diagnostic failure signals for identity, source, attribution, stopping, injection, and system errors.

These controls are quality infrastructure. They are not a substitute for live research evaluation.

## 5. Research-quality evaluation

Use **Apex Research Gauntlet v1** for empirical quality evaluation.

Current registry: 38 grounded-reviewed cases, version 1.1.1, ground truth as of 2026-09-18.

For release-quality evaluation:

- use repeated matched runs;
- preserve raw outputs, trajectories, observations, and evidence graph;
- keep system failures separate from research failures;
- report identity, attribution, evidence, contradiction, source-quality, and negative-finding metrics separately;
- allow unknown/insufficient evidence;
- do not publish a single overall winner score.

## 6. What this is NOT

| Do not | Why |
|---|---|
| Ask for GitHub credentials | GitHub integration handles repository access |
| Ask for DATABASE_URL as an operator secret | Postgres is platform-managed |
| Add a second app | Stay on the imported application |
| Fake people or contacts | Corrupts the evidence ledger |
| Treat snippets/LLM prose as proof | Attribution requires source-backed observation |
| Disable checks for green output | Hides defects |
| Treat CI green as research-quality proof | Structural correctness and research quality are separate |
| Enable schema push for ordinary boot | Runtime must fail closed rather than mutate production state |

## 7. Quick verification

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

## 8. Release stop condition

Do not publish Apex until a fresh environment can:

1. initialize the required schema explicitly;
2. boot canonically with schema mutation disabled;
3. authenticate safely;
4. execute a real Groq/Mistral Investigator run;
5. persist observations, provenance, evidence, contacts, and oversight;
6. survive controlled provider/tool/cancellation failures truthfully;
7. render the same durable truth in the UI;
8. complete a controlled empirical campaign.

A green static check is necessary. It is not sufficient.
