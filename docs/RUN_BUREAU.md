# Apex Atlas — precise deployment and bureau run procedure

**Updated:** 2026-10-19  
**Canonical branch:** `main`  
**Historical Very Strong review branch:** `audit/apex-atlas-very-strong-v1` (fully incorporated into `main`)  
**Historical five-green branch:** `audit/genuine-five-green-final`  
**Living context:** `docs/context.md`  
**Master handoff:** `docs/apex-atlas-handoff/20_MASTER_SUCCESSOR_HANDOFF_2026-10-17.md` (read the 2026-10-19 current override first; historical body is incident lineage)

**Current acceptance status:** Apex remains **not live-accepted**; see `README.md`, `docs/context.md`, and the current handoff for the release boundary.  
**Latest saved live launch:** job `718ed715-aa6d-43c9-916f-463371485ad8`, recorded in `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-18_FRESH_PROJECT_RUN_03.md` (2026-10-18). The audit shows the live discovery phase ending with zero visible findings/admissions, but it does **not** record the final durable job status, post-run case/evidence/admission/card counts, or a post-run active-lock check. Do not assume the job is terminal or the lock idle from the last saved model response. Run 05 job `4b85fc7c-a239-478c-a455-94baf02ffdee` and Run 04 remain historical evidence with their documented limitations; do not substitute their state for the latest job.  
**Before any new launch:** the operator must read-only reconcile job `718ed715-aa6d-43c9-916f-463371485ad8` and the current Atlas active-job lock on the actual runtime; confirm terminal state and no active pointers/lock before allowing another run. Then verify deployed branch/HEAD matches reviewed GitHub `main`, run current preflight/typecheck/build/`check:bureau`, verify database/Redis/schema health, and use a unique ignored `.local/audits/*.md` path only if per-run diagnostic capture is explicitly enabled. Keep visible tracked-file audit opt-in off and never store raw prompt traces in tracked audits. Never launch concurrently while state is active or unclear. Do not use the earlier `Cmd/Ctrl+K` → `Restart compute` remedy unless fresh evidence shows a boot failure; it is not a response to research-quality failure.

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
6. Use the active role-scoped provider secret contract in `docs/context.md`; optional numbered Groq capability slots are separate selectable credentials.
8. Run preflight, architecture checks, typecheck, builds, and focused tests before claiming readiness.

## 2. Operator authentication

**Current Replit deployment contract (effective 2026-10-10): app-level operator authentication is intentionally disabled.** The active route aggregator in `artifacts/api-server/src/src/routes/index.ts` does not mount operator-auth routes or `requireOperatorAuth`; `scripts/replit-preflight.mjs` checks only active provider/integration secret presence. Do not treat `APEX_OPERATOR_PASSWORD`, `APEX_API_AUTH_TOKEN`, or `APEX_SESSION_SECRET` as required secrets for the current deployment.

This is an explicit deployment choice, not a claim that the API is protected: the desk opens directly and anyone who can reach the deployment URL can call operational endpoints. Do not expose the current deployment to an untrusted public audience. The canonical research, provider-role, provenance, admission, cancellation, and durable-persistence guards remain in place.

Operator-auth implementation files remain in the repository but are not mounted by the active route aggregator. Do not infer active authentication from the presence of those legacy files. Run `node scripts/replit-preflight.mjs` to check the active provider/integration secret contract without printing values.

**Release boundary:** this deployment-specific choice does not override §9. A public production release still requires an explicitly verified safe authentication/exposure boundary; the current unauthenticated Replit deployment does not meet that requirement for untrusted public access.

## 3. First-time schema initialization

Apex intentionally fails closed if the durable provenance schema is missing.

For first-time initialization only:

```bash
APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh
```

The helper verifies required durable tables after the repository's current Drizzle schema push.

Do **not** leave `APEX_ALLOW_SCHEMA_PUSH=true` enabled for ordinary runtime boot.

## 4. Canonical research launch

A canonical run is:

```
Groq Boss
  → Investigator capability selection
  → selected Groq Investigator capability
  → model-selected action
  → validated tool execution
  → observation + provenance
  → evidence graph / contact / contradiction state
  → Groq Right-hand review
  → Groq Boss disposition
  ↺ next Investigator act
```

The Investigator can choose search, page retrieval, browser escalation, registries, domain inspection, footprint tools, disproof, revisits, or stopping. The runtime does not impose a fixed order.

Poll the canonical job-status endpoint until terminal state and preserve the job/run identifiers. A completed job without valid durable trajectory/evidence is not a successful research result.

## 5. Very Strong research controls

The current reviewed branch additionally includes:

- bounded evidence-graph cognitive context;
- information-gain action assessment;
- adaptive discovery portfolios;
- optional independent Investigator trajectories;
- structured Investigator action outputs;
- source-family/source-class intelligence;
- diagnostic failure signals for identity, source, attribution, stopping, injection, and system errors.

These controls are quality infrastructure. They are not a substitute for live research evaluation.

## 6. Research-quality evaluation

Use **Apex Research Gauntlet v1** for empirical quality evaluation.

Current registry: 38 grounded-reviewed cases, version 1.1.1, ground truth as of 2026-09-18.

For release-quality evaluation:

- use repeated matched runs;
- preserve raw outputs, trajectories, observations, and evidence graph;
- keep system failures separate from research failures;
- report identity, attribution, evidence, contradiction, source-quality, and negative-finding metrics separately;
- allow unknown/insufficient evidence;
- do not publish a single overall winner score.

## 7. What this is NOT

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

## 8. Quick verification

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

## 9. Release stop condition

Do not publish Apex until a fresh environment can:

1. initialize the required schema explicitly;
2. boot canonically with schema mutation disabled;
3. verify deployment exposure/authentication mode (app-level operator authentication is intentionally disabled for the current Replit deployment; do not imply the API is protected);
4. execute a real Groq Investigator run;
5. persist observations, provenance, evidence, contacts, and oversight;
6. survive controlled provider/tool/cancellation failures truthfully;
7. render the same durable truth in the UI;
8. complete a controlled empirical campaign.

A green static check is necessary. It is not sufficient.
