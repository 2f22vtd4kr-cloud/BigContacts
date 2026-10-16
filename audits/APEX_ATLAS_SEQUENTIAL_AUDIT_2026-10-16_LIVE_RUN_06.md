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

