# Apex Atlas — Import, Setup, and Live-Run Audit

**Requested repository:** https://github.com/2f22vtd4kr-cloud/BigContacts<br>
**Audit started:** 2026-10-20 (Europe/Kyiv)<br>
**Current project status (2026-10-24):** Source `main` at `623695da0b8e78e4a6ba5dce0c04d5b4d4f5bbc4` is imported. No Apex run has started in this project.<br>
**⭐ Active detailed audit:** [Apex Atlas Fresh Replit Import / Run 04 — 2026-10-24](audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-24_FRESH_REPLIT_IMPORT_RUN_04.md)

This file is deliberately stored at the project root so it is visible alongside the source. It is not an ignored/private-folder audit destination.

## Logging policy

- Keep a chronological, append-only record of setup, commands, workflow changes, observable request/response summaries, job state, evidence counts, failures, fixes, and verification.
- Log model/provider names, visible structured decisions, prompts only as concise non-sensitive summaries, and action/tool results as observable facts. Hidden chain-of-thought/private reasoning is not available for publication.
- Never record secret values, tokens, credentials, connection strings, or session material.
- Do not copy raw personal contact details or sensitive personal data into this audit. Redact them; record counts and non-identifying provenance summaries instead.
- An accepted launch, search activity, a completed model response, or a review-only lead is not proof of a full successful run or card creation. Record terminal state, durable evidence/admission/card counts, UI projection, and released lock separately.

## Sequential log

### E001 — New project handoff and initial workspace

- **When:** 2026-10-20 (Europe/Kyiv; exact time not captured)
- **Action:** Moved this conversation into a new Build project titled `BigContacts`.
- **Observed result:** The initial project was the standard Replit pnpm starter, containing API Server and Canvas starter artifacts. The worktree was clean on `main` and had no source remote.

### E002 — Integration search and secure credentials

- **When:** 2026-10-20 (Europe/Kyiv; exact time not captured)
- **Action:** Searched current-project integrations for GitHub and relevant model/research/search capabilities. Attached the account-authorized GitHub connection. Requested the user's application credentials through Replit's secure Secrets form.
- **Observed result:** GitHub became available to this project. The user confirmed all 13 requested secret names were added. Secret values were not returned, inspected, displayed, or copied.
- **Diagnostic note:** Exa is also offered as a setup-required connector, but this app's own provider contract must be inspected before considering any architecture change. The supplied app secrets remain in Replit Secrets.

### E003 — Repository reachability and source revision

- **When:** 2026-10-20 14:19 Europe/Kyiv
- **Action:** Ran `git status --short --branch` and `git ls-remote https://github.com/2f22vtd4kr-cloud/BigContacts.git HEAD`; shallow-cloned the repository to a temporary inspection directory.
- **Observed result:** Source HEAD resolved to `2a5874b2f453305fae9a7d45f635a9404f56107d`. The clone completed (3,391 objects, approximately 45.5 MB received). The source includes substantial historical audits, architecture docs, assets, and the full app.

### E004 — Previous-run and repository guidance reviewed

- **When:** 2026-10-20 (Europe/Kyiv; exact time not captured)
- **Action:** Read repository instructions, the mandatory repository-study protocol, current status, run procedure, the October 20 reliability review, and the newest October 20 Fresh Project Run 03 audit.
- **Observed prior-run state:** Run 03 had been launched in another environment as job `7295606f-bbab-433b-8d3f-290059c3c54e`; its latest tracked observation was an unavailable Investigator discovery slot with a rate-limit/quota-category error, not a verified exhausted key. The source audit ended before terminal reconciliation. Historical documentation also identifies other unresolved jobs and unverified final counts.
- **Architecture constraints noted:** Groq Boss selects direction/capability; Groq Right-hand performs bounded oversight; the selected Groq Investigator owns the research trajectory. The runtime owns authorization, egress safety, provenance, admission, durable state, resource limits, and truthful failures. Do not use a scripted search sequence, silently rotate providers, or treat leads as proof/cards.
- **Capture constraint noted:** Previous documentation says raw prompt/contact capture should remain off by default. This audit will use sanitized observable summaries rather than hidden thought or raw personal data.

### E005 — Starter workflows stopped before import

- **When:** 2026-10-20 (Europe/Kyiv; exact time not captured)
- **Action:** Stopped `artifacts/api-server: API Server` and `artifacts/mockup-sandbox: Component Preview Server`.
- **Observed result:** Both stop operations succeeded.

### E006 — Repository imported into the new project

- **When:** 2026-10-20 14:20 Europe/Kyiv
- **Action:** Preserved the starter commit on local branch `replit-starter-initial`, added Git remote `apex-source`, fetched the repository's full `main` history, and reset the project `main` checkout to the fetched source.
- **Observed result:** Imported `main` now points at `2a5874b2f453305fae9a7d45f635a9404f56107d` (“Save agent progress”), matching the inspected HEAD.
- **Audit continuity note:** The first draft of this audit was not present after the source checkout reset. This root audit was recreated immediately after import with the pre-import actions reconstructed from the recorded tool results. Future checkout/reset operations must preserve this file.

### E007 — Lockfile install and presence-only preflight

- **When:** 2026-10-20 14:21 Europe/Kyiv
- **Action:** Ran `pnpm install --frozen-lockfile` and `node scripts/replit-preflight.mjs`.
- **Observed result:** Install succeeded for all 10 workspace projects using pnpm 10.26.1; the lockfile was current and was not changed. Preflight reported all 13 configured provider/service secret names present and platform-managed `DATABASE_URL` present, without displaying values. No secrets were modified.
- **Diagnostic note:** Package installation downloaded and ran dependency postinstall scripts (including ONNX Runtime). No application workflow was running during install.

### E008 — Audit visibility, runtime configuration, and database baseline

- **When:** 2026-10-20 14:21 Europe/Kyiv
- **Action:** Verified root audit file status and ignore rules, inspected the imported API artifact and canonical boot/preflight/schema scripts, and queried the Replit development DB read-only for public table names.
- **Observed result:** `APEX_ATLAS_AUDIT.md` is visible and is not ignored. The API artifact serves at `/` on port 8080 and uses `bash scripts/replit-boot.sh`. Prompt capture, contact-value capture, test capture, and visible-file capture are all configured `false`; auto-pipeline defaults off; normal boot skips schema mutation. The development database currently has no public tables. Both managed workflows are stopped/finished after the import and dependency install.
- **Diagnostic note:** The artifact's unused model-audit file setting still points to a previous Run 03 report, but capture is disabled. Do not enable raw capture or change the file destination to a tracked report. The development schema is empty, so the repository's explicit initializer can be used after its schema/migration contract is reviewed.

### E009 — Source-level and architecture verification

- **When:** 2026-10-20 14:22 Europe/Kyiv
- **Action:** Ran `pnpm run typecheck && pnpm run check:bureau`.
- **Observed result:** Exit code `0`. Workspace library/app typechecking and all Bureau static integrity checks passed. The run also passed six focused Vitest files (44 tests), six research-run validator tests, and five campaign-score tests. Research Gauntlet fixtures validated as 50 grounded-reviewed cases.
- **Diagnostic note:** This validates the imported source contract only; it does not prove database readiness, provider acceptance, live research quality, or card creation.

### E010 — First-time development schema initialization

- **When:** 2026-10-20 14:23 Europe/Kyiv
- **Action:** Ran the repository's canonical one-shot initializer exactly once: `APEX_ALLOW_SCHEMA_PUSH=true bash scripts/initialize-apex-schema.sh`.
- **Observed result:** Drizzle schema push, durable-invariant migration, compatibility migrations `002`–`004`, and required-table verification all completed successfully. Migration `004` corrected zero legacy rows. A follow-up read-only check found 16 public tables and zero rows in `entities`, `research_cases`, `research_case_events`, `research_run_events`, `research_evidence`, `contact_evidence`, and `research_sessions`.
- **Safety note:** The schema permission existed only in this shell command; normal boot remains configured to skip schema mutation. No research/job data was present in the development database before initialization.

### E011 — Canonical boot, health, and prior-job reconciliation

- **When:** 2026-10-20 14:24 Europe/Kyiv
- **Action:** Restarted `artifacts/api-server: API Server`; read fresh workflow logs; queried `/api/healthz`, `/api/healthz/details`, the Atlas active-job endpoint, and six job IDs cited by the repository's October 19–20 run records.
- **Observed boot result:** `scripts/replit-boot.sh` identified revision `2a5874b2f453305fae9a7d45f635a9404f56107d`, skipped schema push, ran the app checks/build, and started the API process. Health and health-details returned HTTP 200. Redis reported `ok` (about 163 ms); `bureauIntegrity=ok`; `autoPipeline=false`; configured provider-slot counts were reported without revealing values.
- **Prior jobs:** `7295606f-bbab-433b-8d3f-290059c3c54e`, `0bc6087d-4070-4420-a645-ca2606549052`, `71918e8d-1620-4a8b-90b0-affc464903b4`, `741956d5-9069-467c-84b5-e483e2083d4f`, `d7993dc4-4e4e-4fa8-99b9-172146524249`, and `8237e1a8-192a-480e-b415-78f24eb94407` all read back as terminal `failed` / `incomplete` jobs at phase 3/4. The five responses that exposed insert counts reported zero inserts; the sixth did not include those fields. All returned `cancelRequested=false`. They used older source revisions, not this project's current revision.
- **Current state:** `/api/ingest/job/active/atlas-run` returned HTTP 200 with `jobId=null` and `active=false`. No new run was started during these checks.
- **Trace handling incident:** The first direct prior-job response included a large nested historical trace. It was not copied into this audit; its temporary shell-output file was deleted. Subsequent prior-job reads printed only allowlisted status/timing/count fields. This audit will continue to exclude hidden model reasoning and raw personal data.
- **Diagnostic note:** The current active pointer is idle, and all six known prior jobs are terminal. This satisfies the repository's no-overlapping-job gate for a fresh run in this project; it does not claim the historical jobs produced cards.

### E012 — UI launch path verified; apparent route conflict resolved

- **When:** 2026-10-20 14:25 Europe/Kyiv
- **Action:** Captured the running `/` app preview, read the UI launch helper/button handler, checked the route aggregator and canonical/legacy handlers, and re-read the active Atlas pointer.
- **Observed UI:** The real Overview page loaded, showed `READY`, `DB 1/1`, Standard depth, and zero initial entity/priority/asset/link counts. The `Launch Apex Atlas` button was visible. Browser output contained only the standard React DevTools informational notice.
- **Launch contract:** The button helper calls `POST /api/ingest/atlas-run` with default JSON `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`. The canonical handler owns this path and is mounted before the legacy quarantine/retired handler, so the apparent route conflict is not a live defect. No source change was made.
- **Pre-launch state:** A fresh read of `/api/ingest/job/active/atlas-run` returned `jobId=null`, `active=false`; source revision remained `2a5874b2f453305fae9a7d45f635a9404f56107d`.

### E013 — One canonical UI-equivalent launch

- **When:** 2026-10-20 14:26 Europe/Kyiv
- **Action:** Re-read the active pointer immediately before launch; it was idle. Sent exactly one `POST /api/ingest/atlas-run` with the Overview button's default JSON `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`. No discovery context, direct worker call, scripted search, or alternate launch route was used.
- **Observed response:** HTTP `202`, job `fa964622-144a-465a-a657-bc0916b4615f`; accepted options reported target count 3, Standard depth, 420000 ms timeout, no single target, and no discovery context.
- **First poll (about 2 seconds later):** HTTP 200, `running`, phase 0/4, progress 0/4, inserts/skips/errors all 0. The active pointer matched this job and reported active.
- **Interpretation:** This proves the canonical job was accepted and started, not that research or card creation succeeded. Continue with read-only, allowlisted status/trace observations.

### E014 — First live Investigator quota failure

- **When:** 2026-10-20 14:27 Europe/Kyiv
- **Action:** Polled the job and read `/api/ingest/atlas-trace/<jobId>` through a local filter that emits only model ID, slot status, action categories, and counts. Read the durable case-event table as actor/event aggregates only.
- **Observed result:** Job remained `running`, phase 1/4, progress 1/4, with zero inserts/skips/errors. Discovery slot 0 used `openai/gpt-oss-120b`, was marked `unavailable`, and reported 3 searches, 1 visit, 0 model findings, 0 parsed candidates, and 1 result URL. The filtered trace contained 3 successful `parallel_web_search` spans, 2 successful `visit` spans, and 1 error span. The slot error matched the explicit quota-exhaustion category; raw error text was not retained here.
- **Control events:** At this checkpoint, the case ledger contained 2 Groq Boss assignment events, 1 Boss control objective, 1 Investigator assignment, 1 Investigator provider-error event, 5 tool-observation events, and 1 Right-hand observation. These counts alone do not prove a reassignment.
- **Action taken:** No credential was rotated and no model/provider was manually selected. The configured second Investigator capability is available for the existing Boss-controlled reassignment path. Wait for durable evidence of Boss's selection before continuing to interpret the run.
- **Tooling note:** One initial trace-filter attempt used `fetch` in the durable CodeExecution scope, where it is unavailable; it made no request. The trace was then queried via Node and filtered before printing.

### E007 — Setup gates (pending)

- Confirm the audit is not ignored and remains visible/tracked.
- Inspect current source configuration, current provider capture defaults, canonical boot and schema-init path.
- Check secret presence only using the repository's presence-only preflight; never read secret values.
- Install exactly from the imported lockfile, run required checks, initialize only an empty development schema through the canonical one-shot initializer if needed, then boot normally with schema mutation disabled.
- Read-only reconcile the prior job(s), shared Atlas active pointer/lock, database state, and current runtime identity before considering one UI-equivalent launch.
- If the state is active or ambiguous, do not launch over it. Preserve truthful evidence and recover safely.
- After a launch, observe frequently but without capturing private reasoning or raw personal data. Verify job terminal state, durable findings/evidence/admissions/cards, dashboard projection, and released lock. Apply only evidence-backed fixes without weakening architecture gates.
