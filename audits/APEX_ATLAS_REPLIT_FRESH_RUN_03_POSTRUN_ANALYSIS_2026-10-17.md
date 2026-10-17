# Apex Atlas — Replit Fresh Run 03 Post-Run Analysis

**Date:** 17 October 2026  
**Run audit:** [APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-17_REPLIT_FRESH_RUN_03.md](./APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-17_REPLIT_FRESH_RUN_03.md)  
**Audit source revision:** `3857c62d5d0bd9c7094b3e7f277264fe78425b2b`  
**Scope:** This report supplements the append-only chronological audit; it does not rewrite it or start a new live run.

## Verdict

**The failed run is an upstream research-execution/prompt-continuity failure, not evidence of a broken card renderer.** Four discovery slots ended with one `UNEXPECTED_ERROR` and three `ITERATION_BUDGET` results. Across the run, the audit records 5 search queries and 24 result URLs, but zero successful source visits, model findings, parsed candidates, durable evidence rows, entities, contact evidence, or cards.

The research never reached the admission/materialization boundary. A card cannot be expected when no successfully fetched claim-grade source co-binds a real person's exact name, role, and ownership/control/investment clue.

## What happened

- Four discovery slots ended with no candidate or fetched claim-grade source.
- The trace records 4 successful search actions and 7 preflight scope blocks that made no outbound request.
- The first slot failed during prompt composition. The other three exhausted their iteration budgets.
- Search-result URLs remained unvisited. The Investigator repeatedly chose search actions rather than a retrieval action; the liveness reminder was advisory and did not force a tool order.
- The initial Boss scope named the Midwest. The parser did not map the broad region to its member states, so otherwise relevant Illinois/Indiana/Ohio/Michigan queries could be rejected as geographically out of scope.
- The audit's control review also shows Boss/Right-hand describing ownership information as lacking after blocked actions. A blocked request is not a real-world negative result; no source page was fetched to establish that conclusion.

## Root causes and remediation

### 1. Search leads could disappear from the next model-facing prompt

The durable trajectory stored `leadUrls`, but the regular context compactor did not include them in compacted records. The emergency prompt tail also omitted the lead URLs and only carried a compact view of the latest action. A later blocked action could therefore push the last successful search's actionable URLs out of the model's working prompt.

Fixed on `main`:
- Preserve structured lead URLs explicitly in the regular recent/archived Investigator context, clearly labelled as un-fetched leads.
- Preserve the last successful search and its URLs in the final prompt tail when no successful same-scope fetch has followed it, even if the newest act was blocked.
- Keep that carry-forward scoped to the active Boss pivot. The compact prompt tail now suppresses prior-pivot URLs and the follow-up cue when those URLs do not belong to the current scope.
- Include a non-binding cue to consider inspecting a promising, in-scope lead when that has higher expected information gain than another search.

### 2. Boss/Right-hand were not given structured unfetched leads

The control report projected the last Investigator actions into `openQuestions` without the structured `leadUrls` field. The control-report compactor also omitted that field. This meant oversight models could see `visits=0` and scope-block events without a compact, explicit list of URLs the Investigator had already found.

Fixed on `main`:
- Successful search/registry results now reach the control report as `unfetchedLeadUrls`, explicitly separated from fetched `observedUrls`.
- The compactor retains up to two leads per recent action; both Right-hand and Boss prompts explicitly distinguish a preflight block, a search-result lead, and a successful visit with observed page content.
- The prompt forbids using a blocked request as evidence that a registry or sector lacks ownership information, while leaving the control model free to choose a justified next action.

### 3. Midwest geography was parsed as a literal phrase, not a region

The geography parser already knew the Pacific Northwest aliases, but had no Midwest alias. It could treat “Midwest US” as one required literal geography phrase, failing member-state queries. The parser now expands Midwest/Midwestern to the standard twelve-state Midwest set and common city aliases, while retaining scope enforcement and rejecting an out-of-region query such as Texas.

### 4. Prompt composition had a final run-ending failure path

The source contained a terminal `throw new Error` when all prompt-compaction tiers still exceeded the calculated provider ceiling. That path could terminate a discovery slot instead of falling back to a minimal prompt. The final tier now emits a compact prompt that retains the active scope, action/provider/schema contracts, lead-versus-evidence distinction, discovery admission rule, and terminal evidence/falsification gate rather than throwing.

The audit identifies a prompt-composition exception but does not expose its exact exception message or stack. This change removes the identified deterministic throw path; the available audit alone cannot prove that exact statement was the exception raised in the failed slot.

### 5. Evidence/provenance gates remain intact

The full scope-guard function already treats URLs returned by an aligned successful search as eligible retrieval leads. It still blocks a guessed/unobserved URL, and search-result URLs remain non-evidence until the page is actually fetched. That existing behavior is now covered by a regression test; no evidence or admission gate was relaxed, and no target/card was forced.

### 6. The 429 was not the cause of zero visits

The captured Groq response classified the limit as tokens-per-minute (TPM), with request capacity still available. Retrying the same Investigator capability succeeded with HTTP 200. There is no evidence that changing API keys would have fixed this run.

## Commits on `main`

The remediation is split into small, directly committed changes:

- [`d953315` — preserve search leads and recover compact prompts](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/d953315f841ff0f5cebee21e946f431d2fe195cd)
- [`18ba445` — cover Midwest scope and prompt recovery](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/18ba445e7e027cbe2077049e95f2e7f7f703cc90)
- [`47f89b1` — retain search leads in compacted context](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/47f89b1b556f31b01fc767428de3767f1067390e)
- [`d95acda` — test compacted lead continuity](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/d95acda936a7e26e8946347ed54e505b58245827)
- [`4c5d1d7` — document lead continuity and blocked-action semantics](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/4c5d1d7019fe2ecf4a42d940457966a0581e0100)
- [`fed1939` — keep carried search leads within the active pivot](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/fed19390eb4b3cbe80d6b025b0ad9966c61a92b9)
- [`9d37e50` — test active-scope lead continuity](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/9d37e50ab98fbd9ed7286dd98baff19c4f6464b6)
- [`2594d07` — retain terminal gates in the final prompt fallback](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/2594d0791e7003b227d7118d9c468d7094e08385)
- [`88db526` — surface non-binding lead follow-up guidance](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/88db526745b77949b871f1bd13ae69862af5e0cb)
- [`6c4ab2f` — test follow-up guidance survives compaction](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/6c4ab2fb67e0bb2ea1268d59d7f2a3133734781d)
- [`eef6ccf` — protect lead-versus-guessed URL guard behavior](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/eef6ccfcf248e58f58dea222fc0eff69502064af)
- [`836a424` — correct compact prompt line formatting](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/836a424a42b04b540a0d955edddf400210c09d4a)

- [`0f438f6` — expose unfetched leads to the control plane](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/0f438f69b322c74504a74c1450781353cde6b94e)
- [`1b2409c` — retain leads in Boss and Right-hand context](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/1b2409cc16527fea63180772b9c21f87cfc2cc2e)
- [`e7c326e` — test the control-report and prompt lead path](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/e7c326ebc8d3647287ecabb3b96b28c29ac27fda)

- [`3d31113` — type control-trajectory lead URLs explicitly](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/3d3111352cca3de4239aec9ec37419a213af06c4)
- [`088fd9f` — suppress prior-pivot URLs in the active prompt tail](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/088fd9f532553d21616c6638b94b57b2287649a4)
- [`6fb2946` — test that superseded-pivot leads are not carried as active follow-up](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/6fb2946c77ecc2df86f7853a5dc9ffe1a5bdea59)

## Validation status and next gate

Regression tests have been added for Midwest/member-state matching, rejecting out-of-region queries, retaining the last same-scope successful search's URLs after a blocked action, preventing superseded-pivot lead carryover, preserving search leads in ordinary context compaction, keeping oversized prompt composition from throwing, allowing an observed lead URL while rejecting a guessed URL, and retaining unfetched lead provenance through the Right-hand/Boss control report and prompt compaction.

**The tests have not been executed in this session, and no CI status is available for the latest remediation commits. Do not treat the code as test-verified or start another live research run yet.** Before the next operator-run, verify that the Replit workspace has imported the current `main` HEAD, run the API server's `test`, `typecheck`, and `build` scripts, and check their actual results. Do not rotate the Investigator key just for the captured TPM response.

Do not edit this chronology to make the previous attempt look successful. Judge any next run using fetched source visits, exact name/role/ownership co-binding, explicit review-only promotion, durable admission, and final card/evidence reconciliation—not HTTP 202 or search-result counts.
