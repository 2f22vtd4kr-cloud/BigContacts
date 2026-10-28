# Apex Atlas first-card recovery — sequential audit (2026-10-27)

Status: **IN PROGRESS**. This is the live audit for the attempt to obtain the first real, source-backed company card through the canonical Atlas run path. Do not treat this document as evidence of a successful run until a database/API/UI read verifies a persisted card.

## Mission and invariants

- Complete one canonical run through the normal Atlas launch/control/research/card projection path; no synthetic cards, no direct database insertion to fake a result, no hardcoded target outcome.
- A successful, source-attributed public web search may create a **review-only company lead card** from the real organization name and source evidence, even if later Boss/Right Hand control or deeper research fails. The card must disclose whether its source is only a search result or a fetched page.
- Keep the two product card classes distinct: company/business and person/HNWI. A partial person/role lead is not automatically an HNWI.
- Preserve the model-owned Investigator/control architecture, canonical job ownership, provenance, evidence lineage, cancellation and admission safeguards.
- Discovery must be source-diverse and objective-driven. Companies House is one registry among many, not the default for every objective. Source choice remains model-led using the capability registry and available providers.
- A card must communicate source, claim/evidence tier, why it appears, connections, confidence/unknowns, and next verification needs. Generic corporate contact routes and distinctive but public professional/intermediary routes must be visibly distinguished.
- Collect only public, relevant professional/business contact routes. Do not infer wealth or relationships; do not surface private personal numbers from incidental spa/casino records or non-public intimate details.
- Audit exact prompts, model-visible outputs, tool calls/results, provider errors, source URLs and public source-backed data, decisions with concise rationale, DB/evidence IDs, fixes and test outcomes. Never record provider secrets or private hidden chain-of-thought. Record model-visible content and concise decision summaries instead.

## 1. Incoming audit evidence — prior 11 runs

The user supplied the following run summary. It is treated as supplied audit evidence, not independently re-verified in this attempt.

1. `5351b367-3c09-4b00-90a7-939e7420299d`: standard, targetCount=3; phase 1 began with Boss `openai/gpt-oss-120b`, Investigator-1 and Right Hand; Midwest family-owned manufacturing focus; searches/pages executed; repeat visit blocked; unfinished phase 1, zero cards.
2. `3141ca7f-c70e-4784-ba0f-0980f5f1d348`: deep, one target; Boss failed `CONTROL_PROVIDER_RATE_LIMIT`; fail-closed, zero cards.
3. `faf61c58-0c35-49c2-a5ea-b48c3ef7c720`: retry; Boss unavailable after bounded same-role fallback; zero cards.
4. `b23e99f5-b6ef-4bd7-8244-4415ec9e4d02`: restart attempt; API restart lacked Bash-inherited `DATABASE_URL`; infrastructure/setup failure, zero cards.
5. `a627345c-69e7-4a38-bfe4-d4166b7a0bce`: deep, one target; credential fallback loaded, reached phase 3; Boss failed `CONTROL_PROVIDER_RATE_LIMIT`; zero cards.
6. `c460f3d8-f4e5-42f3-81d8-804d399f02cf`: source fallback edit not bundled into `dist/index.mjs`; invalid Llama fallbacks removed after catalog inspection; build/deployment-state failure, zero cards.
7. `2732ccf2-02cc-4c7c-a34b-3202713b9169`: discovery completed and phase 3 began; dedicated Right Hand credential unavailable; fail-closed, zero cards.
8. `ca6b1209-20a8-416e-9d48-2975b2fad9cc`: Boss and Right Hand completed; Investigator-1 quota exhausted; Boss reassigned to Investigator-2, whose token capacity was also exhausted; breaker parked case, zero cards.
9. `91d2892c-e905-422a-9092-7994a445d7c4`: repeated Investigator token-capacity exhaustion; one-reassignment limit stopped recovery; zero cards.
10. `2ce7b7ba-ff6b-4448-8269-c53d2bde4b40`: productive discovery using Investigator capabilities 1, 2, 7, 8, 20b; Companies House searches, filings/directory fetches and parse recovery; next Boss control turn failed `CONTROL_PROVIDER_RATE_LIMIT`; zero cards.
11. `a71c261d-d6a1-4255-9084-4351c93c166a`: live searches, page fetches, registry attempts, parse recovery and Investigator-7 evidence accumulation; failed closed in phase 3 with `CONTROL_PROVIDER_RATE_LIMIT`; zero cards.

Supplied totals: 11 canonical runs; 10 deep recovery runs; real research activity and Companies House evidence activity; no synthetic/directly inserted cards; zero confirmed naturally admitted cards. Primary reported blocker: repeated Groq token/rate limits at Investigator and Boss/Right Hand turns. Five cards in `audits/apex-atlas-live-run-sequential-audit-2026-10-27.md` are from a separate earlier sequence and are excluded.

## 2. Repository/runtime identification

- Repository: `2f22vtd4kr-cloud/BigContacts`, default branch `main`.
- A user-editable Replit app titled `BigContacts` was found at `https://replit.com/@hadserolkijuhte/BigContacts`; its last reported update was 2026-07-23. Its connection to the current repository, branch/commit, runtime secrets, database and deployed version is **not yet verified**.
- A task to inspect/sync the workspace, repair canonical behavior, run the canonical flow and verify the first card was submitted to the Replit agent. The task is asynchronous; no success is claimed from submission alone.
- Work branch created: `apex-atlas-first-card-2026-10-27`, based on the then-current `main`. This audit file is intentionally visible in the repository and is not intended for an ignored/private location.

## 3. Code inspection — verified facts

### Canonical launch and reconciliation

- The canonical HTTP launch is `POST /api/ingest/atlas-run` in `artifacts/api-server/src/src/routes/research/canonical-atlas-launch.ts`.
- The launch starts `runCanonicalAtlasPipeline` under `withProviderScope`, responds asynchronously with a job ID, and in its `finally` path calls `reconcileOrganizationReviewCardsForJob(jobId)` and `reconcilePersonReviewCardsForJob(jobId)`.
- Organization and person review-card reconciliation is in `artifacts/api-server/src/src/lib/research-lead-card-reconciliation.ts`. The code intentionally creates review-only `Corporation` cards for supported organization-name leads and `PersonCandidate` cards for supported person/role leads; those states do not imply wealth/HNWI status.
- The reconciliation code checks exact job ownership and source URLs, records `researchSessions` and `researchEvidence`, and invalidates entity/dashboard caches after writes. It is not supposed to manufacture a target from no evidence.
- `artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts` has checkpoint-based materialization for explicit model findings, plus terminal reconciliation of durable case events. Projection errors can be logged and deferred, so a durable event is not itself proof a card was materialized.

### Concrete potential failure boundary found during inspection

- Organization reconciliation builds candidate names from model findings, typed registry `companyLeads`, page-identity metadata, and (for search results) a source-domain label.
- It then requires a matching source URL and an exact-name span in the corresponding observation text before persisting the review card.
- Search-result URLs from aggregators/search endpoints are deliberately excluded from claim-grade evidence. A result set can therefore contain successful web activity while producing no card if the event payload lacks the exact source-attributed company name/snippet shape that reconciliation expects, if URLs are absent/mismatched, or if ownership/terminal reconciliation fails.
- This is a hypothesis for the zero-card outcome, **not yet the proven root cause** for the 11 supplied runs. The run event payloads and DB write logs must be inspected before attributing causality.
- The distinction between a search-result lead and fetched-source evidence is valuable and should remain explicit; the fix should correct evidence capture/projection, not weaken provenance into arbitrary URL/name admission.

### Discovery source diversity

- The canonical system exposes a registry/capability catalog and model-owned action selection. Companies House should be one available source rather than a fixed first move. The audit must capture the actual selected action/query and the reason it matched the objective.
- The supplied runs show repeated Companies House use, but this alone does not prove a deterministic Companies House bias. The actual prompts, model outputs, capability availability and tool-selection trajectory are needed to distinguish prompt bias, source-selection policy, runtime availability, and model preference.

## 4. Live attempt log

| Time (UTC) | Event | Result |
|---|---|---|
| 2026-10-27 | Read current canonical launch/reconciliation source files from GitHub. | Verified canonical route and review-only card reconciliation code. |
| 2026-10-27 | Located existing Replit app `BigContacts`. | App exists; current workspace/repo/runtime binding remains unverified. |
| 2026-10-27 | Submitted a Replit Agent task to inspect/sync current main, correct source diversity and review-card persistence, test and run canonical launch. | Asynchronous update submitted; not yet verified. |
| 2026-10-27 | Created this visible audit on branch `apex-atlas-first-card-2026-10-27`. | Branch exists; audit records current state and unknowns. |

## 5. Success criteria — all required

- [ ] Establish which source tree/commit is actually running; build/deploy current source rather than stale `dist/index.mjs`.
- [ ] Confirm required database and Redis configuration without printing credentials; verify Redis URL permissions/connection safely.
- [ ] Run one canonical launch through the same path the UI uses; record job ID and exact launch options.
- [ ] Capture model-visible prompts/outputs and concise decision summaries; record actual selected search provider, query, result URLs/snippets, page fetches, registry choices and provider error classes.
- [ ] Observe at least one genuine successful web search with attributable public organization name and source URL.
- [ ] Verify the review-only company card and its evidence/session rows exist in the canonical database and are reachable through the normal dashboard/entity API and UI read path.
- [ ] Verify card type, source URLs, evidence hierarchy, limitations and non-fabricated fields.
- [ ] Run relevant unit/contract/static checks and record exact results.
- [ ] Update this audit with every correction and result. Do not mark success until every success criterion above is satisfied.

## 6. Credentials and audit hygiene

Credentials supplied in the conversation are intentionally not copied into this public audit. Use only environment variables or the app's secret manager; log presence/availability and redacted provider error metadata, never raw secret values. Public-source text/contact information may be logged when it is relevant to the review card and lawfully public; avoid recording irrelevant personal or intimate data. Model-visible prompts and outputs are auditable; private hidden chain-of-thought is not recorded.

## 7. Findings and next actions

1. Verify the current Replit workspace and runtime are actually based on the current canonical repository. If not, align the workspace with `main` without overwriting unrelated user work.
2. Inspect one supplied run's durable `research_cases` / `research_case_events` and logs to identify why real search activity did not produce an organization review card.
3. Add a regression test using a real-shaped successful search observation (company name + snippet + result URL) and a provider/control failure after that observation. Expected: a source-backed, explicitly review-only company card persists; no HNWI is inferred.
4. Ensure discovery prompt and action availability favor objective-relevant source diversity, with no unconditional Companies House-first sequence. Keep strategy model-owned.
5. Fix only the proven code/config/build/runtime causes, run tests, then launch and verify the first real card end-to-end.


## 8. Code correction made on the work branch

### Confirmed projection gap

The canonical checkpoint path `materializePartialOrganizationLeadCards` previously gathered only `observedUrls` and only accepted `visit` / `browser_fetch` observations. That means an Investigator finding grounded in a successful web-search result could not become a partial company card at the checkpoint, even if the search result had a real source URL and the exact company name in the search observation. This is a confirmed limitation of the checkpoint path. It is **not yet proven to be the sole cause of zero cards in all 11 supplied runs**, because the prior run payloads have not yet been inspected.

The separate terminal reconciler can recognize search-result leads, but it depends on the exact durable event payload, result URL eligibility, source-name binding and terminal ownership. It is not equivalent to a checkpoint that preserves a grounded company lead immediately after a successful search.

### Change set

Branch: `apex-atlas-first-card-2026-10-27`

- Modified `artifacts/api-server/src/src/lib/canonical-atlas-discovery.ts`:
  - Checkpoint projection now reads successful `web_search`, `parallel_web_search`, `registry_search`, and `parallel_registry_search` results from `leadUrls`; fetched pages continue to use `observedUrls`.
  - It still requires the exact company name to occur in the actual observation text and the cited URL to be claim-grade and to match the finding's source URL. No card is created from a finding alone.
  - Search-only support is labelled `search_result_lead` / `unverified_search_result`, receives lower confidence/freshness, and explicitly says the underlying page, ownership, materiality, wealth and person route remain unverified.
  - If a fetched source supports the same claim, the support is upgraded to `fetched_source` rather than downgraded.
  - Existing job/case ownership checks, serializable transaction, review status, evidence/session writes, identity collision guard and cache invalidation remain in place.
- Added a regression contract in `artifacts/api-server/src/src/test/research-lead-card-reconciliation.test.ts` to require search-result lead handling and evidence-tier separation.

### Verification state

- [ ] CI/build/test results for this branch.
- [ ] Run against the current deployed/runtime workspace.
- [ ] Inspect a real search trajectory and confirm the finding name, observation snippet and lead URL bind exactly.
- [ ] Confirm database entity/evidence/session IDs and normal API/UI visibility.

No card has yet been verified from this code change. Do not treat the change or the test assertion as proof of successful runtime behavior.


## 9. Source-selection correction and CI status

Updated `artifacts/api-server/src/src/lib/apex-bureau-orientation.ts` on this branch:
- Versioned the institutional prompt contract as `2026-10-27.1`.
- Added source-selection guidance based on expected information gain, subject jurisdiction and objective anchors, not registry availability.
- Explicitly states that Companies House is UK/Great Britain-specific and is not a substitute for US state Secretary-of-State filings.
- For unanchored local/sector/opportunity discovery, ordinary web search is often a higher-value first action; a registry can still be first when the task has a matching jurisdiction/entity/identifier/filing hypothesis.
- Kept the strategy model-led: no fixed source/provider sequence and no forced use of every source class.

Added a regression contract in `artifacts/api-server/src/src/test/research-lead-card-reconciliation.test.ts` to guard the source-selection rule and the one-search company-lead projection.

### CI for earlier revision (commit `0b1d9ce7a6a44632ff0c080c2f988a5f35e5b87f`)

- Apex API Build: passed, including workspace typecheck, API build, lead-card regression tests, provenance tests, discovery pivot tests, Boss/Right-hand control tests and canonical race/continuation tests. Run ID: 40515463050.
- Apex Prompt Architecture Audit: passed. Run ID: 40515463002.
- Apex Research Quality Contracts: passed. Run ID: 40515463159.
- Discovery static check: passed. Run ID: 40515463070.
- Netlify deploy preview for the PR: success. This preview does not prove that the API/database run is live.
- Full consecutive codebase audits were still in progress at the time of this entry. A later source-selection change has been committed since this CI run and requires its own green checks.

### Runtime limitation remains

The editable Replit app lookup reports `BigContacts`, last updated 2026-07-23. Its publish-status check reports `found=false` (no published deployment). Two Replit Agent update requests were submitted asking it to sync to this branch, rebuild from source, check configuration, launch one canonical run, and verify the normal database/API/UI path. The connector returned an asynchronous `updating` state but subsequent status queries returned no textual progress; the app's last-updated timestamp did not change. Therefore this is not evidence that the workspace was synced or that a run occurred.

No actual run job ID, search query/provider response, database entity ID, evidence ID, or UI-visible card has been verified by this attempt so far. The first-card objective remains open.


## 10. Full-audit failure and correction

The full API audit workflows completed Audit 1 and failed in the isolated test-file step; Audits 2–5 were skipped as designed. Both failed on the same pre-existing assertion in `groq-investigator-runtime-contract.test.ts`: the test expected the phrase “topic/company terms,” while the actual scope-recovery prompt says “topic terms and company terms.” The runtime prompt still preserves the intended rule and the failure was a literal wording mismatch, not a provider/runtime failure.

Changed that assertion to match the existing prompt wording without changing prompt behavior. This correction is now committed on the work branch and has its own fresh CI run pending. References: Five Consecutive Full Code Audits run 40515463160; Five Green Complete Codebase Audit run 40515463170. Both Audit 1 failures were otherwise after successful install, architecture contracts, typecheck/build, DB schema setup and live smoke API test.


## 11. Follow-up verification: prompt budget regression found and corrected

Timestamp: 2026-10-27, during the follow-up CI cycle.

- PR #759 remained open/unmerged. Head before this correction: `3aa72741ce290a03b15a4eee03b954047fcafd0e`.
- API build/typecheck passed, but the focused API regression suite failed in `agentic-web-research-core.test.ts` across prompt-contract cases. The generated prompt was falling through to the last-resort emergency tier; this dropped useful guidance and durable URL/source context from the prompt under test.
- Diagnosis: the compact output contract had grown too large and duplicated detailed discovery admission rules already represented in separate compact guidance. The emergency prompt budget could therefore overflow, forcing a lower fallback tier.
- Correction: shortened the emergency output contract while retaining the complete JSON envelope, exact source URL binding, the low-confidence one-search company-review-card rule, the fetched-page requirement for stronger business claims, and the stricter fetched-source person lead rule. This is a prompt-budget correction, not a scripted discovery sequence and not a promotion bypass.
- Regression test wording for source-selection guidance was aligned with the current prompt contract. Retrieval-limit wording was kept in the compact prompt, including PDF handling and the rule that failed extraction is unobserved.
- Latest code commit at the time of this entry: `3c84216d26bcfd656f47f2564a9d44b7ca52f5c1`.
- CI for this commit was still running when this entry was written. The latest API build and full audit must be checked before proceeding.

Runtime remains unverified: no canonical launch job ID, actual search response, persisted card/entity/evidence ID, or normal API read-back has yet been observed. Do not claim the first-card objective is met until all of those are recorded.


## 12. First-card recovery: source admission, prompt budget, and Groq call-budget fixes

Timestamp: 2026-10-27, follow-up implementation pass. Current PR #759 head at entry time: `257ff6742a9b1f09719e1422306ec82da0de6114`; further CI-fix commits followed.

### New diagnosis from code inspection

- The Investigator prompt required a search action to emit a partial organization finding. Canonical checkpointing correctly did nothing when the finding list was empty, even if the underlying search observation had useful result titles and URLs. This left card creation dependent on the model successfully serializing a finding before a subsequent Boss/Right-hand failure.
- Terminal organization reconciliation also had a fallback that derived a purported company label from the result URL hostname. That was not a reliable target-company identity and conflicted with the no-inference contract; a publisher/source domain is not necessarily the company being researched.
- The Right-hand implementation declared numbered Groq key slots but selected only the first configured credential. Boss could walk a long configured key list on a single control decision, and Investigator capability registration covered only six total Groq slots despite seven numbered Investigator capabilities being supplied for configuration.
- The compact discovery targetability gate was 3,437 characters before the next fallback sections. Repeated long policy prose increased prompt pressure and made emergency-tier degradation more likely. Boss control was allowed up to 1,536 completion tokens for a small structured control decision.

### Changes made on the recovery branch

- Added bounded deterministic extraction of a low-confidence company review lead from the search provider's **exact returned title and exact returned HTTPS result URL**, only after a successful web/parallel-web search. It uses business-like title markers, rejects obvious headline-like titles, caps each search batch at three such leads, and records explicitly that the page was not fetched and ownership, wealth, people, and contact conclusions are unverified. The Investigator still owns query choice, hypotheses, and the research trajectory; this is evidence admission from observed output, not a scripted search sequence.
- Removed hostname-to-company-name inference from terminal reconciliation. A URL alone no longer supplies a company identity. Explicit fetched-page identity metadata and exact model/registry leads remain available under their existing source-binding gates.
- Shortened the discovery targetability prompt while preserving the active Boss scope/geography, no registry-first rule, materiality/realistic-route checks, language flexibility, no-placeholder/no-invention rule, and explicit source-stage dependencies.
- Retained the case objective in the emergency prompt tier and aligned the compact output-contract test with the current exact wording.
- Registered all seven numbered Investigator credential slots and added a quota-identity test for them. This fixes the registry's prior off-by-two coverage; actual runtime credentials still must exist in the deployment environment.
- Made Right-hand credential fallback use distinct configured keys after explicit request-quota or authentication failure, deduplicating identical key values as one quota pool and capping outbound chat requests per control decision. Token-window/model-specific limits still allow same-role model recovery. Added a regression test for a distinct secondary credential after a hard request-quota response.
- Bounded Boss credential fallback to the selected key plus at most two distinct fallbacks per control decision, deduplicating identical keys. Reduced Boss control completion allowance from 1,536 to 1,024 tokens for its compact JSON decision.

### Verification and remaining uncertainty

- The source-neutral discovery static check and prompt-architecture audit passed on intermediate commits.
- One CI run initially failed because the roadmap static checker still required exactly five numbered Investigator suffixes; the checker was updated to require seven. Another run exposed missing literal discovery-quality markers after prompt compaction; those phrases were restored compactly.
- Latest code/CI must still be checked after the newest commits. These are code changes, not evidence of a successful live run.
- No canonical launch job ID, real provider result, persisted company-card entity ID, evidence-row ID, or normal API/UI read-back has yet been observed in this recovery pass. The first-card objective remains open until those are captured. Do not count source-domain labels, fabricated records, test fixtures, or cards from the separately excluded earlier run sequence.
- Groq quota caveat: different API keys only provide independent capacity if the provider accounts/projects actually have independent quotas. The code now deduplicates identical secrets and bounds retries, but no claim is made that key rotation can overcome a shared organization/project/model quota.


## 14. Emergency prompt syntax repair — 2026-10-28, 03:40 UTC

- Commit `d1ae7ea6a422a2858ffabae9634c6990684ee10c` repairs a TypeScript syntax regression introduced while shortening `shortestDiscoveryGate`: the discovery-mode ternary had ended with a semicolon instead of the `: ""` false branch.
- This syntax issue explains why the Python OSINT worker and API build were failing on the immediately preceding state; do not treat the earlier test failures as semantic-only until a fresh workflow validates compilation and focused assertions.
- Current latest verified source commit: `d1ae7ea6a422a2858ffabae9634c6990684ee10c`. A workflow lookup for this SHA returned no PR-triggered runs yet. The most recent observed run set on the prior SHA `f9becaefa25a45527b267000bc40cf64a3540303` had API Build, Research Quality Contracts, Python OSINT Worker and Five Green Complete Codebase Audit failed; Prompt Architecture Audit and static discovery check passed; Five Consecutive Full Code Audits was cancelled.
- No canonical run ID, naturally returned web result, persisted company card/evidence ID, deployment SHA, or normal API/UI read-back has been verified. Do not report task success until those artifacts exist.


## 15. Fresh CI exposed a second emergency-prompt syntax defect — 2026-10-28, 03:46 UTC

- Fresh workflows did run on the prior branch head `ade8370adda77f673220ee4731dc011fe70aa653`: API Build run `40627573642`, Research Quality Contracts `40627573745`, Five Green Complete Codebase Audit `40627573669`, Python OSINT Worker `40627573722`, and Five Consecutive Full Code Audits `40627573741` all failed; Prompt Architecture Audit `40627573792` and discovery static check `40627573678` passed.
- The exact compiler failure is not a provider/runtime issue: `agentic-web-research-core.ts` around line 4672 contained two stale orphaned ternary branches after the newly shortened `shortestDiscoveryGate` and `shortestAdmission` expressions. The earlier repair fixed the first malformed ternary but did not remove those duplicate old branches. Build reported esbuild `Unexpected "?"`; TypeScript reported `TS1128: Declaration or statement expected` at lines 4672, 4673, 4675 and 4676.
- Removed only those two orphaned stale expressions, preserving the current compact prompt expressions and all surrounding prompt tiers. Source fix commit: `c3be44c3e0c4d4b2e1ec0cf60616a60abe28f69c`.
- This is a second syntax repair and further proof that earlier claims of the prompt compiling were premature. Fresh CI for `c3be44c` must be checked; no compile/test success is claimed yet.
- Runtime identity remains unresolved: Vercel has no BigContacts project/deployments under the currently connected team; the known Replit BigContacts app has not been updated since 2026-07-23 and the Replit agent returned an empty response to a non-mutating runtime identity question. The PR's Netlify deploy preview is a frontend preview, not proof of the canonical API/database runtime. Do not launch through a guessed preview or local CI database and call it production success.
- No canonical live run, model decision trace, real web result, persisted company card, evidence ID, or normal API/UI read-back has been observed. Acceptance remains blocked.
