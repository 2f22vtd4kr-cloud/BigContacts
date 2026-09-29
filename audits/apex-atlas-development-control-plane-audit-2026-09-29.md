# Apex Atlas Development Control-Plane Audit — 2026-09-29

## Sequential audit

### 1
- **UTC timestamp:** 2026-09-29T05:02:06Z
- **Action:** Imported the canonical repository branch.
- **Exact command/request:** `git fetch origin main && git switch -C main --track origin/main`
- **Observed result:** The repository was fetched successfully and the local branch was reset to `main` tracking `origin/main`.
- **Evidence:** `git branch --show-current` returned `main`; `git rev-parse HEAD` and `git rev-parse origin/main` both returned `c73925892c3a00724429f424d6885ecbfeac3c5a`.
- **Interpretation:** The checkout is exactly aligned with the canonical `origin/main` commit before source execution.
- **Next action:** Inspect the repository's existing instructions, scripts, runtime, and audit conventions without inventing setup behavior.

### 2
- **UTC timestamp:** 2026-09-29T05:02:20Z
- **Action:** Inspected the repository's setup and boot contract before execution.
- **Exact command/request:** Read `package.json`, `scripts/replit-preflight.mjs`, `scripts/replit-boot.sh`, `scripts/initialize-apex-schema.sh`, and enumerated the existing scripts, documentation, audits, and Apex runtime/test references.
- **Observed result:** The repository provides a canonical frozen install command, a presence/shape-only preflight, a single API boot script on port 8080, an explicit schema initialization script gated by `APEX_ALLOW_SCHEMA_PUSH=true`, and extensive existing Bureau/discovery/Investigator/lease/provider/evidence checks and audit records. The boot script refuses to start if port 8080 is already owned and does not mutate source files.
- **Evidence:** `package.json` defines `check:bureau` and the relevant architecture checks; the inspected scripts contain the gates described above.
- **Interpretation:** The canonical repository procedures are available and should be used as-is. No replacement workflow, runner, schema, or test harness is justified.
- **Next action:** Read the repository's operator instructions and recent audit notes, then install dependencies exactly with `pnpm install --frozen-lockfile`.

### 3
- **UTC timestamp:** 2026-09-29T05:02:33Z
- **Action:** Read the repository's operator instructions and canonical runtime documentation.
- **Exact command/request:** Read `AGENTS.md`, `README.md`, `docs/REPLIT_BOOT.md`, `docs/RUN_BUREAU.md`, and `docs/TESTING.md`.
- **Observed result:** The repository confirms `main` as authoritative, `/` as the desk, `/api` as the API, port 8080 as the single canonical API boundary, explicit schema initialization, free-ReAct Investigator autonomy, real provider attribution, and the distinction between static validation and live research validation.
- **Evidence:** The documents explicitly prohibit a second app, fake people/contacts, scripted research playbooks, synthetic evidence, and calling component/static checks end-to-end proof.
- **Interpretation:** This run must remain a repository audit and must stop at genuine failure boundaries rather than modify source to force a green result.
- **Next action:** Run the repository-prescribed frozen dependency installation and record the outcome immediately.

### 4
- **UTC timestamp:** 2026-09-29T05:03:12Z
- **Action:** Installed the repository dependencies using the frozen procedure.
- **Exact command/request:** `pnpm install --frozen-lockfile`
- **Observed result:** Installation completed successfully for all 10 workspace projects with the lockfile resolution step skipped. Native postinstall steps for the repository's dependencies completed.
- **Evidence:** The command exited successfully with `Done in 24.5s using pnpm v10.26.1`; `git status` showed no dependency-file changes.
- **Interpretation:** The imported repository is dependency-installed without redesigning or changing its declared dependency graph.
- **Next action:** Run the repository preflight and record only secret presence/configuration and validation results.

### 5
- **UTC timestamp:** 2026-09-29T05:03:23Z
- **Action:** Ran the repository preflight.
- **Exact command/request:** `node scripts/replit-preflight.mjs`
- **Observed result:** All 13 active provider/integration secret names were present; all three separate API/browser authentication controls met their minimum lengths; platform-managed `DATABASE_URL` was present. The preflight exited successfully and reported that no secrets were modified.
- **Evidence:** Preflight output reported `SET` for every active key and auth control, `OK DATABASE_URL`, and `All active provider/integration names and the separate production authentication boundary are valid.`
- **Interpretation:** Configuration presence and shape validation passed without exposing or changing secret values.
- **Next action:** Determine whether the development database is initialized using the repository's own status/schema checks; initialize only if genuinely empty, then boot canonically with schema mutation disabled.

### 6
- **UTC timestamp:** 2026-09-29T05:03:46Z
- **Action:** Checked the development database and current managed process state.
- **Exact command/request:** Read-only query against `information_schema.tables` for the seven required Apex durable tables; inspected port/process state and refreshed managed workflow logs.
- **Observed result:** The required-table query returned no rows, so the development database is uninitialized. A single API process currently owns port 8080; no second API process was started. The managed API workflow was running the existing server process and had logged a successful bind to port 8080.
- **Evidence:** The database query returned only the `table_name` header; process inspection showed one API server process and no competing listener.
- **Interpretation:** The repository's explicit first-time schema initialization is required. It can run without starting another API server; afterward the existing managed API workflow must be restarted once so it runs the canonical boot script against the initialized database.
- **Next action:** Run `APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh`, then record the result before restarting the managed API workflow with schema mutation disabled.

### 7
- **UTC timestamp:** 2026-09-29T05:03:58Z
- **Action:** Initialized the empty development database through the repository's schema helper.
- **Exact command/request:** `APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh`
- **Observed result:** The helper acquired its single-writer lock, applied the repository's current Drizzle schema, verified all seven required Apex durable tables, and completed successfully. The helper explicitly instructed that schema mutation be disabled for ordinary boot.
- **Evidence:** Output reported `[✓] Changes applied`, `[apex-schema] required durable tables present.`, and `[apex-schema] complete. Disable APEX_ALLOW_SCHEMA_PUSH before ordinary application boot.`
- **Interpretation:** The fresh development database is initialized using the repository's documented procedure; no manual tables or synthetic data were created.
- **Next action:** Restart the one managed API workflow so it runs `scripts/replit-boot.sh` with schema mutation disabled, then verify `/`, `/api/healthz`, and `/api/system/status`.

### 8
- **UTC timestamp:** 2026-09-29T05:04:29Z
- **Action:** Restarted the single managed API workflow using the canonical boot contract.
- **Exact command/request:** Restarted managed workflow `artifacts/api-server: API Server`.
- **Observed result:** The workflow restarted successfully. `scripts/replit-boot.sh` logged the canonical `main` commit, skipped schema push because `APEX_ALLOW_SCHEMA_PUSH` was not enabled, built the desk and API, and started the API server.
- **Evidence:** Workflow log reported `[replit-boot] c7392589 ...`, `schema push skipped`, successful desk checks/build output, and the API `start` command.
- **Interpretation:** Ordinary boot is running with schema mutation disabled and there is one canonical API process.
- **Next action:** Verify the desk root through the shared proxy.

### 9
- **UTC timestamp:** 2026-09-29T05:04:29Z
- **Action:** Verified the canonical desk root.
- **Exact command/request:** `curl -sS -i --max-time 20 http://localhost:80/`
- **Observed result:** The desk returned the Apex Atlas HTML shell with HTTP success and the expected application title/assets.
- **Evidence:** Response contained `<title>Apex Atlas</title>` and the compiled desk assets.
- **Interpretation:** The canonical desk route is reachable through the shared proxy.
- **Next action:** Verify the API health route.

### 10
- **UTC timestamp:** 2026-09-29T05:04:29Z
- **Action:** Verified the API health route.
- **Exact command/request:** `curl -sS -i --max-time 20 http://localhost:80/api/healthz`
- **Observed result:** The route returned HTTP 200 with `status: "ok"`, Redis status `ok`, and `researchKeysConfigured: true`.
- **Evidence:** JSON response returned `{"status":"ok","redis":{"status":"ok",...},"researchKeysConfigured":true}`.
- **Interpretation:** The API, Redis connection, and research-key configuration are healthy at the health endpoint.
- **Next action:** Verify the system status route and its provider-role/control-plane summary.

### 11
- **UTC timestamp:** 2026-09-29T05:04:29Z
- **Action:** Verified the API system status route.
- **Exact command/request:** `curl -sS -i --max-time 20 http://localhost:80/api/system/status`
- **Observed result:** The route returned HTTP 200. Postgres and Redis were ready; Gemini Boss and Gemini Right-hand were configured with their declared roles; Groq/Mistral Investigator lanes and active search providers were reported; `bureauIntegrity` was `ok`.
- **Evidence:** JSON response reported `databases.postgres.status: "ok"`, `databases.localRedis.status: "ready"`, configured Gemini roles/capabilities, active provider slots, and `bureauIntegrity: "ok"`.
- **Interpretation:** The canonical API is reachable with durable storage and the expected control-plane/provider configuration.
- **Next action:** Run the repository's existing canonical Bureau/static architecture checks without modifying source.

### 12
- **UTC timestamp:** 2026-09-29T05:05:10Z
- **Action:** Ran the repository's canonical Bureau/static architecture validation suite.
- **Exact command/request:** `pnpm run check:bureau`
- **Observed result:** The full chained suite completed successfully. Canonical route, job queue, launch boundary, database startup, source-mutation, migration parity, input normalization, browser memory, lease/lock ownership, Redis fail-closed, free-ReAct, discovery, Investigator, provider-role, control durability, evidence/promotion, retired-route, and agentic-runtime checks passed. The included six-file focused Vitest run passed 34 tests.
- **Evidence:** Command exited successfully; output ended with `Test Files 6 passed (6)` and `Tests 34 passed (34)`, with each chained architecture check reporting `PASS`/`OK`.
- **Interpretation:** Static and focused component validation is green. This is not evidence that Gemini, the Investigator, providers, or the downstream live evidence pipeline succeeded.
- **Next action:** Confirm the canonical active Atlas lane is idle, then execute exactly one normal UI-equivalent launch using `scripts/run-bureau.sh` and preserve its raw response.

### 13
- **UTC timestamp:** 2026-09-29T05:06:05Z
- **Action:** Executed exactly one normal UI-equivalent canonical Apex Atlas launch.
- **Exact command/request:** `bash scripts/run-bureau.sh http://localhost:80`
- **Observed result:** The pre-launch active-job check returned idle. The canonical launch returned HTTP success with job ID `eb38f6cf-cf93-4c13-b6fa-05873e73d439`, poll URL `/api/ingest/job/eb38f6cf-cf93-4c13-b6fa-05873e73d439`, and discovery-first options: target count 3, research depth `configured`, target timeout 420000 ms.
- **Evidence:** Raw launch output was preserved at `/tmp/apex-launch.raw`; the response reported `Canonical model-owned discovery started`.
- **Interpretation:** The normal canonical run was accepted by the real application and is now the sole live Apex run under the repository's job queue. No Gemini substitute or downstream fabrication has been used.
- **Next action:** Poll the returned durable job endpoint until its real terminal state, preserving every returned job/log snapshot before inspecting the durable ledger.

### 14
- **UTC timestamp:** 2026-09-29T05:07:07Z
- **Action:** Completed polling the normal canonical run until its terminal state.
- **Exact command/request:** `GET /api/ingest/job/eb38f6cf-cf93-4c13-b6fa-05873e73d439` through the shared proxy at 10-second intervals.
- **Observed result:** The job was `running` for four snapshots at phase 0, then terminated as `failed` at phase 1 with progress 1, zero inserted/skipped/errors, and no job log records. The durable result reported `Gemini Boss` status `unavailable`, model `gemini-3.8-flash`, no selected Investigator, and the sanitized provider error `Gemini Boss gemini-3.5-flash Interactions API rate_limited HTTP 429`.
- **Evidence:** Poll snapshots were preserved at `/tmp/apex-job-poll.ndjson`; terminal response recorded `finishedAt: 2026-09-29T05:06:55.855Z`, `outcome: "incomplete"`, and the exact fail-closed message: `Gemini Boss was unavailable after bounded same-role model fallback; no Groq/Mistral Investigator fallback is permitted.`
- **Interpretation:** The first genuine live failure boundary is Gemini Boss provider availability/rate limiting. The run correctly stopped before Investigator selection, web research, evidence promotion, or card creation. This is a provider failure, not a successful research run.
- **Next action:** Preserve the durable database ledger and final counts for this job, then stop the normal run without retrying it.

### 15
- **UTC timestamp:** 2026-09-29T05:07:36Z
- **Action:** Preserved the final job response, active-job state, durable ledger counts, and recent-row evidence for the failed normal run.
- **Exact command/request:** Re-read `GET /api/ingest/job/eb38f6cf-cf93-4c13-b6fa-05873e73d439`; read `GET /api/ingest/job/active/atlas-run`; queried the seven required durable tables and all rows created since `2026-09-29T05:05:00Z`.
- **Observed result:** The final response remained failed/incomplete and the active Atlas lane was idle. All durable counts were zero: research cases, case events, sessions, run events, research evidence, contact evidence, and entities. No recent rows existed.
- **Evidence:** Final response preserved at `/tmp/apex-job-final.json`; post-run active state at `/tmp/apex-active-after-run.json`; poll history at `/tmp/apex-job-poll.ndjson`; database query output showed zero rows in every relevant table.
- **Interpretation:** The failure occurred before durable case creation and before any Investigator, provider-tool, observation, evidence, promotion, or card/entity transition. There are no downstream records to report for this run.
- **Next action:** Search the repository for an existing development/test seam that substitutes only Gemini Boss and Right-hand decisions before considering any injection or substitute execution.

### 16
- **UTC timestamp:** 2026-09-29T05:09:27Z
- **Action:** Attempted the temporary Vitest-only Boss/Right-hand development bypass using the repository's real canonical pipeline entrypoint.
- **Exact command/request:** `cd artifacts/api-server && pnpm exec vitest run src/src/test/apex-atlas-development-bypass.temp.test.ts --reporter=verbose`
- **Observed result:** The test stopped before invoking the canonical pipeline because the standalone Vitest process had not enabled the repository's permanent Redis client. `setActiveJob("atlas-run", ...)` failed with `Cannot claim active job lane 'atlas-run': permanent Redis lock service unavailable or lane already owned`.
- **Evidence:** Vitest exited in 2.05 seconds with one failed test; no API source was changed and no durable database rows were created. The temporary test file is the only test seam added for this development-only attempt.
- **Interpretation:** This was a test-harness runtime configuration failure, not a Gemini or Investigator result. The managed API remained running and its canonical workflow was not altered.
- **Next action:** Re-run the same temporary test with the repository's permanent Redis boot flag enabled in the test process, without changing application source or substituting any downstream role.

### 17
- **UTC timestamp:** 2026-09-29T05:xx:xxZ
- **Action:** Corrected the development-only downstream harness after the Redis preflight failure.
- **Observed defect:** The first harness invoked `connectPermanentRedis()` while the repository's permanent Redis module was intentionally disabled by default in standalone test processes, so the canonical active-job lock correctly failed closed. The harness also mocked only the opening Boss/Right-hand calls; later canonical control transitions and per-act target oversight still resolve Gemini Boss/Right-hand through their normal module boundaries.
- **Correction:** The development-only harness now calls the repository's `enablePermanentRedis()` before creating/claiming the real job, is explicitly opt-in rather than part of the ordinary Vitest filename pattern, and substitutes only the Gemini Boss/Right-hand model boundaries. The real canonical pipeline, Groq/Mistral Investigator, web tools, durable case/event ledger, evidence gates, target investigation, and card/entity persistence remain untouched.
- **Control surrogate:** The Boss surrogate reads the actual admitted-candidate state from the canonical control prompt, selects an actually admitted candidate for one bounded target test, and stops after the real target Investigator act. If no candidate is admitted by the real Investigator, it stops rather than inventing one; the test then fails its downstream assertions rather than fabricating success. The Right-hand surrogate supplies advisory JSON only and never chooses tools/providers.
- **Assertions:** The harness now requires canonical job completion, phase 4, a target case bound to the test job, at least one real Investigator tool-observation event for that target case, and at least one entity/card associated with the test job.
- **Scope:** Development-only validation seam; no production runtime behavior or Gemini provider logic was changed.
- **Next action:** Run the opt-in harness with the repository's configured real Groq/search providers and append raw results immediately after each stage.
