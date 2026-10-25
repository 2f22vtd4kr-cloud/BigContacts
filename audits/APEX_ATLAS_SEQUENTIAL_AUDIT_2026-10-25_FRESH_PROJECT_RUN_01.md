# ⭐ APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-25_FRESH_PROJECT_RUN_01.md

**Status at opening:** public-source import and preflight in progress; no Atlas launch request has been sent.
**Opened:** 2026-10-25 (Europe/Kyiv).
**Source:** `https://github.com/2f22vtd4kr-cloud/BigContacts`, `main` at `df4ce35ba3370940a9ad5f7e20d09517a49324ad` (verified against GitHub API and anonymous `git ls-remote`).
**Audit location:** `audits/`, visible in the project and not intentionally placed in an ignored/private directory. No commit or push has been made.

## Scope and audit boundary

- Follow one canonical UI-equivalent run, if setup and current-job reconciliation permit it: launch → model-led discovery → target-scoped research → provenance/evidence/admission → durable records/cards → UI projection → terminal status and lock reconciliation.
- Record steps in order, including setup failures, corrections, decisions, observed prompts/actions at a safe summary level, model/provider identifiers, tool requests/results, timing, evidence counts, and durable state.
- Do not fabricate a result, force an itinerary, relax evidence/admission gates, rotate credentials, or retry an ambiguous launch. A blocked proposal is not an outbound search; provider failure is not research evidence; static checks are not proof of a successful investigation.
- The visible audit will not contain credentials, hidden chain-of-thought, or raw personal contact values. It may record verified public-source URLs, source names, anonymized contact references, status/provenance, and counts. This preserves a useful review trail without publishing personal contact data in a broadly visible file.
- Do not include secrets in commands or logs. Secret checks are presence-only.

## Prior-attempt findings to verify, not assume

- Earlier Replit attempts often reached the model loop but ended with zero source-backed admissions or cards. Diagnose the actual stage reached; do not assume the renderer or persistence layer failed without a candidate crossing admission.
- A previous accepted job was not reconciled at the time its audit ended. It belongs to another project's database, but the shared Redis lane must be checked read-only after boot before any new launch.
- Earlier failures included use of the wrong starter workflow, public Git proxy errors, rejected direct `.replit` edits, audit whitespace failures, scope-guard loops, shortened URLs after context compaction, unsupported registry IDs, structured-output errors, and a mismatch between job summaries and actual request counts. Re-check current state and distinguish each layer.
- A transient token-window/429 condition is not proof of exhausted request quota. Only the application's typed failure classification and Boss-directed, durable reassignment to a distinct configured Investigator capability may trigger its existing recovery path. Do not force a model or silently rotate a key.
- The repository identifies the product's target domain as HNWI/operator intelligence, not generic Apollo-style B2B lead generation. The exact live mission and default launch behavior must be verified before sending a run; do not change the architecture or promote unsupported wealth/contact claims to force cards.
- The repository's current `main` includes existing audit history and setup notes. Preserve those files and the project's `.git` metadata during import.

## Sequential event log

### E000 — Audit opened; current project baseline recorded

- The new project contained the generated pnpm starter workspace, two starter workflows (API Server and Component Preview Server), and a Git checkout on local `main` at the starter commit. `.replit` had a pre-existing Replit-managed module change; this must be preserved or reconciled deliberately, not mistaken for an upstream application change.
- The source's GitHub `main` ref was independently confirmed as `df4ce35ba3370940a9ad5f7e20d09517a49324ad`, dated `2026-10-25T07:51:03Z`; commit subject: “Fix private Replit audit trace and Investigator contract.”
- A normal `git ls-remote` was rewritten by the environment to a disconnected Replit GitHub proxy and failed with HTTP 400. Public GitHub HTML, codeload archive, GitHub commit API, and anonymous Git access with the proxy rewrite disabled were reachable; no GitHub reconnect or credential was needed.
- The codeload archive was used only for pre-import inspection in `/tmp`; it is not the application checkout. Its SHA-256 was `85bb76d4830dad2ab7c4bf52a9edefee3c2a18d6c10161f791e10252ecac0534`.
- The inspected source contains a mature Apex Atlas app, extensive prior run audits, agent instructions, setup procedures, and a canonical model-led Boss → selected Groq Investigator → bounded Right-hand architecture. The source—not a newly generated substitute—is the implementation target.
- No provider call, database write, launch request, search, or contact collection has occurred in this project.

### E001 — Public-source fallback verified

- The GitHub URL rewrite was isolated to `/run/replit/agent-git-proxy.gitconfig`; the public repository is accessible without account authorization.
- `GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 git ls-remote --heads ... main` returned the same SHA as the GitHub API.
- The initial archive-listing shell command exited 141 because `head` closed the pipe early. The archive itself remained intact and was extracted successfully; this was an inspection-command pipe condition, not a source-download failure.

### E002 — Repository-specific audit and run history reviewed

- Read the source `AGENTS.md`, README, mandatory repository-study protocol, canonical run procedure, new-Replit setup guide, and newest fresh-import audit.
- Source README reports that Apex is not yet live-accepted: prior actual runs have not demonstrated a person passing source-backed admission and becoming a durable card. Static/fixture checks and an accepted HTTP launch are not live research success.
- Newest prior fresh-import audit reports the prior shared Atlas job as terminal `failed/incomplete`, then observed the lane idle; this is historical evidence only. Re-read current Redis/job state on this project before launch.
- Source setup requires the single canonical API workflow, explicit one-time schema initialization only for a confirmed-empty development database, and ordinary boot with schema mutation disabled. Current app-level operator authentication is intentionally disabled; do not expose this unauthenticated development deployment to an untrusted public audience.
- Source setup contract names 13 provider/service secret variables. The user added all requested names through the secure Replit secrets flow; values remain unread.
- The source README describes HNWI/operator/wealth research and attributable public contact paths. This differs from the user's “Apollo-like B2B” characterization and must be reconciled against the actual UI launch objective before any run.
- Source project instructions place raw model traces in an ignored local audit directory and forbid copying them into the visible report. This report will remain visible and detailed, but will not publish hidden reasoning, secret values, or raw personal contact values.

### E003 — Visible audit created before repository import

- Created this report under the root `audits/` directory before any import/reset operation so that setup events can be recorded sequentially.
- No application files have been reset or overwritten yet. The current generated API and mockup workflows were still running at this event.

### E004 — Starter workflows stopped before import

- Stopped `artifacts/api-server: API Server` and `artifacts/mockup-sandbox: Component Preview Server`; both stop operations returned success.
- This prevents starter-template server output from being mistaken for Apex runtime behavior during import.
- No research/API job, database write, or provider request occurred.

### E005 — Exact upstream source fetched; launch contract inspected

- Created the local starter-backup branch `replit-starter-initial`, added public source remote `origin`, and fetched `main` without the environment's GitHub URL rewrite. Fetch returned 3,855 objects (45.61 MiB).
- Verified `FETCH_HEAD` equals GitHub's current `main` SHA `df4ce35ba3370940a9ad5f7e20d09517a49324ad`. The current worktree has not yet been reset/imported.
- The current managed API artifact and upstream API artifact share the same artifact ID/kind/version, but upstream changes its title and preview from `/api` to **Apex Atlas** at `/`, serves the UI and API together, and runs `bash scripts/replit-boot.sh`. Apply these artifact metadata changes through Replit's validated artifact-configuration flow, not a direct edit.
- The UI's canonical launch helper sends `POST /api/ingest/atlas-run` with `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}` and no single-target override; mock mode returns without launching and must remain off.
- The run pipeline is model-directed, but the default launch body itself contains no user-supplied company/market objective. Repository product law targets public-source owners/operators and wealth-related signals. Keep that scope explicit; do not claim this default is generic Apollo-style lead generation or invent launch input to change it.
- No provider call, database write, launch request, search, or contact collection occurred.

### E006 — Repository imported at the verified `main` commit

- Moved local `main` to `df4ce35ba3370940a9ad5f7e20d09517a49324ad`, preserving the initial starter commit on `replit-starter-initial`. The existing Replit `.git` directory was retained; no push occurred.
- Restored the repository's tracked source files from `origin/main`. The new audit remained intact as an untracked visible project file.
- Preserved the starter API artifact manifest during Git import and then updated it through Replit's schema-validated artifact flow. The artifact now presents **Apex Atlas** at `/`, serves the application through the canonical boot script, and retains the same artifact ID and service port.
- The imported manifest's development configuration enables model-request capture and contact-evidence capture to the source-configured ignored `.local/audits/` path; its explicit visible-file opt-in remains `false`. The separate visible report remains this starred `audits/` file. No prompt capture, model call, or contact-data access has occurred yet.
- No source implementation was edited and no dependency installation, database mutation, API boot, launch request, search, or card creation has occurred.

### E007 — Dependency, secret-presence, and architecture preflight passed

- `pnpm install --frozen-lockfile` completed successfully for all 10 workspace projects with Node `v22.23.4` and pnpm `10.26.1`. The lockfile was reported up to date; native postinstall steps completed. No source or lockfile change was observed.
- `node scripts/replit-preflight.mjs` reported all 13 requested provider/service secret names set and platform-managed `DATABASE_URL` present. It checked presence only; values were not read, changed, or written to this report.
- `pnpm run typecheck` passed for workspace libraries, API server, mockup sandbox, and scripts.
- `pnpm run check:bureau` passed on the imported SHA. Its 50-case research gauntlet validated as `grounded-reviewed`; focused phone/source tests passed 44/44, run-validator tests 6/6, and campaign-score tests 6/6. The architecture/static checks also passed, including free-ReAct, provider-role boundaries, durable evidence/admission, cancellation, SSRF, quota classification, and Boss-directed recovery.
- These checks are structural, not live provider or research-quality evidence. No provider call, launch, search, or card creation occurred.

### E008 — Empty development database initialized using the repository procedure

- Read-only `information_schema` query before setup returned `0` public base tables in this project's development database.
- Ran `APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh` once, exactly as documented. Drizzle schema push and invariant/compatibility migrations 001–004 completed; the initializer verified the seven required durable tables. Migration 004 corrected `0` legacy rows.
- The schema opt-in was scoped to the one-time initializer command. No seed/sample rows were added; ordinary boot remains schema-mutation-disabled.
- No research run, external provider request, web search, or card creation occurred during initialization.

### E009 — Canonical API boot and prelaunch reconciliation

- Restarted only `artifacts/api-server: API Server`. The imported `scripts/replit-boot.sh` skipped schema mutation as intended, ran the source/build and Bureau startup guards, built the frontend and API, and started the API. The 4.9 MB API-bundle size notice was non-fatal.
- `GET /api/healthz`: HTTP 200, `status=ok`, Redis `ok` (119 ms), `researchKeysConfigured=true`.
- `GET /api/healthz/details`: HTTP 200, `bureauIntegrity=ok`, `registryShallowRisk=false`, `autoPipeline=false`.
- `GET /api/ingest/job/active/atlas-run`: HTTP 200, `active=false`; no run owns the shared Atlas lane.
- Read-only status reconciliation of the prior job `2c9b4725-4544-4712-8556-06627ccea718` returned `failed/incomplete`, phase 3/4, `inserted=0`, `skipped=0`, `errors=0`, and an `unexpected_programming_error` summary at old build `01d933d5d560085af2e1b20e649869af3f554dee`. The current project cannot recover that old project's raw case details from its empty database; the available prior audit also did not establish a deeper root cause. No stale active lock was present.
- Read-only post-initialization counts were zero across `entities`, `assets`, `relationships`, `identity_candidates`, `identity_bundles`, `research_cases`, `research_case_events`, `research_sessions`, `research_run_events`, `research_evidence`, and `contact_evidence`.
- The root preview showed the real Apex Atlas desk and the **Launch Apex Atlas** control, with zero entities, assets, links, and priority profiles. Browser output contained only the standard React DevTools informational notice.
- No new launch or live model/search request has been made yet.

### E010 — Visible audit whitespace check caught and corrected

- The first local Git mutation was blocked before changing the index by Replit's Git safeguard. The approved scoped `DANGEROUSLY_ALLOW_GIT=1` retry staged the report and pointer, then `git diff --cached --check` caught trailing Markdown hard-break spaces in the report header.
- The three hard-breaks were replaced with plain metadata lines. This is a documentation-only correction; no application source, runtime, database, or provider state changed.
- Re-run the staged whitespace check before the local-only audit commit. Nothing has been pushed.

## Run evidence

Append each subsequent setup action, exact command and result, failure/recovery, health/lock observation, model/provider action summary, tool activity, source-backed evidence count, admission/card delta, and final reconciliation here. Preserve uncertainty explicitly.
