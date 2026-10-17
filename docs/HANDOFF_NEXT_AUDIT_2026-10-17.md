# Apex Atlas — Successor Handoff for the Next Audit

**Written:** 17 October 2026  
**Repository:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Canonical branch:** main  
**Repository HEAD observed while preparing this handoff:** 8ba3208860f7bf6f3c5d45406a8ce8c3352861c0  
**Primary purpose:** Prepare the next ChatGPT session to audit Apex competently, study the actual system before changing it, and diagnose the next supplied live-run audit from evidence.

This is a continuation guide, not a claim that the next run has already happened. Refresh all repository, CI, and runtime facts before acting.

## 1. The non-negotiable operating rules

1. **Do not launch, queue, replay, restart, kill, or otherwise initiate or interfere with a live Apex/Replit research run.** The user/operator launches live runs. Review supplied audits, inspect GitHub and code, make and test necessary repository changes, and tell the user exactly what is and is not verified.
2. Make repository work directly on canonical branch main, consistent with the user's established workflow. Before writing, verify current HEAD and whether another commit landed. Never force-push, reset main to an old milestone, or overwrite an append-only audit.
3. Do not hardcode a target, sector, geography, search query, provider, registry path, tool sequence, or card. Apex's Investigator owns research strategy. Deterministic code protects authorization, scope, safety, source provenance, identity, admission, persistence, cancellation and resource budgets.
4. Do not weaken evidence or admission gates merely to create a card. Never fabricate people, observations, source URLs, contact details, progress, Reactor events, successful tests, CI outcomes, or run results.
5. Do not treat a blocked action as a web request, a search-result snippet as fetched evidence, model prose as a finding, an admitted candidate as a persisted card, or green CI as live-research acceptance.
6. Do not infer a UI/card-rendering defect unless evidence shows a candidate crossed the admission/persistence boundary and then failed to project. Trace the complete chain before assigning blame.
7. Never expose provider keys, database credentials, cookies, tokens, private contact values, or hidden model reasoning. Capture observable structured outputs and typed failures only, with redaction.
8. Be exact about source/deployment identity. A GitHub main commit does not mean Replit is running it. Verify the actual deployed/imported revision from evidence; if unavailable, say so.

## 2. Mandatory Apex study — do this before proposing code changes

Apex is a substantial research system. A shallow read of the README or prior handoff is not enough. The repository itself is the engineering source of truth. Follow the full protocol at:

- https://github.com/2f22vtd4kr-cloud/BigContacts/blob/main/docs/AGENT_REPOSITORY_STUDY_PROTOCOL.md

Read that protocol first and follow its current-state precedence and study sequence. At minimum:

1. Fetch actual main HEAD and recent commit history; inspect worktree/repo status and GitHub Actions for that exact SHA.
2. Read README.md, docs/CURRENT_STATUS_2026-10-15.md, docs/context.md, the current override at the top of docs/CHATGPT_AGENT_HANDOFF_2026-09-21.md, docs/BUREAU_REACT_ARCHITECTURE.md, docs/APEX_ATLAS_VERY_STRONG_ROADMAP.md, docs/APEX_ATLAS_CEO_RELEASE_REVIEW_2026-09-20.md, docs/RUN_BUREAU.md, and docs/REPLIT_NEW_ACCOUNT_SETUP.md. Read the current override at the top of docs/apex-atlas-handoff/19_MASTER_SUCCESSOR_HANDOFF_CURRENT_2026-10-02.md; its historical body must not override current source or newer evidence.
3. Enumerate the entire repository tree. Inspect source, tests, schema/migrations, scripts, workflows, prompts, benchmarks, deployment files, frontend and docs. Record large/generated files and distinguish source-of-truth from generated output.
4. Trace the actual runtime path end-to-end: process entry → startup → DB/Redis/job lock → route → case/job creation → Boss → Right-hand → Investigator selection and action → tool execution → observation → research intelligence/evidence → candidate promotion/admission → persistence → terminal state → frontend/Reactors projection.
5. Separately trace the benchmark/Research Gauntlet path: registry and schema → launcher → raw artifacts → validation → scoring → failure observatory → CI/release interpretation.
6. Read the relevant implementation and tests before changing anything. For scope/pivot issues, inspect current versions of:
   - artifacts/api-server/src/src/lib/agentic-web-research-core.ts
   - artifacts/api-server/src/src/lib/agentic-web-research-core.test.ts
   - artifacts/api-server/src/src/lib/research-objective.ts and research-objective.test.ts
   - artifacts/api-server/src/src/lib/atlas-control-decision.ts
   - artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts
   - artifacts/api-server/src/src/lib/agentic-web-research.ts
   - artifacts/api-server/src/src/lib/research-intelligence-engine.ts
   - artifacts/api-server/src/src/lib/bureau-agentic-pass.ts
   - artifacts/api-server/src/src/lib/discovery-agent-admit.ts
   - artifacts/api-server/src/src/lib/provider-error-diagnostics.ts and the Groq Investigator adapter/tests.
7. Compare documents to executable source. If a document or chat summary conflicts with current code, preserve the discrepancy and investigate it. Do not silently reconcile facts in favor of the documentation.
8. Run targeted regression tests first, then the appropriate architecture/static/typecheck/build/CI gates. Record exact commands, commit SHA and outcomes.

Do not claim exhaustive repository study unless you actually followed the protocol and can state which traces and gates were inspected.

## 3. What Apex is supposed to be

Apex Atlas is a model-led public-source research bureau, not a scripted enrichment pipeline.

- **Groq Boss:** directs the case and selects the Investigator capability.
- **Groq Right-hand:** independently reviews bounded control decisions; it does not browse as Investigator or choose research tools.
- **Selected Groq Investigator capability:** chooses research hypotheses, queries, tools, pages, pivots, continuation and stopping.
- **Deterministic runtime:** enforces scope, safety, authorization, provenance, identity attribution, evidence/admission, persistence, cancellation, resource and terminal-state integrity.

Tools are capabilities, not mandatory stages. Keep the research route adaptive. Preserve public-source-only research; exact attribution; independent corroboration where required; organization-vs-person contact scope; visible uncertainty and contradictions; and honest typed failure states. A missing answer can be correct. A made-up answer is not.

Legacy docs/audits may mention Gemini or Mistral in old role designs. Current canonical architecture on main is Groq Boss + Groq Right-hand + the Boss-selected Groq Investigator capability. Confirm against current source rather than reviving historical wiring.

## 4. Fresh Run 01 — what the supplied audit actually established

The user supplied an attachment named “★ STARRED — Apex Atlas Sequential Audit — Replit Fresh Run 01.md”. It is a chronological audit from a fresh Replit project. The repository contains a separate post-run analysis:

https://github.com/2f22vtd4kr-cloud/BigContacts/blob/main/audits/APEX_ATLAS_REPLIT_FRESH_RUN_01_POSTRUN_ANALYSIS_2026-10-17.md

Read both the new audit attachment and the post-run report. Do not confuse this run with historical runs numbered 04–08 in the repository.

The audit records Replit imported application source snapshot a5e7ca5987058968539f53c0545fe60d46d14af3. This is older than the main remediation commit referenced above. The running Replit revision was not proven to be the current main head.

### Attempt 1 — provider quota

Job: 328feb72-7e0c-4670-b3a9-32b771cd94e3.

- The operator submitted one UI-equivalent discovery request: targetCount=3, researchDepth=standard, targetTimeoutMs=420000; no singleTargetId or chosen target.
- Some searches executed, but the only recorded page visit was not a useful target source. No findings/candidates/cards were produced.
- Groq explicitly reported tokens-per-day (TPD) quota exhaustion. This was a daily token quota, not an invalid credential and not a transient tokens-per-minute burst.
- Boss and Right-hand stopped; no manual or silent Investigator key rotation occurred. This was correct under the architecture.

### Attempt 2 — vague pivot and guard blocks

Job: df700205-6577-4ca7-bcf9-d15a9cca8ec3.

- A first scope for Illinois private manufacturing firms near Chicago via the Illinois Secretary of State was accepted by Right-hand.
- The control loop later activated a vague pivot: “Shift to a sector-specific, geography-focused discovery approach (e.g., identify private mid-size firms in a chosen region and locate their registered owners via public corporate registries).”
- The concrete subject/geography existed only as vague placeholders/examples; “a chosen region” was not an executable research scope.
- The Investigator chose Austin/manufacturing queries but repeatedly failed the required source-class contract; the parser also treated procedural words such as “shift”, “discovery approach”, “chosen”, and “geography-focused” as subject anchors. Six actions were blocked before outbound execution.
- The terminal report records zero executed searches, zero visits, zero findings, zero candidates, zero result URLs, and zero inserted cards. A later proposed registry ID texas_sos was unsupported and did not reach the external provider.
- Therefore this run does not demonstrate a card-rendering defect; the evidence/admission chain never started.

## 5. Remediation present on main — inspect rather than assume

Commit observed: 8ba3208860f7bf6f3c5d45406a8ce8c3352861c0  
Message: “fix(atlas): prevent vague pivots from deadlocking scoped research”

Commit link:
https://github.com/2f22vtd4kr-cloud/BigContacts/commit/8ba3208860f7bf6f3c5d45406a8ce8c3352861c0

The commit includes:
- rejection of unresolved scope placeholders such as “a chosen region”;
- separating procedural wording from subject anchors;
- retaining explicit geography/source-class/exclusion checks even when substantive subject is left open;
- additional registry/registration source-class synonyms;
- clearer Boss and Right-hand direction requirements;
- regression tests for the vague-pivot pattern and its guard/control behavior;
- a separate Fresh Run 01 post-run analysis file.

Current Actions at the time of handoff preparation showed Atlas CI, API Build, the frontend five-condition gate and the discovery static check passing on 8ba3208860f7bf6f3c5d45406a8ce8c3352861c0. The “Five Consecutive Full Code Audits” workflow was still in progress at last check:
https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/38992656796

Refresh all checks, do not assume that workflow is still in progress or passed. None of those checks is proof of live research success.

### Important unresolved main-vs-Replit discrepancy: TPD classifier

Do not assume the reported Replit TPD-classifier patch is already merged to main. In the current main version inspected while preparing this handoff, artifacts/api-server/src/src/lib/provider-error-diagnostics.ts still has a safeString helper that truncates values to 80 characters and providerErrorCode checks generic daily quota/request wording, but the visible regex does not explicitly include “tokens per day” / “TPD”. That may leave the exact reported Groq error incorrectly classified when the distinguishing phrase appears after a long prefix.

This is a code-inspection observation, not a full adapter-level reproduction. Confirm the actual classifier call path, provider response body handling, tests, and relevant commits. If the issue remains, port the bounded local-parsing fix onto main with regression tests matching the observed Groq body shape. Return only stable diagnostic categories; do not log or persist raw provider text. Preserve the distinction between daily token quota, tokens-per-minute/window capacity, invalid structured output, and transport/tool failures. Do not authorize model/key rotation except through the existing typed, durable, Boss-directed reassignment path.

## 6. How to audit the next run

When the user supplies the next audit, read its full contents. If attached as a very large file, use the Files tools to retrieve relevant sections rather than assuming the initial preview is complete. Keep the chronological audit and later analytical report separate.

Build a chronological, evidence-backed ledger with job IDs, case IDs, timestamps, roles/capabilities, exact action proposals, guard outcome, whether outbound execution occurred, actual URLs fetched, source observations, model findings, admission events, durable row counts and final job state. Distinguish direct observations from interpretation. Explicitly reconcile discrepancies between job summary, event ledger, tool trajectory, database and UI.

For every failed attempt, classify the exact layer:
1. boot/config/revision/audit logger;
2. active job/lease or database/Redis;
3. model request/structured schema/parse;
4. Boss/Right-hand authorization and pivot quality;
5. local action validation/scope guard;
6. outbound tool/provider execution and result quality;
7. fetched source observation and evidence binding;
8. named-person finding / promotion / candidate admission;
9. durable card/entity/evidence persistence;
10. front-end API polling and projection.

Do not summarize all non-successes as “provider problem” or “no card bug”. These are different failure boundaries.

A successful action is not necessarily productive. Check whether returned URLs align with the approved scope, whether pages were actually fetched, whether page text binds the exact person and role, whether ownership/control/investment is supported, whether the proposed person is realistic to approach through a public/professional/intermediary channel, and whether admission requirements actually passed. Preserve negative evidence and uncertainties.

## 7. Current concrete next steps for successor

1. Refresh main HEAD, history, tree, worktree/branch state and Actions. Confirm the current audit is the newest real attempt; do not rely on the historical pointers in README.md or docs/CURRENT_STATUS_2026-10-15.md without re-checking.
2. Read the supplied next audit fully and compare it with Fresh Run 01's audit/report.
3. Inspect main commit 8ba3208 and its regression tests, then verify the Replit workspace source revision before attributing the fix to a live run.
4. Resolve the main-vs-Replit TPD classifier discrepancy described above. Never claim it is fixed until source and regression tests prove it.
5. Determine why a card is absent by following actual execution → source observation → finding → admission → persistence → UI projection, not by guessing.
6. Apply minimal fixes with tests if the evidence demonstrates a defect. Avoid architecture rewrites or looser scope/evidence boundaries.
7. Commit to main according to the user's established workflow, preserving all source history and original audit chronology. Write a separate post-run analysis rather than overwriting the sequential audit.
8. Do not launch a live Replit job. Give the user a precise operator-run gate/checklist after code and CI verification.

## 8. What a good final review must report

Use clear sections:

- **Verified:** directly observed run facts and exact revision/CI state.
- **Root cause:** supported by the event sequence and source, separating confirmed causes from hypotheses.
- **Card path:** the last stage reached and evidence that proves it; do not claim rendering broke unless admission/persistence data supports that.
- **Changed:** exact source/tests/docs and commit SHA.
- **Tested:** exact targeted and broader test commands/results; explicitly identify incomplete CI workflows.
- **Runtime/deployment:** what revision Replit actually ran, active-job/health/schema/provider state, and what remains unknown.
- **Next operator action:** one concrete instruction, never an implied live launch by the assistant.

The standard is truthful progress, not a green-looking story. Apex must demonstrate a real public-source-backed person and durable card before an end-to-end live success can be claimed.
