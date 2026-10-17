# Successor Handoff — Apex Atlas / Replit Fresh Run 02
**Prepared:** 17 October 2026 (UTC)  
**Repository:** https://github.com/2f22vtd4kr-cloud/BigContacts  
**Canonical branch:** `main`  
**Latest HEAD verified when this handoff was written:** `9ba9f1441789b716b13e1f7d68ecc8dc1c50d910`  
**Required next task:** Study Apex Atlas itself, then critically analyze `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-17_REPLIT_FRESH_RUN_02.md`.

This handoff is orientation, not a substitute for the repository study or for the raw audit. Verify all moving facts again at the start of the next session.

## 1. Immediate assignment

The next agent must **first study the Apex Atlas repository and its active implementation**, and only after that conduct an independent critical analysis of the most recent Fresh Run 02 audit:

- [Sequential audit — Replit Fresh Run 02](../audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-17_REPLIT_FRESH_RUN_02.md)
- [Existing Fresh Run 02 post-run analysis](../audits/APEX_ATLAS_REPLIT_FRESH_RUN_02_POSTRUN_ANALYSIS_2026-10-17.md) — useful prior analysis, but treat it as a hypothesis/checklist, not authoritative truth.
- [Fresh Run 01 post-run analysis](../audits/APEX_ATLAS_REPLIT_FRESH_RUN_01_POSTRUN_ANALYSIS_2026-10-17.md) — previous failure pattern and prior remediation.
- [Mandatory repository study protocol](AGENT_REPOSITORY_STUDY_PROTOCOL.md)
- [README](../README.md), [living context](context.md), [current status](CURRENT_STATUS_2026-10-15.md), [canonical ReAct architecture](BUREAU_REACT_ARCHITECTURE.md), and [operational run procedure](RUN_BUREAU.md).

Do not merely summarize the existing post-run report. Read the audit chronology and relevant source code, verify each diagnosis against the exact source revision and tests, locate missing evidence, query current job/ledger state only through safe read-only paths if available, and decide whether additional fixes are warranted.

## 2. Repository study is mandatory, not optional

Follow the complete ordered study sequence in `docs/AGENT_REPOSITORY_STUDY_PROTOCOL.md`; do not claim that the repository has been studied after reading the README and a few files.

At minimum:

1. Verify current `main` HEAD, recent commits, worktree/repository state available to you, and the current audit/report inventory. The repository is moving: do not reuse this handoff's SHA or CI claims without checking them.
2. Read README, current-status/context documents, the current override in `docs/apex-atlas-handoff/19_MASTER_SUCCESSOR_HANDOFF_CURRENT_2026-10-02.md` (discover the exact current path in the tree if it changed), the architecture/roadmap/release review, the operational runbook, and the deployment/import contract.
3. Inventory the full repository tree, then trace the canonical live path from CTA/API launch through Boss, Right-hand, Investigator, action parsing/validation, outbound execution, observations/evidence, findings, candidate admission, durable persistence, and frontend card projection.
4. Read the relevant implementation, schemas, migrations, tool/provider adapters, scope and registry guards, objective-compaction code, recovery/quota logic, all directly related regression tests, scripts, and workflows.
5. Compare documentation with implementation and determine which source revision the Replit audit actually used. A checked-in commit is not proof that the Replit workspace imported it.

Use the architecture law as the invariant: **Boss owns direction and capability selection; Right-hand provides independent bounded oversight; the selected Investigator owns research actions and strategy; deterministic code enforces authorization, scope, identity, source provenance, admission, persistence, cancellation, budgets, and truthful terminal states.** Do not turn fixes into a scripted target, sector, geography, provider, query, tool order, or forced card.

## 3. What the current record says — verify it independently

At the previously checked HEAD, `9ba9f1441789b716b13e1f7d68ecc8dc1c50d910`, the existing post-run analysis reports:

- **Attempt 1**, job `b350d50b-24ab-4f8b-892f-1b52fe32d563`, terminal failed; `inserted=0`, `skipped=0`, `errors=0`; 8 searches, 2 visits, 0 model findings and 0 parsed candidates.
- The Ohio Secretary of State official page returned HTTP 403; treat that as a failed fetch, not evidence. An Indiana result snippet mentioned EarthWay Products, but was not fetched and did not bind a person to an ownership clue; it remains a lead only.
- **Attempt 2**, job `84d92f22-2481-434a-9c6c-c68c787d8737`, is **not terminally reconciled in the checked-in audit snapshot**. The captured audit ends after a model response at 03:13:33 UTC that selected a single-registry action using `oregon_sos`, which is not among the supported registry IDs. Do not infer the job's current status or final ledger counts from that last response.
- No evidence in the report demonstrates that a valid candidate passed admission but failed to render as a card. The card-rendering hypothesis is unproven until the canonical evidence/admission/persistence chain demonstrates a person crossed the appropriate gate.

The audit itself records its starting source as `772ca535d06952b550b680b5c48176829c64325a`. The existing post-run report was written at `ef91b31267567c88c44496f125771d128ede598d`; source changes have since advanced. Read the current source and verify exactly which changes are in each revision before attributing a runtime behavior to the newer code.

## 4. Source fixes already on current main — inspect, don't assume

The current head `9ba9f1441789b716b13e1f7d68ecc8dc1c50d910` includes follow-up changes after the audit and its initial report. The commit message is `fix(atlas): preserve compact scope and validate registry IDs`. It modifies:

- `artifacts/api-server/src/src/lib/agentic-web-research-core.ts`
- `artifacts/api-server/src/src/lib/agentic-web-research-core.test.ts`
- `audits/APEX_ATLAS_REPLIT_FRESH_RUN_02_POSTRUN_ANALYSIS_2026-10-17.md`

The existing post-run analysis states that the source changes:
1. improve emergency scope compaction, preserving the substantive subject/geography instead of producing a malformed scope such as `pacific nort`;
2. validate single `registry_search` IDs against the supported/configured registry catalog, aligning that boundary with parallel registry search; and
3. add regressions for the observed compaction and unsupported registry-ID patterns.

Earlier current-main remediation addressed vague pivot placeholders and subject/source-class scope alignment. Confirm the actual diffs and tests yourself. Do not treat this handoff or the post-run report as substitute evidence.

At the time of writing, all five release workflows were successful on HEAD `9ba9f144...`:
- [Atlas CI](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/39000261798)
- [API Build](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/39000261826)
- [Frontend five-condition gate](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/39000261880)
- [Discovery static check](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/39000261796)
- [Five consecutive full code audits](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/39000261799)

Recheck these against the current HEAD before relying on them. They demonstrate those CI gates passed for that revision; they do **not** show the Replit runtime has imported the code or establish live research acceptance.

## 5. Required audit analysis

Read the entire sequential audit, including its append-only later events—not only the opening setup notes. Preserve the chronology and distinguish:

- preflight/static checks from live model calls;
- HTTP 202 launch acceptance from actual job success;
- a model-proposed action from an action permitted by validators;
- a guard block from an outbound request;
- a search result/snippet/URL lead from a successfully fetched source;
- a fetched page from a claim-grade named-person finding;
- a finding from explicit promotion/admission;
- admission/persistence from card projection;
- provider-format errors, token-per-minute/token-window failures, hard daily quota exhaustion, and unsupported tool/registry IDs.

Explicitly reconcile Attempt 2's terminal job state, active-lane pointer, case status/events, and relevant durable counts for entities/assets/contact evidence/research evidence/relationships/admissions or their canonical equivalents. Use read-only inspection. If the current API/database/runtime cannot be reached, record that as a blocker; do not guess the terminal state. Compare audit-observed timestamps and job IDs to the runtime so that records from a different Replit project/database are not conflated.

Investigate the emergency compaction path and single-registry validation against both the model prompt and action dispatch. Test whether the fixed code preserves scope constraints, rejects unsupported registry IDs *before outbound execution*, and lets a supported in-scope action proceed. Look for any other guard/source-of-truth mismatch revealed by the audit. Do not fix a symptom by broadly disabling safety enforcement.

## 6. Operating constraints

- **Never launch, queue, replay, restart, kill, or otherwise initiate a live Apex/Replit research run. The user/operator alone launches live runs.** A new launch is not part of this assignment.
- Do not manually rotate Investigator keys or replace a selected Investigator. Preserve only the application's existing durable Boss-directed reassignment path after its required typed quota classification; TPM, token-window, malformed structured output, HTTP 403, unsupported registry, and generic tool failures are not interchangeable.
- Do not fabricate a candidate, force a promotion, weaken evidence/admission gates, or insert a card to make the UI appear successful.
- Do not expose the service publicly. The repository's current deployment notes say operator authentication is disabled; publicly reachable operational endpoints are a risk.
- Keep the sequential audit append-only. Put interpretation and remediation in a separate post-run analysis or engineering commit; do not rewrite the operator's chronological record.
- `main` is canonical. Commit repository changes directly to `main`, in narrow commits with tests. Do not reset back to a historical branch.
- Never claim the Replit process is running the new revision without a direct source/runtime revision verification.

## 7. Expected output from the successor

Finish with a concise but evidence-backed report organized as:

### Verified
Current repository HEAD, audit identity and run/job IDs, attempt terminality, actual executed tool/source observations, admission/card counts, current deployment/source-revision evidence, and the exact CI results inspected.

### Critical findings
Root causes in priority order, evidence for each, what is a contributing issue versus a proven cause, and which questions remain unresolved.

### Changed
Exact paths, diff/commit links, and the behavior each change corrects. If no code change is justified, say why.

### Tested
Exact commands, tests, workflows, revision SHA, and outcomes. Separate locally executed checks from GitHub Actions.

### Runtime / Research
What is known about the current Replit runtime and durable records. Explicitly state whether any live run was launched by the agent (it should not be).

### Blockers and next action
Only the concrete remaining blockers, with one recommended next operator step. Do not recommend another live run until Attempt 2 has been reconciled read-only, fixes are verified on the source actually imported into Replit, and the operator chooses to launch.

**Success is not a green build or an accepted launch.** The relevant product proof remains a real fetched source that binds an exact person's identity and role to a credible ownership/control/investment clue, followed by supported promotion, durable evidence/admission, and a reconciled card projection. Preserve uncertainty at every missing link.
