# Apex Atlas — Run 06 Post-Run Investigation and Architecture Repair

**Review date:** 2026-10-16  
**Repository:** `2f22vtd4kr-cloud/BigContacts`  
**Branch:** `main` only  
**Run evidence:** `audits/APEX_ATLAS_SEQUENTIAL_AUDIT_2026-10-16_LIVE_RUN_06.md`  
**Pre-repair source/audit baseline:** `48f67c1f0661273fc1203e8847ea02f1ada88842`  
**Reviewer's last code/test commit before this document:** `17db5f372a8b42fd33c91414abd66171bc07b93f`

This file is a separate review addendum. The large sequential run log and its model-request/response history are left unchanged. The log's opening metadata still describes the pre-run scaffold; its committed chronology later in the same file supersedes that stale top-level status.

## Executive determination

The no-card result was caused before UI projection. The initial Run 06 job made 12 searches and 3 visits, emitted zero findings and admitted zero candidates. The same-project post-parent snapshot recorded zero entities and zero research/contact evidence. No target-scoped investigation was reached in the parent run. That is not evidence of a card-rendering defect.

There were two primary control/design faults and one compounding operating condition:

1. **The opening research direction was silently dropped.** Boss proposed research into privately held renewable-energy Mittelstand firms in Bavaria. Right-hand returned an affirmative decision starting “Proceed with the Bavarian renewable-energy Mittelstand search...”. The code accepted only decision strings beginning with “approve” or “approved”, classified the natural-language “Proceed with...” as not approved, and omitted the approved opening pivot from the Investigator objective. The actual Investigator searched California private-equity / technology paths instead.
2. **Discovery could consume the target-stage reserve when no candidate was admitted.** The standard job's 20 Investigator-action ceiling allocated 12 actions to discovery and protected 8 for target research. If no candidate existed, the budget helper released the reserve. Discovery consequently consumed all 20 Investigator actions without a finding, leaving no target phase.
3. **The discovery handoff required too much of the target investigation in advance.** Discovery's terminal gate required two independent evidence units and an explicit falsification action, while durable lead admission separately required two role-bound source units, a realistic person-level contact-route source, and a wealth/materiality signal. This bundled target-stage corroboration, falsification, and route work into discovery. The Investigator could spend the budget searching for a target yet never hand an evidence-backed lead to target-scoped research.

The child continuation is a separate concern: it resumed the same case and later hit Groq's daily token limit. The committed audit does not include a terminal job poll or final post-child database reconciliation. **Its terminal status is unknown from the available committed record.** This analysis does not mislabel the parent’s verified failure as the child’s terminal state.

The appropriate repair is a stage boundary, not forced target selection: one exact, fetched, claim-grade source co-binding a person and role plus a source-observed wealth/materiality signal can create a *review-only PersonCandidate*. The target Investigator then owns independent corroboration, falsification, and direct/indirect public/professional/intermediary route verification. This neither promotes the lead to HNWI nor asserts that it can be contacted.

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
| [`bc072cf`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/bc072cf7b13c14466aa7f113b21d49892c3e395f) | Allow a review-only lead handoff from one fetched role-bound claim-grade source plus a source-observed wealth/materiality signal; retain durable provenance and no HNWI/contact promotion. Also keep discovery bounded. |
| [`42c0ca9`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/42c0ca9cbb1009dc907c891a294a88302d213cca) | Add discovery-versus-target prompt regression and materialization-boundary assertions. |
| [`e5772ad`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/e5772adf6bf85d107c002f1fd244d42b984f2cfa) | Prevent more Boss control calls after no-candidate discovery allocation is exhausted. Park the case rather than consume tokens deciding whether to continue work for which there is no budget or admitted target. |
| [`b0eee6e`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/b0eee6e58d4366599bd13da7be49ddd90f64a161) | Preserve the revised evidence boundaries in compact/emergency prompts. |
| [`17db5f3`](https://github.com/2f22vtd4kr-cloud/BigContacts/commit/17db5f372a8b42fd33c91414abd66171bc07b93f) | Assert that empty-budget discovery does not continue looping through Boss control turns. |

### Why these changes preserve the intended AI-driven design

No target list, preselected company, fixed query set, or hardcoded investigative sequence was added. Boss/Right-hand remain responsible for model-led hypotheses and control decisions, and the Investigator remains responsible for choosing actions based on the objective and observed evidence.

The deterministic changes address interpretation of a model's explicit approval, resource boundaries, source provenance, stage separation, and safe termination. A source-backed provisional person is created only through explicit Investigator promotion and the existing identity/role and wealth/materiality checks. It remains a low-score `PersonCandidate` with review-only metadata, zero inferred contact confidence, and no claim to HNWI status. The target phase must establish independent corroboration, test counter-evidence, and discover a realistic direct or indirect public/professional/intermediary approach route before any conclusion.

If no credible lead is found by the discovery allocation, Apex should stop honestly with no target phase. It must not invent a candidate or use the reserve to discover forever.

## 4. Validation status and remaining risk

The following regression tests were committed:
- Opening approval positive/negative decisions.
- Standard discovery/target budget separation.
- Discovery-versus-target terminal contracts.
- Prompt-mode separation and review-lead materialization rules.
- No-candidate empty-budget loop prevention.

**These tests were added but were not executed by this review.** A commit-status lookup for the latest code/test SHA returned no status entries; that is not proof that CI passed. Typecheck, build, API tests, static checks, and the frontend gate must be verified against the final `main` revision before calling this repair validated. No live run has been launched by this review.

Groq quota handling is still a separate operational risk. The child continuation reached an explicit daily-token cap. Rotating among model names on the same exhausted Groq account would not necessarily restore quota. Failover should use a genuinely available configured provider/capability, preserve the current research objective/evidence, and leave an auditable record; otherwise fail promptly and honestly instead of spending retries on a hard daily quota.

## 5. Gate for the next operator-launched run

Before the user launches again, verify CI on the final `main` SHA and ensure the Replit workspace/runtime actually contains that exact source revision. Record the actual process SHA and current audit destination. Then the operator may launch through the normal UI.

Judge the next run using these checkpoints:

1. Does the Investigator objective actually contain the model-approved opening direction?
2. Does discovery remain within its allocation instead of consuming target reserve?
3. Does the model find and explicitly promote any exact person/role supported by a fetched claim-grade source with a real wealth/materiality signal?
4. If a lead is admitted, does the run enter target-scoped research with unresolved questions intact?
5. Does the target Investigator continue the same person's evidence thread when ownership/counter-evidence/contact routes are promising, revisit where useful, or let the control models pivot/stop when evidence suggests a better use of effort?
6. Are contacts and any HNWI conclusion based on source-backed evidence rather than organizational prominence or seniority?
7. Do candidate/entity/evidence records, API projection, and visible cards reconcile in the same project/database?

If no person crosses the source-backed review-lead threshold, an empty card view may still be the correct outcome; the run should finish as a low-yield/incomplete investigation within its budget, not silently exhaust all resources. If a review-only PersonCandidate is persisted and the target pipeline runs, investigate any later failure at the exact transition where durable evidence diverges from research/control decisions. Do not modify the UI unless admitted and persisted records prove a projection/rendering defect.

**Current verdict:** The parent Run 06 was a failed, low-yield discovery run with a demonstrated opening-scope bug and two discovery/target-stage boundary issues. The UI is not the demonstrated root cause. Narrow fixes and regression tests are now committed to `main`; CI remains unverified, and the child continuation's final state remains unknown. Do not call the system ready for another live run until CI is confirmed and the operator's Replit runtime is synchronized to the revised main.
