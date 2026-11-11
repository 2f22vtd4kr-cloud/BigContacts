# Apex Atlas — new Replit account setup contract

> **Current status override — 2026-10-30:** Use handoff [22 — 30 October 2026](./apex-atlas-handoff/22_MASTER_SUCCESSOR_HANDOFF_2026-10-30.md) as the current UI/provider/worker status. Refresh GitHub `main` and Actions after the UI patch is merged; do not import a feature branch as the canonical Replit source. The most recent tracked run audit is 2026-10-27, but its final captured job checkpoint was not terminally reconciled; do not assume it describes the current Replit runtime. The available Replit integration has not established a canonical current workspace or deployed SHA. Import/sync the reviewed `main` before the next user-controlled run, and inspect that workspace's own active-job pointer/lock and deployed source revision before launching.
>
> Python network OSINT tools (SpiderFoot, Sherlock, Maigret, Holehe, TheHarvester) are conditional capabilities. They are exposed only after the runtime verifies a fresh signed attestation from the isolated worker with pinned worker/proxy image digests and the required egress boundary. The repository CI builds/tests images but does not deploy the worker; never assume these tools are available from source code alone.

## Repository

The current successor handoff is `docs/apex-atlas-handoff/22_MASTER_SUCCESSOR_HANDOFF_2026-10-30.md`; older numbered volumes are historical chronology unless explicitly superseded by current source.


Before modifying code or launching research, read `README.md`, `docs/context.md`, and the current master handoff; verify current GitHub `main` HEAD and Actions, then inspect the newest **actual job-bound live audit**. The 2026-10-19 launch references below are historical only; the latest tracked audit is [the 2026-10-27 live-run audit](../audits/apex-atlas-live-run-sequential-audit-2026-10-27.md). Its final captured checkpoint for job `69904b9c-ceb4-4fa6-be55-8172c4b24c77` was not terminally reconciled. Do not assume that historical job describes the current runtime. Inspect the active-job pointer/lock and deployed source revision in the actual workspace before another launch; never launch concurrently while state is active or ambiguous. The bureau remains not live-accepted until a user-controlled run demonstrates source-backed evidence, durable card persistence, ordinary API/UI read-back, truthful terminal status, and released lock.

Architecture assessment: live logs demonstrate that Boss/Right-hand/Investigator control flow and outbound guard boundaries run. End-to-end productive research and card creation are not yet accepted. Preserve model-owned research strategy, evidence and admission gates; do not force a target or itinerary to obtain cards.

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

## Required and optional Replit preflight inputs

`scripts/replit-preflight.mjs` checks secret presence only. It never reads a value into output, validates provider reachability, or guarantees quota.

The canonical Replit development workflow requires:
- `GROQ_BOSS_API_KEY`
- `GROQ_RIGHT_HAND_API_KEY`
- `GROQ_INVESTIGATOR_API_KEY` (the first selectable Investigator credential)
- `REDIS_URL_1` (the durable job/case store)
- At least one of `SERPER_API_KEY`, `TAVILY_API_KEY`, or `EXA_API_KEY`

The following are optional capabilities; missing values disable only the corresponding integration:
- `COMPANIES_HOUSE_API_KEY`
- `GROQ_INVESTIGATOR_API_KEY_1` (additional numbered Investigator slots are also optional)
- `SCRAPFLY_API_KEY`
- `ZENROWS_API_KEY`

Any configured search provider among Serper, Tavily, and Exa may be used; no provider order is prescribed. The runtime advertises only capabilities that are actually configured. Additional numbered Boss, Right-hand, and Investigator credential slots are independent capabilities, not aliases for the base credential. The Investigator registry maps `groq-investigator-1` to `GROQ_INVESTIGATOR_API_KEY`, `groq-investigator-2` to `GROQ_INVESTIGATOR_API_KEY_1`, and continues through slot 8. A selected capability must not silently rotate to another credential.

OpenCorporates is optional and must be exposed only when `OPENCORPORATES_API_TOKEN` or `OPENCORPORATES_API_KEY` is configured. Its authentication uses the documented `api_token` query parameter; neither name is mandatory preflight input.

`DATABASE_URL` is supplied by Postgres/platform infrastructure and must not be requested from the operator. `HF_TOKEN` and `SERPAPI_KEY` are not active required capabilities. Never request GitHub credentials, retired Gemini/Mistral/DeepSeek/NVIDIA control-plane credentials, WHOIS/WHOXY credentials, or any secret values in chat.

## Operator authentication

The API route aggregator mounts `operatorAuthRouter` and the `requireOperatorAuth` middleware. The runtime contract is mode-dependent:

- **Replit development workflow:** `.replit` sets `NODE_ENV=development` under `[userenv.development]`. In this mode the middleware explicitly bypasses app-level operator authentication, and preflight does not require operator-auth secrets. Keep this development endpoint private; the bypass is not a production security boundary.
- **Production / any non-development runtime:** operator authentication is enabled and fails closed. Preflight requires `APEX_OPERATOR_PASSWORD` (at least 16 characters), `APEX_API_AUTH_TOKEN` (at least 32 characters), and `APEX_SESSION_SECRET` (at least 32 characters). The API middleware protects data and operational routes; missing configuration returns an unavailable/auth-not-configured response rather than opening the API.

The development bypass does not disable the canonical research workflow, active-job lock, provider-role/quota rules, provenance, identity, evidence/admission, cancellation, or durable persistence guards.

## Install and run

Use the repository's existing pnpm scripts, lockfiles and configuration. Do not scaffold a replacement application.

For first-time Postgres initialization only:

```bash
APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh
```

The helper runs the repository's current schema push, durable hardening migration `001`, contact-outcome migration `002`, and review-only candidate taxonomy migration `003`, then verifies the required durable tables. Migration `003` reclassifies only rows with the canonical discovery review-only markers; malformed/legacy metadata is left untouched. Schema mutation must not remain enabled during ordinary boot.

Run preflight, architecture checks, typecheck, builds, and focused tests. Start the canonical API workflow on port `8080`.

### Replit Nix environment stability

The application uses the managed Redis service through `REDIS_URL_1` (mapped to `REDIS_URL` by `scripts/replit-boot.sh`); it does not require a workspace-local Redis server binary. The repository therefore no longer carries a custom `replit.nix` package derivation for Redis. Keep the Replit-managed Node.js, Python, and PostgreSQL modules in `.replit`; do not add ad-hoc Nix packages unless a runtime dependency demonstrably requires a local system executable and has a tested reason to live in Nix.

A Replit error naming a missing internal path such as `nix-internal/derivation-internal.nix` is a failure inside Replit's environment builder, before the project's boot script or application commands execute. It is not evidence of an Apex code, database, lockfile, or schema defect. Removing the redundant Redis derivation reduces custom Nix surface area but cannot repair a corrupted/missing Replit-internal derivation. Do not repeatedly create/import replacement accounts or alter `.replit`/Nix channels to chase this platform error. Preserve the workspace and project data, capture the exact error and timestamp, and use Replit's supported compute-restart/recovery path or support escalation. After recovery, verify the environment with install/typecheck/build and health checks before any schema mutation or research launch.

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
