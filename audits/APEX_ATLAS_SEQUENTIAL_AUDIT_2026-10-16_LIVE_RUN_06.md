# Apex Atlas Sequential Audit — 2026-10-16, Live Run 06

**Audit type:** Run-specific, append-only live audit. This is a pre-run scaffold only; no Run 06 research job has been launched by this review.
**Repository:** `2f22vtd4kr-cloud/BigContacts`
**Canonical branch:** `main`
**Status:** `PREPARED — NOT STARTED`
**Intended model audit destination:** `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-16_LIVE_RUN_06.md`
**Runtime source SHA:** must be recorded from the actual Replit workspace at launch; do not treat the commit that prepared this file as proof of the process SHA.
**Job ID / case ID:** not assigned yet.

## Prior-run boundary — Run 05

Run 05 job `4b85fc7c-a239-478c-a455-94baf02ffdee` is verified in the imported Replit project's available job store as `failed / incomplete`, finished at `2026-10-16T03:00:24.824Z`. In the checked Redis store, the `atlas-run` and `case-bureau-discovery` active-job pointers were absent. Its additional discovery trace reconciled to 16 searches, 4 visits, 0 recorded findings, 0 parsed candidates, and no recorded admission; the last trace entry reported `unavailable / LLM_UNAVAILABLE`.

**Important limitation:** the imported project's database does not contain the trace's `caseId=2`. Its empty tables and UI cannot establish the original project's final durable case, evidence, contact-attribution, entity, candidate, or card counts. Do not infer that those original-project counts were zero. Keep Run 05 marked incomplete for that persistence reconciliation.

## Pre-run gate — fill with observed values before launch

- [ ] Replit workspace is the existing Apex Atlas app, not a replacement project.
- [ ] `git remote -v`, current branch, `git status --short`, and exact `git rev-parse HEAD` recorded.
- [ ] Current source is safely synchronized to the intended latest `main`; no destructive reset, dirty-worktree overwrite, or schema mutation.
- [ ] The actual running API process has `APEX_CAPTURE_MODEL_PROMPTS=true` and `APEX_MODEL_AUDIT_FILE=audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-16_LIVE_RUN_06.md`. The first model request and response must append here, not to the Run 04 or Run 05 audit.
- [ ] `node scripts/replit-preflight.mjs` passes (names/presence only; never print secret values).
- [ ] `pnpm run typecheck`, `pnpm run build`, and `pnpm run check:bureau` pass against this exact workspace SHA.
- [ ] `GET /api/healthz` is healthy, Redis and bureau integrity are not critical, and the desk at `/` renders.
- [ ] The prior job's terminal state and active-job pointers have been checked read-only in this same runtime; no active job exists.
- [ ] Current baseline counts are captured from the actual database that the new run will write to. Distinguish confirmed zero counts from unavailable endpoints or inaccessible prior-project state.
- [ ] The user's intended launch task/scope is recorded as supplied. Do not hardcode a research target or query sequence in source or the audit scaffold.

Do not launch until the pre-run gate is resolved. A green build or health response is not a successful investigation.

## Live chronology — append observations in timestamp order

No live Run 06 events are recorded yet. When the operator launches, append actual timestamps, request IDs, job/case IDs, model responses, accepted and rejected actions, tool execution results, source URLs, fetched-page observations, and oversight decisions. Preserve the difference between proposed actions, guard-blocked actions (no network request), executed requests, observations, findings, and admissions. Retain only the visible model outputs needed for audit; exclude credentials, contact data, and private reasoning.

## Terminal reconciliation — fill only from runtime evidence

- Job terminal status/outcome:
- Job started / finished timestamps:
- Exact runtime source SHA:
- Model-request / response count and destination-file verification:
- Accepted outbound searches / visits / fetches (count and evidence):
- Guard blocks (count and reason dimensions where exposed):
- Provider/runtime errors (status, safe diagnostic, request ID, retry outcome):
- Final research case/events:
- Findings with source-bound evidence:
- Candidate admissions and admission decisions:
- Contact-attribution records (counts only in this summary; keep contact values redacted):
- Durable entities / evidence / contact evidence / card counts:
- Final UI/card projection matched against durable records:
- Active-job pointers and locks after terminal state:
- Discrepancies between job counters, trace, API, database, and UI:
- Operational result:
- Research-yield result:
- Remaining uncertainty / blockers:

## Evaluation boundary

Treat operational behavior and research yield separately. Evidence of live model calls or executed searches alone is not success. A candidate card is valid only when its identity, public-source evidence, attribution, admission decision, durable records, and UI projection reconcile. If no candidate is sufficiently supported, record the honest research-yield outcome; never manufacture evidence or force a target. Any provider failure, scope rejection, cancellation, or persistence discrepancy must remain visible in the final status.

## Pre-run setup and gate evidence — recorded 2026-10-16

This section records the new-project import and setup before any Run 06 research request. The project was imported from the repository's `main` branch at `d7712f0ff40e3f4a6b764b207eff24e3ba071bff`; the Replit-managed `.git` directory was preserved. The only tracked local change is this artifact's audit destination, updated from the stale Run 04 path to this Run 06 file.

### Setup sequence

- The first workflow output belonged to the starter project: `/` returned HTTP 404 before the repository was imported. After the source import, the canonical `scripts/replit-boot.sh` workflow built the existing frontend and API and served the desk at `/`.
- The GitHub integration call from the preceding conversation had returned a token-validation 401. In this project, GitHub was attached successfully and `git fetch origin main` completed; no GitHub credential was requested or stored in this file.
- `pnpm install --frozen-lockfile` completed with the repository lockfile unchanged.
- `node scripts/replit-preflight.mjs` passed. All 13 required secret names were present; values were not inspected or recorded.
- The new development database had no application tables before initialization. `APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh` completed and verified the required tables and invariants. The ordinary API boot ran with schema mutation disabled.
- `pnpm run typecheck` and `pnpm run check:no-force-dig` passed. The canonical boot performed the existing frontend and API builds and its embedded architecture checks; the API workflow remained running.
- At 2026-10-16T10:50:07Z, `/api/healthz` returned HTTP 200 with Redis `ok` and `researchKeysConfigured=true`; `/` returned HTTP 200 and served the imported desk. A later read-only `/api/system/status` returned `bureauIntegrity=ok`, with Groq Boss, Right-hand, and two configured Investigator capability slots reported present. These are configuration/readiness signals, not proof that provider credentials have usable quota.
- The read-only application-data baseline in this new development database was: entities 0; assets 0; relationships 0; research cases 0; research-case events 0; research sessions 0; research-run events 0; research evidence 0; contact evidence 0.

### Prior Run 05 re-check in this runtime

- At 2026-10-16T10:53:15Z, `GET /api/ingest/job/4b85fc7c-a239-478c-a455-94baf02ffdee` returned terminal `failed / incomplete`, finished at `2026-10-16T03:00:24.824Z`, with the message that the Investigator iteration ceiling was reached after 32 iterations. Its discovery summary reported 16 searches, 4 visits, 0 findings, 0 parsed candidates, and no admission.
- At 2026-10-16T10:53:14Z, the current `atlas-run` and `case-bureau-discovery` active-job endpoints both returned `active=false` and `jobId=null`.
- The current database has no `caseId=2`. The original project's durable case/evidence/contact/card counts remain unavailable; the empty database here is not evidence that those original counts were zero. The prior run is terminal and the current locks are clear, but the cross-project persistence limitation remains unresolved.
- The visible Right-hand disposition in the stored Run 05 record warned against a broad regional registry search and recommended narrowing to a concrete sector and sub-region. Do not repeat the same broad launch without a recorded scope.

### Audit and privacy boundary

`APEX_CAPTURE_MODEL_PROMPTS=true` is enabled and `APEX_MODEL_AUDIT_FILE` points to this file. The repository logger records model-visible request/response content and transport metadata while redacting credentials, email addresses, and phone numbers and omitting provider-private reasoning fields. The audit will preserve raw search queries, tool outcomes, source URLs, evidence identifiers, and concise decision summaries. It will not copy hidden chain-of-thought, secret values, or raw personal contact values into this tracked file.

No Run 06 launch request or live research action has occurred as of this entry. The UI's default Launch button sends a three-target, standard-depth request with no target ID or user-specified industry/geography. Full `pnpm run build` and `pnpm run check:bureau` have not yet been run against this workspace state. The run gate remains incomplete pending those checks and a narrower, explicitly recorded investigation scope.

## Pre-launch validation update — 2026-10-16

- At 2026-10-16T10:55:34Z, `pnpm run build` started on the imported workspace. It exited 0 at 10:55:56Z. Workspace and package typechecks passed; API and frontend builds and their embedded static/architecture checks passed. Vite emitted a non-blocking warning that the main JavaScript chunk exceeds 500 kB after minification.
- `pnpm run check:bureau` then exited 0 at 10:56:24Z. All chained route, job-state, database-boundary, security, autonomy, provider-selection, control, provenance, evidence, and architecture checks passed; the included focused tests passed (44 phone/source/scoreboard tests, 6 research-run-validator tests, and 5 campaign-score tests). No live model or search run was started by these checks.
- The audit file is tracked by Git and `git check-ignore` returned no matching ignore rule. It remains at the visible repository path named at the top of this file.
- Code-readiness gates are now clear. Run 06 is still not launched: the UI default has no sector/geography, while the prior Right-hand disposition specifically warned that broad discovery would repeat the earlier scope problem. Await an explicit narrow scope before any provider or search call.

