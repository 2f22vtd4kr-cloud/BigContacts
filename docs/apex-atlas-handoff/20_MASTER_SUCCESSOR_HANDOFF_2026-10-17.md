# Apex Atlas — Master Successor Handoff (17 October 2026)

> **Current run-preparation override — 2026-10-19 (takes precedence over older audit-path instructions below).** Read the actual GitHub `main` HEAD and current PR/CI state before operating; do not assume any SHA below is current. The checked-in `.replit` and API artifact config now leave raw prompt capture, contact-value capture, and visible-file opt-in **disabled by default**. The configured private destination is `.local/audits/APEX_ATLAS_MODEL_AUDIT.jsonl`; `.local/` is Git-ignored and the runtime path guard explicitly permits `.local/audits/` without enabling visible `audits/` writes.
>
> For one controlled canonical development run that needs a detailed diagnostic trace, explicitly enable `APEX_CAPTURE_MODEL_PROMPTS=true` and set `APEX_MODEL_AUDIT_FILE=.local/audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-19_CANONICAL_RUN_01.md` (use a new run-specific filename for every run). Keep `APEX_MODEL_AUDIT_ALLOW_VISIBLE_FILE=false` and `APEX_CAPTURE_MODEL_PROMPTS_IN_TEST=false`. Enable `APEX_MODEL_AUDIT_INCLUDE_CONTACT_DATA=true` only for that authorized run when exact public professional-contact attribution must be inspected; otherwise keep it false. Credentials must still be redacted, provider-private reasoning must remain excluded, and the raw trace must never be committed or copied into a tracked audit. Record a separate sanitized chronological report in the active tracked audit.
>
> **Most recent known live-run blocker:** `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-18_FRESH_PROJECT_RUN_03.md` records canonical launch job `718ed715-aa6d-43c9-916f-463371485ad8` at 18:36:08 UTC and the final saved model response at 18:37:38 UTC, with zero admitted candidates/findings in the visible discovery state. The tracked audit does not record the job's final terminal status, post-run durable case/evidence/admission/card counts, or a post-run active-lock check. **Before any new launch, the operator must read-only reconcile that job and the active Atlas lock on the actual Replit runtime.** Do not assume it is finished or idle from the audit's last line, and do not launch concurrently. This chat does not access or operate Replit.
>
> Do not reuse the generic audit file across runs or blindly run `scripts/restore-private-atlas-run05-audit.sh` for a new numbered run; that restoration script belongs to the historical 17 October pre-launch audit. Before launching, confirm the deployed Replit source/build actually contains current `main`, verify health/build/DB/Redis and that no active job or stale lock exists, and verify the effective per-run audit path. After UI launch, require a real job/case ID in the first post-launch model-audit record; jobless preflight/test telemetry is not run evidence.
>
> **Purpose:** continue the live-run → evidence-based review → root-cause fix → live re-run loop until Apex Atlas is demonstrably operational. This handoff is an entry point, not a substitute for studying the repository. The repository's executable source and the newest user-supplied audit outrank every dated summary below.

## 0. Current state at handoff

- Repository: `2f22vtd4kr-cloud/BigContacts`; canonical integration branch: `main`.
- Last verified `main` baseline at the start of this work: `16ed16943c8815bb02285c33b86ad96786550cc0` (“Keep test telemetry out of private Atlas audit traces”). A follow-up PR from this handoff work may advance `main`; always fetch the actual latest HEAD before acting.
- The product is **not live-accepted**. The critical acceptance gap is not that the architecture lacks sophisticated components; it is that live work has not yet demonstrated a consistently productive trajectory that produces source-grounded people, passes deterministic admission, and creates truthful durable cards.
- Do not claim this next live run passed or failed until the terminal job state and durable evidence are inspected.
- The user will perform the Replit launch and supply the sequential audit. Do not claim to have launched Replit or inspected runtime state unless tools/evidence actually establish that.
- The user explicitly requires this loop to end in a fully operational product, not an indefinite succession of speculative changes. Make the smallest evidence-backed root-cause fix, prove it with regression coverage and required gates, then run the next controlled live test. Do not invent a new architecture or scripted research itinerary.

## 1. Mandatory architecture and repository study — do this before diagnosing

First read `docs/AGENT_REPOSITORY_STUDY_PROTOCOL.md` in full and obey it. Record the actual current `main` SHA, inspect recent commits, inspect the current worktree/branch state available to you, and identify the newest *actual* live-run audit. Do not assume the newest dated file is live evidence: classify its phase and whether requests have real job identifiers.

Then read these canonical documents in order:

1. `README.md` — current orientation and explicit non-acceptance boundary.
2. `docs/context.md` — living architecture, runtime/deployment truth, current pointers.
3. `docs/BUREAU_REACT_ARCHITECTURE.md` — role law and model-owned ReAct boundary.
4. `docs/RUN_BUREAU.md` and `docs/REPLIT_NEW_ACCOUNT_SETUP.md` — supported launch and deployment process.
5. `docs/CURRENT_STATUS_2026-10-15.md` — valuable detailed prior-run evidence, but it predates the 17 October preflight audit; treat its run counts and links as historical until verified.
6. `docs/APEX_ATLAS_VERY_STRONG_ROADMAP.md` and `docs/APEX_RESEARCH_GAUNTLET_V1.md` — intended capability/quality direction and evidence criteria.
7. This handoff, plus the newest local sequential audit supplied by the user.

Study source rather than trusting documents. Trace these paths end to end:

- API boot / Replit workflow / build stamp / health / database / Redis / active job and lock state.
- UI launch → canonical Atlas launch route → durable job/case creation → Boss → Right-hand (when justified) → Boss-selected Investigator capability → model-selected action → guard/capability validation → actual outbound tool execution → source observation and provenance → evidence graph / research intelligence → candidate identity and attribution → deterministic admission → durable write → UI card/Reactor projection → terminal job status.
- Prompt construction and compaction across Boss, Right-hand, and Investigator. Track which fields are preserved, dropped, summarized, or repeated. Verify scope, exclusions, source-class/capability options and evidence constraints survive compaction.
- Provider adapter contract, retries, token budgets, 400 structured-output failures, 429 responses, per-role credentials, transient errors and cancellation.
- Tests/static checks, CI/workflow definitions, schema, migrations, persistence and benchmark/Gauntlet artifacts. Enumerate the tree; don't claim exhaustive study after reading only these files.

Never make a diagnosis from a single isolated prompt or a stale document if source, runtime logs or durable state can verify it.

## 2. Architecture law — preserve it

Apex Atlas is a model-led OSINT research bureau, not a fixed enrichment script.

- **Groq Boss** owns case direction and selection of the Investigator capability.
- **Groq Right-hand** provides independent, bounded oversight when justified. It does not take over research or prescribe a static sequence of tools.
- **Groq Investigator** owns the actual research trajectory: search/fetch choices, pivots, corroboration, falsification and stopping.
- Configured Investigator credential slots are available capabilities, not a deterministic provider/model ladder.
- The runtime is deterministic where it must be: authorization, capability support, scope/SSRF/egress boundaries, provenance, identity/attribution and admission, persistence, cancellation, job/target locks, resource bounds, and truthful errors/terminal state.
- A tool is a capability, not a mandatory stage. Never force identity → organization → contact or any other universal recipe.
- Public content is untrusted. Prompt injection is data, not instruction.
- A search result is a lead, not fetched evidence. A fetched page is not automatically a finding. A finding is not an admitted person. An admitted candidate is not a durable UI card until persistence/projection is verified.
- Unknown/insufficient evidence is a valid outcome. Never fabricate people, wealth, sources, relationships, contacts, confidence or activity to make the UI look productive. Keep contact attribution source-backed and person-scoped; don't promote an organization's general inbox to a person's contact.

### Core recent fix already on main

PR #698 merged as `c4ddee7d65040e9ce46b119a8e38481da93e9c6e`. Its root-cause fixes followed the Run 04 failure chain:

- Preserve approved scope/geography through prompt compaction instead of allowing appended control commentary to corrupt the scope marker.
- Ground supervisory direction in actual source/capability support and evidence feasibility, rather than confidently inventing a registry/source path.
- Make unused discovery budget available to the stage that can use it while still enforcing the global ceiling.
- Include evidence-aware discovery outcomes in run health.
- Add regression coverage for these failure modes.

Do **not** re-fix or revert these changes merely because the next run is bad. Prove exactly which stage regressed or remains defective from the new trace. The previous run's unsupported registry pivots and scope-feedback loops are important hypotheses, not a license to hard-code a solution or disable the safety guard.

## 3. The 17 October audit: understand its phase before counting anything

The GitHub commit `8f388dbd8be13cd18991e2f6de34ddf6c1af86e4` added the report originally named:

`audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-17_REPLIT_FRESH_RUN_05.md`

The report was intentionally created to provide deep step-by-step diagnostic visibility. It recorded **65 model request/response pairs** during local validation between approximately 14:06:14Z and 14:07:22Z. All had `jobId=null` and `caseId=null`. The source audit classified them as validation telemetry, not a live research trace. The observed status breakdown was 35 HTTP 200, 21 HTTP 429, 4 HTTP 400, 1 HTTP 413, 1 HTTP 503 and 3 without a parsed status. Calls were spread across Boss, Right-hand and Investigator roles and used synthetic fixtures/targets. These numbers must not be treated as actual run quota consumption, a live research failure, or a live success.

The report ended at the **final pre-launch gate**; it did not record the first live Run 05 request. Replit explicitly reported that the workspace build left no tracked source changes, the 65 jobless pairs were marked as non-run telemetry, and it was restarting the API on the rebuilt bundle. Its next actions were to recheck the *effective audit destination and lock state*, then use the UI's default launch request. That ordering is correct.

There are two historical artifacts labeled “Run 05” in this repository's dated material:

- The **16 October** Run 05 artifact refers to a separate job `4b85fc7c-a239-478c-a455-94baf02ffdee`, with 50 model pairs and 30 reconstructed Investigator turns; terminal reconciliation was not available in that report.
- The **17 October Fresh Run 05** artifact is the new pre-launch/validation sequence described above.

Do not conflate their job IDs, counts, turn histories, terminal state, or conclusions. For the upcoming live execution, continue the 17 October sequential audit unless the user explicitly starts a distinct numbered attempt.

### Preserve the user's audit; don't erase its context again

The report in commit `8f388db...` was removed from the *current main tree* by `16ed169...` because it contained raw prompts and diagnostic trace data. This did **not** erase the earlier public Git commit/history. More importantly, do not interpret that repository-hygiene fix as a request to suppress diagnostics or discard the user's preflight narrative.

The configured destination in current Replit development settings is:

`private-audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-17_REPLIT_FRESH_RUN_05.md`

Before launch, run `bash scripts/restore-private-atlas-run05-audit.sh`. This one-time script prefers the existing workspace report (preserving uncommitted operator notes), falls back to commit `8f388db...` if that path is absent, places it in the ignored destination, preserves any existing destination bytes without duplicating a shared prefix, refuses a non-ignored path and prints line/byte counts. Check the output and inspect the report's final section before launch. Do not rerun it as a generic step for later numbered runs. Then continue appending sequential observations. Do not commit, push or attach the private audit to a public PR. `/private-audits/` is in `.gitignore`.

The development config explicitly opts into detailed contact-bearing evidence in this private ignored trace. It still redacts credential-shaped secrets and excludes separate provider-private reasoning fields. The audit-capture follow-up also preserves sanitized visible unstructured completions (previously only their lengths were retained) and a bounded excerpt for an invalid outer provider response, so malformed output and gateway failures are diagnosable. The log should show actual model-visible prompts, visible completions/actions, tool choices, provider errors and transport outcomes—not hidden reasoning tokens that the model API does not return as normal message content.

## 4. Audit capture: what it does and how to read it

Current configuration enables `APEX_CAPTURE_MODEL_PROMPTS=true` only in development and writes to the private audit path above. The recent telemetry hygiene change is `16ed16943c8815bb02285c33b86ad96786550cc0`:

- test-mode telemetry cannot contaminate the run trace without the separate test-only opt-in;
- the audit directory is created when needed;
- Replit no longer targets a tracked public `audits/` path;
- the old report was removed from the current public tree, not the earlier Git history.

The audit records request IDs, role/provider/model, attempts, job/case identifiers, model-visible messages, response-format/schema and tool definitions, visible structured output/tool calls, latency/status and provider/transport errors. Credentials remain redacted. Contact data can be retained only under the explicit local development opt-in because it is directly relevant to checking attribution/admission.

**Do not overclaim the logger:** separate provider-private fields such as `reasoning_content` are deliberately excluded; GPT-OSS contract hardening uses `include_reasoning:false` and does not ask the provider to return private reasoning. Treat visible model decisions/rationales, prompts, action JSON, guard feedback and source evidence as the auditable trace. An audit logger is diagnostic instrumentation, not proof that the runtime is correct.

A request/response pair with null job IDs is not a job-bound research pair. Label it as one of: preflight, test/fixture, startup or live-job, based on explicit evidence. Do not infer live job identity from timestamps alone when IDs and durable job state can be checked. Match response to its request by the shared request ID. Account for retries as attempts, not as separate successful research decisions.

## 5. Pre-launch checklist — all before clicking Run

1. Refresh current `main` and the run-preparation PR merge SHA. Confirm Replit is built from that source revision. `/api/healthz` returning 200 by itself is insufficient: the prior incident had an older process responding while the new API workflow had failed. Inspect the API workflow process/build stamp and startup logs as well as health.
2. Confirm exactly one canonical API workflow/process owns port 8080; do not kill a sibling workflow blindly. The boot script intentionally refuses to kill a process already owning the port.
3. Verify effective development environment values safely (never print secrets): capture enabled, audit path exactly as above, contact-retention opt-in enabled, and environment is development. Verify `private-audits/` is ignored and the report exists with the prior preflight content.
4. Recheck health, DB and Redis readiness, current active job/target lock/Atlas lock through the supported UI/API routes and `docs/RUN_BUREAU.md`. Ensure no earlier job is still active and no stale lock points to another job. Do not infer provider capacity from the mere presence of configured credentials.
5. Confirm the API is running the newly rebuilt bundle after the restart; inspect the actual job/run identifiers returned by the UI/backend.
6. Launch via the UI's normal default path. The 17 October gate recorded this default as `POST /api/ingest/atlas-run` with `{"targetCount":3,"researchDepth":"standard","targetTimeoutMs":420000}`. Don't bypass the UI or silently change defaults without a clear reason.
7. Immediately verify the audit's first *post-launch* model request has a real non-null `jobId` once the job exists, and match its response by request ID. If all subsequent events remain jobless, stop and diagnose instrumentation/launch lifecycle instead of pretending the research engine ran.
8. Do not run a second concurrent Atlas job. Append an observation in the audit before each consequential recovery or restart.

## 6. Review protocol once the user supplies the live audit

The reviewer must reconstruct chronology, not just summarize totals.

For each consequential step, record timestamp/order, role, model, request ID/attempt, job/case ID, prompt/context that mattered, visible model action/rationale, Right-hand/Boss decision, guard decision and exact block dimension, tool/provider call, raw returned result/HTTP status, observation/finding emitted, persistence/admission outcome, and resulting state. Distinguish **proposed action**, **authorized action**, **actual outbound request**, **returned source**, **accepted evidence** and **durable candidate/card**.

Start with a phase table:

- workspace/build/health preflight;
- model validation/fixture calls (jobless);
- actual UI launch;
- first job-bound model request;
- Investigator trajectory and every pivot/retry;
- findings/evidence/admission;
- terminal state and post-run durable counts;
- post-run active-job/lock check.

Then follow this failure chain from the first missing link:

`launch accepted → job/case created → model receives correct context → valid structured action → action passes correct guard → outbound capability runs → reliable source/page returned → source-bound observation/finding → correctly resolved named person/entity → attributable relationship/contact if available → admission → durable insert/card projection → truthful terminal outcome`.

Classify the first root cause precisely: preflight/stale build; job/lock/launch lifecycle; prompt/context compaction; Boss direction; Right-hand oversight; structured output/provider contract; unsupported capability; overly broad/wrong guard; search/source access; fetch/redirect/content quality; evidence/identity resolution; attribution/admission; persistence; UI projection; resource ceiling/cancellation; or telemetry defect.

Do not label a downstream stage broken before a candidate reaches it. If there are no accepted source observations, card rendering is not the leading hypothesis. If there are credible findings but no admission, inspect identity/provenance/admission. If the DB records the admitted card but UI misses it, then inspect projection.

Treat provider errors truthfully: 429 is rate-window/provider capacity unless the response proves a different cause; 400 structured-output errors are provider contract/generation failures; blocked actions are not outbound requests; unsupported registry IDs are a model/runtime capability-boundary issue; a process/build issue is not a research-quality result. Do not count validation requests as quota drained by the live job.

## 7. What counts as operational acceptance

A static test or green build is necessary but not enough. One clean run alone also does not prove broad OSINT superiority, but the following is the immediate live acceptance gate:

- Replit runs the intended current build, the UI launch is accepted, and one identifiable job owns the full trace through terminal state.
- Boss, Right-hand and a Boss-selected Investigator capability execute with the intended role separation. The audit can explain what each visible model request asked and what action/output came back; no missing request/response chain is ignored.
- Model choices are productive and adaptive: the trajectory includes accepted, relevant searches/fetches and source-specific pivots, not endless repetitions or guard-feedback loops. All guard blocks remain fail-closed and their exact reasons are understandable from the trace.
- Returned evidence is real, source-attributed and tied to the intended entity. Named people/relationships are supported by public sources; contact claims are properly scoped and attributed. Unknown values remain unknown.
- Candidate admission is justified from its evidence, and the database/card projection reflects the same canonical durable state. No synthetic frontend “research activity”.
- Provider/tool/system errors, retries, timeout/cancellation, resource limits and stopping are reported truthfully. The job ends in an intelligible terminal state, and final durable counts/active-lock state are checked.
- Findings, admissions/cards, source quality, precision, useful pivots, unnecessary calls and failure modes are reported separately. Never reduce research quality to a single vague “smartness” score.

A legitimately negative research result can be correct if sources truly do not support a person. However, recurring inability to find sources because the model gets bad context, invalid capabilities, unproductive searches or generic guard feedback is an engineering failure, not calibrated abstention.

## 8. The run → review → fix loop (finite, evidence-led)

1. **Run once, with a valid trace.** The user operates Replit; the reviewer checks build provenance, live job ID and final durable state.
2. **Find the earliest divergence.** Identify the earliest point at which correct research progress stopped. Use exact prompt/output/guard/tool/source evidence, not a plausible story.
3. **State one root cause and a falsifiable test.** Quote the request/event and the source branch involved. Explain expected vs actual behavior. If several hypotheses remain, use targeted tests/log checks to separate them before changing code.
4. **Reproduce in a regression test.** Cover the real context/response/guard sequence, including failure and recovery paths. Keep public-source provenance and fail-closed boundaries intact.
5. **Make the smallest complete repair.** Do not patch downstream symptoms. Do not broaden permissions, disable guards, force static itineraries, invent data, switch providers as a shortcut or redesign stable architecture without evidence.
6. **Run the relevant focused tests, typecheck/build and required Bureau/research-quality checks.** Review actual CI for the exact PR/merge SHA. In-progress, skipped, cancelled, stale-SHA or failed workflows are not passes.
7. **Merge only when the fix is reviewed and gates needed for that change pass.** Confirm the resulting SHA and files on `main`.
8. **Run again on that merged source.** Reconcile the active job before another launch. Compare failure location and output to the previous audit.
9. **Stop changing code when the acceptance gate is met.** Preserve the working baseline and record the evidence. Don't invent additional “optimizations” just to keep the loop going.

If the next real run fails, deliver a critical diagnosis plus the tested fix and a concise bottom line. Do not ask the user questions already answered in the audit, and do not promise later/background work. If the current trace is insufficient, name exactly what observation is missing and the single check that would establish it.

## 9. Current known history and cautionary lessons

- Run 04's actual job `e0730630-a845-4b1e-9086-d9e27a77319f` ended failed/incomplete after 20 Investigator iterations, with zero findings/admissions/cards. Its control loop executed searches/tools, but that isn't end-to-end research acceptance. An earlier workflow restart failed before boot; a later restart did succeed. Both phases must remain in chronology rather than collapsing the whole attempt into “never launched”.
- Historical 16 October Run 05 job `4b85fc7c-a239-478c-a455-94baf02ffdee` has 50 model request/response pairs / 30 reconstructed Investigator turns, with successful actions mixed with guard blocks/errors, but terminal reconciliation was missing in its report. Re-query job and durable state when authorized/available; do not assume it equals the 17 October fresh audit.
- The 17 October audit's 65 jobless validation pairs include many 429 responses. Because they have no job IDs and were marked preflight telemetry, do not call these evidence that a live research job drained quota.
- The 17 October public report had initially been committed on GitHub. Removing it from current `main` did not rewrite Git history. Keep subsequent raw research/prompt traces private and ignored; don't let privacy hygiene become an excuse to remove their diagnostic value.
- Do not repeat the previous review error of treating an intentionally detailed preflight audit as if the user did not want detail. The correct response is to separate phases rigorously and keep full model-visible telemetry useful and intact.

## 10. Operating principle

**The goal is not a prettier audit or a green checklist; the goal is a reliable, evidence-grounded OSINT bureau.** Preserve the model-led architecture, make runtime failures visible, fix confirmed root causes, and verify the result through a real controlled Replit investigation. Stop the loop when the live acceptance criteria are actually satisfied—not before, and not after endless speculative tuning.
