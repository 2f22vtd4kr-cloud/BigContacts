# ⭐ Apex Atlas Sequential Audit — Main refresh relaunch 01

**Date:** 2026-10-19  
**Status:** UI-default launch accepted; tracked post-launch outcome and terminal reconciliation missing  
**Source:** local `main` tracking `origin/main`, HEAD `4c2ea0ab0d11a5903458882dabffd7f35f19984f`  
**Previous report:** `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-18_FRESH_PROJECT_RUN_04.md`

## Audit scope and handling

This is a chronological record of setup, runtime observations, model-visible requests/completions, searches/actions, evidence and card outcomes. It records factual summaries and concise diagnostic analysis, not hidden chain-of-thought or provider-private reasoning. Secrets are never recorded. Raw model-wire diagnostics, if enabled, are confined to a unique ignored `.local/audits/` file; contact capture and visible-file raw capture remain off. This tracked report will contain sanitized findings, query/action summaries, source links and outcome counts rather than raw contact values.

## P000 — Refresh and preserve the prior workspace

- Fetched the latest GitHub `main`; the fetched tip is `4c2ea0ab0d11a5903458882dabffd7f35f19984f`.
- The imported checkout and upstream `main` have unrelated Git histories. No merge, reset, rebase, or `.git` replacement was used.
- Preserved the old local snapshot as branch `workspace-pre-refresh-2026-10-19` at `fa8673814`; `gitsafe-backup/main` also still points to that snapshot.
- Created the current local `main` to track `origin/main`. The complete prior run04 report was preserved and restored byte-for-byte (SHA-256 `61c88ba493c5fdb300edd77dbd6cae026bd353f319642e5974ef7c5a75aba17c`). It is visible and not ignored.
- The fetched source includes the control-plane change that prevents jurisdiction-only churn after an observed failed/inaccessible source route, while preserving Investigator autonomy and evidence/access-control boundaries.
- Main’s run guide was reviewed. It requires reconciliation of job `718ed715-aa6d-43c9-916f-463371485ad8`, a verified current `main` runtime, preflight/typecheck/build/architecture checks, healthy database/Redis, and a canonical default launch. It forbids forced research hops, fixed search sequences, fabricated evidence, and raw prompt traces in tracked reports.

## P001 — Historical job and active-lane reconciliation

Read-only checks against the existing API/Redis runtime found the following terminal jobs:

| Job | Status | Outcome | Terminal detail |
|---|---|---|---|
| `718ed715-aa6d-43c9-916f-463371485ad8` | `failed` | `incomplete` | Phase 3 of 4; ended 2026-10-18 18:37:39 UTC without an evidence-backed terminal state |
| `3ae02de0-2e1d-4353-97f7-67853d706486` | `failed` | `incomplete` | Phase 3 of 4; canonical Investigator reached the 20-iteration ceiling; case preserved for review |
| `4b85fc7c-a239-478c-a455-94baf02ffdee` | `failed` | `incomplete` | Phase 3 of 4; canonical Investigator reached the 32-iteration ceiling; case preserved for review |

The active `atlas-run` pointer returned `active=false`, `jobId=null`. These historical jobs are not being resumed or treated as successful. The prior run04 audit documents its own narrower findings and limitations.

## P002 — Development database baseline

Read-only schema and row-count checks against the Replit **development** database:

- Tables present: `assets`, `contact_evidence`, `dedup_reviews`, `enrichment_runs`, `enrichment_state`, `entities`, `identity_bundles`, `identity_candidates`, `improvement_logs`, `phase_j_checkpoints`, `relationships`, `research_case_events`, `research_cases`, `research_evidence`, `research_run_events`, `research_sessions`.
- Baseline: `research_cases=1`, `research_case_events=29`, `research_run_events=0`, `research_evidence=0`, `entities=0`, `assets=0`, `relationships=0`.
- Comparing `lib/db` and `scripts/initialize-apex-schema.sh` between the preserved checkout and refreshed `main` showed no schema/migration file differences. No schema mutation was run.

## P003 — Secret-presence and stale-runtime checks

- `node scripts/replit-preflight.mjs` passed and reported all 13 configured active secret names present. It did not print or modify secret values.
- Health from the currently serving API returned HTTP 200, Redis `ok`, `researchKeysConfigured=true`; the active Atlas pointer was idle.
- **Stale runtime warning:** the latest API workflow boot log still identifies `fa8673814`, not refreshed `main`. Therefore these health results are baseline-only and do not establish that the refreshed code is running. Do not launch until the latest build has been restarted and rechecked.
- `scripts/replit-boot.sh` defaults `ENABLE_AUTO_PIPELINE=false`; no separate automatic pipeline is to be started.

## P004 — Canonical UI launch contract

Inspected the current UI helper used by “Launch Apex Atlas.” Its default real-run request is:

```json
{
  "targetCount": 3,
  "researchDepth": "standard",
  "targetTimeoutMs": 420000
}
```

No `singleTargetId` is sent. The fresh run will use this default payload, not a target-specific shortcut, forced query, or hand-authored tool sequence.

## P005 — Refreshed-main typecheck

- Ran `pnpm run typecheck` on `main` at `4c2ea0ab0d11a5903458882dabffd7f35f19984f`.
- Result: passed. Shared libraries, API server, mockup sandbox, and scripts completed TypeScript checks without errors.

## P006 — Refreshed-main build

- Ran `pnpm run build`; it passed, including a second typecheck, recursive workspace builds, and the Apex Atlas frontend/API production bundles.
- The frontend build emitted the existing non-blocking Vite warning that several chunks exceed 500 kB. Build exit status was successful; this warning is not being treated as a research or runtime failure.

## P007 — Focused control-plane and architecture checks

- Focused `atlas-control-decision.test.ts`: passed, 5/5 tests. This covers the current control-prompt and source-route recovery contract.
- Full `pnpm run check:bureau`: exited 0. The complete architecture/check suite passed, including its research-run validator tests (6/6) and campaign-score tests (5/5).

## P008 — Run-scoped private model audit setup

- The refreshed source’s audit helper records model-visible request/response data, removes provider-private reasoning fields, filters credential fields, and redacts contact fields/values by default.
- The report destination will be a unique `.local/audits/` path. Contact inclusion, visible tracked-file capture, and test capture remain explicitly false. The service launch command will only override prompt capture and the per-run path for this one development run; it will be restored after the run.

## P009 — Refreshed-runtime and schema verification

- Restarted the existing managed API workflow after the scoped trace configuration. Fresh boot log identifies `4c2ea0ab0d11a5903458882dabffd7f35f19984f`; it built the API bundle and started `dist/index.mjs`.
- `/api/healthz`: HTTP 200; Redis `ok`; research-key readiness true.
- `/api/healthz/details`: `bureauIntegrity=ok`, no integrity reasons, `registryShallowRisk=false`, `autoPipeline=false`. Provider capability counts showed Groq 2, Right-hand 1, Exa 1, Tavily 1, Serper 1, Companies House 1, Scrapfly 1, and ZenRows 1; Gemini and Perplexity 0. No secret values were read.
- `/api/ingest/job/active/atlas-run`: HTTP 200, `active=false`, no job ID.
- Root desk screenshot is nonblank and shows the “Launch Apex Atlas” button with standard depth selected; entity, asset and relationship counts are 0. Browser console only reported the React DevTools informational notice.
- A first attempt to invoke the readiness helper directly did not run because this API package has no `tsx` executable. It made no database change. Repeated the exact read-only readiness contract from `schema-readiness.ts` with database metadata queries instead: no required columns or invariants missing; the replay-integrity function is bound to `atlasJobId`.
- No schema migration or data mutation was needed.

## P010 — Final pre-launch gate

Passed: fetched `main` is the runtime SHA; typecheck, build, focused source-route tests and full `check:bureau`; database schema invariants, Redis, provider readiness and bureau integrity; prior required job is terminal; active Atlas lane is idle; UI default request is confirmed. Launch the UI-equivalent default exactly once.

## P011 — Canonical UI-default launch accepted

- Rechecked four guards immediately before the request: health/Redis/provider readiness, bureau integrity with automatic pipeline disabled, prior required job terminal, and active Atlas lane idle. All were true.
- Sent exactly one `POST /api/ingest/atlas-run` using the inspected UI helper’s default body: `targetCount=3`, `researchDepth=standard`, `targetTimeoutMs=420000`; no `singleTargetId`.
- API returned HTTP 202 and job `8237e1a8-192a-480e-b415-78f24eb94407`, with accepted options matching the UI defaults. The canonical route’s schema gate passed and the request was accepted. The tracked report has no post-launch model request/checkpoint, so this records launch acceptance only—not proof that a model call executed or that research progressed.

## P012 — Live checkpoints

The monitor will append UTC checkpoints with status, phase/progress and log-entry counts while the job runs. Model-visible prompts/completions are captured only in the run-specific ignored file; this report will record sanitized action/evidence summaries and durable outcomes.

## P013 — Repository evidence checkpoint — 2026-10-19

- Review of the tracked audit at main commit `f84902e79dd0f30ee59749063124ef2407786270` confirms that the last recorded event is the HTTP 202 launch acceptance in P011 and the planned monitoring note in P012. No later checkpoint or terminal reconciliation is present in this committed report.
- Therefore this repository artifact alone cannot establish whether job `8237e1a8-192a-480e-b415-78f24eb94407` is still active, terminal-successful, or terminal-incomplete; it also cannot establish final durable evidence, candidate admission, card counts, or post-run lock state.
- Before any further launch, the operator must reconcile that job and the active Atlas lock read-only in the actual runtime. Do not start a second job concurrently or infer an outcome from the missing tracked checkpoints.
- This is a GitHub-side evidence-gap note only; it does not access, restart, or operate Replit, and it does not add runtime observations that were not captured in the repository.
