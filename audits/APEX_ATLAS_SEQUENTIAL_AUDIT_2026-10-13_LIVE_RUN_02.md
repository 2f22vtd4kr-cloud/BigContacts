# Apex Atlas Sequential Audit — 2026-10-13 Live Run 02

**Status:** Awaiting operator scope; no Atlas launch or provider/search request has been made for this run.
**Audit started:** 2026-10-13T17:34:37Z
**Repository:** `https://github.com/2f22vtd4kr-cloud/BigContacts`
**Branch / source commit:** `main` / `6ac7b5089572ee93cb07b3e1a6aad46170ecc4c4`
**Environment:** Fresh Replit project; development database only
**File visibility:** Stored in the repository's normal `audits/` directory. `git check-ignore` did not match this path.

## Purpose, capture, and limits

Trace one standard UI-equivalent discovery-first Atlas run from launch through any model-directed research, evidence admission, and final card/ledger state. Record events in observed order, with UTC timestamps, provider/model identities when exposed, actual tool inputs/results, source URLs and relevant excerpts, structured model decisions, durable IDs/state transitions, errors, and interventions.

When enabled, the app's development-only `model-prompt-audit` hook appends the exact allowlisted request body sent to Boss, Right-hand, and Investigator—including application message text—to this file. It does not capture HTTP authorization headers or fields outside its allowlist. The provider requests specify `include_reasoning=false`; hidden chain-of-thought is neither requested nor available and will not be reconstructed. Record visible structured responses/actions and concise evidence-based rationale summaries instead.

Record only research-relevant public search results, page excerpts, and URLs. Include a person's contact value only when the application observes it on a public source, attributes it to the correct person or organization, and the value is relevant to the case. Do not copy unrelated personal data. Never write secret values, credentials, authorization headers, cookies, or database connection strings.

## Chronological setup record

### S-001 — Import and repository state

- The user's source was imported into this new project without replacing the Replit-managed `.git` directory. The `origin` remote points to the supplied repository; checked-out branch is `main` at `6ac7b5089572ee93cb07b3e1a6aad46170ecc4c4`.
- Replit initially blocked writes to the existing Git metadata; the reviewed remote/fetch/checkout sequence succeeded with the explicit `DANGEROUSLY_ALLOW_GIT=1` opt-in. The upstream source tree was clean at import.
- The current workspace also has a small tracked agent-memory note at `.agents/memory/replit-git-import.md`; no application source file was changed during import/build.

### S-002 — Credentials and dependencies

- Repository preflight confirmed all 13 requested secret names are present: `COMPANIES_HOUSE_API_KEY`, `EXA_API_KEY`, `GROQ_BOSS_API_KEY`, `GROQ_RIGHT_HAND_API_KEY`, `GROQ_INVESTIGATOR_API_KEY`, `HF_TOKEN`, `GROQ_INVESTIGATOR_API_KEY_1`, `REDIS_URL_1`, `SCRAPFLY_API_KEY`, `SERPAPI_KEY`, `SERPER_API_KEY`, `TAVILY_API_KEY`, and `ZENROWS_API_KEY`.
- Values were not read or recorded. Platform-managed `DATABASE_URL` is available. Presence does not establish live provider quota.
- `pnpm install --frozen-lockfile` succeeded. `pnpm run typecheck` passed. The canonical boot build ran the repository's frontend contract/architecture checks, produced the frontend and API bundles, and reached API startup.

### S-003 — Workflow and database setup

- After import, the managed workflow's displayed command changed to the repository boot script while its already-running process still executed the starter API dev command; the preview root returned 404. Explicitly restarting `artifacts/api-server: API Server` applied `bash scripts/replit-boot.sh`, built the existing frontend, and served it successfully.
- The first preview exposed HTTP 500 responses from entity queries. A read-only schema inventory showed zero public tables in this new development database. The repository's documented `APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh` initializer created the schema and applied hardening/migrations 002–004; it verified the required durable tables. Migration 004 corrected zero legacy rows.
- Schema-push permission was not retained. The subsequent ordinary boot log explicitly said schema push was skipped.
- Post-initialization checks: `GET /` returned HTTP 200; `GET /api/healthz` returned HTTP 200 with Redis `ok` and `researchKeysConfigured=true`; `GET /api/entities` returned HTTP 200 with `[]`. A fresh preview showed no browser-console errors.

## Previous-attempt review and constraints

- Reviewed `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-13_LIVE_RUN_01.md` and the older live-run records it references. Those case/job IDs and database snapshots belong to previous project state; none are treated as current.
- The latest prior live run launched the default broad objective with no concrete market seed. It reached the 20-action discovery budget after four successful searches, made zero source visits, admitted no candidate, and ended with a model-directed stop. An initial bare `site:ch` query was blocked; later searches were blocked after an unsupported Zefix/Swiss-registry pivot failed pivot-scope alignment. This run must not repeat an unscoped default objective or treat snippets as verified evidence.
- Earlier recorded launches included `NETWORK_ERROR`/turn-preparation failures and an invalid upstream HTTP-status crash. The prior audit explicitly distinguishes those from provider quota exhaustion. The current imported commit includes regression-guarded recovery for those boundaries.
- Current source already handles the requested Investigator hard-quota case without silent credential rotation: after an explicitly classified hard request-quota exhaustion, Groq Boss selects an available alternative Investigator capability, the assignment and reason are durably recorded, and aliases of the exhausted credential are excluded for the job. Token-window limits, transient rate limits, HTTP 413, malformed output, Redis errors, or local exceptions do not authorize this reassignment. No application code has been changed for this behavior.
- The UI launch helper sends `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}` by default and carries no subject/market text in that request. Do not launch the default broad run again; first obtain an operator-supplied, concrete market/sector/company seed so discovery can be scoped without prescribing its tool sequence.

## Pre-launch baseline

- **Database counts:** `entities=0`, `research_cases=0`, `research_case_events=0`, `research_evidence=0`, `contact_evidence=0`, `research_run_events=0`, `research_sessions=0`.
- **Active job:** `GET /api/ingest/job/active/atlas-run` returned HTTP 200 with `active=false`, `jobId=null`.
- A probe to the retired `/api/ingest/atlas-status` returned HTTP 410. This was a stale endpoint, not an active-job failure; use the active-job endpoint above.
- No current case, target, search, provider generation, or live research has been started.

## Sequential run journal

Append a timestamped entry for each material pre-launch action, provider request, Investigator action/tool result, control decision, persistence transition, quota recovery, and card verification. Keep this file synchronized with the live job. If the process fails, record the observed boundary before changing code or retrying. Never repeat the launch merely to probe a provider.

### P-001 — Audit baseline and launch boundary

- **Timestamp:** 2026-10-13T17:34:37Z.
- **Action:** Reviewed the prior sequential audit, current launch helper/route, prompt-capture code, current Investigator-quota recovery path, active-job state, and development-ledger counts.
- **Result:** Current project is idle with an empty ledger. Existing hard-request-quota reassignment is model-selected, durable, and role-scoped; no fallback code change is indicated before launch.
- **Issue carried forward:** Prior run had no concrete industry/geography seed and no source-backed admissions. The UI's default launch alone does not carry a scoped objective.
- **Decision:** Wait for the operator's target market/seed before issuing the one canonical launch. No provider or search request has been made for Live Run 02.

### P-002 — Development prompt capture and readiness

- **Timestamp:** 2026-10-13T17:36:15Z.
- **Action:** Enabled the existing model-request audit hook only in the Replit `development` environment, targeting this audit file; restarted the canonical API workflow to load it.
- **Capture boundary:** The hook allowlists request-body fields and captures application messages for Boss, Right-hand, and Investigator. It omits authorization headers and non-allowlisted fields. Groq calls keep `include_reasoning=false`; no model's hidden reasoning is captured.
- **Build/runtime:** The restarted boot log reports schema push skipped and the embedded frontend/API architecture checks completed successfully. `/api/healthz` returned HTTP 200 with Redis `ok` and research keys configured. The active Atlas-job endpoint returned HTTP 200 with `active=false` and `jobId=null`.
- **Provider status:** The local status endpoint showed Groq slots 0 and 1 as configured/active. This is key-presence state only, not proof that either provider account has quota or that the slots are distinct quota pools.
- **Database baseline:** The seven audited tables remain at zero rows; no case or card predates this run.
- **Decision:** Capture is ready, but no model/search request has been made. Await a concrete market seed before the single canonical UI-equivalent launch.
