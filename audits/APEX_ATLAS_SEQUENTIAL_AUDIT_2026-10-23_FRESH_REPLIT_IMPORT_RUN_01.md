# ⭐ APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-23_FRESH_REPLIT_IMPORT_RUN_01.md

**Audit started:** 2026-10-23 (Europe/Kyiv)<br>
**Source:** https://github.com/2f22vtd4kr-cloud/BigContacts<br>
**Scope:** fresh Replit project import, setup, startup, and safe verification.
**Status:** setup in progress; no Apex research launch has been sent.

This is the visible, chronological audit for this project. It records observed setup actions, commands, source revision, outcomes, errors, and concise diagnostic conclusions. Secret values, access tokens, cookies, private chain-of-thought, and third-party personal contact values are excluded. Provider-visible prompts or responses are included only when safely observable and relevant; hidden reasoning is not available for logging.

## Sequential events

### E001 — Project request and scope

- The user asked to move into a new blank project, import the complete existing GitHub repository, run the existing app, and keep a detailed, starred sequential audit.
- The user supplied 13 secret names to request through Replit Secrets. The values are not recorded here.
- The user asked for raw prompts, internal thought processes, and raw contact data. Audit boundary: record observable tool inputs/outputs and provider-visible content only when safe; do not disclose hidden chain-of-thought, secrets, or third-party personal contact data in a tracked public file.
- The repository README describes Apex Atlas as an OSINT research bureau that discovers people based on wealth potential and public contact paths. A live people-discovery run is therefore not part of this setup audit absent a bounded, appropriate case.

### E002 — Fresh project baseline

- Project scaffold was a pnpm workspace on branch `main`, initial commit `d89200957ae9442f53ca0c7790c9c6142ba5a70b`.
- It contained starter API and mockup artifacts, not the BigContacts application.
- The existing Replit-managed `.git` directory and artifact metadata are to be preserved during import.

### E003 — Requested secrets collected securely

- Replit Secrets confirmed presence of all 13 requested names: `COMPANIES_HOUSE_API_KEY`, `EXA_API_KEY`, `GROQ_BOSS_API_KEY`, `GROQ_RIGHT_HAND_API_KEY`, `GROQ_INVESTIGATOR_API_KEY`, `HF_TOKEN`, `GROQ_INVESTIGATOR_API_KEY_1`, `REDIS_URL_1`, `SCRAPFLY_API_KEY`, `SERPAPI_KEY`, `SERPER_API_KEY`, `TAVILY_API_KEY`, and `ZENROWS_API_KEY`.
- The check returned presence booleans only. No secret values were read, printed, or copied into the audit.

### E004 — Starter workflows stopped before import

- Stopped `artifacts/api-server: API Server` and `artifacts/mockup-sandbox: Component Preview Server`.
- Both stop operations succeeded. This prevents the starter application from being mistaken for the imported app during replacement.

### E005 — GitHub connector unavailable; public Git fallback verified

- The GitHub integration was attached, but its status remained `connect` with an authorization note. A normal `git ls-remote` attempt was rewritten to Replit's GitHub proxy and failed with a disconnected-connection error.
- Retried public Git access with the inherited proxy variables and Git config overrides disabled; `git ls-remote` succeeded.
- Source `main` resolved to `4a79fbf752618bf18382e5658ecef1305bc8d23b`. No GitHub credentials were requested or exposed.

### E006 — Prior acceptance state reviewed

- The source README and prior run audit were reviewed before launching anything.
- The README reports the product is not yet live-accepted and documents earlier runs that ended without evidence-backed candidates/cards. Its latest cited audit requires checking the current job/lock and deployed revision before another research launch.
- This fresh project has not launched an Apex job. No search, source fetch, model request, person/contact discovery, or card creation has occurred here.

### E007 — Exact repository snapshot fetched

- Added the public repository as remote `bigcontacts` and fetched `main` at depth 50 without replacing the existing `.git` directory.
- Fetched source revision: `4a79fbf752618bf18382e5658ecef1305bc8d23b`; the tracked tree contains 3,353 files.
- Source tree includes the existing Finder UI, API, runtime, service worker, tests, scripts, docs, and prior audits. No replacement application was generated.
- The source API artifact configuration expects the desk at `/`, API on port `8080`, and the canonical boot command `cd ../.. && bash scripts/replit-boot.sh`. Its source artifact ID matches this project's existing API artifact.
- The source's development configuration enables prompt capture to an ignored `.local/audits/` path and excludes contact values. The tracked audit remains separate; no model prompt or research request has been generated in this project.
- The latest source audit records job `81a955bf-f44f-4faf-a39a-e2bcffbc5014` ending `failed/incomplete`, with zero findings, admissions, evidence rows, or cards. This is historical evidence from a different runtime, not proof of this new project's state. It is a reason not to relaunch the same broad default mission without first reconciling its runtime and defining an appropriate case.

### E008 — Import guard stopped on a platform config change

- The first import-copy attempt halted before copying or deleting any application files because the worktree had an unexpected `.replit` modification.
- Inspection showed the only tracked diff was a platform-added `python-base-3.13` module; the visible audit was the only untracked directory.
- No source or starter application files were changed by the aborted attempt. The upstream `.replit` declares Node 22, Python 3.13, and PostgreSQL 16, so the import will use that source runtime configuration rather than silently retaining the Node 24 starter setting.

### E009 — Repository import completed

- Imported the fetched `main` tree at `4a79fbf752618bf18382e5658ecef1305bc8d23b` (3,353 tracked source files) into the existing Replit checkout.
- Preserved the Replit-managed `.git` directory and artifact TOMLs during file replacement; no second application or generated replacement code was added.
- Moved local `main` to the exact fetched source revision. The upstream `main` remote is retained.

### E010 — Replit runtime and preview configuration validated

- A direct `.replit` edit was rejected by platform safeguards. The full TOML was then submitted through the validated replacement flow; validation succeeded.
- The existing API artifact was updated through artifact validation to the source's expected `Apex Atlas` title, root preview `/`, port `8080`, and canonical `cd ../.. && bash scripts/replit-boot.sh` command. Validation succeeded; workflow remains stopped pending dependency and database setup.
- Runtime modules now match source: Node 22, Python 3.13, and PostgreSQL 16. The model-prompt trace path is unique to this import run under ignored `.local/audits/`; contact-value capture and visible raw-file opt-in are disabled.
- Updated `APEX_ATLAS_RUN_AUDIT.md` to point to this starred report. `git check-ignore` confirmed the report is not ignored; the report, pointer, and runtime config changes are staged, not committed or pushed.

### E011 — Empty development database and dependency-install failure

- Read-only `information_schema.tables` query returned no public base tables. No schema or row data was modified.
- Runtime observed: Node `v22.23.4`, pnpm `10.26.1`.
- `pnpm install --frozen-lockfile` failed with `ERR_PNPM_FETCH_403` for `proxy-addr@2.0.7` from Replit's package firewall. The error stated no authorization header was set; no registry firewall was bypassed and the lockfile was not intentionally edited.
- Follow-up inspection found the lockfile pins `proxy-addr@2.0.7` under Express, while `pnpm why proxy-addr -r` reported an installed `2.0.8`. This version discrepancy is unresolved; the next step is to check the latest approved package version and the exact lock/manifest dependency path before retrying.

### E012 — Package-firewall recovery and locked install

- `pnpm view proxy-addr version` returned `2.0.8`. The API manifest allows Express `^5.2.1`, while the frozen lock pinned `express@5.2.1` and `proxy-addr@2.0.7`.
- Updated the API's direct Express dependency to `^5.3.0`; this is within the prior `^5.2.1` range and uses `proxy-addr@2.0.8`. No firewall or registry authorization was bypassed.
- Retried `pnpm install --frozen-lockfile`; all 10 workspace projects installed successfully. The install reported existing deprecation warnings for `recharts@2.15.4` and `boolean@3.2.0`; no install error remained.
- `pnpm-lock.yaml` was regenerated by pnpm `10.26.1`; it includes refreshed peer/platform-optional metadata as well as the Express dependency update. The API manifest also reordered `pdfjs-dist` without changing its version. The subsequent bureau checks, typecheck, frontend build, and API build passed.

### E013 — Secret preflight, bureau gates, and typecheck

- `node scripts/replit-preflight.mjs` passed. It reported all 13 active provider/integration secret names present and platform-managed `DATABASE_URL` present; values were not displayed or changed.
- `pnpm run check:bureau` exited `0`. Its architecture/runtime contract checks passed, including `check:no-force-dig`; the bundled focused test group reported 44 passing tests, with the research-run validator and campaign-score groups each reporting 6 passing tests.
- `pnpm run typecheck` exited `0`, including workspace libraries, API server, mockup sandbox, and scripts.
- No live provider requests or person discovery occurred in these checks.

### E014 — First-time development schema initialization

- Ran the documented `APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh` once after confirming the development database had no public base tables.
- Drizzle schema push and hardening/compatibility migrations completed; migration 004 reported zero legacy rows corrected.
- The initializer verified the required durable Apex tables. The schema-push flag was command-scoped and is not part of normal workflow configuration.

### E015 — API build, startup, health, and desk verification

- Restarted the existing `artifacts/api-server: API Server` workflow. The canonical boot skipped schema push, ran the frontend contract/build and API build checks, then started `artifacts/api-server/dist/index.mjs`.
- `GET /api/healthz` returned HTTP 200 with `status: ok`, Redis `status: ok` (`126 ms`), and `researchKeysConfigured: true`. This reports configuration presence, not successful provider authentication or model execution.
- The desk route `/` returned HTTP 200. The browser screenshot showed the Apex Atlas Research Desk, the Launch button, and the empty-state counters (0 entities/profiles/assets/links). Browser console only showed the standard React DevTools informational notice.
- No launch button was clicked; there was no discovery, model/provider call, contact lookup, or card creation in this setup run. The visible UI is ready, but end-to-end live research/card creation remains unverified and needs an appropriately bounded, consented use case. Prompt capture is configured for a private per-run file; no hidden model chain-of-thought or personal contact values are included in this public audit.
- The separate mockup component workflow remains stopped; this app serves its desk from the API workflow as documented.
- The first attempt to append this verification section used stale checklist context and was rejected without changing the file; the retry used the current checklist text.

### E016 — Historical run notes reconciled; stale context corrected

- The imported `docs/context.md` still treated the 2026-10-19 job `0bc6087d-4070-4420-a645-ca2606549052` as unresolved. The newer 2026-10-20 report reconciled it as `failed/incomplete` after 20 Investigator turns, with zero admissions/cards and an idle active pointer.
- The current README and 2026-10-21 Run 02 identify the newer job `81a955bf-f44f-4faf-a39a-e2bcffbc5014`: terminal `failed/incomplete` despite a low-level `completed` status; 12/20 actions, four successful fetched pages, zero findings/admissions/evidence/cards, two recovered JSON-validation errors, and no observed quota exhaustion. The run used an older runtime SHA and does not validate this fresh project.
- No card-layer defect or quota-triggered Investigator switch was established by those runs. The current app was not launched into the same broad, unscoped mission; the new PostgreSQL database is separate.
- Corrected `docs/context.md` to label the 2026-10-19 note as historical and cite the newer verified status. No prior job was launched, mutated, or reconciled through this fresh runtime.

### E017 — Tracked audit and trace boundaries aligned

- Updated `APEX_ATLAS_RUN_AUDIT.md` to keep the starred sequential report visible while excluding third-party personal contact values and hidden chain-of-thought from tracked content.
- The current development config captures provider-visible prompts only in the unique ignored `.local/audits/` trace file; contact-value capture, test capture, and visible raw-file opt-in remain false.
- No prompt trace was generated because no model request was made. The public audit remains a sanitized setup and startup record.

### E018 — Final diff check caught header whitespace

- The first final `git diff --check` stopped on trailing Markdown line-break spaces in the edited `docs/context.md` header; because the shell used `set -e`, no files were staged by that attempt.
- Replaced those spaces with explicit `<br>` tags. No application code or runtime behavior changed.

### E019 — Staged diff check caught audit-header whitespace

- The second final check reached `git diff --cached --check` and found Markdown line-break spaces in the new audit header. The `set -e` command again stopped before `git add`; no files were staged by that attempt.
- Replaced the header's trailing spaces with explicit `<br>` tags. No runtime behavior changed.

## Current state

- [x] Visible audit created before repository import.
- [x] Requested secret names confirmed present without reading values.
- [x] Starter workflows stopped.
- [x] Public source branch and revision identified.
- [x] Import repository files while preserving Replit-managed `.git` and artifact metadata.
- [x] Reconcile source setup requirements and update the existing API artifact configuration through the validated platform flow.
- [x] Resolve package firewall block and complete locked dependency install.
- [x] Run required preflight, architecture checks, and typecheck.
- [x] Initialize the confirmed-empty development schema.
- [x] Build and start the API workflow; verify health and UI.
- [x] Reconcile the repository's historical run notes and correct the stale context status.
- [x] Verify the tracked audit/config changes pass whitespace checks and remain visible.
- [x] Do not treat app startup as live research success; no live people-discovery run was launched from this setup.
