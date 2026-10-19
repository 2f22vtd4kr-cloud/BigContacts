# Apex Atlas — Current Verified Status

> **Latest operational override — 2026-10-19.** The newest tracked run is [Fresh Replit Import Run 01](../audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-19_FRESH_REPLIT_IMPORT_RUN_01.md), job `0bc6087d-4070-4420-a645-ca2606549052`, last captured at P018. The Replit audit agent then exhausted its credits. Its observation ending is not proof that Apex's backend job stopped or completed; final terminal status, durable candidate/evidence/card counts, and active-job lock remain unknown. Read-only reconcile this job and the actual runtime's active Atlas pointer/lock before any new launch. The older Main Refresh Relaunch job `8237e1a8-192a-480e-b415-78f24eb94407` is recorded as failed/incomplete in P002 of the newer audit and is no longer the latest outstanding run.

**Updated:** 2026-10-19 (UTC)  
**Repository:** `2f22vtd4kr-cloud/BigContacts`  
**Canonical branch:** `main`  
**Last verified live-runtime source SHA for launch 8237e1a8:** `4c2ea0ab0d11a5903458882dabffd7f35f19984f` (P009 boot evidence only; it does not establish the runtime’s present SHA).  
**Source revision note:** SHA values below are historical run-specific checkpoints, not current `main` or runtime deployment proof. Refresh the actual `main` HEAD and runtime build identity before every run.
**Release state:** **NOT LIVE-ACCEPTED — model-led execution is demonstrated; evidence-backed candidate admission and card creation are not.**

This file is the current operational status and replaces the stale snapshot retained under the historical `CURRENT_STATUS_2026-10-15.md` filename. Before the next code change or live run, refresh actual `main`, the newest audit files, GitHub Actions for the exact current SHA, and durable runtime state.

## Read this first

- [Run 05 — separate reconstructed audit, terminal state unverified](../audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-16_LIVE_RUN_05.md)
- [Run 04 — original full append-only audit, including its real terminal report and later Run 05 request/response append](../audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-15_LIVE_RUN_04.md)
- [Living architecture/context](context.md)
- [Canonical ReAct architecture](BUREAU_REACT_ARCHITECTURE.md)
- [Operational run procedure](RUN_BUREAU.md)

Important chronology: Run 04's first Replit workflow restart did fail before boot. A later restart succeeded, the dashboard launch was accepted, and Run 04 actually executed. Do not keep describing the entire Run 04 attempt as blocked before launch. Run 05 was then executed as a separate job, but its terminal reconciliation was interrupted.

## What live execution has demonstrated

The live audit records show the model-led Boss → Right-hand → selected Investigator loop executing with the expected role separation. Models returned structured decisions, chose queries/tools and pivots; the runtime made actual search/fetch calls for accepted actions and stopped outbound execution for rejected actions. The expanded model request/response audit logger captured real provider responses, request formats, request IDs, attempt numbers and errors.

That is meaningful evidence that the **control loop is running live**. It is not yet end-to-end acceptance of the bureau, and it does not by itself prove that every capability/guard behaves correctly.

## Run 04 — verified terminal outcome

Audit: [APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-15_LIVE_RUN_04.md](../audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-15_LIVE_RUN_04.md)  
Job: `e0730630-a845-4b1e-9086-d9e27a77319f)

- Terminal status: `failed`, outcome `incomplete`, Atlas phase 3/4.
- Finished: `2026-10-16T02:42:00.582Z).
- Final reason: standard-depth Investigator iteration ceiling reached after 20 iterations; case retained for review.
- Audit's terminal summary: 20 Investigator iterations, 11 searches, 3 visits, 40 trajectory entries, 0 findings, 0 candidate admissions, 0 cards/promotions.
- Post-run counts: entities 0, assets 0, contact evidence 0, research evidence 0, relationships 0; one research case and 35 research-case events retained.
- The Investigator's tool trajectory was constrained by repeated scope-guard blocks and one HTTP 301 visit. The redirect was surfaced rather than followed automatically; this is intentional safety behavior.
- A separate Right-hand request received HTTP 429 `rate_limit_exceeded` with an explicit tokens-per-minute message. This is a temporary capacity event, not proof of an exhausted key.

The absence of any admitted person means Run 04 does **not** demonstrate a defect in card rendering or persistence. The candidate never crossed admission.

## Run 05 — actual execution, incomplete reconciliation

Audit: [APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-16_LIVE_RUN_05.md](../audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-16_LIVE_RUN_05.md)  
Job: `4b85fc7c-a239-478c-a455-94baf02ffdee)

The source records 50 model request/response pairs across Boss, Right-hand and Investigator roles. The reconstructed Investigator trajectory contains 30 turns: 13 successful tool actions, 11 guard-blocked actions, 5 other execution errors, and 1 HTTP error. The final captured model response at 02:59:18.761 UTC is a structured HTTP 200 proposal for another search. The available audit does not contain a verified terminal job result, final database-count poll, or post-run active-job check. The owner reported the Replit Agent ran out of credits before reconciliation finished.

Therefore:
- No candidate admission or card is evidenced in the captured Run 05 trace.
- Do not claim final durable counts or terminal state until the job is checked directly.
- Do not launch another Atlas job while this one's terminal state or active-job pointer is unclear.

## Groq structured-output failure findings

The later job recorded six HTTP 400 `json_validate_failed` responses, all with provider type `invalid_request_error`. Investigator attempts used `openai/gpt-oss-120b`, a 1,024-token completion budget, and strict `json_schema` output before retrying as `json_object`.

- At 02:50, both the strict-schema attempt and the JSON-object retry failed with Groq's generic `Failed to generate JSON. Please adjust your prompt. See 'failed_generation' for more details.`
- At 02:52 and 02:53, JSON-object retries returned structured HTTP 200 results; the proposed actions were still subject to scope authorization.
- At 02:57, Groq explicitly reported output truncation at `max_completion_tokens`, with required `findings` missing. The JSON-object retry returned a structured action.
- At 02:58, JSON-object mode returned HTTP 200 but the model proposed unsupported registry IDs `washington` and `oregon`. The runtime rejected the action locally.

The generic provider messages do not reveal the contents of Groq's `failed_generation` payload, so they do not establish whether each was invalid JSON syntax, schema mismatch, or another generation failure. They do establish provider-reported output validation failures, not authentication or exhausted-key failures. The current main code contains bounded Groq output recovery, including explicit-truncation recognition; these live records predate proof that the later recovery implementation works end to end.

## Confirmed blockers versus hypotheses

**Confirmed:** no admission/card is evidenced in the inspected run traces; both runs consumed turns on blocked actions; Run 05 had repeated provider output-validation failures; one recovered structured response failed local registry validation; Run 05 terminal state remains unknown.

**Strong hypothesis to test:** scope-guard feedback is too generic to let a model reliably repair a rejected action. The recurring message says the query must match subject, geography and source class but does not say which dimension failed. Some rejected actions omit an evident source-class phrase or active geography, while the exact intended match needs case-specific tests. This is not permission to bypass the guard.

**Not established:** that the card renderer is defective, that credentials are exhausted, that the model must be replaced, that every scope block is wrong, or that the latest application source SHA was running in Replit for every recorded request.

## Last verified GitHub Actions snapshot

At application-code SHA `4c09192d0b747635ad7fa830018d1e3d7831f47f`, these five workflows all completed successfully:

- [Atlas CI — 38845818849](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/38845818849)
- [Apex API Build — 38845818856](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/38845818856)
- [Discovery static check — 38845818865](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/38845818865)
- [Frontend five-condition gate — 38845819056](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/38845819056)
- [Five Consecutive Full Code Audits — 38845818953](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/38845818953); all five audit jobs and their steps completed successfully.

Those results apply to the cited SHA. Documentation changes advance `main`; re-check the current final HEAD and required workflows before relying on that snapshot. CI does not establish live research success.

## Required next actions

1. **Reconcile the latest launch first:** query job `0bc6087d-4070-4420-a645-ca2606549052`, active-job state, terminal events, case 2 and final durable candidate/evidence/card counts. Record timestamp and evidence. Do not launch until the job has a truthful terminal state and the active lock is idle. The prior job `8237e1a8-192a-480e-b415-78f24eb94407` is historical and recorded as failed/incomplete in the newer audit.
2. Add a mocked-request regression covering the full `callGroqJson` retry sequence, including strict-schema failure → JSON-object fallback, explicit truncation → bounded budget increase, repeated failure → bounded stop, and non-output failures that must not enter recovery.
3. Improve scope-guard diagnostics to name the exact failed dimension(s). Add tests for the observed Pacific Northwest / water-transportation query formulations, filing-source synonyms, registry IDs and URL provenance. Keep guard rejection fail-closed and no outbound request on a block.
4. Trace accepted action → outbound request → fetched page → source-bound finding → admission → persistence → card projection. Investigate card projection only if a valid candidate is shown to have crossed admission and was not projected.
5. Run focused tests, then complete release workflows on the exact current `main` SHA. No skipped, cancelled or incomplete audit job counts as a pass.
6. Conduct the next live investigation only after job `0bc6087d-4070-4420-a645-ca2606549052` and the active lane are reconciled, the relevant source fixes are present on the process actually booted in Replit, and the audit-capture configuration is verified to be off by default with a unique private per-run path only when explicitly enabled.

## Non-negotiable architecture law

Boss owns direction and role/capability selection. Right-hand provides bounded independent oversight. The selected Investigator owns research strategy, query/tool selection, pivots, corroboration, falsification and stopping. Deterministic runtime code owns authorization, outbound safety, capability availability, evidence provenance, identity/admission, durable state, cancellation, budgets and truthful terminal outcomes.

Never force a person, query, source, provider or action sequence. Never fabricate findings or cards. A blocked action is not an outbound request; a search result is a lead, not fetched evidence; a fetched page is not automatically a finding; a finding is not automatically an admitted target.

**Owner-facing conclusion:** the live model-led control loop is demonstrated. The remaining release blocker is productive, safely scoped research that yields source-grounded people who actually pass admission and become durable cards.
