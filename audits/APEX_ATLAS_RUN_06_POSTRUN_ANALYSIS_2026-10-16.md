# Apex Atlas — Run 06 Post-Run Investigation and Architecture Repair

**Review date:** 2026-10-16  
**Repository:** `2f22vtd4kr-cloud/BigContacts`  
**Branch:** `main` only  
**Run evidence:** `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-16_LIVE_RUN_06.md`  
**Pre-repair source/audit baseline:** `48f67c1f0661273fc1203e8847ea02f1ada88842`  
**Latest reviewed code/test commit before this analysis refresh:** `3c1c242a55b0f1dcdad344c95f0c0c234a4407ce`

This file is a separate review addendum. The large sequential run log and its model-request/response history are left unchanged. The log's opening metadata still describes the pre-run scaffold; its committed chronology later in the same file supersedes that stale top-level status.

## Executive determination

The no-card result was caused before UI projection. The initial Run 06 job made 12 searches and 3 visits, emitted zero findings and admitted zero candidates. The same-project post-parent snapshot recorded zero entities and zero research/contact evidence. No target-scoped investigation was reached in the parent run. That is not evidence of a card-rendering defect.

There were two primary control/design faults and one compounding operating condition:

1. **The opening research direction was silently dropped.** Boss proposed research into privately held renewable-energy Mittelstand firms in Bavaria. Right-hand returned an affirmative decision starting “Proceed with the Bavarian renewable-energy Mittelstand search...”. The code accepted only decision strings beginning with “approve” or “approved”, classified the natural-language “Proceed with...” as not approved, and omitted the approved opening pivot from the Investigator objective. The actual Investigator searched California private-equity / technology paths instead.
2. **Discovery could consume the target-stage reserve when no candidate was admitted.** The standard job's 20 Investigator-action ceiling allocated 12 actions to discovery and protected 8 for target research. If no candidate existed, the budget helper released the reserve. Discovery consequently consumed all 20 Investigator actions without a finding, leaving no target phase.
3. **The discovery handoff required too much of the target investigation in advance.** Discovery's terminal gate required two independent evidence units and an explicit falsification action, while durable lead admission separately required two role-bound source units, a realistic person-level contact-route source, and a wealth/materiality signal. This bundled target-stage corroboration, falsification, and route work into discovery. The Investigator could spend the budget searching for a target yet never hand an evidence-backed lead to target-scoped research.

The child continuation is a separate concern: it resumed the same case and later hit Groq's daily token limit. The committed audit does not include a terminal job poll or final post-child database reconciliation. **Its terminal status is unknown from the available committed record.** This analysis does not mislabel the parent’s verified failure as the child’s terminal state.

The appropriate repair is a stage boundary, not forced target selection: one exact, fetched, claim-grade source co-binding a person and role plus a source-observed ownership/control/investment clue (such as owner, founder, shareholder, beneficial owner, investor, or managing partner) can create a *review-only PersonCandidate*. Discovery does not need to prove company scale or materiality at handoff. The target Investigator owns independent corroboration, falsification/counter-evidence, business and asset materiality, and direct/indirect public/professional/intermediary route verification. This neither promotes the lead to HNWI nor asserts that it can be contacted.

## 1. What the committed Run 06 record shows

### Parent job

- Standard UI launch: `2026-10-16T11:03:40.467Z`.
- Job: `91597f90-5572-4411-8f55-f89500139f2e`.
- Discovery case: `1`.
- Request parameters included `targetCount=3`, `researchDepth=standard`, and `targetTimeoutMs=420000`.
- Terminal status: `failed / incomplete` at `2026-10-16T11:11:22.662Z`, with the message that the 20-iteration global Investigator ceiling was reached.
- Recorded discovery yield: 12 searches, 3 visits, zero findings, zero parsed candidates, and zero admitted candidates.
- Same-project post-parent snapshot: one research case, 35 case events, zero entities, zero assets, zero relationships, zero research evidence, zero contact evidence, zero research sessions, and zero research-run events. The audit later records no active job pointer at `11:11:33Z`.
- No named person was admitted or handed to the target-scoped Investigator. No card was created from the parent run.

### Child continuation

- Job: `9916dba1-a02f-4017-959e-56e0e6200043`, continuing case `1`.
- Its recorded direction returned to California business-entity/ownership searches; the two logged searches did not produce candidate findings.
- A later Investigator request was rejected with HTTP 429 for Groq's daily token cap. The message cited a 200,000-token/day limit and approximately 199,290 tokens already used, with about 3,154 requested.
- The audit does not document the child's final job poll or post-child durable counts. It remains **unreconciled**, not assumed failed or complete.

### Model activity is not a research result

The parent audit records substantial model activity, including Right-hand/Boss control responses, structured-output validation errors, a recovered token-per-minute error, accepted searches, and visits. But every inspected trajectory turn has `findings: []`. The model's final suggestion of another research angle is a hypothesis for a future investigation, not a discovered target.

## 2. Critical assessment of attempted research routes

No natural person was named in the recorded findings because no findings were emitted. I therefore cannot honestly conduct person-specific wealth or contact research on a target discovered by this run. This session's external web-retrieval tool was unavailable, so the assessment below is limited to the URLs, returned page text, queries, and model decisions captured in the audit. It is not presented as fresh external verification.

### GrowthCap private-equity-firm list

Recorded URL: `https://growthcapadvisory.com/the-top-private-equity-firms-of-2026/`

The Investigator treated this page as likely to provide founders/co-founders and a basis for discovering equity owners. The recorded search response instead surfaced a generic private-equity firm ranking alongside broad listicles and unrelated material. The page was visited/fetched, but no source-bound person/role finding emerged.

This was a weak standalone discovery path. A firm ranking does not establish that a specific natural person owns equity, has material personal wealth, or has a realistic public approach route. It could be a lead source if a concrete firm/principal emerges, but it should not absorb repeated queries by itself.

### California Secretary of State / BizFile

Recorded query paths included:
- `site:bizfileonline.sos.ca.gov "principal" "owner" "California"`
- `California Secretary of State business entity filing owner`
- `California Secretary of State business entity search boutique technology startup founded 2015..2024`

The audit records the official BizFile search page as an observed URL. A state business registry can be a legitimate source for entity officers, members, or filed documents, depending on the company type and what the filing exposes. But the search interface or a generic filing portal is a starting point, not proof of beneficial ownership, personal wealth, or contactability. The recorded actions did not yield a named, evidence-backed person.

The route is not inherently bad; the execution never progressed to useful source-bound findings. More importantly, California was not the direction Right-hand had explicitly approved at the opening. The initial scope handoff was wrong.

### California Association of Clerks and Election Officials

Recorded URL: `https://www.caceo58.org/view-all`

The observed text identifies the California Association of Clerks and Election Officials and navigation/categories such as county clerk position letters, surveys, marriage licenses/weddings, passports, and related public functions. The model hypothesized that this directory could provide named clerks as HNWI candidates and a route to their assets or business interests. The attempted page visit did not yield usable evidence.

This was a poor HNWI route. Public-service seniority or a directory listing is not evidence of wealth potential, ownership/equity, or beneficial control. The public officials’ association itself has no demonstrated reason to be a fruitful proxy for wealthy private owners. This is the clearest example in the run where targetability judgment should have demoted the hypothesis quickly rather than turning it into another search thread.

### Gallery, luxury-car dealership, and private-aviation queries

These later queries broadened away from the original opening hypothesis without a source-supported bridge to a named person. The attempted `ca_sos` registry identifier was not among the supported registry identifiers and was rejected locally. That rejection was appropriate; inventing or accepting an unsupported registry capability would not solve the problem.

There is no basis to treat these attempts as promising target discovery. They indicate drift, not a useful evidence chain.

### Bavaria renewable-energy Mittelstand

This was the approved opening direction from Boss/Right-hand, but the logged Investigator trajectory did not execute it. A private or mid-market renewable-energy operator can be a reasonable hypothesis because filings and corporate disclosures may lead to owners, shareholders, founders, or transaction participants. That does **not** make the sector automatically promising, and it certainly does not establish a named individual's wealth.

The important finding is not that the California target was definitely bad and Bavaria definitely good. It is that the system did not faithfully hand the approved hypothesis to the Investigator, so the run never conducted a fair evidence-based comparison. The correct next behavior is for models to choose and compare evidence-backed hypotheses—not to hardcode Bavaria or any other target into the application.

## 3. Code and architecture changes committed on main

All changes below were made directly on `main` after reviewing the Run 06 audit. No Replit process was launched, restarted, or operated by this review.

| Commit | Change |
|---|---|
| [`0a332bc`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/0a332bc499fd4d3654a0d4d51a2b6901b808acfa) | Recognize explicit natural-language Right-hand approvals, including “Proceed with...”, while keeping ambiguous/refused decisions fail-closed. |
| [`a15a9d2`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/a15a9d2502115d52ab38943e5a0f0a15bdb73f66) | Add regression coverage for the observed approval wording and explicit/noncommittal refusals. |
| [`121b1c6`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/121b1c67ef857ef9ea9d023d89740355a3eaca3f) | Preserve the discovery allocation and target-stage Investigator reserve even when a candidate has not yet been admitted. |
| [`6ac1fa9`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/6ac1fa9f2c5dc2f10cd83a26439b573d5acc0336) | Test standard allocation arithmetic (12 discovery actions, up to 8 target actions under a 20-action ceiling). |
| [`4531bbe`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/4531bbe0df58506ff4ab07012416d16192d6927d) | Separate discovery terminal evidence from the stricter target research gate. |
| [`8ac75ba`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/8ac75bab8a354f87e414699df0542852080e018e) | Test stage-specific terminal contracts. |
| [`eec8d89`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/eec8d89399e8883d41603b7af99c699a7b2a7b33) | Separate discovery-only lead selection/handoff guidance from target-mode prompts. |
| [`bc072cf`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/bc072cf7b13c14466aa7f113b21d49892c3e395f) | First pass on review-only admission and bounded discovery; later commits below narrow the handoff to a source-backed ownership/control clue and move materiality proof to target research. |
| [`42c0ca9`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/42c0ca9cbb1009dc907c891a294a88302d213cca) | Add discovery-versus-target prompt regression and materialization-boundary assertions. |
| [`e5772ad`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/e5772adf6bf85d107c002f1fd244d42b984f2cfa) | Prevent more Boss control calls after no-candidate discovery allocation is exhausted. Park the case rather than consume tokens deciding whether to continue work for which there is no budget or admitted target. |
| [`b0eee6e`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/b0eee6e58d4366599bd13da7be49ddd90f64a161) | Preserve the revised evidence boundaries in compact/emergency prompts. |
| [`17db5f3`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/17db5f372a8b42fd33c91414abd66171bc07b93f) | Assert that empty-budget discovery does not continue looping through Boss control turns. |
| [`f99aac7`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/f99aac7a8177c375daec694000c9de3cdc7c24e2) | Add `hasDiscoveryOwnershipLeadSignal`: the same successfully fetched claim-grade source must mention the exact person with an ownership/control/investment clue. The stricter wealth/materiality helper remains intact for later assessment. |
| [`4539313`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/453931341b9fb19f8ad8bcbc71fef32f88268808) | Make canonical review-only candidate materialization use the ownership-lead helper, leaving materiality and realistic contact-route verification to target research while keeping exact role binding and explicit model promotion. |
| [`72134e5`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/72134e51f3a4a17f3261c2796de1b2fb2edadde4) | Align full and compact Investigator prompts with the ownership-clue threshold and state that materiality, corroboration, falsification, and contact route belong to target-scoped research. |
| [`9a6b1fc`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/9a6b1fcac348b937b4880b20b6f9f2b15595cbd3) | Update the prompt/materializer source assertion to verify the ownership-clue helper. |
| [`87914de`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/87914ded5b3398487e1c17fc62c769b960cbb832) | Add direct helper tests for ownership clue without materiality, rejecting title-only employment, rejecting search/unvisited sources, and distinguishing an ownership lead from a source-backed materiality signal. |
| [`bdd9252`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/bdd925270a9caa7d5413fcd21e8f9422d34db7bb) | Clarify code documentation for the separate ownership-lead and wealth-materiality gates. |
| [`29c8701`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/29c8701d74412ea481f9cad37d4b20fad679bb0b) | Share one ownership vocabulary between review-lead admission and the stricter materiality evaluator, preventing the two gates from drifting. |
| [`3c1c242`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/3c1c242a55b0f1dcdad344c95f0c0c234a4407ce) | Align the prompt regression assertions with the explicit target-stage materiality obligation. |

### Why these changes preserve the intended AI-driven design

No target list, preselected company, fixed query set, or hardcoded investigative sequence was added. Boss/Right-hand remain responsible for model-led hypotheses and control decisions, and the Investigator remains responsible for choosing actions based on the objective and observed evidence.

The deterministic changes address interpretation of a model's explicit approval, resource boundaries, source provenance, stage separation, and safe termination. A review-only person is materialized only after explicit Investigator promotion, exact name/role binding in fetched claim-grade source evidence, and a source-observed ownership/control/investment clue. It remains a low-score `PersonCandidate` with review-only metadata, zero inferred contact confidence, and no claim to HNWI status. The target phase must establish independent corroboration, test counter-evidence, assess business/assets/transaction materiality, and discover a realistic direct or indirect public/professional/intermediary route before any wealth/contact conclusion.

If no credible lead is found by the discovery allocation, Apex should stop honestly with no target phase. It must not invent a candidate or use the reserve to discover forever.

## 4. Validation status and remaining risk

The following regression tests were committed:
- Opening approval positive/negative decisions.
- Standard discovery/target budget separation.
- Discovery-versus-target terminal contracts.
- Prompt-mode separation and review-lead materialization rules.
- No-candidate empty-budget loop prevention.
- Ownership clue without materiality versus the stricter wealth/materiality signal, with title-only and unobserved-source negatives.

**These tests were added but were not executed by this review.** A commit-status lookup for the latest code/test SHA returned no status entries; that is not proof that CI passed. Typecheck, build, API tests, static checks, and the frontend gate must be verified against the final `main` revision before calling this repair validated. No live run has been launched by this review.

Groq quota handling is still a separate operational risk. The child continuation reached an explicit daily-token cap. Rotating among model names on the same exhausted Groq account would not necessarily restore quota. Failover should use a genuinely available configured provider/capability, preserve the current research objective/evidence, and leave an auditable record; otherwise fail promptly and honestly instead of spending retries on a hard daily quota.

## 5. Gate for the next operator-launched run

Before the user launches again, verify CI on the final `main` SHA and ensure the Replit workspace/runtime actually contains that exact source revision. Record the actual process SHA and current audit destination. Then the operator may launch through the normal UI.

Judge the next run using these checkpoints:

1. Does the Investigator objective actually contain the model-approved opening direction?
2. Does discovery remain within its allocation instead of consuming target reserve?
3. Does the model find and explicitly promote any exact person/role supported by a fetched claim-grade source with a source-observed ownership/control/investment clue (not seniority alone)?
4. If a lead is admitted, does the run enter target-scoped research with unresolved questions intact?
5. Does the target Investigator continue the same person's evidence thread when ownership/counter-evidence/contact routes are promising, revisit where useful, or let the control models pivot/stop when evidence suggests a better use of effort?
6. Are contacts and any HNWI conclusion based on source-backed evidence rather than organizational prominence or seniority?
7. Do candidate/entity/evidence records, API projection, and visible cards reconcile in the same project/database?

If no person crosses the source-backed review-lead threshold, an empty card view may still be the correct outcome; the run should finish as a low-yield/incomplete investigation within its budget, not silently exhaust all resources. If a review-only PersonCandidate is persisted and the target pipeline runs, investigate any later failure at the exact transition where durable evidence diverges from research/control decisions. Do not modify the UI unless admitted and persisted records prove a projection/rendering defect.

**Current verdict:** The parent Run 06 was a failed, low-yield discovery run with a demonstrated opening-scope parser bug and linked discovery-budget/handoff design faults. The UI is not the demonstrated root cause. Narrow fixes and regression tests are committed to `main`, including a review-only ownership-lead threshold that deliberately defers wealth/materiality and route proof to target research. CI and test execution remain unverified, and the child continuation's final state remains unknown. Do not call the system ready for another live run until checks are confirmed and the operator's Replit runtime is synchronized to the revised main.

## 6. Successor validation addendum — 2026-10-16

### Revision and scope

This addendum supplements the original Run 06 analysis. It does not rewrite or replace the chronological record in `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-16_LIVE_RUN_06.md`. That sequential audit remains unchanged (blob SHA `b4a1b2029a10e54f710a9bfd4d5d755dd8955c66`, 15,345 lines). The child continuation's final state and final durable database counts remain **unknown**; no new evidence resolved them.

The code revision validated by the completed non-live gates below was `2807740435c382b45dc3d363b1f39957fb0c6368`. This review did not launch, queue, restart, or interfere with an Apex/Replit research run. No new named person or candidate was investigated by Run 06 as a result of this work.

### Architecture review and changes

Current source inspection confirmed these intended boundaries:

- Opening approval is accepted for an unambiguous affirmative such as “Proceed with the … search”, while explicit refusals and noncommittal decisions fail closed. The committed `research-objective.test.ts` covers the positive “Proceed with…” decision and negative/ambiguous examples.
- Discovery admission is a **review-only ownership lead**: explicit Investigator promotion, a successful fetched claim-grade source binding the exact full name and page-stated role, and an ownership/control/equity/investment clue observed in eligible source text. Search snippets, unvisited URLs, generic seniority, and unrelated ownership language do not qualify. Source URL, same-run binding, bounded name/role-span checks and publisher/lineage controls remain in place.
- A provisional lead is not an HNWI finding or contact conclusion. Its evidence remains `reviewOnly` / `evidence_only`; materiality, independent corroboration, falsification and practical direct/indirect route verification remain target-stage obligations.
- Discovery's own iteration allocation and target-stage reserve remain separate. With no eligible lead and no discovery allocation remaining, the controller records the exhausted allocation and stops making further Boss control calls rather than spending the protected reserve or continuing an empty loop.
- The emergency/compact discovery prompt now explicitly retains the warning against generic wealth/net-worth/private-equity-profile searches without a concrete lead, as well as the ownership clue, seniority-only, ranking/global-brand, scope, and target-stage verification boundaries. It does not prescribe a fixed target or search sequence.

Only one runtime prompt source file was changed in this investigation: `artifacts/api-server/src/src/lib/agentic-web-research-core.ts`, to preserve that anti-generic-search rule in the size-bounded prompt. The other changes in the commit series update static architecture guards and regression expectations to the approved staged-discovery contract; they do not replace model decisions with scripted research.

Commit sequence (all changes went directly to `main`):

1. `226fde7ff24c73e13120d14ee967d0bba99f6374` — aligned `scripts/check-single-canonical-discovery-control-plane.mjs`, `scripts/check-discovery-admission-strategy.mjs`, `scripts/check-discovery-context-control.mjs`, and `scripts/check-discovery-quality.mjs` with one-source review-lead admission while retaining source/run-binding requirements.
2. `7eb5036169d8f9a0ba922c0b40ec5bc6055a9e59`, `730819e2bf2dbb8d56c43783ab1c0a7f33905faf` — corrected `scripts/check-discovery-quality.mjs` assertions to the actual target-stage route contract wording.
3. `c565874830c18c9a60eb5d8e5e50e3a7fa6be83e`, `7fa9ce0811784b5fc17991f10218c030ce0e30e4` — updated `scripts/check-canonical-promotion-boundary-v2.mjs` to test review-only handoff separately from target-stage materiality/route obligations.
4. `752425597ff82df9c256a3eead3da93e0695d421` — corrected the stale two-source assertion in `scripts/check-canonical-atlas-provider-scope.mjs` without removing source/provenance guards.
5. `08d19960df46bab1c813cf7e553061051e526674`, `9adaf444d76957ec7c6ba31197bd99e3ae683772` — revised `artifacts/api-server/src/src/lib/agentic-web-research-core.test.ts` to test the bounded prompt contract and added a static guard for emergency-prompt handoff/target-stage duties; the provider-scope guard was updated accordingly.
6. `96c08ccd49730a334a7c8bc51a25e7221496f377` — updated `artifacts/api-server/src/src/lib/agentic-web-research-core.test.ts`, `artifacts/api-server/src/src/test/canonical-atlas-ownership-provenance.test.ts`, `artifacts/api-server/src/src/test/discovery-runtime-correctness.test.ts`, `artifacts/api-server/src/src/test/groq-investigator-runtime-contract.test.ts`, `artifacts/api-server/src/src/test/research-depth.test.ts`, and `artifacts/api-server/src/src/test/research-terminal-gate.test.ts` for one-source review leads, permanent target reserve, bounded discovery, and stage-specific terminal obligations.
7. `06ee448a72be90b8379fcaab19e87c8abe54094e` — updated the compact discovery prompt in `artifacts/api-server/src/src/lib/agentic-web-research-core.ts` to retain the anti-generic-search guard and aligned the current reserve-exhaustion assertion in `artifacts/api-server/src/src/test/discovery-runtime-correctness.test.ts`.
8. `2807740435c382b45dc3d363b1f39957fb0c6368` — kept compact prompt/contract wording and `artifacts/api-server/src/src/test/discovery-runtime-correctness.test.ts` budget assertions aligned with the actual source.

### Executed validation evidence

All results below are for the source revision `2807740435c382b45dc3d363b1f39957fb0c6368` (before this report-only addendum commit):

- [Apex frontend five-condition gate, run 38912239279](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/38912239279) — **success**.
- [apex-discovery-static-check, run 38912239355](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/38912239355) — **success**.
- [Atlas CI, run 38912239493](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/38912239493) — **success**. The non-live API regression suite reported **176 test files passed, 1 skipped, 177 total**; the separate Apex Finder run-status contract test reported **1 passed**.
- [Apex API Build, run 38912239436](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/38912239436) — **success**. The workflow completed the Apex/Bureau static audit suite, production boot-safety and boundary checks, API build, workspace typecheck, strict provenance/provider-cache regression tests, Groq Boss/Right-hand control-plane tests, and canonical race/continuation tests.
- [Five Consecutive Full Code Audits, run 38912239534](https://github.com/2f22vtd4kr-cloud/BigContacts/actions/runs/38912239534) — **in progress at addendum time; not a pass**. Audit 1 had completed its architecture contract suite, typecheck, build, Atlas control contract regression, ephemeral database invariants and the workflow's local smoke API test; its per-file isolated API test stage was still running. This CI smoke test is not evidence of a Replit research run.

The non-live application tests and build are now genuinely executed and green, unlike the earlier intermediate revisions. Earlier CI failures were stale source/prompt assertions exposed as the suite reached the relevant paths. The last successful Atlas CI run no longer has those failures. Do not infer an end-to-end research success from these test results.

### Unresolved facts and gate for the next operator-launched run

- The child continuation `9916dba1-a02f-4017-959e-56e0e6200043` still has no verified terminal status or final durable record counts in the reviewed audit evidence. The observed Groq daily-token-limit (HTTP 429) remains an operational risk; retries or model-name rotation on the same exhausted account are not a reliable fallback.
- No evidence proves which revision is currently running in Replit. The user/operator must verify that the actual runtime corresponds to the current `main` code before launching. This assistant has not launched a research run.
- The next run should correlate its job ID and runtime revision and capture: the approved direction as actually supplied to the Investigator; discovery and total iteration use versus the reserved target budget; successful outbound actions and fetched source observations; the exact source-bound person/role/ownership clue; review-only admission and durable evidence rows; target-stage identity/ownership corroboration, counter-evidence, materiality and route checks; final job/candidate/entity/evidence counts; API projection and visible cards; and provider/rate-limit/fallback events.
- If no lead meets the review threshold, an empty card view can be correct if the run stops within budget with auditable reasons. If a lead is admitted and persisted but does not appear in the same project's API/UI projection, diagnose that exact transition rather than assuming the UI is at fault. Do not claim a named person was found or investigated unless the new run's evidence establishes it.

**Readiness verdict at this point: conditional, not fully signed off.** The frontend gate, discovery static check, Atlas CI regression suite, and API build/typecheck are green on the source revision above. The full five-consecutive-audit workflow had not yet completed when this addendum was written, and Replit revision synchronization is not established. Hold the next operator-launched run until the full-audit workflow has a terminal green result on the resulting `main` revision and the operator verifies the runtime source SHA. After those checks, proceed with one controlled user-launched research run; evaluate the observable model-decision → tool/action → fetched evidence → source-bound finding → admission → persistence → API/UI chain. Do not call the repair end-to-end successful until that run supplies evidence.
